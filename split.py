import os
import random
import shutil
from pathlib import Path

SOURCE_DIR = Path("mrleyedataset")
DEST_DIR = Path("mrl_eye_split")

TRAIN_RATIO = 0.7
VAL_RATIO = 0.15
TEST_RATIO = 0.15

def split_dataset():
    if not SOURCE_DIR.exists():
        raise FileNotFoundError(
            f"Source dataset not found: {SOURCE_DIR}. Update SOURCE_DIR to your dataset path."
        )

    if not DEST_DIR.exists():
        os.makedirs(DEST_DIR)

    for cls in os.listdir(SOURCE_DIR):
        cls_path = os.path.join(SOURCE_DIR, cls)

        if not os.path.isdir(cls_path):
            continue

        images = os.listdir(cls_path)
        random.shuffle(images)

        total = len(images)
        train_count = int(total * TRAIN_RATIO)
        val_count = int(total * VAL_RATIO)

        train_imgs = images[:train_count]
        val_imgs = images[train_count:train_count + val_count]
        test_imgs = images[train_count + val_count:]

        for split_name, split_imgs in zip(
            ["train", "val", "test"],
            [train_imgs, val_imgs, test_imgs]
        ):
            split_dir = os.path.join(DEST_DIR, split_name, cls)
            os.makedirs(split_dir, exist_ok=True)

            for img in split_imgs:
                src = os.path.join(cls_path, img)
                dst = os.path.join(split_dir, img)
                shutil.copy(src, dst)

        print(f"\nClass: {cls}")
        print(f"Total: {total}")
        print(f"Train: {len(train_imgs)}")
        print(f"Val: {len(val_imgs)}")
        print(f"Test: {len(test_imgs)}")

split_dataset()
print("\nSplitting complete.")
