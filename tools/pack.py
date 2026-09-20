#!/usr/bin/env python3
"""Zip een gebouwde map tot een bestand dat je bij de store kunt uploaden.

    node tools/build.js && python tools/pack.py

Beide stores willen het manifest in de root van de zip, dus we zippen de
*inhoud* van dist/<doel> en niet de map zelf.
"""
import json
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
TARGETS = ("chrome", "firefox")


def pack(target):
    src = os.path.join(DIST, target)
    if not os.path.isdir(src):
        raise SystemExit(f"{target}: niet gebouwd — draai eerst node tools/build.js")

    with open(os.path.join(src, "manifest.json"), encoding="utf8") as fh:
        version = json.load(fh)["version"]

    out = os.path.join(DIST, f"{target}-{version}.zip")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder, _dirs, files in os.walk(src):
            for name in sorted(files):
                full = os.path.join(folder, name)
                zf.write(full, os.path.relpath(full, src).replace(os.sep, "/"))
    return out


def main():
    wanted = sys.argv[1:] or list(TARGETS)
    for target in wanted:
        if target not in TARGETS:
            raise SystemExit(f"onbekend doel: {target}")
        out = pack(target)
        size = os.path.getsize(out) / 1024
        print(f"{os.path.relpath(out, ROOT)} ({size:.0f} kB)")


if __name__ == "__main__":
    main()
