'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { AlertSystem, Alert, AlertLevel, AlertMode } from '@/lib/analytics/alert-system';

export interface AlertState {
  level:     AlertLevel;
  mode:      AlertMode;
  escalated: boolean;
  reason:    string;
  timestamp: number;
}

export function useAudioAlert() {
  const systemRef     = useRef<AlertSystem | null>(null);
  const [alertState, setAlertState]           = useState<AlertState | null>(null);
  const [consecutiveWarnings, setConsecutive] = useState(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        ctx.resume();
      } catch { /* ignore */ }
    };
    window.addEventListener('click',      unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('click',      unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  function getSystem(): AlertSystem {
    if (!systemRef.current) systemRef.current = new AlertSystem({ voiceEnabled: true });
    return systemRef.current;
  }

  // FIX: now takes detected so counter resets correctly
  const evaluate = useCallback((
    score:      number,
    frameIndex: number,
    mode:       AlertMode = 'fatigue',
    detected:   boolean   = true
  ): Alert | null => {
    const sys   = getSystem();
    const alert = sys.evaluate(score, frameIndex, mode, detected);
    setConsecutive(sys.consecutiveWarningCount);
    if (!alert) return null;

    sys.playAudio(alert);
    setAlertState({
      level:     alert.level,
      mode:      alert.mode,
      escalated: alert.escalated,
      reason:    alert.reason,
      timestamp: alert.timestamp,
    });

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(
      () => setAlertState(null),
      alert.level === 'ESCALATION' ? 5000 : 3000
    );

    return alert;
  }, []);

  const getStats = useCallback(() => getSystem().getStats(), []);

  return { evaluate, alertState, consecutiveWarnings, escalationThreshold: 5, getStats };
}
