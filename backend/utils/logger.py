"""
utils/logger.py
Enhanced event logger — writes to CSV for download + post-session analytics.

CSV columns
-----------
timestamp, session_id, mode, result, confidence_%, severity, event_type
"""

import csv
import os
import time


class CSVLogger:
    """
    Append-only CSV event logger.

    Parameters
    ----------
    filepath : str
        Path to the CSV file.  Parent directory is created if needed.
    """

    HEADER = ["timestamp", "session_id", "mode", "result", "confidence_%", "severity", "event_type"]

    def __init__(self, filepath: str = "logs/detections.csv"):
        self.filepath = filepath
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        needs_header = (
            not os.path.exists(filepath)
            or os.path.getsize(filepath) == 0
        )
        if needs_header:
            with open(filepath, "a", newline="") as f:
                csv.writer(f).writerow(self.HEADER)

    def log(
        self,
        mode:       str,
        result:     str,
        confidence: float,
        severity:   str = "SAFE",
        session_id: str = "",
        event_type: str = "detection",
    ) -> None:
        """
        Append one detection record.

        Args:
            mode        : "fatigue" | "smoking"
            result      : e.g. "Drowsy", "Not Drowsy", "Smoking", "Not Smoking"
            confidence  : float in [0, 1]
            severity    : "SAFE" | "WARNING" | "CRITICAL"
            session_id  : session identifier (empty string if not applicable)
            event_type  : "detection" | "alert" | "micro_fatigue" | "snapshot"
        """
        ts  = time.strftime("%Y-%m-%d %H:%M:%S")
        row = [
            ts,
            session_id,
            mode,
            result,
            f"{confidence * 100:.2f}",
            severity,
            event_type,
        ]
        with open(self.filepath, "a", newline="") as f:
            csv.writer(f).writerow(row)

    def log_alert(self, session_id: str, mode: str, state: str, fatigue_score: int) -> None:
        """Convenience method for logging alert events explicitly."""
        self.log(
            mode=mode,
            result=f"ALERT_{state}",
            confidence=fatigue_score / 100.0,
            severity=state,
            session_id=session_id,
            event_type="alert",
        )

    def log_snapshot(self, session_id: str, filepath: str) -> None:
        """Log a snapshot save event."""
        self.log(
            mode="fatigue",
            result=f"SNAPSHOT:{filepath}",
            confidence=1.0,
            severity="CRITICAL",
            session_id=session_id,
            event_type="snapshot",
        )
