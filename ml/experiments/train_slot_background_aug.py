#!/usr/bin/env python3
"""Background-invariant slot classifier: white-bg FPI cutouts on synthetic beds/floors.

Why this exists: the shipped flat-lay slot head scores 0.964 on Fashion Product
but only 0.534 on Fashionpedia street crops. Real users shoot garments on
patterned bedsheets, so the model must see texture behind the garment during
training, not just white studio backgrounds.

Trains two heads with identical data/epochs for an honest A/B:
  baseline  = white-background FPI crops (current recipe)
  augmented = same crops composited onto procedural bed/floor/sofa backgrounds

Run on Colab (T4). Never train on the laptop.
"""
from __future__ import annotations

import json
import math
import os
import random
import subprocess
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small

ROOT = Path(os.environ.get("STYLEME_ROOT", "/content/StyleMe"))
DATA = Path(os.environ.get("FPI_DIR", "/content/fashion-product"))
ART = ROOT / "artifacts"
ART.mkdir(parents=True, exist_ok=True)
SIZE = 224
MAX_PER_CLASS = 800
EPOCHS = 8
SEED = 0
LABELS = ["top", "bottom", "dress", "outerwear", "shoes", "accessory"]
LABEL_TO_ID = {label: i for i, label in enumerate(LABELS)}
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]
NORM = transforms.Normalize(MEAN, STD)


def run(cmd: list[str]) -> None:
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def ensure_data() -> None:
    if (DATA / "styles.csv").exists():
        return
    DATA.mkdir(parents=True, exist_ok=True)
    run(
        [
            "kaggle",
            "datasets",
            "download",
            "-d",
            "paramaggarwal/fashion-product-images-small",
            "-p",
            str(DATA),
            "--unzip",
        ]
    )


def slot_of(row) -> str | None:
    sub = str(row.get("subCategory", ""))
    at = str(row.get("articleType", ""))
    master = str(row.get("masterCategory", ""))
    if master == "Footwear":
        return "shoes"
    if master == "Accessories":
        return "accessory"
    if at in ("Dresses", "Sarees"):
        return "dress"
    if at in ("Jackets", "Rain Jacket"):
        return "outerwear"
    if sub == "Topwear":
        return "top"
    if sub == "Bottomwear":
        return "bottom"
    return None


# --- synthetic surfaces ------------------------------------------------------

SURFACE_COLORS = [
    (238, 232, 222),
    (220, 214, 204),
    (205, 198, 188),
    (180, 172, 160),
    (142, 150, 160),
    (120, 130, 145),
    (90, 100, 115),
    (210, 190, 200),
    (190, 205, 190),
    (225, 205, 180),
    (170, 120, 90),
    (120, 85, 65),
]


def _surface(kind: int, rng: np.random.Generator) -> Image.Image:
    w = h = 512
    base = Image.new("RGB", (w, h), tuple(int(c) for c in rng.choice(SURFACE_COLORS)))
    d = ImageDraw.Draw(base)
    if kind == 0:  # broad stripes
        angle = int(rng.integers(0, 180))
        for i in range(-h, w + h, int(rng.integers(28, 90))):
            color = tuple(int(c) for c in rng.integers(30, 230, size=3))
            d.line([(i, 0), (i + h * math.cos(math.radians(angle)), h * math.sin(math.radians(angle)))], fill=color, width=int(rng.integers(6, 28)))
    elif kind == 1:  # checks / gingham
        step = int(rng.integers(24, 80))
        c1 = tuple(int(c) for c in rng.integers(40, 220, size=3))
        c2 = tuple(int(c) for c in rng.integers(40, 220, size=3))
        for x in range(0, w, step):
            d.rectangle([x, 0, x + step // 2, h], fill=c1)
        for y in range(0, h, step):
            d.rectangle([0, y, w, y + step // 2], fill=c2)
    elif kind == 2:  # floral-ish blobs
        for _ in range(int(rng.integers(20, 70))):
            x, y = int(rng.integers(0, w)), int(rng.integers(0, h))
            r = int(rng.integers(8, 55))
            color = tuple(int(c) for c in rng.integers(30, 240, size=3))
            d.ellipse([x - r, y - r, x + r, y + r], fill=color)
    elif kind == 3:  # floor planks
        plank = int(rng.integers(40, 100))
        for y in range(0, h, plank):
            color = tuple(int(c) for c in rng.integers(90, 190, size=3))
            d.rectangle([0, y, w, y + plank], fill=color)
            d.line([(0, y), (w, y)], fill=(60, 40, 30), width=3)
    else:  # soft fabric noise / gradient
        arr = rng.normal(0, 22, size=(h, w, 1)).repeat(3, axis=2)
        arr += np.linspace(0, 50, w)[None, :, None]
        base = Image.fromarray(np.clip(np.asarray(base) + arr, 0, 255).astype(np.uint8))

    if rng.random() < 0.7:
        base = base.filter(ImageFilter.GaussianBlur(float(rng.uniform(0, 1.5))))
    return base


def white_alpha(im: Image.Image) -> tuple[Image.Image, np.ndarray]:
    """Soft alpha for product-on-white images (white pixels become transparent)."""
    arr = np.asarray(im.convert("RGB"), dtype=np.float32)
    # Distance from white: dark/colored pixels are foreground. Soft ramp near white.
    dist = 255.0 - arr.min(axis=2)
    alpha = np.clip((dist - 8.0) / 22.0, 0.0, 1.0)
    rgba = np.dstack([arr, alpha * 255.0]).astype(np.uint8)
    ys, xs = np.where(alpha > 0.15)
    if len(xs) < 16:
        return im.convert("RGBA"), np.ones((im.height, im.width), dtype=np.float32)
    crop = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    return Image.fromarray(rgba).crop(crop), alpha[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def composite(im: Image.Image, rng: np.random.Generator | None = None) -> Image.Image:
    rng = rng or np.random.default_rng()
    garment, _ = white_alpha(im)
    bg = _surface(int(rng.integers(0, 5)), rng).resize((SIZE, SIZE))
    side = int(SIZE * float(rng.uniform(0.48, 0.92)))
    ratio = garment.width / max(1, garment.height)
    if ratio >= 1:
        gw, gh = side, max(16, int(side / ratio))
    else:
        gw, gh = max(16, int(side * ratio)), side
    garment = garment.resize((gw, gh), Image.LANCZOS)
    if rng.random() < 0.8:
        garment = garment.rotate(float(rng.uniform(-18, 18)), expand=True, resample=Image.BICUBIC)
    x = int(rng.integers(-gw // 8, max(1, SIZE - gw * 7 // 8)))
    y = int(rng.integers(-gh // 8, max(1, SIZE - gh * 7 // 8)))
    bg.paste(garment, (x, y), garment)
    bg = ImageEnhance.Brightness(bg).enhance(float(rng.uniform(0.72, 1.18)))
    bg = ImageEnhance.Contrast(bg).enhance(float(rng.uniform(0.78, 1.2)))
    if rng.random() < 0.35:
        bg = bg.filter(ImageFilter.GaussianBlur(float(rng.uniform(0.3, 1.2))))
    return bg


class ProductDataset(Dataset):
    def __init__(self, rows: list[tuple[str, str]], train: bool, augmented: bool, deterministic: bool = False):
        self.rows = rows
        self.train = train
        self.augmented = augmented
        self.deterministic = deterministic

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, idx: int):
        path, label = self.rows[idx]
        im = ImageOps.exif_transpose(Image.open(path).convert("RGB"))
        if self.augmented:
            rng = np.random.default_rng(SEED * 100000 + idx) if self.deterministic else np.random.default_rng()
            im = composite(im, rng)
        else:
            if self.train:
                im = transforms.RandomResizedCrop(SIZE, scale=(0.75, 1.0))(im)
                im = transforms.RandomHorizontalFlip()(im)
                im = transforms.ColorJitter(0.15, 0.15, 0.15)(im)
            else:
                im = transforms.Resize((SIZE, SIZE))(im)
        tensor = NORM(transforms.ToTensor()(im))
        return tensor, LABEL_TO_ID[label]


def load_rows() -> list[tuple[str, str]]:
    ensure_data()
    styles = pd.read_csv(DATA / "styles.csv", on_bad_lines="skip")
    styles = styles.dropna(subset=["id"])
    styles["slot"] = styles.apply(slot_of, axis=1)
    styles = styles.dropna(subset=["slot"])
    styles["path"] = styles["id"].astype(str).apply(lambda i: DATA / "images" / f"{i}.jpg")
    styles = styles[styles["path"].apply(lambda p: p.exists())]
    parts = []
    for label, g in styles.groupby("slot"):
        parts.append(g.sample(min(len(g), MAX_PER_CLASS), random_state=SEED))
    sample = pd.concat(parts).reset_index(drop=True)
    rows = [(str(p), str(l)) for p, l in zip(sample["path"], sample["slot"])]
    print("classes:", sample["slot"].value_counts().to_dict(), "n:", len(rows), flush=True)
    return rows


def make_model() -> nn.Module:
    model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(LABELS))
    return model


def evaluate(model: nn.Module, loader: DataLoader, device: str) -> tuple[float, np.ndarray, np.ndarray]:
    model.eval()
    ys, preds = [], []
    with torch.no_grad():
        for x, y in loader:
            out = model(x.to(device)).argmax(1).cpu().numpy()
            ys.extend(y.numpy().tolist())
            preds.extend(out.tolist())
    return accuracy_score(ys, preds), np.asarray(ys), np.asarray(preds)


def train_one(name: str, rows: list[tuple[str, str]], device: str, augmented: bool) -> tuple[nn.Module, dict]:
    tr, va = train_test_split(rows, test_size=0.18, random_state=SEED, stratify=[r[1] for r in rows])
    train_loader = DataLoader(ProductDataset(tr, True, augmented), batch_size=64, shuffle=True, num_workers=2, pin_memory=True)
    white_loader = DataLoader(ProductDataset(va, False, False), batch_size=64, shuffle=False, num_workers=2, pin_memory=True)
    aug_loader = DataLoader(ProductDataset(va, False, True, deterministic=True), batch_size=64, shuffle=False, num_workers=2, pin_memory=True)

    model = make_model().to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=EPOCHS)
    loss_fn = nn.CrossEntropyLoss()
    for epoch in range(EPOCHS):
        model.train()
        total = correct = 0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            opt.zero_grad()
            out = model(x)
            loss = loss_fn(out, y)
            loss.backward()
            opt.step()
            total += y.numel()
            correct += (out.argmax(1) == y).sum().item()
        sched.step()
        print(f"{name} epoch {epoch + 1}: train acc {correct / max(1, total):.3f}", flush=True)

    white_acc, ys, preds = evaluate(model, white_loader, device)
    aug_acc, _, _ = evaluate(model, aug_loader, device)
    print(f"{name} white acc {white_acc:.3f} | augmented acc {aug_acc:.3f}", flush=True)
    print(confusion_matrix(ys, preds), flush=True)
    return model, {"white_acc": float(white_acc), "aug_acc": float(aug_acc), "n_val": int(len(va))}


def main() -> None:
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    random.seed(SEED)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("device:", device, flush=True)
    rows = load_rows()

    baseline, base_metrics = train_one("baseline", rows, device, augmented=False)
    augmented, aug_metrics = train_one("augmented", rows, device, augmented=True)

    for name, model, metrics in (("slot_product_baseline", baseline, base_metrics), ("slot_background_aug", augmented, aug_metrics)):
        model.cpu().eval()
        dummy = torch.randn(1, 3, SIZE, SIZE)
        onnx_path = ART / f"{name}.onnx"
        torch.onnx.export(
            model,
            dummy,
            onnx_path,
            opset_version=17,
            input_names=["pixels"],
            output_names=["logits"],
            dynamo=False,
        )
        meta = {
            "labels": LABELS,
            "white_acc": round(metrics["white_acc"], 3),
            "aug_acc": round(metrics["aug_acc"], 3),
            "n_val": metrics["n_val"],
            "input": [1, 3, SIZE, SIZE],
            "normalize": {"mean": MEAN, "std": STD},
            "seed": SEED,
            "source": "fashion-product-images-small + procedural beds/floors",
        }
        (ART / f"{name}.json").write_text(json.dumps(meta, indent=1))
        print("wrote", onnx_path, onnx_path.stat().st_size, flush=True)
        print("metrics", name, meta, flush=True)


if __name__ == "__main__":
    main()
