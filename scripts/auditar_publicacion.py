#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
import zipfile
from pathlib import Path
from typing import Any

ALLOWED_GHF = {
    "fixtures/FIXTURE_GHFPROJECT_MINIMO_SINTETICO.ghfproject",
    "fixtures/FIXTURE_GHFPROJECT_COMPLETO_SINTETICO.ghfproject",
}
ALLOWED_XLSX = {
    "plantillas/PLANTILLA_RECOGIDA_DATOS_GHFPROJECT_1_0.xlsx",
    "plantillas/EJEMPLO_SINTETICO_PLANTILLA_GHFPROJECT_1_0.xlsx",
}
PUBLIC_IDENTITY_ALLOWLIST = (
    "Remo José Pereira González",
    "@remo1611-arch",
    "remo1611-arch",
)
TEXT_SUFFIXES = {
    ".html", ".py", ".md", ".json", ".csv", ".txt", ".yml", ".yaml",
    ".toml", ".ini", ".js", ".css", ".xml", ".rels", ".cff",
}
FORBIDDEN_SUFFIXES = {
    ".pdf", ".sqlite", ".db", ".log", ".pyc", ".pyo", ".pem", ".key",
    ".p12", ".pfx",
}
FORBIDDEN_DIRS = {
    "__pycache__", "private", "data-private", "real-data", "exports-real",
    "backups", "jobs", "resultados", "exports",
}
GENERIC_PATTERNS = [
    ("datos REAL incrustados", re.compile(r'"dataNature"\s*:\s*"REAL"', re.I)),
    ("datos personales declarados", re.compile(r'"containsPersonalData"\s*:\s*true', re.I)),
    ("clave privada", re.compile(r"-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----", re.I)),
    ("token GitHub clásico", re.compile(r"\bgh[opsu]_[A-Za-z0-9]{30,}\b")),
    ("token GitHub granular", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{40,}\b")),
    ("token OpenAI", re.compile(r"\bsk-[A-Za-z0-9_-]{24,}\b")),
    ("ruta local absoluta", re.compile(r"(?:[A-Za-z]:\\\\|/home/|/Users/|/storage/emulated/|/data/data/|/sdcard/)", re.I)),
    ("etiqueta pública heredada", re.compile("Datos " + "reales parciales", re.I)),
    ("fixture parcial heredado", re.compile(r'id=["\']' + "partial" + "DraftFixture" + r'["\']', re.I)),
]
EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
SYNTHETIC_MARKER = re.compile(r"sintet|synthet|fixture|demo|prueba|fictici", re.I)
HEX64 = re.compile(r"^[a-f0-9]{64}$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audita que un árbol destinado a GitHub solo contenga material público y sintético."
    )
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument(
        "--denylist",
        default=os.environ.get("GHF_PRIVATE_DENYLIST", ""),
        help="Archivo privado externo con un término literal por línea. No debe versionarse.",
    )
    return parser.parse_args()


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch)).lower()


def is_synthetic_marker(value: str) -> bool:
    return SYNTHETIC_MARKER.search(normalize(value)) is not None


def mask_public_identities(text: str) -> str:
    masked = text
    for allowed in sorted(PUBLIC_IDENTITY_ALLOWLIST, key=len, reverse=True):
        masked = re.sub(re.escape(allowed), " " * len(allowed), masked, flags=re.I)
    return masked


def load_private_patterns(path_value: str, issues: list[str]) -> list[tuple[str, re.Pattern[str]]]:
    if not path_value:
        return []
    path = Path(path_value).expanduser().resolve()
    if not path.is_file():
        issues.append(f"denylist privada no encontrada: {path}")
        return []
    patterns: list[tuple[str, re.Pattern[str]]] = []
    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        term = raw.strip()
        if not term or term.startswith("#"):
            continue
        patterns.append((f"término privado #{number}", re.compile(re.escape(term), re.I)))
    return patterns


def walk(value: Any, path: str = "$"):
    if isinstance(value, dict):
        for key, item in value.items():
            item_path = f"{path}.{key}"
            yield item_path, key, item
            yield from walk(item, item_path)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from walk(item, f"{path}[{index}]")


def audit_public_payload(label: str, payload: Any, issues: list[str]) -> None:
    for path, key, value in walk(payload):
        if key == "dataNature" and str(value).upper() != "SYNTHETIC":
            issues.append(f"{label}{path}: dataNature debe ser SYNTHETIC")
        elif key == "containsPersonalData" and value is True:
            issues.append(f"{label}{path}: contiene datos personales")
        elif key == "sourceStatus" and str(value).upper() != "SYNTHETIC":
            issues.append(f"{label}{path}: sourceStatus público no sintético ({value})")
        elif key == "tutorTexto" and value not in (None, ""):
            issues.append(f"{label}{path}: nombre libre de tutoría no autorizado")
        elif key in {"comunidadAutonoma", "autonomousCommunity", "localidad", "locality"}:
            if value not in (None, "") and not is_synthetic_marker(str(value)):
                issues.append(f"{label}{path}: ubicación no marcada inequívocamente como sintética")
        elif key in {"centro", "centerName"}:
            if value not in (None, "") and not is_synthetic_marker(str(value)):
                issues.append(f"{label}{path}: nombre de centro no marcado inequívocamente como sintético")
        elif key == "source" and isinstance(value, str) and ".xlsx" in value.lower():
            if not is_synthetic_marker(value):
                issues.append(f"{label}{path}: fuente XLSX no marcada como sintética")
        elif key == "sourceFiles":
            if not isinstance(value, list):
                issues.append(f"{label}{path}: sourceFiles debe ser una lista")
                continue
            for index, item in enumerate(value):
                item_label = f"{label}{path}[{index}]"
                if not isinstance(item, dict):
                    issues.append(f"{item_label}: fuente no válida")
                    continue
                file_name = str(item.get("file") or "")
                role = str(item.get("role") or "")
                digest = str(item.get("sha256") or "")
                if not is_synthetic_marker(file_name):
                    issues.append(f"{item_label}.file: nombre de fuente no sintético")
                if not is_synthetic_marker(role):
                    issues.append(f"{item_label}.role: rol de fuente no sintético")
                if digest and not HEX64.fullmatch(digest):
                    issues.append(f"{item_label}.sha256: SHA-256 no válido")


def parse_json(label: str, data: bytes, issues: list[str], *, public_payload: bool) -> Any | None:
    try:
        payload = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        issues.append(f"{label}: JSON inválido ({exc})")
        return None
    if public_payload:
        audit_public_payload(label, payload, issues)
    return payload


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    issues: list[str] = []
    private_patterns = load_private_patterns(args.denylist, issues)
    scanned_files = 0
    semantic_payloads = 0

    def scan_text(label: str, data: bytes, *, apply_generic: bool = True) -> str:
        text = data.decode("utf-8", "ignore")
        if apply_generic:
            for description, pattern in GENERIC_PATTERNS:
                if pattern.search(text):
                    issues.append(f"{label}: patrón prohibido ({description})")
        masked = mask_public_identities(text)
        for description, pattern in private_patterns:
            if pattern.search(masked):
                issues.append(f"{label}: patrón prohibido ({description})")
        for email in EMAIL_PATTERN.findall(text):
            if not email.lower().endswith("@users.noreply.github.com"):
                issues.append(f"{label}: dirección de correo publicada ({email})")
        return text

    def scan_archive(path: Path, rel: str) -> None:
        nonlocal semantic_payloads
        try:
            with zipfile.ZipFile(path) as archive:
                damaged = archive.testzip()
                if damaged:
                    issues.append(f"{rel}: ZIP dañado en {damaged}")
                    return
                for name in archive.namelist():
                    normalized = Path(name)
                    if normalized.is_absolute() or ".." in normalized.parts:
                        issues.append(f"{rel}!{name}: ruta insegura")
                        continue
                    suffix = normalized.suffix.lower()
                    data = archive.read(name)
                    if suffix in TEXT_SUFFIXES or normalized.name in {"[Content_Types].xml"}:
                        scan_text(f"{rel}!{name}", data)
                    if path.suffix.lower() == ".ghfproject" and suffix == ".json":
                        if parse_json(f"{rel}!{name}", data, issues, public_payload=True) is not None:
                            semantic_payloads += 1
        except (OSError, zipfile.BadZipFile) as exc:
            issues.append(f"{rel}: archivo ZIP inválido ({exc})")

    if not root.is_dir():
        print(json.dumps({"ok": False, "issues": [f"raíz no válida: {root}"]}, ensure_ascii=False, indent=2))
        return 2

    index_path = root / "index.html"
    if not index_path.is_file():
        issues.append("index.html: falta la entrada estática requerida para GitHub Pages")
    else:
        index_text = scan_text("index.html", index_path.read_bytes())
        for script_id in ("initialProject", "partialSyntheticFixture"):
            matches = re.findall(
                rf'<script id="{re.escape(script_id)}" type="application/json">(.*?)</script>',
                index_text,
                flags=re.S,
            )
            if len(matches) != 1:
                issues.append(f"index.html: se esperaba un único payload {script_id}")
                continue
            payload = parse_json(
                f"index.html#{script_id}",
                matches[0].encode("utf-8"),
                issues,
                public_payload=True,
            )
            if payload is not None:
                semantic_payloads += 1
                center = payload.get("centroCurso") or {}
                if center.get("comunidadAutonoma") != "Territorio Sintético":
                    issues.append(f"index.html#{script_id}: marcador territorial público incorrecto")
                if center.get("localidad") != "Ciudad Sintética":
                    issues.append(f"index.html#{script_id}: marcador de localidad público incorrecto")

    for path in sorted(root.rglob("*")):
        if not path.is_file() or ".git" in path.parts:
            continue
        rel = path.relative_to(root).as_posix()
        if rel == "index.html":
            scanned_files += 1
            continue
        scanned_files += 1
        rel_parts = set(path.relative_to(root).parts[:-1])
        suffix = path.suffix.lower()

        if rel_parts & FORBIDDEN_DIRS:
            issues.append(f"{rel}: directorio no publicable")
        if path.name.startswith(".env") or path.name.lower().startswith("credentials"):
            issues.append(f"{rel}: posible archivo de credenciales")
        if suffix in FORBIDDEN_SUFFIXES:
            issues.append(f"{rel}: tipo no autorizado")
        if suffix == ".zip":
            issues.append(f"{rel}: ZIP anidado no autorizado en el repositorio")
        if suffix == ".ghfproject" and rel not in ALLOWED_GHF:
            issues.append(f"{rel}: .ghfproject no autorizado")
        if suffix == ".xlsx" and rel not in ALLOWED_XLSX:
            issues.append(f"{rel}: XLSX no autorizado")

        if suffix in TEXT_SUFFIXES or path.name in {"LICENSE", ".gitignore", ".nojekyll"}:
            data = path.read_bytes()
            scan_text(rel, data, apply_generic=rel != "scripts/auditar_publicacion.py")
            if suffix == ".json" and (rel.startswith("fixtures/") or rel.startswith("casos/")):
                if parse_json(rel, data, issues, public_payload=True) is not None:
                    semantic_payloads += 1
        elif suffix in {".ghfproject", ".xlsx"}:
            scan_archive(path, rel)

    # Evitar repeticiones exactas sin ocultar la localización del problema.
    issues = list(dict.fromkeys(issues))
    result = {
        "ok": not issues,
        "issues": issues,
        "scannedFiles": scanned_files,
        "semanticPayloads": semantic_payloads,
        "privateDenylistApplied": bool(private_patterns),
        "publicIdentityAllowlist": list(PUBLIC_IDENTITY_ALLOWLIST),
        "scannedRoot": ".",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not issues else 1


if __name__ == "__main__":
    sys.exit(main())
