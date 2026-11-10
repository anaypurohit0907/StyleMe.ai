#!/usr/bin/env python3
"""
StyleMe dataset downloader — runs inside Colab, writes to Google Drive.

Datasets:
  deepfashion2  (491k imgs, 13 classes, 801k items) — zero-shot eval ground truth
  abo           (28k outfits, 260+ item attributes, compatibility labels) — compat model
  fashionpedia  (48k imgs, 294 fine-grained attributes) — optional, phase 2

Idempotent: each dataset is marked with a <name>.done file on Drive.
Re-running skips what's already there. Kaggle mirrors are tried in order;
if none work, follow the printed manual fallback (dataset lives on Kaggle
or the official site — one copy-paste of a Drive link).

Usage (Colab):
    !python /content/drive/MyDrive/StyleMe/scripts/download_data.py
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys

DRIVE_ROOT = "/content/drive/MyDrive/StyleMe"
RAW = os.path.join(DRIVE_ROOT, "raw")

# Kaggle dataset slugs tried in order per dataset. First that downloads wins.
CANDIDATES: dict[str, list[str]] = {
    "deepfashion2": [
        "yuanfz/deepfashion2",
        "switchablenorms/deepfashion2",
        "deepfashion2/deepfashion2",
        "abhaygarg/deepfashion2",
    ],
    "abo": [
        "yuanfz/abo",
        "fashion/abo",
        "abo/abo-dataset",
    ],
    "fashionpedia": [
        "sairam795/fashionpedia",
        "fashionpedia/fashionpedia",
    ],
}

MANUAL_URLS = {
    "deepfashion2": "https://github.com/switchablenorms/deepfashion2  (official form -> Drive link)",
    "abo": "https://github.com/YufeiJi/Outfit-Completion  (paper: 'Learning to Complete Outfit with Style')",
    "fashionpedia": "https://fashionpedia.github.io/home/Fashionpedia_download.html",
}


def log(msg: str) -> None:
    print(msg, flush=True)


def have_dataset(name: str) -> bool:
    return os.path.exists(os.path.join(DRIVE_ROOT, f"{name}.done"))


def setup_kaggle_auth() -> bool:
    """kaggle.json must exist on Drive (upload once: File > Upload in Colab
    into the StyleMe folder, or paste below). Returns True if auth present."""
    dest = os.path.join(DRIVE_ROOT, "kaggle.json")
    if os.path.exists(dest):
        os.environ["KAGGLE"] = DRIVE_ROOT
        return True
    log("No kaggle.json on Drive yet.")
    log("Get a token at https://www.kaggle.com/settings (Kaggle API section),")
    log(f"then either upload it to {dest} and re-run, or paste it below to store on Drive:")
    try:
        token = input("paste kaggle.json content here (or leave empty to skip): ").strip()
    except EOFError:
        token = ""
    if token and token.startswith("{"):
        os.makedirs(DRIVE_ROOT, exist_ok=True)
        with open(dest, "w") as f:
            f.write(token)
        os.environ["KAGGLE"] = DRIVE_ROOT
        return True
    return False


def kaggle_download(slug: str, dest_dir: str) -> bool:
    os.makedirs(dest_dir, exist_ok=True)
    log(f"  trying kaggle slug: {slug}")
    r = subprocess.run(
        ["kaggle", "datasets", "download", "-d", slug, "-p", dest_dir, "--unzip"],
        capture_output=True,
        text=True,
    )
    if r.returncode == 0:
        return True
    tail = (r.stderr or r.stdout or "").strip().splitlines()[-2:]
    for line in tail:
        log(f"    | {line}")
    return False


def download(name: str) -> bool:
    if have_dataset(name):
        log(f"[{name}] already on Drive — skipping")
        return True
    dest = os.path.join(RAW, name)
    for slug in CANDIDATES[name]:
        if kaggle_download(slug, dest):
            with open(os.path.join(DRIVE_ROOT, f"{name}.done"), "w") as f:
                f.write(slug)
            log(f"[{name}] downloaded via {slug}")
            return True
    log(f"[{name}] all Kaggle mirrors failed. Manual fallback: {MANUAL_URLS[name]}")
    log(f"  download, unzip into {dest}, then run:")
    log(f"  !touch {DRIVE_ROOT}/{name}.done")
    return False


def verify() -> None:
    log("\n--- Drive state ---")
    for root, dirs, files in os.walk(DRIVE_ROOT):
        depth = root[len(DRIVE_ROOT):].count(os.sep)
        if depth > 2:
            dirs[:] = []
            continue
        for f in files[:6]:
            p = os.path.join(root, f)
            size = os.path.getsize(p)
            log(f"  {os.path.relpath(p, DRIVE_ROOT)}  ({size / 1e6:.1f} MB)" if size > 1e6 else f"  {os.path.relpath(p, DRIVE_ROOT)}")
    for name in CANDIDATES:
        marker = os.path.join(DRIVE_ROOT, f"{name}.done")
        log(f"[{name}] {'OK' if os.path.exists(marker) else 'MISSING'}")


def main() -> int:
    os.makedirs(RAW, exist_ok=True)
    log("StyleMe dataset downloader")
    log(f"Drive root: {DRIVE_ROOT}")
    if not setup_kaggle_auth():
        log("No Kaggle auth — you can still run this later; datasets skipped.")
        return 1
    results = [download(name) for name in CANDIDATES]
    verify()
    missing = [n for n, ok in zip(CANDIDATES, results) if not ok]
    if missing:
        log(f"\nDone with gaps: {missing}. Manual steps printed above.")
        return 2
    log("\nAll datasets on Drive. Next: run 01_taxonomy_and_zero_shot.ipynb")
    return 0


if __name__ == "__main__":
    sys.exit(main())
