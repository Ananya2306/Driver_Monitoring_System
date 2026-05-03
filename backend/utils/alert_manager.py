"""
utils/alert_manager.py
Event-driven alert engine modelled on ADAS (Advanced Driver Assistance System) logic.

Behaviour
---------
  SAFE     → no alert
  WARNING  → BEEP alert, 10-second cooldown
  CRITICAL → VOICE alert, 5-second cooldown

A cooldown prevents alert spam while still surfacing repeated events.
"""

import time


class AlertManager:
    """
    Stateful alert engine.  Feed it (fatigue_score, state) after every frame.
    """

    COOLDOWN: dict[str, float] = {
        "WARNING":  10.0,
        "CRITICAL":  5.0,
    }
    ALERT_TYPE: dict[str, str] = {
        "WARNING":  "BEEP",
        "CRITICAL": "VOICE",
    }

    def __init__(self):
        self._last_alert_ts:    float       = 0.0
        self._last_alert_level: str | None  = None
        self.alert_history:     list[dict]  = []
        self.total_alerts:      int         = 0

    # ── Public API ────────────────────────────────────────────────────────────
    def evaluate(self, fatigue_score: int, state: str) -> dict:
        """
        Decide whether to fire an alert.

        Returns
        -------
        dict with keys:
          alert_active, alert_type, state, timestamp (or next_alert_in)
        """
        if state == "SAFE":
            return {
                "alert_active": False,
                "alert_type":   None,
                "state":        "SAFE",
                "timestamp":    None,
            }

        cooldown = self.COOLDOWN.get(state, 10.0)
        elapsed  = time.time() - self._last_alert_ts

        if elapsed < cooldown:
            return {
                "alert_active":  False,
                "alert_type":    None,
                "state":         state,
                "next_alert_in": round(cooldown - elapsed, 1),
                "timestamp":     None,
            }

        # ── Fire alert ────────────────────────────────────────────────────
        now            = time.time()
        ts             = time.strftime("%H:%M:%S")
        alert_type     = self.ALERT_TYPE.get(state, "BEEP")

        self._last_alert_ts    = now
        self._last_alert_level = state
        self.total_alerts     += 1

        entry = {
            "timestamp":    ts,
            "state":        state,
            "alert_type":   alert_type,
            "fatigue_score": fatigue_score,
        }
        self.alert_history.append(entry)

        return {
            "alert_active": True,
            "alert_type":   alert_type,
            "state":        state,
            "timestamp":    ts,
        }

    @property
    def last_alert_timestamp(self) -> str | None:
        return self.alert_history[-1]["timestamp"] if self.alert_history else None

    def reset(self):
        self._last_alert_ts    = 0.0
        self._last_alert_level = None
        self.alert_history.clear()
        self.total_alerts = 0
