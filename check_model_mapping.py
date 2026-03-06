import tensorflow as tf

# Load model
model = tf.keras.models.load_model("models/eye_state_model.keras")

print("Model loaded successfully.")

# Load dataset just to inspect class order
ds = tf.keras.utils.image_dataset_from_directory(
    "mrl_eye_split/train",
    image_size=(64, 64),
    batch_size=32,
    label_mode="binary"
)

print("Class names:", ds.class_names)