#!/usr/bin/env python3
"""
Local MobileCLIP tagging server for Expo Go testing.

The phone cannot run the ONNX native module in Expo Go, so it sends a resized
photo here over `adb reverse tcp:8788 tcp:8788`. The same prompt embeddings and
linear probes that ship in the app bundle are used, so tags match the real
on-device pipeline.

    python3 ml/serve_tagger.py
    adb reverse tcp:8788 tcp:8788
"""
from __future__ import annotations

import base64
import io
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import yaml
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel

ART = Path(__file__).parent / "artifacts"
SIZE = 256
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

print("loading MobileCLIP-S1 ONNX ...", flush=True)
session = ort.InferenceSession(str(ART / "mobileclip_s1_image.onnx"), providers=["CPUExecutionProvider"])
input_name = session.get_inputs()[0].name

prompt_emb = np.load(ART / "prompt_embeddings.npy").astype(np.float32)
taxonomy = json.loads((ART / "taxonomy.json").read_text())
probes = json.loads((ART / "probes.json").read_text())
subtype_session = ort.InferenceSession(str(ART / "subtype_mobilenet.onnx"), providers=["CPUExecutionProvider"])
slot_session = ort.InferenceSession(str(ART / "slot_product_mobilenet.onnx"), providers=["CPUExecutionProvider"])
slot_meta = json.loads((ART / "slot_product_mobilenet.json").read_text())
subtype_meta = json.loads((ART / "subtype_mobilenet.json").read_text())
palette = {
    name: np.array(rgb, dtype=np.float32)
    for name, rgb in yaml.safe_load((Path(__file__).parent / "taxonomy.yaml").read_text())["palette"].items()
}

groups: dict[str, dict[str, np.ndarray]] = {}
for row, key in enumerate(taxonomy["prompts"]):
    group, _, value = key.partition(":")
    groups.setdefault(group, {})[value] = prompt_emb[row]


def normalize(v: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(v))
    return v / (n if n else 1.0)


def zero_shot(embedding: np.ndarray, group: str) -> str | None:
    table = groups.get(group, {})
    if not table:
        return None
    return max(table.items(), key=lambda kv: float(np.dot(embedding, kv[1])))[0]


def classify_slot(im: Image.Image) -> str:
    small = im.resize((224, 224), Image.BICUBIC)
    arr = np.asarray(small, dtype=np.float32) / 255.0
    arr = np.transpose((arr - MEAN) / STD, (2, 0, 1))[None].astype(np.float32)
    logits = np.asarray(slot_session.run(None, {slot_session.get_inputs()[0].name: arr})[0]).ravel()
    return slot_meta["labels"][int(np.argmax(logits))]


def classify_subtype(im: Image.Image, slot: str) -> str | None:
    small = im.resize((224, 224), Image.BICUBIC)
    arr = np.asarray(small, dtype=np.float32) / 255.0
    arr = np.transpose((arr - MEAN) / STD, (2, 0, 1))[None].astype(np.float32)
    logits = np.asarray(subtype_session.run(None, {subtype_session.get_inputs()[0].name: arr})[0]).ravel()
    probs = np.exp(logits - logits.max())
    probs /= probs.sum()
    idx = int(probs.argmax())
    label = subtype_meta["labels"][idx]
    if probs[idx] < 0.6 or subtype_meta["slot_by_label"].get(label) != slot:
        return None
    return label


def apply_probe(embedding: np.ndarray, group: str) -> str | None:
    p = probes.get(group)
    if not p:
        return None
    W = np.asarray(p["W"], dtype=np.float32)
    b = np.asarray(p["b"], dtype=np.float32)
    scores = W @ embedding + b
    return str(p["labels"][int(np.argmax(scores))])


def preprocess(data_uri: str) -> tuple[np.ndarray, Image.Image]:
    if "," not in data_uri:
        raise ValueError("expected data URI")
    raw = base64.b64decode(data_uri.split(",", 1)[1])
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    small = im.resize((SIZE, SIZE), Image.BICUBIC)
    arr = np.asarray(small, dtype=np.float32) / 255.0
    arr = (arr - MEAN) / STD
    return np.transpose(arr, (2, 0, 1))[None].astype(np.float32), im


def dominant_color(im: Image.Image) -> str:
    # Center crop avoids most background; median is robust for solids.
    arr = np.asarray(im.resize((64, 64)), dtype=np.float32)
    h, w = arr.shape[:2]
    crop = arr[int(h * 0.2):int(h * 0.8), int(w * 0.2):int(w * 0.8)]
    med = np.median(crop.reshape(-1, 3), axis=0)
    return min(palette, key=lambda n: float(np.linalg.norm(med - palette[n])))


class TagRequest(BaseModel):
    image: str


app = FastAPI(title="StyleMe tagger")


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": taxonomy.get("model"), "dim": int(prompt_emb.shape[1])}


@app.post("/tag")
def tag(req: TagRequest) -> dict:
    try:
        tensor, im = preprocess(req.image)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"bad image: {e}") from e

    out = session.run(None, {input_name: tensor})[0]
    e = normalize(np.asarray(out, dtype=np.float32).ravel())

    slot = classify_slot(im)
    color = dominant_color(im)
    formality_raw = apply_probe(e, "formality") or zero_shot(e, "formality") or "3"
    try:
        formality = max(1, min(5, int(formality_raw)))
    except ValueError:
        formality = 3
    subtype = classify_subtype(im, slot)
    if subtype:
        casual = {"t-shirt", "tank top", "shorts", "joggers", "sneakers", "running shoes", "sandals"}
        formal = {"button-down shirt", "trousers", "dress shoes", "skirt", "dress"}
        if subtype in casual:
            formality = min(formality, 2)
        if subtype in formal:
            formality = max(formality, 3)

    return {
        "slot": slot,
        "colors": [color],
        "pattern": zero_shot(e, "pattern") or "solid",
        "fit": zero_shot(e, "fit") or "regular",
        "formality": formality,
        "season": zero_shot(e, "seasons") or "all",
        "material": zero_shot(e, "materials") or "medium",
        "subtype": subtype,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8788)
