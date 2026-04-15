import tensorflow as tf
import numpy as np
from pathlib import Path
from sklearn.metrics import confusion_matrix, classification_report

# Load saved model
MODEL_PATH = Path("models/eye_state_model.keras")
if not MODEL_PATH.exists():
    MODEL_PATH = Path("eye_state_model.keras")

model = tf.keras.models.load_model(str(MODEL_PATH))

# Load test dataset
IMG_SIZE = (64, 64)
BATCH_SIZE = 32

DATASET_DIR = Path("mrl_eye_split") / "test"
if not DATASET_DIR.exists():
    raise FileNotFoundError(
        f"Dataset not found: {DATASET_DIR}. Expected class folders under this path."
    )

test_ds = tf.keras.preprocessing.image_dataset_from_directory(
    str(DATASET_DIR),
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary"
)
class_names = list(test_ds.class_names)

# Normalize
normalization_layer = tf.keras.layers.Rescaling(1./255)
test_ds = test_ds.map(lambda x, y: (normalization_layer(x), y))

# Collect predictions
y_true = []
y_pred = []

for images, labels in test_ds:
    predictions = model.predict(images)
    predictions = (predictions > 0.5).astype(int).flatten()

    y_true.extend(labels.numpy())
    y_pred.extend(predictions)

# Confusion Matrix
cm = confusion_matrix(y_true, y_pred)
print("Confusion Matrix:")
print(cm)

print("\nClassification Report:")
print(classification_report(y_true, y_pred, target_names=class_names))
