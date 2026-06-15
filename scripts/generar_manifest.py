#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Regenera MANIFEST_SHA256.txt para el repositorio público.")
    parser.add_argument("root", nargs="?", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    manifest = root / "MANIFEST_SHA256.txt"
    files = [
        path for path in root.rglob("*")
        if path.is_file() and ".git" not in path.parts and path != manifest
    ]
    lines = [f"{sha256(path)}  {path.relative_to(root).as_posix()}" for path in sorted(files)]
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"MANIFEST_SHA256.txt generado: {len(lines)} archivos")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
