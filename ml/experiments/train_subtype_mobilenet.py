#!/usr/bin/env python3
"""Fine-tune MobileNetV3-Small for garment subtypes on Fashionpedia train2020."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import ijson
import numpy as np
import torch
from PIL import Image
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small

ROOT = Path(os.environ.get("STYLEME_ROOT", "/content/StyleMe"))
WORK = Path("/content/fp")
CROPS = Path("/content/crops")
ART = ROOT / "artifacts"
ART.mkdir(parents=True, exist_ok=True)
MAX_PER_CLASS = 500
SIZE = 224

CAT = {
    0: ("button-down shirt", "top"),
    1: ("t-shirt", "top"),
    2: ("sweater", "top"),
    3: ("sweater", "top"),
    5: ("tank top", "top"),
    6: ("trousers", "bottom"),
    7: ("shorts", "bottom"),
    8: ("skirt", "bottom"),
    10: ("dress", "dress"),
    11: ("dress", "dress"),
}
LABELS = ["button-down shirt", "t-shirt", "sweater", "tank top", "trousers", "shorts", "skirt", "dress"]
SLOT = {label: slot for label, slot in CAT.values()}
LABEL_TO_ID = {label: i for i, label in enumerate(LABELS)}


def run(cmd):
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def ensure_data():
    ann = next(WORK.glob("**/instances_attributes_train2020.json"), None) if WORK.exists() else None
    img = next(WORK.glob("**/train2020/train"), None) if WORK.exists() else None
    if not ann or not img:
        WORK.mkdir(parents=True, exist_ok=True)
        run(["kaggle", "datasets", "download", "-d", "deepakdhull/fashionpedia", "-p", str(WORK), "--unzip"])
        ann = next(WORK.glob("**/instances_attributes_train2020.json"))
        img = next(WORK.glob("**/train2020/train"))
    return ann, img


def prepare(ann: Path, img: Path) -> list[dict]:
    if CROPS.exists() and len(list(CROPS.glob("*.jpg"))) > 1000:
        return [json.loads(p.read_text()) for p in CROPS.glob("*.json")]

    print("image index ...", flush=True)
    with ann.open("rb") as f:
        id2file = {im["id"]: im["file_name"] for im in ijson.items(f, "images.item")}
    print("annotations ...", flush=True)
    buckets: dict[str, list[dict]] = {}
    with ann.open("rb") as f:
        for a in ijson.items(f, "annotations.item"):
            cid = a.get("category_id")
            if cid not in CAT:
                continue
            label, slot = CAT[cid]
            if len(buckets.get(label, [])) >= MAX_PER_CLASS:
                continue
            fn = id2file.get(a["image_id"])
            if not fn:
                continue
            p = img / fn
            if not p.exists():
                continue
            buckets.setdefault(label, []).append({"path": str(p), "bbox": a["bbox"], "label": label, "slot": slot})
    rows = [r for v in buckets.values() for r in v]
    print({k: len(v) for k, v in buckets.items()}, flush=True)

    CROPS.mkdir(parents=True, exist_ok=True)
    saved = []
    for row in rows:
        im = Image.open(row["path"]).convert("RGB")
        x, y, w, h = [float(v) for v in row["bbox"]]
        W, H = im.size
        x1, y1 = max(0, int(x)), max(0, int(y))
        x2, y2 = min(W, int(x + w)), min(H, int(y + h))
        if x2 - x1 < 16 or y2 - y1 < 16:
            continue
        idx = len(saved)
        row["idx"] = idx
        crop = im.crop((x1, y1, x2, y2)).resize((SIZE, SIZE), Image.BICUBIC)
        crop.save(CROPS / f"{idx}.jpg", quality=92)
        (CROPS / f"{idx}.json").write_text(json.dumps(row, default=float))
        saved.append(row)
        if len(saved) % 500 == 0:
            print("  crops", len(saved), flush=True)
    return saved


class CropDataset(Dataset):
    def __init__(self, rows, train: bool):
        self.rows = rows
        self.tf = transforms.Compose(
            [
                transforms.RandomResizedCrop(SIZE, scale=(0.7, 1.0)) if train else transforms.Resize((SIZE, SIZE)),
                transforms.RandomHorizontalFlip() if train else transforms.Lambda(lambda x: x),
                transforms.ColorJitter(0.2, 0.2, 0.2) if train else transforms.Lambda(lambda x: x),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]
        )

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, idx):
        row = self.rows[idx]
        im = Image.open(CROPS / f"{row['idx']}.jpg").convert("RGB")
        return self.tf(im), LABEL_TO_ID[row["label"]]


def main():
    ann, img = ensure_data()
    rows = prepare(ann, img)
    train_rows, val_rows = train_test_split(rows, test_size=0.2, random_state=0, stratify=[r["label"] for r in rows])
    print("train", len(train_rows), "val", len(val_rows), flush=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(LABELS))
    model.to(device)

    train_loader = DataLoader(CropDataset(train_rows, True), batch_size=64, shuffle=True, num_workers=2)
    val_loader = DataLoader(CropDataset(val_rows, False), batch_size=64, shuffle=False, num_workers=2)
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=6)
    loss_fn = nn.CrossEntropyLoss()

    for epoch in range(6):
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
    torch.save(model.state_dict(), ART / "subtype_mobilenet.pt")
    dummy = torch.randn(1, 3, SIZE, SIZE)
    onnx_path = ART / "subtype_mobilenet.onnx"
    torch.onnx.export(
        model,
        dummy,
        onnx_path,
        opset_version=17,
        input_names=["pixels"],
        output_names=["logits"],
        dynamo=False,
    )
    (ART / "subtype_mobilenet.json").write_text(
        json.dumps(
            {
                "labels": LABELS,
                "slot_by_label": SLOT,
                "acc": round(float(acc), 3),
                "input": [1, 3, SIZE, SIZE],
                "normalize": {"mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]},
            },
            indent=1,
        )
    )
    print("wrote", onnx_path, onnx_path.stat().st_size, flush=True)


if __name__ == "__main__":
    main()
