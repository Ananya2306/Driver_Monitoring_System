/**
 * lib/scoring/fatigue-scorer.ts
 *
 * Converts frame predictions into a smooth fatigue score (0–100).
 *
 * Key fixes from video observation:
 * - Smoothing 0.35 → 0.25 (rises much slower, doesn't spike on 1-2 drowsy frames)
 * - Decay multiplier 0.85 → 0.75 (drops faster when awake)
 * - minDrowsyFrames 3 → 4 (needs 4 consecutive drowsy before any alert)
 * - warningThreshold 70 → 72 (slightly harder to reach WARNING)
 * - Window 30 → 40 frames (more temporal context = smoother)
 */

export type FatigueState = 'SAFE' | 'WARNING' | 'CRITICAL';

interface ScoringConfig {
  windowSize:       number;
  safeThreshold:    number;
  warningThreshold: number;
  smoothingFactor:  number;
  minDrowsyFrames:  number;
  decayMultiplier:  number;
}

const DEFAULT_CONFIG: ScoringConfig = {
  windowSize:       40,    // more frames = smoother
  safeThreshold:    35,
  warningThreshold: 72,    // harder to reach
  smoothingFactor:  0.25,  // much gentler rise
  minDrowsyFrames:  4,     // need 4 consecutive drowsy detections
  decayMultiplier:  0.75,  // drops fast when awake
};

export class FatigueScoringEngine {
  private frameHistory:      number[] = [];
  private lastScore:         number   = 0;
  private consecutiveDrowsy: number   = 0;
  private config:            ScoringConfig;

  constructor(config: Partial<ScoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  addFrame(drowsyProb: number): { score: number; state: FatigueState; trend: string } {
    const clamped = Math.max(0, Math.min(1, drowsyProb));

    if (clamped >= 0.5) this.consecutiveDrowsy++;
    else                this.consecutiveDrowsy = 0;

    this.frameHistory.push(clamped);
    if (this.frameHistory.length > this.config.windowSize) this.frameHistory.shift();

    const windowScore = this._weightedAverage();

    const smoothed = this.lastScore === 0
      ? windowScore
      : this.config.smoothingFactor * windowScore + (1 - this.config.smoothingFactor) * this.lastScore;

    // Aggressive decay when current frame is clearly awake
    const finalSmoothed = clamped < 0.35
      ? smoothed * this.config.decayMultiplier
      : smoothed;

    const finalScore = Math.round(finalSmoothed * 100);
    this.lastScore   = finalSmoothed;

    return { score: finalScore, state: this._getState(finalScore), trend: this._trend() };
  }

  private _weightedAverage(): number {
    if (!this.frameHistory.length) return 0;
    const n = this.frameHistory.length;
    let ws = 0, wt = 0;
    this.frameHistory.forEach((v, i) => { const w = i + 1; ws += v * w; wt += w; });
    return ws / wt;
  }

  private _getState(score: number): FatigueState {
    if (this.consecutiveDrowsy < this.config.minDrowsyFrames) return 'SAFE';
    if (score < this.config.safeThreshold)    return 'SAFE';
    if (score < this.config.warningThreshold) return 'WARNING';
    return 'CRITICAL';
  }

  private _trend(): string {
    if (this.frameHistory.length < 6) return 'stable';
    const r = this.frameHistory.slice(-3).reduce((a,b)=>a+b)/3;
    const o = this.frameHistory.slice(-6,-3).reduce((a,b)=>a+b)/3;
    return r - o < -0.08 ? 'improving' : r - o > 0.08 ? 'worsening' : 'stable';
  }

  reset() {
    this.frameHistory = []; this.lastScore = 0; this.consecutiveDrowsy = 0;
  }

  getHistory()   { return [...this.frameHistory]; }
  getLastScore() { return Math.round(this.lastScore * 100); }
}
