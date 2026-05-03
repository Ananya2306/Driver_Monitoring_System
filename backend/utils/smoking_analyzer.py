"""
utils/smoking_analyzer.py
Tracks smoking detection events over time and computes behavioural frequency.

Frequency thresholds (events per rolling 60-second window)
----------------------------------------------------------
  0–1 → Low
  2–4 → Medium
  5+  → High
"""

import time
from collections import deque


class SmokingAnalyzer:
    """
    Turns frame-level smoking classifications into behavioural frequency metrics.

    A new *event* is counted only when there is a positive→negative transition
    followed by another positive, preventing a single continuous smoke from
    inflating the count.
    """

    WINDOW_SEC = 60.0

    THRESHOLDS = [
        (5, "High"),
        (2, "Medium"),
        (0, "Low"),
    ]

    def __init__(self):
        self._event_ts:       deque[float] = deque()   # timestamps of distinct events
        self.total_events:    int          = 0
        self._was_smoking:    bool         = False      # previous frame state

    # ── Public API ────────────────────────────────────────────────────────────
    def update(self, is_smoking: bool, conf: float) -> dict:
        """
        Feed one frame.

        Returns
        -------
        dict with:
          smoking_events (total lifetime), events_last_minute, frequency
        """
        now = time.time()

        # Count a distinct event on rising edge (not-smoking → smoking)
        if is_smoking and not self._was_smoking:
            self.total_events += 1
            self._event_ts.append(now)

        self._was_smoking = is_smoking

        # Purge events outside the rolling window
        cutoff = now - self.WINDOW_SEC
        while self._event_ts and self._event_ts[0] < cutoff:
            self._event_ts.popleft()

        events_last_min = len(self._event_ts)
        frequency       = self._classify(events_last_min)

        return {
            "smoking_events":     self.total_events,
            "events_last_minute": events_last_min,
            "frequency":          frequency,
        }

    def get_frequency(self) -> str:
        return self._classify(len(self._event_ts))

    def reset(self):
        self._event_ts.clear()
        self.total_events = 0
        self._was_smoking = False

    # ── Internals ─────────────────────────────────────────────────────────────
    @staticmethod
    def _classify(count: int) -> str:
        for threshold, label in SmokingAnalyzer.THRESHOLDS:
            if count >= threshold:
                return label
        return "Low"
