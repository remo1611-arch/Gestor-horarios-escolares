#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from importar_plantilla_p6_0e import convert_xlsx_to_ghfproject, preflight_xlsx, safe_output_filename


def main() -> int:
    parser = argparse.ArgumentParser(description="Preflight e importación de la plantilla P6-0D a GHFProject 1.0.")
    parser.add_argument("input", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--preflight-only", action="store_true")
    args = parser.parse_args()

    data = args.input.read_bytes()
    if args.preflight_only:
        report = preflight_xlsx(data, args.input.name)
        package = None
    else:
        report, package = convert_xlsx_to_ghfproject(data, args.input.name)

    text = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    print(text, end="")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(text, encoding="utf-8")

    if package is not None:
        output = args.output or args.input.with_name(safe_output_filename(report))
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(package)
        print(f"GHFPROJECT={output}")

    return 0 if report["classification"] == "APTO" else 2


if __name__ == "__main__":
    raise SystemExit(main())
