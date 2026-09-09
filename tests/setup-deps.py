#!/usr/bin/env python3
"""Install checksum-pinned test dependencies locally, never into user Emacs."""
import hashlib
import io
import json
import os
from pathlib import Path
import tarfile
import urllib.request

HERE = Path(__file__).resolve().parent
DEST = Path(os.environ.get("DENOTE_EXPLORE_TEST_DEPS", HERE / ".deps"))

for package in json.loads((HERE / "deps-lock.json").read_text()):
    target = DEST / package["name"]
    receipt = target / ".sha256"
    if receipt.exists() and receipt.read_text().strip() == package["sha256"]:
        print(f"Present: {package['name']} {package['version']}")
        continue
    data = urllib.request.urlopen(package["url"], timeout=60).read()
    if hashlib.sha256(data).hexdigest() != package["sha256"]:
        raise SystemExit(f"Checksum mismatch: {package['name']}")
    target.mkdir(parents=True, exist_ok=True)
    # Only copy regular root-level package files; never extract links or paths.
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as archive:
        for member in archive.getmembers():
            parts = Path(member.name).parts
            if member.isfile() and len(parts) == 2 and parts[1] not in (".", ".."):
                source = archive.extractfile(member)
                assert source is not None
                (target / parts[1]).write_bytes(source.read())
    receipt.write_text(package["sha256"] + "\n")
    print(f"Installed: {package['name']} {package['version']}")
