import tensorflow as tf
import numpy as np
import cv2
from pathlib import Path

# Load trained model
model = tf.keras.models.load_model("models/eye_state_model.keras")

IMG_SIZE = (64, 64)

# Load images
open_folder = Path("mrl_eye_split/test/Open-Eyes")
closed_folder = Path("mrl_eye_split/test/Close-Eyes")

# Take 20 open images + 30 closed images
open_images = list(open_folder.glob("*"))[:20]
closed_images = list(closed_folder.glob("*"))[:30]

sequence = open_images + closed_images

consecutive_closed = 0

for idx, img_path in enumerate(sequence):
    img = cv2.imread(str(img_path))
    #img = cv2.resize(img, IMG_SIZE)
    #img = img / 255.0
    #img = np.expand_dims(img, axis=0)

    prob = model.predict(img, verbose=0)[0][0]

    is_closed = prob > 0.5

    if is_closed:
        consecutive_closed += 1
    else:
        consecutive_closed = 0

    fatigue = consecutive_closed >= 15

    print(f"Frame {idx+1} | Closed Prob: {prob:.2f} | Consecutive: {consecutive_closed} | Fatigue: {fatigue}")