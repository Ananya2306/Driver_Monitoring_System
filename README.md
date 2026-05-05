# 🚗 Driver Monitoring System (DMS)
### Dual Deep Learning Models for Real-Time Fatigue & Smoking Detection

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![TensorFlow](https://img.shields.io/badge/ML-TensorFlow_CPU-FF6F00?style=flat-square&logo=tensorflow)](https://tensorflow.org)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python)](https://python.org)

> A real-time, non-intrusive driver monitoring system that detects **fatigue** and **smoking** behaviour using two independent CNN models, with temporal behaviour analysis, bilingual multi-modal alerts (English + Hindi), and a full session analytics dashboard.

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Model Information](#-model-information)
- [API Reference](#-api-reference)
- [Alert System](#-alert-system)
- [Deployment](#-deployment)
- [Research Paper](#-research-paper)

---

## ✨ Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Temporal Fatigue Scoring** | Rolling 40-frame window → score 0–100 with weighted average + exponential smoothing |
| 2 | **Micro-Fatigue Detection** | Flags eye closure events ≥1.5 seconds as micro-sleep precursors |
| 3 | **Adaptive Alert System** | SAFE → WARNING → CRITICAL → ESCALATION with cooldown (no alert spam) |
| 4 | **Bilingual Multi-Modal Alerts** | WAV sounds + voice synthesis in English AND Hindi |
| 5 | **Smoking Frequency Analysis** | Rising-edge event counting → Low / Medium / High per 60-second window |
| 6 | **Event Logging (CSV)** | Timestamped log: mode, result, confidence, severity, session_id |
| 7 | **Analytics Dashboard** | Real-time fatigue trend chart + alert severity distribution |
| 8 | **Snapshot on CRITICAL** | OpenCV saves frame evidence when sustained CRITICAL alert fires |
| 9 | **Mode-Based Execution** | Only one model runs at a time — lower compute, clearer output |
| 10 | **CLAHE Low-Light Enhancement** | Adaptive histogram equalisation on LAB L-channel before inference |
| 11 | **Performance Monitor** | FPS + API latency tracked per session |
| 12 | **Session Summary** | End-of-run report: total frames, alerts, max score, duration |

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                        │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────────┐    │
│  │ Webcam   │  │ Image Upload│  │  Batch Mode          │    │
│  │   Tab    │  │    Tab      │  │                      │    │
│  └────┬─────┘  └──────┬──────┘  └──────────┬───────────┘    │
│       │               │                    │                │
│  ┌────▼───────────────▼────────────────────▼───────────┐    │
│  │           FatigueScoringEngine (client-side)        │    │
│  │  40-frame window → score → state → AlertSystem      │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │ POST multipart/form-data         │
└──────────────────────────┼─────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend                           │
│                                                             │
│  POST /predict/fatigue   POST /predict/smoking              │
│         │                        │                          │
│  ┌──────▼──────┐         ┌───────▼──────┐                   │
│  │ preprocessor│         │ preprocessor │                   │
│  │ (eye strip) │         │ (face crop)  │                   │
│  └──────┬──────┘         └───────┬──────┘                   │
│  ┌──────▼──────┐         ┌───────▼──────┐                   │
│  │  Fatigue    │         │  Smoking     │                   │
│  │  CNN Model  │         │  CNN Model   │                   │
│  │  (91.5% acc)│         │  (79.9% acc) │                   │
│  └──────┬──────┘         └───────┬──────┘                   │
│         └──────────┬─────────────┘                          │
│                    ▼                                        │
│  ┌─────────────────────────────────────┐                    │
│  │  CSVLogger  │  SessionManager       │                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Research_Paper_Project-main/
├── backend/
│   ├── main.py                    # FastAPI app + all routes
│   ├── requirements.txt           # Python dependencies
│   ├── Procfile                   # Railway/Render deployment
│   ├── .env                       # Environment variables
│   ├── models/
│   │   ├── fatigue_model.h5       # Trained fatigue CNN (~92% accuracy)
│   │   └── smoking_model.h5       # Trained smoking CNN (~90% accuracy)
│   ├── logs/
│   │   └── detections.csv         # Auto-created event log
│   ├── snapshots/                 # CRITICAL alert evidence frames
│   └── utils/
│       ├── preprocessor.py        # Eye-strip extraction + CLAHE
│       ├── detector.py            # Model loading (3 fallback strategies)
│       ├── fatigue_scorer.py      # Temporal fatigue scoring (backend)
│       ├── alert_manager.py       # Adaptive alert engine
│       ├── smoking_analyzer.py    # Smoking frequency analysis
│       ├── session_manager.py     # In-memory session store
│       └── logger.py              # CSV event logger
│
├── frontend/
│   ├── app/
│   │   └── page.tsx               # Main page, mode selector
│   ├── components/dms/
│   │   ├── webcam-tab.tsx         # Live webcam detection
│   │   ├── image-upload-tab.tsx   # Single image upload
│   │   ├── batch-upload-tab.tsx   # Batch processing
│   │   ├── analytics-dashboard.tsx
│   │   ├── performance-monitor.tsx
│   │   └── session-summary.tsx
│   ├── hooks/
│   │   └── use-audio-alert.ts     # Audio + escalation hook
│   ├── lib/
│   │   ├── scoring/fatigue-scorer.ts   # Client-side temporal scorer
│   │   ├── analytics/alert-system.ts  # Bilingual alert engine
│   │   └── stores/session-store.ts    # Zustand session state
│   ├── public/sounds/
│   │   ├── warning.wav            # Loud single beep (WARNING)
│   │   ├── critical.wav           # Alternating siren (CRITICAL)
│   │   └── escalation.wav         # Rising sweep + sustained alarm
│   └── .env.local                 # NEXT_PUBLIC_BACKEND_URL
│
└── models/                        # Model training scripts
    ├── train_fatigue.py
    ├── train_smoking.py
    └── evaluate.py
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or pnpm

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Place your trained models
# backend/models/fatigue_model.h5
# backend/models/smoking_model.h5

# Set environment (already configured for local)
cat .env
# ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# Start backend
uvicorn main:app --reload --port 8000
```

Backend available at: http://localhost:8000  
Swagger docs: http://localhost:8000/docs

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install        # or: pnpm install

# Check backend URL (already set to 8000)
cat .env.local
# NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Start frontend
npm run dev
```

Frontend available at: http://localhost:3000

### 3. Usage

1. Open http://localhost:3000
2. Select mode: **Fatigue Detection** or **Smoking Detection**
3. Click **Start Detection** (webcam) or upload image(s)
4. Watch real-time predictions, fatigue score, and alerts

---

## 🧠 Model Information

### Fatigue Detection Model

| Property | Value |
|----------|-------|
| Architecture | Custom CNN (5 conv blocks + dense) |
| Input size | 64 × 64 × 3 (RGB) |
| Output | Sigmoid → Drowsy probability |
| Training data | MRL Eye Dataset + NTHU-DDD |
| Training samples | ~84,898 images |
| Accuracy | **91.5%** |
| AUC-ROC | **1.00** |
| Optimizer | Adam (lr=0.001) |
| Loss | Binary Cross-Entropy |

**Key preprocessing insight:** The model was trained on close-up eye images. The preprocessor extracts the **eye strip (25–62% of face height)** using Haar cascade detection before inference. Sending a full frame causes incorrect predictions on dark-skinned faces due to dark background pixels.

### Smoking Detection Model

| Property | Value |
|----------|-------|
| Architecture | Custom CNN (similar to fatigue) |
| Input size | 64 × 64 × 3 (RGB) |
| Training data | Roboflow Smoking + Cigarette Reality |
| Training samples | ~1,566+ images |
| Accuracy | **79.9%** |
| AUC-ROC | **0.98** |
| Recall | 59.3% (limited by occlusion in real images) |

---

## 📡 API Reference

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Service info + model status |
| `GET` | `/health` | Health check |
| `POST` | `/predict/fatigue` | Fatigue detection (multipart file upload) |
| `POST` | `/predict/smoking` | Smoking detection (multipart file upload) |
| `POST` | `/predict` | Full predict with base64 + session support |
| `GET` | `/session/{id}/summary` | Session metrics + alert history |
| `GET` | `/session/{id}/analytics` | Chart-ready data for dashboard |
| `DELETE` | `/session/{id}` | End session, return final summary |
| `GET` | `/logs/download` | Download detections CSV |

### POST /predict/fatigue

**Request:** `multipart/form-data` with `file` field (JPEG/PNG)

**Response:**
```json
{
  "detected": true,
  "confidence": 0.8821,
  "label": "DROWSY",
  "fatigue_score": 0,
  "state": "SAFE",
  "alert_active": false,
  "alert_type": null,
  "micro_fatigue_count": 1,
  "lighting_condition": "Normal",
  "enhancement_active": false,
  "snapshot_captured": false,
  "snapshot_timestamp": null
}
```

> **Note:** `fatigue_score` and `state` are computed by the frontend `FatigueScoringEngine` using temporal context. The backend returns raw detection only.

---

## 🔔 Alert System

### Levels

| Level | Score Range | Sound | Voice (EN) | Voice (HI) | Cooldown |
|-------|-------------|-------|------------|------------|----------|
| SAFE | 0–34 | — | — | — | — |
| WARNING | 35–71 | `warning.wav` (loud beep) | "Do not fall asleep" | "Neend mat lo" | 12s |
| CRITICAL | 72–100 | `critical.wav` (siren × 3) | "Do not sleep while driving" | "Mat soye" | 8s |
| ESCALATION | Auto | `escalation.wav` (loudest) | "Park the vehicle aside" | "Park karein abhi" | 8s |

### Escalation Logic

```
WARNING #1 → beep + English voice + Hindi voice
WARNING #2 → beep + bilingual voice (consecutive count = 2)
WARNING #3 → beep + bilingual voice (consecutive count = 3)
WARNING #4 → beep (count = 4)
WARNING #5 → 🚨 AUTO-ESCALATION → loudest alarm + "Park the vehicle" bilingual
```

Counter resets **immediately** when person is detected as AWAKE (not just when score drops below threshold).

### Scorer Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Window size | 40 frames | Temporal context |
| Smoothing factor | 0.25 | Gentle rise (prevents spike on 1-2 drowsy frames) |
| Decay multiplier | 0.75 | Fast drop when awake |
| Min drowsy frames | 4 | Must be drowsy 4 consecutive frames before any alert |
| Warning threshold | 72 | Harder to reach = fewer false alarms |

---

## ☁️ Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions.

**Quick summary:**
- **Backend** → Deploy on **Railway** or **Render** (needs persistent runtime for TensorFlow)
- **Frontend** → Deploy on **Vercel** (Next.js native)
- **NOT** serverless for backend — TF models need a persistent process

---

## 📄 Research Paper

**Title:** Driver Monitoring System using Dual Deep Learning Models for Fatigue and Smoking Detection

**Authors:** Ananya, Yashashwai Chaudhary, Chaithrika Yadav, Kanishk Narang, Aryan Singh

**Supervisor:** Ms. Surabhi Purwar

**Institution:** IILM University, Greater Noida

**Key Results:**
- Fatigue model: 91.5% accuracy, AUC = 1.00
- Smoking model: 90.9% accuracy, AUC = 0.98
- Real-time: ~15 FPS, <70ms API latency
- 12 integrated behavioral analysis features

---

## 📜 License

Academic project — IILM University, Greater Noida. All rights reserved.