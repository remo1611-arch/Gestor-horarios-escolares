#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

LINE_RE = re.compile(r"^([0-9a-f]{64})  (.+)$")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Verifica integridad y cobertura de MANIFEST_SHA256.txt.")
    parser.add_argument("root", nargs="?", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    manifest = root / "MANIFEST_SHA256.txt"
    issues: list[str] = []
    entries: dict[str, str] = {}

    if not manifest.is_file():
        issues.append("MANIFEST_SHA256.txt no existe")
    else:
        for number, line in enumerate(manifest.read_text(encoding="utf-8").splitlines(), start=1):
            match = LINE_RE.fullmatch(line)
            if not match:
                issues.append(f"línea {number}: formato inválido")
                continue
            expected, rel = match.groups()
            pure = Path(rel)
            if pure.is_absolute() or ".." in pure.parts or rel == "MANIFEST_SHA256.txt":
                issues.append(f"línea {number}: ruta no permitida {rel!r}")
                continue
            if rel in entries:
                issues.append(f"línea {number}: ruta duplicada {rel}")
                continue
            entries[rel] = expected

    actual_files = {
        path.relative_to(root).as_posix(): path
        for path in root.rglob("*")
        if path.is_file() and ".git" not in path.parts and path != manifest
    }

    for rel, expected in sorted(entries.items()):
        path = actual_files.get(rel)
        if path is None:
            issues.append(f"falta archivo inventariado: {rel}")
            continue
        current = sha256(path)
        if current != expected:
            issues.append(f"hash incorrecto: {rel}")

    for rel in sorted(set(actual_files) - set(entries)):
        issues.append(f"archivo no inventariado: {rel}")

    result = {
        "ok": not issues,
        "listed": len(entries),
        "actual": len(actual_files),
        "issues": issues,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not issues else 1


if __name__ == "__main__":
    raise SystemExit(main())
