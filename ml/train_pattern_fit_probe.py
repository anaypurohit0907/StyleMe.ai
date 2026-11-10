#!/usr/bin/env python3
"""
Train pattern + fit linear probes on Fashionpedia train2020.

Run on a Colab T4 (12GB RAM). Downloads the official attributes JSON + train
images from the Kaggle mirror, embeds bbox crops with MobileCLIP-S1 ONNX, fits
logistic heads, and writes probes_pattern_fit.json.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import ijson
import numpy as np
import onnxruntime as ort
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

ROOT = Path(os.environ.get("STYLEME_ROOT", "/content/StyleMe"))
WORK = Path("/content/fp")
VISION = Path("/content/vision")
OUT = ROOT / "artifacts" / "probes_pattern_fit.json"
OUT.parent.mkdir(parents=True, exist_ok=True)

PATTERN_MAP = {
    "plain (pattern)": "solid",
    "check": "check",
    "floral": "floral",
    "stripe": "striped",
    "dot": "other",
    "printed": "graphic",
}
FIT_MAP = {
    "tight (fit)": "slim",
    "regular (fit)": "regular",
    "loose (fit)": "relaxed",
    "oversized": "oversized",
}
MAX_PER_CLASS = 500
SIZE = 256
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def run(cmd: list[str]) -> None:
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def ensure_data() -> tuple[Path, Path]:
    ann = next(WORK.glob("**/instances_attributes_train2020.json"), None) if WORK.exists() else None
    img_dir = next(WORK.glob("**/train2020/train"), None) if WORK.exists() else None
    if ann and img_dir:
        return ann, img_dir

    WORK.mkdir(parents=True, exist_ok=True)
    run(["kaggle", "datasets", "download", "-d", "deepakdhull/fashionpedia", "-p", str(WORK), "--unzip"])
    ann = next(WORK.glob("**/instances_attributes_train2020.json"), None)
    img_dir = next(WORK.glob("**/train2020/train"), None)
    if not ann or not img_dir:
        print("files under", WORK, ":", [str(p) for p in WORK.rglob("*")][:20])
        raise SystemExit("could not find annotations/images")
    return ann, img_dir


def ensure_vision() -> Path:
    model = VISION / "mobileclip_s1_image.onnx"
    if model.exists():
        return model
    VISION.mkdir(parents=True, exist_ok=True)
    run([
        "curl", "-fL", "--retry", "3",
        "https://github.com/anaypurohit0907/StyleMe.ai/releases/download/vision-v1/styleme_vision_v1.zip",
        "-o", "/content/vision.zip",
    ])
    run(["unzip", "-o", "/content/vision.zip", "-d", str(VISION)])
    return model


def group_label(attr_ids: list[int], names: dict[int, str], mapping: dict[str, str]) -> str | None:
    hits = {mapping[names[i]] for i in attr_ids if names.get(i) in mapping}
    return next(iter(hits)) if len(hits) == 1 else None


def load_samples(ann: Path, img_dir: Path) -> list[dict]:
    print("reading attributes ...", flush=True)
    with ann.open("rb") as f:
        names = {a["id"]: a["name"].lower().strip() for a in ijson.items(f, "attributes.item")}
    print("reading image index ...", flush=True)
    with ann.open("rb") as f:
        id2file = {im["id"]: im["file_name"] for im in ijson.items(f, "images.item")}

    print("reading annotations ...", flush=True)
    samples = []
    with ann.open("rb") as f:
        for a in ijson.items(f, "annotations.item"):
            ids = a.get("attribute_ids") or []
            pat = group_label(ids, names, PATTERN_MAP)
            fit = group_label(ids, names, FIT_MAP)
            if not pat and not fit:
                continue
            fn = id2file.get(a["image_id"])
            if not fn:
                continue
            p = img_dir / fn
            if not p.exists():
                continue
            samples.append({
                "path": str(p),
                "bbox": a["bbox"],
                "pattern": pat,
                "fit": fit,
            })
            if len(samples) % 20000 == 0:
                print("  annotations", len(samples), flush=True)
    print("labeled samples:", len(samples), flush=True)
    return samples


def balanced(samples: list[dict], key: str, limit: int) -> list[dict]:
    buckets: dict[str, list[dict]] = {}
    for s in samples:
        if s[key]:
            buckets.setdefault(s[key], []).append(s)
    out = []
    rng = np.random.default_rng(0)
    for label, rows in sorted(buckets.items()):
        if len(rows) > limit:
            idx = rng.choice(len(rows), limit, replace=False)
            rows = [rows[i] for i in idx]
        print(f"  {key}={label}: {len(rows)}", flush=True)
        out.extend(rows)
    return out


def crop(s: dict) -> Image.Image | None:
    try:
        im = Image.open(s["path"]).convert("RGB")
    except Exception:
        return None
    x, y, w, h = [float(v) for v in s["bbox"]]
    W, H = im.size
    x1, y1 = max(0, int(x)), max(0, int(y))
    x2, y2 = min(W, int(x + w)), min(H, int(y + h))
    if x2 - x1 < 8 or y2 - y1 < 8:
        return None
    return im.crop((x1, y1, x2, y2)).resize((SIZE, SIZE), Image.BICUBIC)


def embed(samples: list[dict], model: Path) -> tuple[np.ndarray, list[dict]]:
    session = ort.InferenceSession(str(model), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    embs = []
    kept = []
    for i, s in enumerate(samples):
        im = crop(s)
        if im is None:
            continue
        arr = np.asarray(im, dtype=np.float32) / 255.0
        arr = np.transpose((arr - MEAN) / STD, (2, 0, 1))[None].astype(np.float32)
        out = np.asarray(session.run(None, {input_name: arr})[0], dtype=np.float32).ravel()
        out /= np.linalg.norm(out) + 1e-9
        embs.append(out)
        kept.append(s)
        if (i + 1) % 320 == 0:
            print(f"  embedded {i + 1}/{len(samples)}", flush=True)
    return np.vstack(embs), kept


def fit_probe(X: np.ndarray, y: np.ndarray, name: str) -> dict:
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=0, stratify=y)
    clf = LogisticRegression(max_iter=3000, C=0.5, class_weight="balanced").fit(Xtr, ytr)
    acc = float(clf.score(Xte, yte))
    print(f"{name}: test acc {acc:.3f}  n={len(y)}  classes={sorted(set(y))}", flush=True)
    return {
        "labels": [str(c) for c in clf.classes_],
        "W": np.round(np.asarray(clf.coef_, dtype=np.float32), 5).tolist(),
        "b": np.round(np.asarray(clf.intercept_, dtype=np.float32), 5).tolist(),
        "acc": round(acc, 3),
        "n": int(len(y)),
    }


def main() -> None:
    ann, img_dir = ensure_data()
    model = ensure_vision()
    samples = load_samples(ann, img_dir)
    pat = balanced(samples, "pattern", MAX_PER_CLASS)
    fit = balanced(samples, "fit", MAX_PER_CLASS)

    # Encode each unique (path,bbox) once.
    unique = {(s["path"], tuple(s["bbox"])): s for s in pat + fit}
    rows = list(unique.values())
    print("unique crops to embed:", len(rows), flush=True)
    X, kept = embed(rows, model)
    np.savez_compressed(
        ROOT / "artifacts" / "pattern_fit_embeddings.npz",
        X=X,
        pattern=np.array([s["pattern"] or "" for s in kept]),
        fit=np.array([s["fit"] or "" for s in kept]),
    )
    print("saved embeddings", X.shape, flush=True)

    def subset(key: str) -> tuple[np.ndarray, np.ndarray]:
        idx = [i for i, s in enumerate(kept) if s[key]]
        return X[idx], np.array([kept[i][key] for i in idx])

    out = {}
    Xp, yp = subset("pattern")
    if len(yp) >= 50:
        out["pattern"] = fit_probe(Xp, yp, "pattern")
    Xf, yf = subset("fit")
    if len(yf) >= 50:
        out["fit"] = fit_probe(Xf, yf, "fit")

    OUT.write_text(json.dumps(out, indent=1))
    print("wrote", OUT, flush=True)
    print(json.dumps({k: v["acc"] for k, v in out.items()}, indent=1), flush=True)


if __name__ == "__main__":
    main()
