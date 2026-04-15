import cv2
import numpy as np
import tensorflow as tf
from collections import deque
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import mediapipe as mp

# =========================
# CONFIG
# =========================
MODEL_PATH = "fatigue_model.keras"

WINDOW_SIZE = 20
EYE_FATIGUE_THRESHOLD = 0.5
YAWN_THRESHOLD = 0.6   # mouth openness threshold
ALERT_STREAK = 8

# =========================
# LOAD MODEL
# =========================
model = tf.keras.models.load_model(MODEL_PATH)
print("Model loaded successfully.")
model_input = model.input_shape
IMG_SIZE = (model_input[1], model_input[2])

def clamp(value, low, high):
    return max(low, min(value, high))

def face_bbox_from_landmarks(landmarks, w, h, pad_ratio=0.1):
    x_coords = [int(l.x * w) for l in landmarks.landmark]
    y_coords = [int(l.y * h) for l in landmarks.landmark]

    x_min, x_max = min(x_coords), max(x_coords)
    y_min, y_max = min(y_coords), max(y_coords)

    box_w = x_max - x_min
    box_h = y_max - y_min
    if box_w <= 0 or box_h <= 0:
        return None

    pad = int(max(box_w, box_h) * pad_ratio)
    x_min = clamp(x_min - pad, 0, w - 1)
    y_min = clamp(y_min - pad, 0, h - 1)
    x_max = clamp(x_max + pad, 1, w)
    y_max = clamp(y_max + pad, 1, h)

    if x_max <= x_min or y_max <= y_min:
        return None

    return x_min, y_min, x_max, y_max

# =========================
# FACE LANDMARKS (OPTIONAL)
# =========================
USE_MEDIAPIPE = hasattr(mp, "solutions")
if USE_MEDIAPIPE:
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)

    # Mouth landmarks
    UPPER_LIP = 13
    LOWER_LIP = 14
else:
    print("mediapipe solutions not available; using Haar face detector (no yawn detection).")
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    if face_cascade.empty():
        raise RuntimeError("Could not load face detector.")

# =========================
# WEBCAM
# =========================
cap = cv2.VideoCapture(0)

prob_history = deque(maxlen=WINDOW_SIZE)
fatigue_streak = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)

    status = "NO FACE"
    color = (0, 255, 255)

    bbox = None
    is_yawning = False
    mouth_open = None

    if USE_MEDIAPIPE:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)

        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0]

            h, w, _ = frame.shape

            # =========================
            # MOUTH OPENNESS (YAWN)
            # =========================
            upper = landmarks.landmark[UPPER_LIP]
            lower = landmarks.landmark[LOWER_LIP]

            upper_y = int(upper.y * h)
            lower_y = int(lower.y * h)

            mouth_open = abs(lower_y - upper_y) / h
            is_yawning = mouth_open > YAWN_THRESHOLD

            # =========================
            # FACE CROP FOR MODEL
            # =========================
            bbox = face_bbox_from_landmarks(landmarks, w, h)
    else:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(100, 100))
        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
            x1 = clamp(x, 0, frame.shape[1] - 1)
            y1 = clamp(y, 0, frame.shape[0] - 1)
            x2 = clamp(x + w, 1, frame.shape[1])
            y2 = clamp(y + h, 1, frame.shape[0])
            if x2 > x1 and y2 > y1:
                bbox = (x1, y1, x2, y2)

    if bbox:
        x_min, y_min, x_max, y_max = bbox

        face = frame[y_min:y_max, x_min:x_max]

        if face.size != 0:
            face_rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
            face_rgb = cv2.resize(face_rgb, IMG_SIZE).astype(np.float32)
            face_rgb = np.expand_dims(face_rgb, axis=0)
            face_rgb = preprocess_input(face_rgb)

            prob_notdrowsy = float(model.predict(face_rgb, verbose=0)[0][0])
            prob_history.append(prob_notdrowsy)

            smooth_prob = float(np.mean(prob_history))
            eye_fatigue = (1 - smooth_prob) > EYE_FATIGUE_THRESHOLD

            # =========================
            # FINAL DECISION (HYBRID)
            # =========================
            is_fatigued = eye_fatigue or is_yawning

            if is_fatigued:
                fatigue_streak += 1
            else:
                fatigue_streak = 0

            final_fatigue = fatigue_streak >= ALERT_STREAK

            if final_fatigue:
                status = "FATIGUED"
                color = (0, 0, 255)
            elif is_yawning:
                status = "YAWNING DETECTED"
                color = (0, 165, 255)
            elif eye_fatigue:
                status = "FATIGUE (EYES)"
                color = (0, 165, 255)
            else:
                status = "NOT FATIGUED"
                color = (0, 255, 0)

            cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), color, 2)

            if mouth_open is not None:
                cv2.putText(frame, f"Mouth: {mouth_open:.2f}", (20, 140),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200,200,200), 2)

    # =========================
    # DISPLAY
    # =========================
    cv2.rectangle(frame, (10, 10), (520, 120), (0, 0, 0), -1)

    cv2.putText(frame, f"State: {status}", (20, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

    cv2.putText(frame, f"Streak: {fatigue_streak}", (20, 90),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200,200,200), 2)

    cv2.imshow("Hybrid Fatigue Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

