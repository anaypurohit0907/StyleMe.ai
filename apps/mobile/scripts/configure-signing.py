#!/usr/bin/env python3
"""Patch the generated android/app/build.gradle to use the CI release keystore.

Expo prebuild regenerates android/ from app.json, so this runs after prebuild in
CI. Passwords come from env (GitHub secrets), never from the repo.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRADLE = ROOT / "android" / "app" / "build.gradle"
KEYSTORE = "styleme-release.keystore"

for key in ("STYLEME_STORE_PASSWORD", "STYLEME_KEY_ALIAS", "STYLEME_KEY_PASSWORD"):
    if not os.environ.get(key):
        sys.exit(f"missing env {key}")

src = GRADLE.read_text()

if "signingConfigs.release" not in src:
    src = src.replace(
        "    signingConfigs {\n        debug {",
        f'''    signingConfigs {{
        release {{
            storeFile file("{KEYSTORE}")
            storePassword System.getenv("STYLEME_STORE_PASSWORD")
            keyAlias System.getenv("STYLEME_KEY_ALIAS")
            keyPassword System.getenv("STYLEME_KEY_PASSWORD")
        }}
        debug {{''',
        1,
    )

# Only the release buildType switches to the release key.
src, n = re.subn(
    r"(release\s*\{[^}]*?)signingConfig signingConfigs\.debug",
    r"\1signingConfig signingConfigs.release",
    src,
    count=1,
)
if n != 1:
    sys.exit("could not patch release signingConfig")

GRADLE.write_text(src)
print("release signing configured")
