import tensorflow as tf
import numpy as np
from sklearn.metrics import confusion_matrix, classification_report

# Load saved model
model = tf.keras.models.load_model("models/eye_state_model.keras")

# Load test dataset
IMG_SIZE = (64, 64)
BATCH_SIZE = 32

test_ds = tf.keras.preprocessing.image_dataset_from_directory(
    "mrl_eye_split/test",
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary"
)

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
print(classification_report(y_true, y_pred, target_names=["Open", "Closed"]))