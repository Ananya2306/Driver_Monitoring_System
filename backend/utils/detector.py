"""
utils/detector.py
Loads the two .h5 CNN models and exposes a predict() interface.

Handles:
  - Simple CNN models (64x64 input)
  - MobileNetV2-based models (224x224 input)
  - TensorFlow version conflicts (DepthwiseConv2D 'groups' param)
"""

import os
import numpy as np


def _load_model(path: str):
    """
    Load a Keras .h5 model with 3 fallback strategies.
    Returns (model | None, loaded: bool).
    """
    if not os.path.exists(path):
        print(f"[WARNING] Model not found: {path}")
        return None, False

    # Strategy 1: normal load
    try:
        from tensorflow.keras.models import load_model
        model = load_model(path)
        print(f"[INFO] Loaded (normal): {path} | input: {model.input_shape}")
        return model, True
    except Exception as e1:
        print(f"[INFO] Normal load failed: {e1.__class__.__name__}, trying fallback...")

    # Strategy 2: custom_objects to strip unsupported 'groups' arg
    try:
        import tensorflow as tf
        from tensorflow.keras.models import load_model

        class _FixedDepthwiseConv2D(tf.keras.layers.DepthwiseConv2D):
            def __init__(self, *args, **kwargs):
                kwargs.pop('groups', None)
                super().__init__(*args, **kwargs)

        model = load_model(path, custom_objects={'DepthwiseConv2D': _FixedDepthwiseConv2D})
        print(f"[INFO] Loaded (custom_objects): {path} | input: {model.input_shape}")
        return model, True
    except Exception as e2:
        print(f"[INFO] custom_objects failed: {e2.__class__.__name__}, trying MobileNetV2 rebuild...")

    # Strategy 3: rebuild MobileNetV2 architecture + load weights
    try:
        import tensorflow as tf

        base = tf.keras.applications.MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            weights=None
        )
        model = tf.keras.Sequential([
            base,
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(1, activation='sigmoid')
        ])
        model.load_weights(path)
        # Tag so the detector knows to preprocess at 224x224
        model._input_size_override = 224
        print(f"[INFO] Loaded (MobileNetV2 rebuild): {path} | input: {model.input_shape}")
        return model, True
    except Exception as e3:
        print(f"[ERROR] All strategies failed for {path}: {e3}")
        return None, False


def _get_input_size(model) -> int:
    """Return the spatial input size the model expects."""
    override = getattr(model, '_input_size_override', None)
    if override:
        return override
    try:
        return model.input_shape[1]  # (batch, H, W, C)
    except Exception:
        return 64


def _predict(model, frame_bgr, pos_label: str, neg_label: str):
    """
    Preprocess frame_bgr for this specific model and run inference.
    Handles sigmoid (shape [1,1]) and softmax (shape [1,2]) outputs.
    """
    from utils.preprocessor import preprocess_image
    size = _get_input_size(model)
    img  = preprocess_image(frame_bgr, size)
    pred = model.predict(img, verbose=0)

    if pred.shape[-1] == 1:
        conf = float(pred[0][0])
        return (pos_label, conf) if conf >= 0.5 else (neg_label, 1.0 - conf)
    else:
        conf_pos = float(pred[0][1])
        conf_neg = float(pred[0][0])
        return (pos_label, conf_pos) if conf_pos >= 0.5 else (neg_label, conf_neg)


class FatigueDetector:
    """Drowsy / Not Drowsy"""

    def __init__(self, model_path: str):
        self.model, self.loaded = _load_model(model_path)

    def predict(self, frame_bgr):
        if not self.loaded:
            return "Model Not Loaded", 0.0
        try:
            return _predict(self.model, frame_bgr, "Drowsy", "Not Drowsy")
        except Exception as e:
            print(f"[ERROR] Fatigue prediction: {e}")
            return "Error", 0.0


class SmokingDetector:
    """Smoking / Not Smoking"""

    def __init__(self, model_path: str):
        self.model, self.loaded = _load_model(model_path)

    def predict(self, frame_bgr):
        if not self.loaded:
            return "Model Not Loaded", 0.0
        try:
            return _predict(self.model, frame_bgr, "Smoking", "Not Smoking")
        except Exception as e:
            print(f"[ERROR] Smoking prediction: {e}")
            return "Error", 0.0
