#!/usr/bin/env python3
"""
Train a garment subtype probe from Fashion Product Images (articleType labels).

Output: ml/artifacts/subtype_probe.json
  labels, W, b, slot_by_label, acc, n
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import pandas as pd
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "fashion-product"
ART = ROOT / "artifacts"
MAX_PER_CLASS = 300
SIZE = 256
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# articleType -> (canonical subtype, slot)
MAP = {
    "Tshirts": ("t-shirt", "top"),
    "Shirts": ("button-down shirt", "top"),
    "Tops": ("top", "top"),
    "Sweatshirts": ("sweatshirt", "top"),
    "Sweaters": ("sweater", "top"),
    "Kurtas": ("kurta", "top"),
    "Kurtis": ("kurta", "top"),
    "Tunics": ("top", "top"),
    "Innerwear Vests": ("tank top", "top"),
    "Jeans": ("jeans", "bottom"),
    "Trousers": ("trousers", "bottom"),
    "Shorts": ("shorts", "bottom"),
    "Track Pants": ("joggers", "bottom"),
    "Skirts": ("skirt", "bottom"),
    "Dresses": ("dress", "dress"),
    "Sarees": ("saree", "dress"),
    "Jackets": ("jacket", "outerwear"),
    "Casual Shoes": ("sneakers", "shoes"),
    "Sports Shoes": ("running shoes", "shoes"),
    "Formal Shoes": ("dress shoes", "shoes"),
    "Sandals": ("sandals", "shoes"),
    "Flip Flops": ("sandals", "shoes"),
    "Heels": ("heels", "shoes"),
    "Flats": ("flats", "shoes"),
    "Handbags": ("bag", "accessory"),
    "Backpacks": ("bag", "accessory"),
    "Wallets": ("bag", "accessory"),
    "Clutches": ("bag", "accessory"),
    "Caps": ("hat", "accessory"),
    "Belts": ("belt", "accessory"),
    "Watches": ("watch", "accessory"),
    "Sunglasses": ("sunglasses", "accessory"),
    "Socks": ("socks", "accessory"),
    "Ties": ("tie", "accessory"),
}


def embed(paths: list[Path], session: ort.InferenceSession) -> np.ndarray:
    name = session.get_inputs()[0].name
    out = []
    for i, p in enumerate(paths):
        im = Image.open(p).convert("RGB").resize((SIZE, SIZE), Image.BICUBIC)
        arr = np.asarray(im, dtype=np.float32) / 255.0
        arr = np.transpose((arr - MEAN) / STD, (2, 0, 1))[None].astype(np.float32)
        e = np.asarray(session.run(None, {name: arr})[0], dtype=np.float32).ravel()
        e /= np.linalg.norm(e) + 1e-9
        out.append(e)
        if (i + 1) % 500 == 0:
            print(f"  embedded {i + 1}/{len(paths)}", flush=True)
    return np.vstack(out)


def main() -> None:
    styles = pd.read_csv(DATA / "styles.csv", on_bad_lines="skip")
    styles["subtype"] = styles["articleType"].map(lambda x: MAP.get(str(x), (None, None))[0])
    styles["slot"] = styles["articleType"].map(lambda x: MAP.get(str(x), (None, None))[1])
    styles = styles.dropna(subset=["subtype", "slot"]).copy()
    styles["path"] = styles["id"].astype(str).apply(lambda i: DATA / "images" / f"{i}.jpg")
    styles = styles[styles["path"].apply(lambda p: p.exists())]

    parts = []
    for label, g in styles.groupby("subtype"):
        parts.append(g.sample(min(len(g), MAX_PER_CLASS), random_state=0))
    sample = pd.concat(parts).reset_index(drop=True)
    print("classes:", sample["subtype"].nunique(), "images:", len(sample), flush=True)
    print(sample["subtype"].value_counts().to_string(), flush=True)

    cache = ART / "subtype_embeddings.npz"
    if cache.exists():
        data = np.load(cache, allow_pickle=True)
        X = data["X"]
        y = np.asarray(data["y"], dtype=object)
        print("loaded cached embeddings", X.shape, flush=True)
    else:
        session = ort.InferenceSession(str(ART / "mobileclip_s1_image.onnx"), providers=["CPUExecutionProvider"])
        X = embed([Path(p) for p in sample["path"]], session)
        y = sample["subtype"].to_numpy(dtype=object)
        np.savez_compressed(cache, X=X, y=y)

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=0, stratify=y)
    clf = LogisticRegression(max_iter=3000, C=1.0, class_weight="balanced").fit(Xtr, ytr)
    pred = clf.predict(Xte)
    acc = accuracy_score(yte, pred)
    print(f"subtype accuracy: {acc:.3f}  n={len(y)}", flush=True)
    print("labels:", clf.classes_.tolist(), flush=True)
    print(confusion_matrix(yte, pred), flush=True)

    slot_by_label = {subtype: slot for subtype, slot in MAP.values()}
    out = {
        "labels": [str(c) for c in clf.classes_],
        "W": np.round(np.asarray(clf.coef_, dtype=np.float32), 5).tolist(),
        "b": np.round(np.asarray(clf.intercept_, dtype=np.float32), 5).tolist(),
        "slot_by_label": {str(k): str(v) for k, v in slot_by_label.items()},
        "acc": round(float(acc), 3),
        "n": int(len(y)),
    }
    (ART / "subtype_probe.json").write_text(json.dumps(out, indent=1))
    print("wrote", ART / "subtype_probe.json", flush=True)


if __name__ == "__main__":
    main()
