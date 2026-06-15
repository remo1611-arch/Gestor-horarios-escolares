#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]


def run_json(command: list[str], *, check: bool = True) -> dict:
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    completed = subprocess.run(command, cwd=ROOT, check=check, capture_output=True, text=True, env=env)
    return json.loads(completed.stdout)


def canonical_hash(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def collect_key(value: Any, searched: str) -> list[Any]:
    found: list[Any] = []
    if isinstance(value, dict):
        for key, item in value.items():
            if key == searched:
                found.append(item)
            found.extend(collect_key(item, searched))
    elif isinstance(value, list):
        for item in value:
            found.extend(collect_key(item, searched))
    return found


def embedded_json(html: str, script_id: str) -> dict:
    match = re.search(
        rf'<script id="{re.escape(script_id)}" type="application/json">(.*?)</script>',
        html,
        flags=re.S,
    )
    if not match:
        raise AssertionError(f"No se encontró {script_id}")
    return json.loads(match.group(1))


def payload_is_public_synthetic(payload: dict) -> tuple[bool, str]:
    data_natures = [str(value).upper() for value in collect_key(payload, "dataNature")]
    source_statuses = [str(value).upper() for value in collect_key(payload, "sourceStatus")]
    tutor_names = [value for value in collect_key(payload, "tutorTexto") if value not in (None, "")]
    source_files = payload.get("sourceFiles") or []
    source_files_ok = bool(source_files) and all(
        isinstance(item, dict)
        and re.search(r"sintet|fixture", str(item.get("file") or ""), re.I)
        and re.search(r"sintet|fixture", str(item.get("role") or ""), re.I)
        and re.fullmatch(r"[a-f0-9]{64}", str(item.get("sha256") or ""))
        for item in source_files
    )
    center = payload.get("centroCurso") or {}
    center_ok = (
        center.get("comunidadAutonoma") == "Territorio Sintético"
        and center.get("localidad") == "Ciudad Sintética"
        and "Sintético" in str(center.get("centro") or "")
    )
    ok = (
        bool(data_natures)
        and all(value == "SYNTHETIC" for value in data_natures)
        and bool(source_statuses)
        and all(value == "SYNTHETIC" for value in source_statuses)
        and not tutor_names
        and source_files_ok
        and center_ok
    )
    detail = (
        f"dataNature={len(data_natures)}; sourceStatus={len(source_statuses)}; "
        f"tutorTexto={len(tutor_names)}; sourceFiles={len(source_files)}; center={center_ok}"
    )
    return ok, detail


def main() -> int:
    checks: list[dict] = []

    fixture_names = [
        "FIXTURE_GHFPROJECT_MINIMO_SINTETICO.ghfproject",
        "FIXTURE_GHFPROJECT_COMPLETO_SINTETICO.ghfproject",
    ]
    for name in fixture_names:
        report = run_json([
            sys.executable,
            str(ROOT / "validar_ghfproject.py"),
            "--skip-jsonschema",
            str(ROOT / "fixtures" / name),
        ])
        checks.append({
            "name": f"validación {name}",
            "pass": report.get("ok") is True and report.get("passed") == 15 and report.get("total") == 15,
            "detail": f"{report.get('passed')}/{report.get('total')}",
        })

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    checks.extend([
        {
            "name": "fixture parcial heredado ausente",
            "pass": ('id="' + "partial" + "DraftFixture" + '"') not in html
            and ("Datos " + "reales parciales") not in html,
        },
        {
            "name": "fixture parcial sintético presente",
            "pass": html.count('id="partialSyntheticFixture"') == 1,
        },
    ])

    for script_id in ("initialProject", "partialSyntheticFixture"):
        payload = embedded_json(html, script_id)
        passed, detail = payload_is_public_synthetic(payload)
        checks.append({
            "name": f"payload público sintético {script_id}",
            "pass": passed,
            "detail": detail,
        })

    request = json.loads((ROOT / "fixtures/SOLICITUD_SINTETICA_502_SESIONES.json").read_text(encoding="utf-8"))
    request_project_hash = canonical_hash(request.get("projectSnapshot"))
    request_probe = dict(request)
    request_probe["requestSha256"] = None
    checks.extend([
        {
            "name": "hash del proyecto sintético recalculado",
            "pass": (request.get("sourceProject") or {}).get("projectSha256") == request_project_hash,
        },
        {
            "name": "hash de la solicitud sintética recalculado",
            "pass": request.get("requestSha256") == canonical_hash(request_probe),
        },
        {
            "name": "sourceStatus sintético en solicitud pública",
            "pass": bool(collect_key(request, "sourceStatus"))
            and all(str(value).upper() == "SYNTHETIC" for value in collect_key(request, "sourceStatus")),
        },
    ])

    case = json.loads((ROOT / "casos/PLANTILLA_SINTETICA_CANONICA_ENTRADA_v1_3.json").read_text(encoding="utf-8"))
    case_statuses = collect_key(case, "sourceStatus")
    checks.append({
        "name": "sourceStatus sintético en caso canónico",
        "pass": bool(case_statuses) and all(str(value).upper() == "SYNTHETIC" for value in case_statuses),
        "detail": str(len(case_statuses)),
    })

    license_text = (ROOT / "LICENSE").read_text(encoding="utf-8")
    security_text = (ROOT / "SECURITY.md").read_text(encoding="utf-8")
    checks.extend([
        {
            "name": "autoría pública conservada",
            "pass": "Remo José Pereira González" in license_text,
        },
        {
            "name": "mantenedor público coherente",
            "pass": "@remo1611-arch" in security_text,
        },
    ])

    with tempfile.TemporaryDirectory() as temporary:
        temp = Path(temporary)
        denylist = temp / "denylist.txt"
        denylist.write_text("Remo José Pereira González\n@remo1611-arch\n", encoding="utf-8")
        audit = run_json([
            sys.executable,
            str(ROOT / "scripts/auditar_publicacion.py"),
            str(ROOT),
            "--denylist",
            str(denylist),
        ])
        checks.append({
            "name": "allowlist de autoría compatible con denylist",
            "pass": audit.get("ok") is True and audit.get("privateDenylistApplied") is True,
            "detail": str(audit.get("semanticPayloads")),
        })

        response_path = temp / "response.json"
        status_path = temp / "status.json"
        child_env = os.environ.copy()
        child_env["PYTHONDONTWRITEBYTECODE"] = "1"
        completed = subprocess.run(
            [
                sys.executable,
                str(ROOT / "motor/procesar_solicitud_p5_2.py"),
                str(ROOT / "fixtures/SOLICITUD_SINTETICA_502_SESIONES.json"),
                str(response_path),
                "--job-id", "QA-P60F2",
                "--status", str(status_path),
            ],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
            env=child_env,
        )
        summary = json.loads(completed.stdout)
        response = json.loads(response_path.read_text(encoding="utf-8"))
        assignments = ((response.get("solverOutput") or {}).get("assignments") or [])
        checks.extend([
            {"name": "motor status FEASIBLE", "pass": summary.get("status") == "FEASIBLE"},
            {"name": "preview READY_FOR_PREVIEW", "pass": summary.get("preview") == "READY_FOR_PREVIEW"},
            {"name": "502 asignaciones", "pass": summary.get("assigned") == 502 and len(assignments) == 502},
            {"name": "sin escritura directa", "pass": (response.get("policy") or {}).get("directWriteAllowed") is False},
            {"name": "aceptación explícita", "pass": (response.get("policy") or {}).get("requiresExplicitAcceptance") is True},
        ])

    result = {
        "ok": all(item["pass"] for item in checks),
        "passed": sum(1 for item in checks if item["pass"]),
        "total": len(checks),
        "checks": checks,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
