#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def wait_json(url: str):
    for _ in range(80):
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                return json.load(response)
        except Exception:
            time.sleep(0.1)
    raise RuntimeError("servidor no disponible")


def get_redirect(url: str) -> tuple[int, str]:
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    opener = urllib.request.build_opener(NoRedirect)
    try:
        opener.open(url, timeout=5)
    except urllib.error.HTTPError as exc:
        return exc.code, exc.headers.get("Location", "")
    raise RuntimeError("la raíz no devolvió redirección")


def post_json(url: str, value):
    request = urllib.request.Request(
        url,
        data=json.dumps(value).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode("utf-8"))


def main() -> int:
    checks = []
    for mode, port in [("local-private", 9101), ("public-demo", 9102)]:
        with tempfile.TemporaryDirectory() as jobs:
            child_env = os.environ.copy()
            child_env["PYTHONDONTWRITEBYTECODE"] = "1"
            process = subprocess.Popen(
                [
                    sys.executable,
                    str(ROOT / "servidor_ghf.py"),
                    "--mode", mode,
                    "--host", "127.0.0.1",
                    "--port", str(port),
                    "--jobs-dir", jobs,
                ],
                cwd=ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=child_env,
            )
            try:
                config = wait_json(f"http://127.0.0.1:{port}/api/runtime-config")
                expected_mode = "LOCAL_PRIVATE" if mode == "local-private" else "PUBLIC_DEMO"
                checks.append({"name": f"config {mode}", "pass": config["mode"] == expected_mode})
                code, location = get_redirect(f"http://127.0.0.1:{port}/")
                checks.append({
                    "name": f"entrada index {mode}",
                    "pass": code == 302 and location == "/index.html?v=0_6_3",
                    "status": code,
                })
                if mode == "local-private":
                    checks.append({
                        "name": "REAL policy local-private",
                        "pass": config.get("acceptsRealData") is True,
                        "status": "CONFIG",
                    })
                else:
                    request = json.loads((ROOT / "fixtures/SOLICITUD_SINTETICA_502_SESIONES.json").read_text(encoding="utf-8"))
                    request_real = json.loads(json.dumps(request))
                    request_real["sourceProject"]["dataNature"] = "REAL"
                    request_real["requestSha256"] = None
                    status, _body = post_json(f"http://127.0.0.1:{port}/api/jobs", request_real)
                    checks.append({"name": "REAL policy public-demo", "pass": status == 400, "status": status})
            finally:
                process.terminate()
                process.wait(timeout=5)

    result = {"ok": all(item["pass"] for item in checks), "checks": checks}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
