"""
utils/fatigue_scorer.py
Converts per-frame drowsy/not-drowsy predictions into a time-based
fatigue score (0–100) using eye-closure duration and continuity.

States
------
  0–29  → SAFE
  30–64 → WARNING
  65–100→ CRITICAL
"""

import time
from collections import deque


class FatigueScorer:
    """
    Sliding-window fatigue analyser.

    Parameters
    ----------
    window_sec : float
        Rolling window duration used to compute the score (default 30 s).
    micro_threshold_sec : float
        Minimum continuous closure to count as a micro-fatigue event (default 1.5 s).
    """

    SAFE_MAX     = 29
    WARNING_MAX  = 64

    def __init__(self, window_sec: float = 30.0, micro_threshold_sec: float = 1.5):
        self.window_sec          = window_sec
        self.micro_threshold_sec = micro_threshold_sec

        self._events: deque[tuple[float, bool, float]] = deque()  # (ts, is_drowsy, conf)
        self.micro_fatigue_events: list[dict] = []

        self._drowsy_start:           float | None = None
        self._current_closure_sec:    float        = 0.0

    # ── Public API ────────────────────────────────────────────────────────────
    def update(self, is_drowsy: bool, conf: float) -> dict:
        """
        Feed one frame's prediction.

        Returns a dict with:
          fatigue_score, state, micro_fatigue_events,
          current_closure_sec, micro_fatigue_log (last 5)
        """
        now = time.time()

        # Track continuous closure → micro-fatigue events
        if is_drowsy:
            if self._drowsy_start is None:
                self._drowsy_start = now
            self._current_closure_sec = now - self._drowsy_start
        else:
            if self._drowsy_start is not None:
                duration = now - self._drowsy_start
                if duration >= self.micro_threshold_sec:
                    self.micro_fatigue_events.append({
                        "timestamp":    time.strftime("%H:%M:%S"),
                        "duration_sec": round(duration, 2),
                    })
            self._drowsy_start        = None
            self._current_closure_sec = 0.0

        # Add to rolling window
        self._events.append((now, is_drowsy, conf))
        self._purge_old(now)

        score = self._compute_score()
        state = self._state_label(score)

        return {
            "fatigue_score":        score,
            "state":                state,
            "micro_fatigue_events": len(self.micro_fatigue_events),
            "current_closure_sec":  round(self._current_closure_sec, 2),
            "micro_fatigue_log":    self.micro_fatigue_events[-5:],
        }

    def reset(self):
        self._events.clear()
        self.micro_fatigue_events.clear()
        self._drowsy_start        = None
        self._current_closure_sec = 0.0

    # ── Internals ─────────────────────────────────────────────────────────────
    def _purge_old(self, now: float):
        cutoff = now - self.window_sec
        while self._events and self._events[0][0] < cutoff:
            self._events.popleft()

    def _compute_score(self) -> int:
        if not self._events:
            return 0

        total        = len(self._events)
        drowsy_items = [(ts, c) for ts, d, c in self._events if d]
        drowsy_count = len(drowsy_items)

        if drowsy_count == 0:
            return 0

        ratio    = drowsy_count / total                            # 0–1  → up to 80 pts
        avg_conf = sum(c for _, c in drowsy_items) / drowsy_count  # 0–1  → up to 10 pts
        closure_bonus = min(self._current_closure_sec * 5, 10)    # 0–10 pts (max ~2 s)

        score = int(ratio * 80 + avg_conf * 10 + closure_bonus)
        return max(0, min(score, 100))

    @staticmethod
    def _state_label(score: int) -> str:
        if score <= FatigueScorer.SAFE_MAX:
            return "SAFE"
        if score <= FatigueScorer.WARNING_MAX:
            return "WARNING"
        return "CRITICAL"
