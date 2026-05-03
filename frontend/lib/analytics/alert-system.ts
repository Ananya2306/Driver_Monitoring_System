/**
 * lib/analytics/alert-system.ts
 *
 * Fixed: consecutive warnings now only count when CURRENTLY detected as drowsy.
 * Resets immediately when detected=false (awake), not just when score < 30.
 * Escalation threshold raised to 5 (needs ~10 seconds of real drowsiness).
 */

export type AlertLevel = 'SAFE' | 'WARNING' | 'CRITICAL' | 'ESCALATION';
export type AlertMode  = 'fatigue' | 'smoking';

export interface Alert {
  id:        string;
  level:     AlertLevel;
  mode:      AlertMode;
  timestamp: number;
  reason:    string;
  escalated: boolean;
  evidence?: { score: number; frameIndex: number };
}

interface AlertConfig {
  warningCooldown:     number;
  criticalCooldown:    number;
  escalationThreshold: number;  // consecutive DETECTED drowsy frames before escalation
  voiceEnabled:        boolean;
}

const DEFAULT_CONFIG: AlertConfig = {
  warningCooldown:     12000,
  criticalCooldown:    8000,
  escalationThreshold: 5,   // raised from 3 → needs ~10 seconds of real drowsiness
  voiceEnabled:        true,
};

const MESSAGES: Record<string, { en: string; hi: string }> = {
  'fatigue-WARNING': {
    en: "Warning! Do not fall asleep. Stay alert.",
    hi: "Khabardar! Neend mat lo. Savdhaan rahein.",
  },
  'fatigue-CRITICAL': {
    en: "Danger! Do not sleep while driving.",
    hi: "Khatre mein hain! Gaadi chalate waqt mat soye.",
  },
  'fatigue-ESCALATION': {
    en: "Emergency! Park the vehicle aside immediately.",
    hi: "Tatkal! Gaadi ko side mein park karein abhi.",
  },
  'smoking-WARNING': {
    en: "Alert! Smoking detected. Please put out the cigarette.",
    hi: "Savdhaan! Smoking detect hui. Cigarette bujhao abhi.",
  },
  'smoking-CRITICAL': {
    en: "Danger! Stop smoking while driving immediately.",
    hi: "Khatre mein hain! Gaadi chalate waqt smoking band karo.",
  },
};

export class AlertSystem {
  private alerts:              Alert[]                = [];
  private lastAlertTime:       Record<string, number> = {};
  private consecutiveWarnings: number                 = 0;
  private config:              AlertConfig;
  private audioCtx:            AudioContext | null    = null;

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * KEY FIX: evaluate now takes `detected` (actual model output).
   * - If NOT detected (awake) → reset counter immediately, return null
   * - Only increment consecutive when ACTUALLY drowsy right now
   */
  evaluate(
    score:      number,
    frameIndex: number,
    mode:       AlertMode = 'fatigue',
    detected:   boolean   = true      // actual model detection result
  ): Alert | null {

    // FIX 1: reset immediately when person is awake, regardless of score
    if (!detected && mode === 'fatigue') {
      this.consecutiveWarnings = 0;
      return null;
    }

    const raw: AlertLevel =
      score >= 65 ? 'CRITICAL' :
      score >= 30 ? 'WARNING'  : 'SAFE';

    if (raw === 'SAFE') {
      this.consecutiveWarnings = 0;
      return null;
    }

    // FIX 2: only increment when currently drowsy (detected=true)
    if (raw === 'WARNING' && detected) {
      this.consecutiveWarnings++;
    } else if (raw === 'CRITICAL') {
      this.consecutiveWarnings = 0;
    }

    // Escalation: needs sustained real drowsiness (5 consecutive detections)
    const escalated = mode === 'fatigue' &&
      raw === 'WARNING' &&
      this.consecutiveWarnings >= this.config.escalationThreshold;

    const effectiveLevel: AlertLevel = escalated ? 'ESCALATION' : raw;

    const now      = Date.now();
    const cooldown = effectiveLevel === 'WARNING'
      ? this.config.warningCooldown
      : this.config.criticalCooldown;

    if (now - (this.lastAlertTime[`${mode}-${effectiveLevel}`] ?? 0) < cooldown) return null;

    const alert: Alert = {
      id:        `alert_${now}_${Math.random().toString(36).slice(2, 7)}`,
      level:     effectiveLevel,
      mode,
      timestamp: now,
      escalated,
      reason:
        effectiveLevel === 'ESCALATION'
          ? `Escalated after ${this.consecutiveWarnings} sustained drowsy detections`
          : `${mode} ${effectiveLevel} — score ${score}`,
      evidence: { score, frameIndex },
    };

    this.alerts.push(alert);
    this.lastAlertTime[`${mode}-${effectiveLevel}`] = now;
    if (escalated) this.consecutiveWarnings = 0;

    return alert;
  }

  resetConsecutive(): void {
    this.consecutiveWarnings = 0;
  }

  playAudio(alert: Alert): void {
    const key = `${alert.mode}-${alert.level}` as keyof typeof MESSAGES;
    const msg = MESSAGES[key] ?? MESSAGES[`${alert.mode}-WARNING`];

    if (alert.level === 'ESCALATION') {
      this._playFile('/sounds/escalation.wav', () =>
        this._speakSequence(msg.en, msg.hi));
      return;
    }
    if (alert.level === 'CRITICAL') {
      this._playFile('/sounds/critical.wav', () =>
        this._speakSequence(msg.en, msg.hi));
      return;
    }
    this._playFile('/sounds/warning.wav', () =>
      this._speakSequence(msg.en, msg.hi));
  }

  private _ctx(): AudioContext {
    if (!this.audioCtx)
      this.audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return this.audioCtx;
  }

  private _playFile(path: string, onEnd?: () => void): void {
    const ctx = this._ctx();
    fetch(path)
      .then(r  => r.arrayBuffer())
      .then(ab => ctx.decodeAudioData(ab))
      .then(decoded => {
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = decoded;
        gain.gain.value = 1.0;
        src.connect(gain); gain.connect(ctx.destination);
        src.start();
        if (onEnd) src.onended = onEnd;
      })
      .catch(() => {
        this._syntheticFallback(path);
        if (onEnd) setTimeout(onEnd, 800);
      });
  }

  private _speakSequence(en: string, hi: string): void {
    if (!this.config.voiceEnabled || !window.speechSynthesis) return;
    this._speakOne(en, 'en', () => setTimeout(() => this._speakOne(hi, 'hi'), 600));
  }

  private _speakOne(text: string, lang: 'en' | 'hi', onEnd?: () => void): void {
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utt.rate = 0.95; utt.pitch = 1.0; utt.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const voice  = lang === 'hi'
      ? voices.find(v => v.lang.startsWith('hi'))
      : (voices.find(v => v.lang === 'en-IN') ?? voices.find(v => v.lang.startsWith('en')));
    if (voice) utt.voice = voice;
    if (onEnd) utt.onend = onEnd;
    window.speechSynthesis.speak(utt);
  }

  private _syntheticFallback(path: string): void {
    const ctx   = this._ctx();
    const isEsc = path.includes('escalation');
    const isCri = path.includes('critical');
    const vol   = isEsc ? 0.98 : isCri ? 0.92 : 0.80;
    const tones: Array<[number, number, number]> = isEsc
      ? [[500,0,0.06],[800,0.1,0.06],[1100,0.2,0.06],[1400,0.3,0.06],[1700,0.4,0.25]]
      : isCri ? [[1100,0,0.18],[750,0.22,0.18],[1100,0.44,0.18],[750,0.66,0.18]]
      : [[960, 0, 0.30]];
    tones.forEach(([freq, delay, dur]) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.01);
    });
  }

  get consecutiveWarningCount() { return this.consecutiveWarnings; }
  get escalationThreshold()     { return this.config.escalationThreshold; }

  getAlerts()    { return [...this.alerts]; }
  clearAlerts()  { this.alerts = []; }
  getLastAlert() { return this.alerts.at(-1) ?? null; }
  getStats() {
    return {
      total:       this.alerts.length,
      warnings:    this.alerts.filter(a => a.level === 'WARNING').length,
      criticals:   this.alerts.filter(a => a.level === 'CRITICAL').length,
      escalations: this.alerts.filter(a => a.level === 'ESCALATION').length,
    };
  }
}
