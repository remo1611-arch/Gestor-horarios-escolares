#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

JSON_SCRIPT_TYPES = {"application/json", "application/ld+json"}


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    html_path = root / "index.html"
    issues: list[str] = []
    checked: list[dict[str, int]] = []

    node = shutil.which("node")
    if node is None:
        issues.append("No se encontró Node.js en PATH")
    if not html_path.is_file():
        issues.append("No se encontró index.html")

    if issues:
        print(json.dumps({"ok": False, "issues": issues, "checked": checked}, ensure_ascii=False, indent=2))
        return 2

    source = html_path.read_text(encoding="utf-8")
    pattern = re.compile(r"<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>", re.I | re.S)

    with tempfile.TemporaryDirectory(prefix="ghf_js_") as temporary:
        temporary_path = Path(temporary)
        executable_index = 0
        for html_index, match in enumerate(pattern.finditer(source), start=1):
            attrs = match.group("attrs")
            type_match = re.search(r"type=[\"']([^\"']+)", attrs, re.I)
            script_type = type_match.group(1).lower() if type_match else ""
            if script_type in JSON_SCRIPT_TYPES:
                continue
            if re.search(r"\bsrc=[\"']", attrs, re.I):
                continue

            executable_index += 1
            script_path = temporary_path / f"index_inline_{html_index}.js"
            script_path.write_text(match.group("body"), encoding="utf-8")
            completed = subprocess.run(
                [node, "--check", str(script_path)],
                capture_output=True,
                text=True,
                check=False,
            )
            checked.append({"htmlScriptIndex": html_index, "bytes": script_path.stat().st_size})
            if completed.returncode != 0:
                detail = (completed.stderr or completed.stdout).strip()
                issues.append(f"script ejecutable #{html_index}: {detail}")

    if executable_index == 0:
        issues.append("No se encontraron scripts JavaScript ejecutables")

    result = {
        "ok": not issues,
        "issues": issues,
        "checked": checked,
        "total": executable_index,
        "engine": "node --check",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not issues else 1


if __name__ == "__main__":
    raise SystemExit(main())
