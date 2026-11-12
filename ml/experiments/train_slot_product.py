#!/usr/bin/env python3
"""MobileNetV3 slot classifier trained on Fashion Product flat-lay photos."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pandas as pd
import torch
from PIL import Image
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small

ROOT = Path(os.environ.get("STYLEME_ROOT", "/content/StyleMe"))
DATA = Path("/content/fashion-product")
ART = ROOT / "artifacts"
ART.mkdir(parents=True, exist_ok=True)
SIZE = 224
MAX_PER_CLASS = 600
LABELS = ["top", "bottom", "dress", "outerwear", "shoes", "accessory"]
LABEL_TO_ID = {label: i for i, label in enumerate(LABELS)}


def run(cmd):
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def ensure_data():
    if (DATA / "styles.csv").exists():
        return
    DATA.mkdir(parents=True, exist_ok=True)
    run(["kaggle", "datasets", "download", "-d", "paramaggarwal/fashion-product-images-small", "-p", str(DATA), "--unzip"])


def slot_of(row) -> str | None:
    sub = str(row["subCategory"])
    at = str(row["articleType"])
    master = str(row["masterCategory"])
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


class ProductDataset(Dataset):
    def __init__(self, rows, train: bool):
        self.rows = rows
        self.train = train
        self.tf = transforms.Compose([
            transforms.RandomResizedCrop(SIZE, scale=(0.75, 1.0)) if train else transforms.Resize((SIZE, SIZE)),
            transforms.RandomHorizontalFlip() if train else transforms.Lambda(lambda x: x),
            transforms.ColorJitter(0.15, 0.15, 0.15) if train else transforms.Lambda(lambda x: x),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, idx):
        path, label = self.rows[idx]
        im = Image.open(path).convert("RGB")
        return self.tf(im), LABEL_TO_ID[label]


def main():
    ensure_data()
    styles = pd.read_csv(DATA / "styles.csv", on_bad_lines="skip")
    styles = styles.dropna(subset=["id"])
    styles["slot"] = styles.apply(slot_of, axis=1)
    styles = styles.dropna(subset=["slot"])
    styles["path"] = styles["id"].astype(str).apply(lambda i: DATA / "images" / f"{i}.jpg")
    styles = styles[styles["path"].apply(lambda p: p.exists())]
    parts = []
    for label, g in styles.groupby("slot"):
        parts.append(g.sample(min(len(g), MAX_PER_CLASS), random_state=0))
    sample = pd.concat(parts).reset_index(drop=True)
    rows = [(str(p), str(l)) for p, l in zip(sample["path"], sample["slot"])]
    print("classes:", sample["slot"].value_counts().to_dict(), "n:", len(rows), flush=True)

    train_rows, val_rows = train_test_split(rows, test_size=0.2, random_state=0, stratify=[r[1] for r in rows])
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(LABELS))
    model.to(device)
    train_loader = DataLoader(ProductDataset(train_rows, True), batch_size=64, shuffle=True, num_workers=2)
    val_loader = DataLoader(ProductDataset(val_rows, False), batch_size=64, shuffle=False, num_workers=2)
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=8)
    loss_fn = nn.CrossEntropyLoss()

    for epoch in range(8):
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
        print(f"epoch {epoch+1}: train acc {correct/total:.3f}", flush=True)

    model.eval()
    ys, preds = [], []
    with torch.no_grad():
        for x, y in val_loader:
            out = model(x.to(device)).argmax(1).cpu().numpy()
            ys.extend(y.numpy().tolist())
            preds.extend(out.tolist())
    acc = accuracy_score(ys, preds)
    print(f"val acc {acc:.3f}", flush=True)
    print(confusion_matrix(ys, preds), flush=True)

    model.cpu().eval()
    torch.save(model.state_dict(), ART / "slot_product_mobilenet.pt")
    dummy = torch.randn(1, 3, SIZE, SIZE)
    onnx_path = ART / "slot_product_mobilenet.onnx"
    torch.onnx.export(model, dummy, onnx_path, opset_version=17, input_names=["pixels"], output_names=["logits"], dynamo=False)
    (ART / "slot_product_mobilenet.json").write_text(json.dumps({
        "labels": LABELS,
        "acc": round(float(acc), 3),
        "input": [1, 3, SIZE, SIZE],
        "normalize": {"mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]},
    }, indent=1))
    print("wrote", onnx_path, onnx_path.stat().st_size, flush=True)


if __name__ == "__main__":
    main()
