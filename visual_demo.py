import tensorflow as tf
import numpy as np
import cv2
from pathlib import Path
import os

# =====================================
# SETTINGS
# =====================================
IMG_SIZE = (64, 64)                 # Model input size
DISPLAY_SIZE = (300, 300)           # Enlarged display size
CONSECUTIVE_THRESHOLD = 15          # Trigger fatigue after 15 closed frames

# =====================================
# LOAD MODEL
# =====================================
model = tf.keras.models.load_model("models/eye_state_model.keras")

# =====================================
# LOAD SAMPLE IMAGES
# =====================================
open_folder = Path("mrl_eye_split/test/Open-Eyes")
closed_folder = Path("mrl_eye_split/test/Close-Eyes")

# Simulate 20 open frames + 30 closed frames
sequence = list(open_folder.glob("*"))[:20] + list(closed_folder.glob("*"))[:30]

# Output folder
os.makedirs("fatigue_demo_output", exist_ok=True)

consecutive_closed = 0

for idx, img_path in enumerate(sequence):

    img = cv2.imread(str(img_path))
    if img is None:
        print(f"Skipping unreadable image: {img_path}")
        continue

    # -------------------------
    # Prepare image for model
    # -------------------------
    input_img = cv2.resize(img, IMG_SIZE)
    input_img = input_img.astype("float32") / 255.0
    input_img = np.expand_dims(input_img, axis=0)

    prob = model.predict(input_img, verbose=0)[0][0]

    # IMPORTANT:
    # Class names = ['Close-Eyes', 'Open-Eyes']
    # So sigmoid output = probability of Open (class 1)
    is_closed = prob <= 0.5

    if is_closed:
        consecutive_closed += 1
    else:
        consecutive_closed = 0

    fatigue = consecutive_closed >= CONSECUTIVE_THRESHOLD

    # -------------------------
    # Prepare image for display
    # -------------------------
    annotated = cv2.resize(img, DISPLAY_SIZE)
    h, w = annotated.shape[:2]

    label = "CLOSED" if is_closed else "OPEN"
    color = (0, 0, 255) if is_closed else (0, 255, 0)

    # Display State
    cv2.putText(annotated,
                f"State: {label}",
                (10, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                color,
                2)

    # Display consecutive counter
    cv2.putText(annotated,
                f"Closed Count: {consecutive_closed}",
                (10, 80),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 255),
                2)

    # Display fatigue alert
    if fatigue:
        cv2.putText(annotated,
                    "FATIGUE DETECTED",
                    (10, 130),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 0, 255),
                    3)

    save_path = f"fatigue_demo_output/frame_{idx+1}.jpg"
    cv2.imwrite(save_path, annotated)

    print(f"Processed frame {idx+1} | Closed Count: {consecutive_closed}")

print("Demo completed. Check 'fatigue_demo_output' folder.")