"""
utils/preprocessor.py

ROOT CAUSE FIX:
The fatigue CNN (trained on MRL Eye Dataset) expects CLOSE-UP EYE IMAGES.
Sending a full face makes it predict DROWSY because:
- Dark skin / hair / background → model sees "dark image" → closed eye → DROWSY

Fix: detect face → extract EYE STRIP (top 25%-60% of face where eyes live)
     → model now sees actual eye region → correct predictions

Pipeline:
  1. Face detection (Haar cascade, 3 fallbacks)
  2. Crop eye strip from face  
  3. CLAHE enhancement
  4. Resize → model input size
  5. BGR → RGB → Gaussian blur → Normalise → Batch dim
"""

import cv2
import numpy as np

_face_cascade    = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
_profile_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_profileface.xml')
_clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))


def _enhance_low_light(bgr: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    lab = cv2.merge([_clahe.apply(l), a, b])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def _detect_face_rect(frame: np.ndarray):
    """Returns (x,y,w,h) of largest face, or None."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h, w = frame.shape[:2]

    for sf, mn in [(1.1, 4), (1.05, 3), (1.15, 3)]:
        faces = _face_cascade.detectMultiScale(
            gray, scaleFactor=sf, minNeighbors=mn,
            minSize=(max(30, w//10), max(30, h//10)))
        if len(faces):
            return sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]

    faces = _profile_cascade.detectMultiScale(gray, 1.1, 4, minSize=(40,40))
    if len(faces):
        return sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]

    return None


def _get_eye_strip(frame: np.ndarray) -> np.ndarray:
    """
    Detect face → extract eye strip (rows 25%–62% of face height).
    Falls back to centre-top crop if no face found.
    This is the correct input for the MRL-Eye-trained CNN.
    """
    rect = _detect_face_rect(frame)
    fh, fw = frame.shape[:2]

    if rect is not None:
        x, y, w, h = rect
        # Add small horizontal padding
        pad = int(w * 0.08)
        x1 = max(0, x - pad)
        x2 = min(fw, x + w + pad)
        face = frame[y:y+h, x1:x2]
        fh_face = face.shape[0]
        # Eye strip: rows 25% to 62% of face height
        y_top = int(fh_face * 0.25)
        y_bot = int(fh_face * 0.62)
        strip = face[y_top:y_bot, :]
        if strip.size > 0:
            return strip

    # Fallback: use centre-top strip of full frame
    y1 = int(fh * 0.20)
    y2 = int(fh * 0.55)
    x1 = int(fw * 0.15)
    x2 = int(fw * 0.85)
    return frame[y1:y2, x1:x2]


def preprocess_image(frame: np.ndarray, img_size: int = 64) -> np.ndarray:
    """Full pipeline: eye extraction → CLAHE → resize → normalise → batch."""
    strip = _get_eye_strip(frame)

    # CLAHE
    enhanced = _enhance_low_light(strip)

    # Resize
    img = cv2.resize(enhanced, (img_size, img_size), interpolation=cv2.INTER_AREA)

    # BGR → RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Gaussian blur
    img = cv2.GaussianBlur(img, (3, 3), 0)

    # Normalise
    img = img.astype(np.float32) / 255.0

    return np.expand_dims(img, axis=0)


def preprocess_grayscale(frame: np.ndarray, img_size: int = 64) -> np.ndarray:
    strip    = _get_eye_strip(frame)
    enhanced = _enhance_low_light(strip)
    img      = cv2.resize(enhanced, (img_size, img_size), interpolation=cv2.INTER_AREA)
    img      = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    img      = cv2.GaussianBlur(img, (3, 3), 0)
    img      = img.astype(np.float32) / 255.0
    img      = np.expand_dims(img, axis=-1)
    return np.expand_dims(img, axis=0)
