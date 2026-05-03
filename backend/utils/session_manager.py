"""
utils/session_manager.py
Lightweight in-memory session store.

Each session tracks:
  - mode (fatigue | smoking)
  - frame + alert counters
  - max fatigue score
  - fatigue timeline (for analytics chart)
"""

import time
import uuid
from dataclasses import dataclass, field


@dataclass
class Session:
    session_id:       str
    mode:             str
    started_at:       float = field(default_factory=time.time)

    # Counters
    total_frames:     int   = 0
    total_alerts:     int   = 0
    fatigue_events:   int   = 0
    smoking_events:   int   = 0
    max_fatigue_score: int  = 0

    # Timeline for analytics (list of dicts: {ts, score, state})
    fatigue_history:  list  = field(default_factory=list)

    def to_summary(self) -> dict:
        return {
            "session_id":        self.session_id,
            "mode":              self.mode,
            "duration_sec":      round(time.time() - self.started_at),
            "total_frames":      self.total_frames,
            "total_alerts":      self.total_alerts,
            "fatigue_events":    self.fatigue_events,
            "smoking_events":    self.smoking_events,
            "max_fatigue_score": self.max_fatigue_score,
        }


class SessionManager:
    """Thread-safe (GIL) in-memory session registry."""

    def __init__(self):
        self._sessions: dict[str, Session] = {}

    def create(self, mode: str) -> Session:
        sid     = uuid.uuid4().hex[:8]
        session = Session(session_id=sid, mode=mode)
        self._sessions[sid] = session
        return session

    def get(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)

    def get_or_create(self, session_id: str, mode: str) -> Session:
        """Return existing session or create a new one."""
        if session_id and session_id in self._sessions:
            return self._sessions[session_id]
        return self.create(mode)

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    @property
    def active_count(self) -> int:
        return len(self._sessions)
