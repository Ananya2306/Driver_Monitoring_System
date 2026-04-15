import tensorflow as tf
import numpy as np
import cv2
from pathlib import Path

# Load trained model
MODEL_PATH = Path("models/eye_state_model.keras")
if not MODEL_PATH.exists():
    MODEL_PATH = Path("eye_state_model.keras")

model = tf.keras.models.load_model(str(MODEL_PATH))

IMG_SIZE = (64, 64)

# Load images
open_folder = Path("mrl_eye_split/test/Open-Eyes")
closed_folder = Path("mrl_eye_split/test/Close-Eyes")

if not open_folder.exists() or not closed_folder.exists():
    raise FileNotFoundError(
        f"Dataset not found. Expected folders: {open_folder} and {closed_folder}."
    )

# Take 20 open images + 30 closed images
open_images = list(open_folder.glob("*"))[:20]
closed_images = list(closed_folder.glob("*"))[:30]

if not open_images or not closed_images:
    raise FileNotFoundError(
        "No images found in test folders. Ensure Open-Eyes and Close-Eyes contain images."
    )

sequence = open_images + closed_images

consecutive_closed = 0

for idx, img_path in enumerate(sequence):
    img = cv2.imread(str(img_path))
    if img is None:
        print(f"Skipping unreadable image: {img_path}")
        continue

    input_img = cv2.resize(img, IMG_SIZE)
    input_img = input_img.astype("float32") / 255.0
    input_img = np.expand_dims(input_img, axis=0)

    prob_open = float(model.predict(input_img, verbose=0)[0][0])

    is_closed = prob_open <= 0.5

    if is_closed:
        consecutive_closed += 1
    else:
        consecutive_closed = 0

    fatigue = consecutive_closed >= 15

    print(f"Frame {idx+1} | Open Prob: {prob_open:.2f} | Consecutive Closed: {consecutive_closed} | Fatigue: {fatigue}")
