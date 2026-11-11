#!/usr/bin/env python3
"""Train top/bottom subtype probes on high-res Fashionpedia train2020 crops."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import ijson
import numpy as np
import onnxruntime as ort
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split

ROOT = Path(os.environ.get("STYLEME_ROOT", "/content/StyleMe"))
WORK = Path("/content/fp")
VISION = Path("/content/vision")
ART = ROOT / "artifacts"
ART.mkdir(parents=True, exist_ok=True)
MAX_PER_CLASS = 500
SIZE = 256
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Fashionpedia category id -> (subtype, slot)
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


def run(cmd):
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def ensure():
    ann = next(WORK.glob("**/instances_attributes_train2020.json"), None) if WORK.exists() else None
    img = next(WORK.glob("**/train2020/train"), None) if WORK.exists() else None
    if not ann or not img:
        WORK.mkdir(parents=True, exist_ok=True)
        run(["kaggle", "datasets", "download", "-d", "deepakdhull/fashionpedia", "-p", str(WORK), "--unzip"])
        ann = next(WORK.glob("**/instances_attributes_train2020.json"))
        img = next(WORK.glob("**/train2020/train"))
    model = VISION / "mobileclip_s1_image.onnx"
    if not model.exists():
        VISION.mkdir(parents=True, exist_ok=True)
        run(["curl", "-fL", "--retry", "3",
             "https://github.com/anaypurohit0907/StyleMe.ai/releases/download/vision-v1/styleme_vision_v1.zip",
             "-o", "/content/vision.zip"])
        run(["unzip", "-o", "/content/vision.zip", "-d", str(VISION)])
    return ann, img, model


def load(ann: Path, img: Path):
    print("images index ...", flush=True)
    with ann.open("rb") as f:
        id2file = {im["id"]: im["file_name"] for im in ijson.items(f, "images.item")}
    print("annotations ...", flush=True)
    buckets = {}
    with ann.open("rb") as f:
        for a in ijson.items(f, "annotations.item"):
            cid = a.get("category_id")
            if cid not in CAT:
                continue
            subtype, slot = CAT[cid]
            if len(buckets.get(subtype, [])) >= MAX_PER_CLASS:
                continue
            fn = id2file.get(a["image_id"])
            if not fn:
                continue
            p = img / fn
            if not p.exists():
                continue
            buckets.setdefault(subtype, []).append({"path": str(p), "bbox": a["bbox"], "subtype": subtype, "slot": slot})
    rows = [r for v in buckets.values() for r in v]
    print({k: len(v) for k, v in buckets.items()}, flush=True)
    return rows


def crop(row):
    try:
        im = Image.open(row["path"]).convert("RGB")
    except Exception:
        return None
    x, y, w, h = [float(v) for v in row["bbox"]]
    W, H = im.size
    x1, y1 = max(0, int(x)), max(0, int(y))
    x2, y2 = min(W, int(x + w)), min(H, int(y + h))
    if x2 - x1 < 16 or y2 - y1 < 16:
        return None
    return im.crop((x1, y1, x2, y2)).resize((SIZE, SIZE), Image.BICUBIC)


def embed(rows, model):
    session = ort.InferenceSession(str(model), providers=["CPUExecutionProvider"])
    name = session.get_inputs()[0].name
    X, kept = [], []
    for i, row in enumerate(rows):
        im = crop(row)
        if im is None:
            continue
        a = np.asarray(im, dtype=np.float32) / 255.0
        a = np.transpose((a - MEAN) / STD, (2, 0, 1))[None].astype(np.float32)
        e = np.asarray(session.run(None, {name: a})[0], dtype=np.float32).ravel()
        e /= np.linalg.norm(e) + 1e-9
        X.append(e)
        kept.append(row)
        if (i + 1) % 500 == 0:
            print(f"  embedded {i+1}/{len(rows)}", flush=True)
    return np.vstack(X), kept


def main():
    ann, img, model = ensure()
    rows = load(ann, img)
    cache = ART / "fashionpedia_subtype_embeddings.npz"
    if cache.exists():
        d = np.load(cache, allow_pickle=True)
        X = d["X"]
        subtypes = np.asarray(d["subtypes"], dtype=object)
        slots = np.asarray(d["slots"], dtype=object)
        print("loaded cache", X.shape, flush=True)
    else:
        X, kept = embed(rows, model)
        subtypes = np.array([r["subtype"] for r in kept], dtype=object)
        slots = np.array([r["slot"] for r in kept], dtype=object)
        np.savez_compressed(cache, X=X, subtypes=subtypes, slots=slots)

    out = {"labels": [], "W": [], "b": [], "slot_by_label": {}, "acc": 0, "n": 0}
    for slot in ["top", "bottom"]:
        mask = slots == slot
        if mask.sum() < 100:
            continue
        Xs, ys = X[mask], subtypes[mask]
        Xtr, Xte, ytr, yte = train_test_split(Xs, ys, test_size=0.2, random_state=0, stratify=ys)
        clf = LogisticRegression(max_iter=3000, C=1.0, class_weight="balanced").fit(Xtr, ytr)
        pred = clf.predict(Xte)
        acc = accuracy_score(yte, pred)
        print(f"{slot}: acc {acc:.3f} n={len(ys)} classes={sorted(set(ys))}", flush=True)
        print(confusion_matrix(yte, pred), flush=True)
        for i, label in enumerate(clf.classes_):
            out["labels"].append(str(label))
            out["W"].append(np.round(np.asarray(clf.coef_[i], dtype=np.float32), 5).tolist())
            out["b"].append(float(np.round(clf.intercept_[i], 5)))
            out["slot_by_label"][str(label)] = slot
        out["acc"] = max(out["acc"], round(float(acc), 3))
        out["n"] += int(len(ys))

    # per-slot intercepts: sklearn multiclass has one intercept per class
    (ART / "subtype_probe_fashionpedia.json").write_text(json.dumps(out, indent=1))
    print("wrote", ART / "subtype_probe_fashionpedia.json", "acc", out["acc"], flush=True)


if __name__ == "__main__":
    main()
