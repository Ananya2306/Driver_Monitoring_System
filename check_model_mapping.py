import tensorflow as tf
from pathlib import Path

# Load model
MODEL_PATH = Path("models/eye_state_model.keras")
if not MODEL_PATH.exists():
    MODEL_PATH = Path("eye_state_model.keras")

model = tf.keras.models.load_model(str(MODEL_PATH))

print("Model loaded successfully.")

# Load dataset just to inspect class order
DATASET_DIR = Path("mrl_eye_split") / "train"
if not DATASET_DIR.exists():
    raise FileNotFoundError(
        f"Dataset not found: {DATASET_DIR}. Expected class folders under this path."
    )

ds = tf.keras.utils.image_dataset_from_directory(
    str(DATASET_DIR),
    image_size=(64, 64),
    batch_size=32,
    label_mode="binary"
)

print("Class names:", ds.class_names)
