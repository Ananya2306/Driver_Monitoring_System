# Driver Monitoring System — Backend API

FastAPI backend for the Driver Monitoring System.  
**Deploy on Railway or Render** (TensorFlow needs a persistent runtime — Vercel serverless won't work).

---

## Folder Structure

```
backend/
├── main.py                  # FastAPI app + all routes
├── requirements.txt
├── Procfile                 # Railway / Render entry point
├── .env.example             # Copy → .env for local dev
├── models/
│   ├── fatigue_model.h5     # ← place your trained models here
│   └── smoking_model.h5
├── logs/                    # auto-created; detections.csv written here
├── snapshots/               # auto-created; CRITICAL alert frames saved here
└── utils/
    ├── detector.py          # model loading + inference (3 fallback strategies)
    ├── preprocessor.py      # CLAHE low-light enhancement + resize/normalise
    ├── fatigue_scorer.py    # sliding-window fatigue score (0–100) + micro-fatigue
    ├── alert_manager.py     # adaptive alert engine with cooldown
    ├── smoking_analyzer.py  # smoking event frequency tracker
    ├── session_manager.py   # in-memory session registry
    └── logger.py            # CSV event logger (timestamp, severity, session_id)
```

---

## Local Development

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                               # edit ALLOWED_ORIGINS
uvicorn main:app --reload --port 8000
```

Swagger docs → http://localhost:8000/docs

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/health` | Model status + active session count |
| `POST` | `/predict` | Run detection on a base64 frame |
| `GET`  | `/session/{id}/summary` | End-of-run metrics + alert history |
| `GET`  | `/session/{id}/analytics` | Chart-ready fatigue timeline + smoking data |
| `DELETE` | `/session/{id}` | Close session, returns final summary |
| `GET`  | `/logs/download` | Download full detections CSV |

### POST `/predict` — request body

```json
{
  "image_b64": "<base64-encoded JPEG>",
  "mode": "fatigue",
  "session_id": ""
}
```

### POST `/predict` — response (key fields)

```json
{
  "session_id": "a3f9c12b",
  "result": "Drowsy",
  "confidence": 0.87,
  "fatigue_score": 72,
  "state": "CRITICAL",
  "micro_fatigue_events": 2,
  "alert_active": true,
  "alert_type": "VOICE",
  "smoking_events": 0,
  "smoking_frequency": "Low",
  "fps": 14.3,
  "latency_ms": 68.4,
  "total_frames": 120,
  "total_alerts": 5,
  "snapshot_saved": true,
  "snapshot_path": "snapshots/critical_20250425_143201_a3f9c12b.jpg"
}
```

---

## Deploying on Railway

1. Push the `backend/` folder to a GitHub repo.
2. Create a new Railway project → **Deploy from GitHub repo**.
3. Set environment variables in Railway dashboard:
   - `ALLOWED_ORIGINS` = `https://your-app.vercel.app`
4. Upload `.h5` model files to the `models/` directory via Railway's file editor or mount a volume.
5. Railway auto-detects `Procfile` and starts the server.

---

## Feature Map

| Feature | Module |
|---------|--------|
| Temporal Fatigue Score (0–100) | `utils/fatigue_scorer.py` |
| Micro-Fatigue Detection | `utils/fatigue_scorer.py` |
| Adaptive Alerts (BEEP / VOICE + cooldown) | `utils/alert_manager.py` |
| Smoking Frequency (Low / Medium / High) | `utils/smoking_analyzer.py` |
| Session Summary | `utils/session_manager.py` |
| Event Logging (CSV + severity) | `utils/logger.py` |
| Low-Light Enhancement (CLAHE) | `utils/preprocessor.py` |
| Snapshot on CRITICAL | `main.py → _save_snapshot()` |
| Analytics endpoint (chart data) | `main.py → /session/{id}/analytics` |
| FPS + latency monitor | `main.py → _perf tracker` |
