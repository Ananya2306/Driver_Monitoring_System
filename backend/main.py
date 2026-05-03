"""
main.py — Driver Monitoring System API (FastAPI)
Deploy on Railway / Render (NOT Vercel — TF models need a persistent runtime)

Endpoints
---------
POST  /predict                        → run detection on a base64 frame
GET   /session/{session_id}/summary   → end-of-run summary + alert history
GET   /session/{session_id}/analytics → fatigue timeline + smoking bar data
DELETE /session/{session_id}          → close session, return final summary
GET   /logs/download                  → CSV download
GET   /health                         → model status + active sessions
"""

import base64
import os
import time

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from utils.detector import FatigueDetector, SmokingDetector
from utils.logger import CSVLogger
from utils.fatigue_scorer import FatigueScorer
from utils.alert_manager import AlertManager
from utils.smoking_analyzer import SmokingAnalyzer
from utils.session_manager import SessionManager

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Driver Monitoring System API", version="2.0.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load models once at startup ───────────────────────────────────────────────
FATIGUE_MODEL = os.getenv("FATIGUE_MODEL_PATH", "models/fatigue_model.h5")
SMOKING_MODEL = os.getenv("SMOKING_MODEL_PATH", "models/smoking_model.h5")
fatigue_det = FatigueDetector(FATIGUE_MODEL)
smoking_det = SmokingDetector(SMOKING_MODEL)

# ── Global singletons ─────────────────────────────────────────────────────────
logger          = CSVLogger("logs/detections.csv")
session_manager = SessionManager()

# Per-session components (keyed by session_id)
_fatigue_scorers:   dict[str, FatigueScorer]   = {}
_alert_managers:    dict[str, AlertManager]    = {}
_smoking_analyzers: dict[str, SmokingAnalyzer] = {}
_perf:              dict[str, dict]            = {}


# ── Schemas ───────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    image_b64:  str        # base64-encoded JPEG / PNG frame
    mode:       str        # "fatigue" | "smoking"
    session_id: str = ""   # empty → server creates a new one


class PredictResponse(BaseModel):
    session_id: str
    mode:       str
    result:     str
    confidence: float

    # Fatigue
    fatigue_score:        int
    state:                str    # SAFE | WARNING | CRITICAL
    micro_fatigue_events: int
    current_closure_sec:  float

    # Alert
    alert_active: bool
    alert_type:   str | None     # BEEP | VOICE | None
    last_alert:   str | None

    # Smoking
    smoking_events:    int
    smoking_frequency: str   # Low | Medium | High

    # Performance
    fps:        float
    latency_ms: float

    # Session counters
    total_frames: int
    total_alerts: int

    # Snapshot
    snapshot_saved: bool
    snapshot_path:  str | None


# ── Helpers ───────────────────────────────────────────────────────────────────
def _decode_image(b64: str) -> np.ndarray:
    try:
        data  = base64.b64decode(b64)
        arr   = np.frombuffer(data, np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("imdecode returned None")
        return frame
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}")


def _init_session_components(sid: str):
    if sid not in _fatigue_scorers:
        _fatigue_scorers[sid]   = FatigueScorer()
        _alert_managers[sid]    = AlertManager()
        _smoking_analyzers[sid] = SmokingAnalyzer()
        _perf[sid]              = {"last_ts": time.time(), "fps": 0.0}


def _save_snapshot(frame: np.ndarray, sid: str) -> str:
    os.makedirs("snapshots", exist_ok=True)
    fname = f"snapshots/critical_{time.strftime('%Y%m%d_%H%M%S')}_{sid}.jpg"
    cv2.imwrite(fname, frame)
    return fname


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "service": "Driver Monitoring System API",
        "version": "2.0.0",
        "models":  {"fatigue": fatigue_det.loaded, "smoking": smoking_det.loaded},
    }


@app.get("/health")
def health():
    return {
        "status":          "ok",
        "fatigue_model":   fatigue_det.loaded,
        "smoking_model":   smoking_det.loaded,
        "active_sessions": len(_fatigue_scorers),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    t0    = time.time()
    frame = _decode_image(req.image_b64)

    # Session
    session = session_manager.get_or_create(req.session_id, req.mode)
    sid     = session.session_id
    _init_session_components(sid)

    scorer   = _fatigue_scorers[sid]
    alerter  = _alert_managers[sid]
    smoker   = _smoking_analyzers[sid]

    # ── Detection ─────────────────────────────────────────────────────────
    if req.mode == "fatigue":
        if not fatigue_det.loaded:
            raise HTTPException(503, "Fatigue model not loaded — place .h5 in models/")
        result, conf = fatigue_det.predict(frame)
        is_drowsy    = result == "Drowsy"

        fatigue_info = scorer.update(is_drowsy, conf)
        alert_info   = alerter.evaluate(fatigue_info["fatigue_score"], fatigue_info["state"])
        smoke_info   = {"smoking_events": 0, "frequency": "Low"}

        if is_drowsy:
            session.fatigue_events += 1
        session.max_fatigue_score = max(session.max_fatigue_score, fatigue_info["fatigue_score"])
        session.fatigue_history.append({
            "ts":    time.strftime("%H:%M:%S"),
            "score": fatigue_info["fatigue_score"],
            "state": fatigue_info["state"],
        })

    else:  # smoking
        if not smoking_det.loaded:
            raise HTTPException(503, "Smoking model not loaded — place .h5 in models/")
        result, conf = smoking_det.predict(frame)
        is_smoking   = result == "Smoking"

        smoke_info   = smoker.update(is_smoking, conf)
        fatigue_info = {"fatigue_score": 0, "state": "SAFE",
                        "micro_fatigue_events": 0, "current_closure_sec": 0.0}
        alert_info   = {
            "alert_active": is_smoking,
            "alert_type":   "BEEP" if is_smoking else None,
            "state":        "WARNING" if is_smoking else "SAFE",
            "timestamp":    time.strftime("%H:%M:%S") if is_smoking else None,
        }
        session.smoking_events = smoke_info["smoking_events"]

    # ── Session counters ───────────────────────────────────────────────────
    session.total_frames += 1
    if alert_info.get("alert_active"):
        session.total_alerts += 1

    # ── Snapshot on CRITICAL ───────────────────────────────────────────────
    snapshot_saved, snapshot_path = False, None
    if fatigue_info.get("state") == "CRITICAL" and alert_info.get("alert_active"):
        snapshot_path  = _save_snapshot(frame, sid)
        snapshot_saved = True

    # ── Log event ─────────────────────────────────────────────────────────
    logger.log(
        mode=req.mode,
        result=result,
        confidence=conf,
        severity=fatigue_info.get("state", "SAFE"),
        session_id=sid,
    )

    # ── FPS / latency ─────────────────────────────────────────────────────
    now      = time.time()
    elapsed  = now - _perf[sid]["last_ts"]
    fps      = round(1.0 / elapsed, 1) if elapsed > 0 else 0.0
    _perf[sid] = {"last_ts": now, "fps": fps}
    latency_ms = round((now - t0) * 1000, 1)

    return PredictResponse(
        session_id=sid,
        mode=req.mode,
        result=result,
        confidence=round(conf, 4),

        fatigue_score=fatigue_info.get("fatigue_score", 0),
        state=fatigue_info.get("state", "SAFE"),
        micro_fatigue_events=fatigue_info.get("micro_fatigue_events", 0),
        current_closure_sec=fatigue_info.get("current_closure_sec", 0.0),

        alert_active=alert_info.get("alert_active", False),
        alert_type=alert_info.get("alert_type"),
        last_alert=alert_info.get("timestamp"),

        smoking_events=smoke_info.get("smoking_events", 0),
        smoking_frequency=smoke_info.get("frequency", "Low"),

        fps=fps,
        latency_ms=latency_ms,

        total_frames=session.total_frames,
        total_alerts=session.total_alerts,

        snapshot_saved=snapshot_saved,
        snapshot_path=snapshot_path,
    )


@app.get("/session/{session_id}/summary")
def session_summary(session_id: str):
    session = session_manager.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    alert_history = (
        _alert_managers[session_id].alert_history[-20:]
        if session_id in _alert_managers else []
    )
    micro_log = (
        _fatigue_scorers[session_id].micro_fatigue_events[-10:]
        if session_id in _fatigue_scorers else []
    )
    return {
        **session.to_summary(),
        "alert_history":    alert_history,
        "micro_fatigue_log": micro_log,
    }


@app.get("/session/{session_id}/analytics")
def session_analytics(session_id: str):
    """Returns chart-ready data for the analytics dashboard."""
    session = session_manager.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    alert_timeline = (
        _alert_managers[session_id].alert_history
        if session_id in _alert_managers else []
    )
    smoking_info = {}
    if session_id in _smoking_analyzers:
        a = _smoking_analyzers[session_id]
        smoking_info = {
            "total_events":      a.total_events,
            "events_last_minute": len(a.events),
            "frequency":         a.get_frequency(),
        }

    return {
        "fatigue_timeline":  session.fatigue_history,   # [{ts, score, state}]
        "alert_timeline":    alert_timeline,             # [{timestamp, state, alert_type, fatigue_score}]
        "smoking":           smoking_info,
        "session_summary":   session.to_summary(),
    }


@app.delete("/session/{session_id}")
def end_session(session_id: str):
    session = session_manager.get(session_id)
    summary = session.to_summary() if session else None
    session_manager.delete(session_id)
    for store in (_fatigue_scorers, _alert_managers, _smoking_analyzers, _perf):
        store.pop(session_id, None)
    return {"message": "Session ended", "summary": summary}


@app.get("/logs/download")
def download_logs():
    path = "logs/detections.csv"
    if not os.path.exists(path):
        raise HTTPException(404, "No log file found yet")
    return FileResponse(path, media_type="text/csv", filename="detections.csv")


# ── Frontend-compatible endpoints (multipart/form-data) ───────────────────────
# The Next.js frontend POSTs a `file` field via FormData to these endpoints.
# They bridge to the same detection logic and return a simpler response shape.

def _file_to_frame(upload: UploadFile) -> np.ndarray:
    """Read an uploaded image file → BGR numpy array."""
    data  = upload.file.read()
    arr   = np.frombuffer(data, np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Cannot decode image file")
    return frame


@app.post("/predict/fatigue")
async def predict_fatigue(file: UploadFile = File(...)):
    """
    Fatigue detection endpoint for the Next.js frontend.
    Returns raw model output only — frontend FatigueScoringEngine handles state/scoring.
    """
    if not fatigue_det.loaded:
        raise HTTPException(503, "Fatigue model not loaded")

    frame        = _file_to_frame(file)
    result, conf = fatigue_det.predict(frame)
    detected     = result == "Drowsy"

    # Micro-fatigue: only count if very high confidence drowsy
    micro_fatigue_count = 1 if (detected and conf >= 0.80) else 0

    # Lighting check on the eye-strip region (after preprocessing)
    mean_brightness    = float(frame.mean())
    lighting_condition = "Low" if mean_brightness < 70 else "Normal"
    enhancement_active = lighting_condition == "Low"

    logger.log(mode="fatigue", result=result, confidence=conf, severity="SAFE")

    return {
        "detected":            detected,
        "confidence":          round(conf, 4),
        "label":               "DROWSY" if detected else "ALERT",
        # NOTE: fatigue_score and state are computed by frontend scorer
        # Backend only returns raw detection so frontend has full temporal control
        "fatigue_score":       0,
        "state":               "SAFE",
        "alert_active":        False,
        "alert_type":          None,
        "micro_fatigue_count": micro_fatigue_count,
        "lighting_condition":  lighting_condition,
        "enhancement_active":  enhancement_active,
        "snapshot_captured":   False,
        "snapshot_timestamp":  None,
    }


@app.post("/predict/smoking")
async def predict_smoking(file: UploadFile = File(...)):
    """
    Smoking detection endpoint for the Next.js frontend.
    Accepts multipart/form-data with a `file` field.
    Returns all fields consumed by the frontend ResultCard + WebcamTab.
    """
    if not smoking_det.loaded:
        raise HTTPException(503, "Smoking model not loaded")

    frame        = _file_to_frame(file)
    result, conf = smoking_det.predict(frame)
    detected     = result == "Smoking"

    # Smoking events: count rising edge (1 if detected, 0 if not)
    smoking_events = 1 if detected else 0

    # Frequency label from event count (single frame → Low by default; escalates over session)
    smoking_frequency = "Low"

    # Low-light detection
    mean_brightness    = float(frame.mean())
    lighting_condition = "Low" if mean_brightness < 80 else "Normal"
    enhancement_active = lighting_condition == "Low"

    severity = "WARNING" if detected else "SAFE"
    logger.log(mode="smoking", result=result, confidence=conf, severity=severity)

    return {
        # Core detection
        "detected":           detected,
        "confidence":         round(conf, 4),
        "label":              "SMOKING" if detected else "NOT SMOKING",
        # Alert
        "alert_active":       detected,
        "alert_type":         "BEEP" if detected else None,
        # Smoking analytics (Feature #5)
        "smoking_events":     smoking_events,
        "smoking_frequency":  smoking_frequency,
        # Lighting / CLAHE (Feature #10)
        "lighting_condition": lighting_condition,
        "enhancement_active": enhancement_active,
        # Snapshot (not triggered for smoking, but field expected by frontend)
        "snapshot_captured":  False,
        "snapshot_timestamp": None,
    }
