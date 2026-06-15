#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Compila en memoria todos los .py sin crear __pycache__.")
    parser.add_argument("root", nargs="?", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    files = sorted(path for path in root.rglob("*.py") if ".git" not in path.parts)
    issues: list[str] = []
    for path in files:
        rel = path.relative_to(root).as_posix()
        try:
            source = path.read_text(encoding="utf-8")
            compile(source, rel, "exec")
        except Exception as exc:
            issues.append(f"{rel}: {exc}")
    result = {"ok": not issues, "pythonFiles": len(files), "issues": issues}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not issues else 1


if __name__ == "__main__":
    raise SystemExit(main())
