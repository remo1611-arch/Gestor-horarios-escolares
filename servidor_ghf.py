#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import signal
import subprocess
import sys
import threading
import uuid
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

ROOT = Path(__file__).resolve().parent
JOBS = Path(os.environ.get("GHF_JOBS_DIR", ROOT / "motor" / "jobs"))
PROCESSOR = ROOT / "motor" / "procesar_solicitud_p5_2.py"
APP = "index.html"
JOBS.mkdir(parents=True, exist_ok=True)
PROCESSES: dict[str, subprocess.Popen] = {}

from exportar_document_model_xlsx import MIME as XLSX_MIME, build_xlsx_bytes
from importar_plantilla_p6_0e import convert_xlsx_to_ghfproject, preflight_xlsx, safe_output_filename
LOCK = threading.Lock()

RUNTIME_MODE = "LOCAL_PRIVATE"
ALLOWED_ORIGIN = ""

def is_public_demo() -> bool:
    return RUNTIME_MODE == "PUBLIC_DEMO"

def report_data_nature(report):
    return str(((report or {}).get("identityPreview") or {}).get("dataNature") or "").upper()

def require_public_synthetic_nature(value: str, context: str):
    if is_public_demo() and str(value or "").upper() != "SYNTHETIC":
        raise ValueError(f"PUBLIC_DEMO solo admite datos SYNTHETIC ({context}).")



def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def job_paths(job_id: str):
    d = JOBS / job_id
    return d, d / "request.json", d / "response.json", d / "status.json", d / "motor.log"


def safe_job_id(value: str) -> str | None:
    if not value or any(c not in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_" for c in value):
        return None
    return value


def watcher(job_id: str, proc: subprocess.Popen, status_path: Path, response_path: Path, log_file):
    code = proc.wait()
    log_file.close()
    with LOCK:
        PROCESSES.pop(job_id, None)
    try:
        status = read_json(status_path) if status_path.exists() else {"jobId": job_id}
    except Exception:
        status = {"jobId": job_id}
    if status.get("state") == "CANCELLED":
        return
    if response_path.exists():
        try:
            response = read_json(response_path)
            status["state"] = "COMPLETED" if response.get("status") not in {"ERROR", "CANCELLED"} else "FAILED"
            status["responseStatus"] = response.get("status")
            status["previewStatus"] = (response.get("preview") or {}).get("status")
        except Exception as exc:
            status["state"] = "FAILED"
            status["error"] = {"code": "INVALID_RESPONSE", "message": str(exc)}
    elif code != 0:
        status["state"] = "FAILED"
        status["error"] = {"code": "PROCESS_EXIT", "message": f"El proceso terminó con código {code}."}
    status["updatedAt"] = utc_now()
    write_json(status_path, status)


class Handler(SimpleHTTPRequestHandler):
    server_version = "GHF-P6-0F/0.6.3"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("X-Content-Type-Options", "nosniff")
        if ALLOWED_ORIGIN:
            self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-GHF-Filename, X-GHF-Data-Nature")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))
        sys.stdout.flush()

    def json_response(self, status: int, value):
        data = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_body_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 25_000_000:
            raise ValueError("Tamaño de solicitud no permitido")
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def read_body_bytes(self, max_bytes: int = 30_000_000):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > max_bytes:
            raise ValueError("Tamaño de archivo no permitido")
        return self.rfile.read(length)

    def request_filename(self, default: str = "plantilla.xlsx") -> str:
        value = unquote(self.headers.get("X-GHF-Filename", default)).strip()
        value = Path(value).name
        return value or default

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/":
            self.send_response(302)
            self.send_header("Location", f"/{APP}?v=0_6_3")
            self.end_headers()
            return
        if path == "/api/runtime-config":
            self.json_response(200, {"mode": RUNTIME_MODE, "version": "0.6.3", "acceptsRealData": not is_public_demo(), "publicDemoSyntheticOnly": is_public_demo()})
            return
        if path == "/api/health":
            try:
                import importlib.util
                ortools = importlib.util.find_spec("ortools") is not None
            except Exception:
                ortools = False
            self.json_response(200, {"ok": True, "phase": "P6-0F", "version": "0.6.3", "mode": RUNTIME_MODE, "python": sys.version.split()[0], "ortoolsAvailable": ortools, "xlsxExport": True, "ghfProject": True, "xlsxTemplateImport": True, "preflightClassifications": ["APTO", "INCOMPLETO", "CONTRADICTORIO", "NO_IMPORTABLE"]})
            return
        parts = [unquote(x) for x in path.strip("/").split("/")]
        if len(parts) >= 3 and parts[:2] == ["api", "jobs"]:
            job_id = safe_job_id(parts[2])
            if not job_id:
                self.json_response(400, {"error": "jobId no válido"}); return
            d, req, resp, status, log = job_paths(job_id)
            if len(parts) == 3:
                if not status.exists(): self.json_response(404, {"error": "trabajo no encontrado"}); return
                data = read_json(status)
                with LOCK:
                    proc = PROCESSES.get(job_id)
                if proc and proc.poll() is None:
                    data["state"] = "RUNNING"
                self.json_response(200, data); return
            if len(parts) == 4 and parts[3] == "response":
                if not resp.exists(): self.json_response(404, {"error": "respuesta no disponible"}); return
                self.json_response(200, read_json(resp)); return
            if len(parts) == 4 and parts[3] == "log":
                if not log.exists(): self.json_response(404, {"error": "log no disponible"}); return
                data = log.read_bytes()
                self.send_response(200); self.send_header("Content-Type", "text/plain; charset=utf-8"); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data); return
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/import/xlsx/preflight":
            try:
                data = self.read_body_bytes()
                filename = self.request_filename()
                report = preflight_xlsx(data, filename)
                if is_public_demo() and report_data_nature(report) != "SYNTHETIC":
                    report["classification"] = "NO_IMPORTABLE"
                    report["canGenerateGhfProject"] = False
                    report.setdefault("issues", []).append({"severity":"BLOCKING","category":"PRIVACY","code":"PUBLIC_DEMO_SYNTHETIC_ONLY","message":"La demo pública solo admite plantillas SYNTHETIC.","sheet":"10_Proyecto_Centro","field":"naturaleza_datos"})
                self.json_response(200, report)
            except Exception as exc:
                self.json_response(400, {"error": str(exc), "classification": "NO_IMPORTABLE"})
            return
        if path == "/api/import/xlsx/ghfproject":
            try:
                data = self.read_body_bytes()
                filename = self.request_filename()
                report, package = convert_xlsx_to_ghfproject(data, filename)
                if is_public_demo() and report_data_nature(report) != "SYNTHETIC":
                    report["classification"] = "NO_IMPORTABLE"
                    report["canGenerateGhfProject"] = False
                    report.setdefault("issues", []).append({"severity":"BLOCKING","category":"PRIVACY","code":"PUBLIC_DEMO_SYNTHETIC_ONLY","message":"La demo pública solo admite plantillas SYNTHETIC."})
                    package = None
                if package is None:
                    self.json_response(422, report)
                    return
                output_name = safe_output_filename(report)
                self.send_response(200)
                self.send_header("Content-Type", "application/vnd.ghfproject+zip")
                self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{quote(output_name)}")
                self.send_header("X-GHF-Classification", report.get("classification", "APTO"))
                self.send_header("Content-Length", str(len(package)))
                self.end_headers()
                self.wfile.write(package)
            except Exception as exc:
                self.json_response(400, {"error": str(exc), "classification": "NO_IMPORTABLE"})
            return
        if path == "/api/export/xlsx":
            try:
                model = self.read_body_json()
                if model.get("schemaId") != "ghf_document_model_1.0":
                    raise ValueError("El XLSX exige ghf_document_model_1.0")
                require_public_synthetic_nature((model.get("metadata") or {}).get("dataNature"), "exportación XLSX")
                data = build_xlsx_bytes(model)
                metadata = model.get("metadata") or {}
                course = str(metadata.get("course") or "proyecto").replace("/", "_").replace("\\", "_")
                filename = f"Horario_Escolar_{course}_v0_6_3.xlsx"
                self.send_response(200)
                self.send_header("Content-Type", XLSX_MIME)
                self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{quote(filename)}")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            except Exception as exc:
                self.json_response(400, {"error": str(exc)})
            return
        if path == "/api/jobs":
            try:
                request = self.read_body_json()
                require_public_synthetic_nature((request.get("sourceProject") or {}).get("dataNature"), "solicitud al motor")
                job_id = "JOB-P60F-" + uuid.uuid4().hex[:12].upper()
                d, req_path, resp_path, status_path, log_path = job_paths(job_id)
                d.mkdir(parents=True, exist_ok=False)
                write_json(req_path, request)
                status = {"jobId": job_id, "requestId": request.get("requestId"), "state": "QUEUED", "createdAt": utc_now(), "updatedAt": utc_now(), "progress": {"stage": "QUEUED", "assigned": 0, "elapsedMs": 0}}
                write_json(status_path, status)
                log_file = log_path.open("w", encoding="utf-8")
                proc = subprocess.Popen([sys.executable, str(PROCESSOR), str(req_path), str(resp_path), "--job-id", job_id, "--status", str(status_path)], cwd=str(ROOT), stdout=log_file, stderr=subprocess.STDOUT, text=True)
                with LOCK:
                    PROCESSES[job_id] = proc
                threading.Thread(target=watcher, args=(job_id, proc, status_path, resp_path, log_file), daemon=True).start()
                status["state"] = "RUNNING"; status["pid"] = proc.pid; status["updatedAt"] = utc_now(); write_json(status_path, status)
                self.json_response(202, status)
            except Exception as exc:
                self.json_response(400, {"error": str(exc)})
            return
        parts = [unquote(x) for x in path.strip("/").split("/")]
        if len(parts) == 4 and parts[:2] == ["api", "jobs"] and parts[3] == "cancel":
            job_id = safe_job_id(parts[2])
            if not job_id: self.json_response(400, {"error": "jobId no válido"}); return
            d, req, resp, status_path, log = job_paths(job_id)
            if not status_path.exists(): self.json_response(404, {"error": "trabajo no encontrado"}); return
            with LOCK:
                proc = PROCESSES.get(job_id)
            if proc and proc.poll() is None:
                proc.terminate()
                try: proc.wait(timeout=4)
                except subprocess.TimeoutExpired: proc.kill()
            status = read_json(status_path)
            status.update({"state": "CANCELLED", "updatedAt": utc_now(), "progress": {"stage": "CANCELLED", "assigned": status.get("progress", {}).get("assigned", 0), "elapsedMs": status.get("progress", {}).get("elapsedMs", 0)}})
            status.pop("error", None)
            write_json(status_path, status)
            if not resp.exists():
                write_json(resp, {"schemaId": "ghf_generation_response_1.0", "contractVersion": "1.0", "responseId": f"RESP-{job_id}", "requestId": status.get("requestId"), "jobId": job_id, "status": "CANCELLED", "createdAt": status.get("createdAt"), "finishedAt": utc_now(), "policy": {"directWriteAllowed": False, "requiresExplicitAcceptance": True, "targetMode": "CREATE_SEPARATE_PREVIEW"}, "engine": {"selected": "NONE"}, "scope": {}, "solverOutput": None, "preview": {"schemaId": "ghf_schedule_preview_1.0", "previewVersion": "1.0", "proposalId": f"PREVIEW-{job_id}", "runId": f"RUN-{job_id}", "status": "REJECTED", "source": {}, "summary": {"totalActivities": 0, "proposedAssignments": 0, "added": 0, "moved": 0, "unchanged": 0, "unassigned": 0, "preservedLocks": 0}, "changes": [], "validation": {"solverStatus": "CANCELLED", "hardViolationCount": 0, "lockedChanges": 0, "validForAcceptance": False}, "applyPolicy": {"mode": "NO_DIRECT_WRITE", "requiresExplicitAcceptance": True, "targetVersionMode": "CREATE_NEW_DRAFT", "directWriteAllowed": False}, "createdAt": utc_now()}, "diagnostics": {"errors": [], "warnings": ["Trabajo cancelado por el usuario."]}})
            self.json_response(200, status); return
        self.json_response(404, {"error": "ruta no encontrada"})


def main():
    global RUNTIME_MODE, ALLOWED_ORIGIN, JOBS
    parser = argparse.ArgumentParser(description="Servidor de Gestor de Horarios Escolares: demo pública sintética o modo local privado")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8993)
    parser.add_argument("--mode", choices=["local-private", "public-demo"], default="local-private")
    parser.add_argument("--allow-origin", default="")
    parser.add_argument("--jobs-dir", default="")
    args = parser.parse_args()
    RUNTIME_MODE = "PUBLIC_DEMO" if args.mode == "public-demo" else "LOCAL_PRIVATE"
    ALLOWED_ORIGIN = args.allow_origin.strip()
    if args.jobs_dir:
        JOBS = Path(args.jobs_dir).resolve()
        JOBS.mkdir(parents=True, exist_ok=True)
    if RUNTIME_MODE == "PUBLIC_DEMO" and args.host in {"127.0.0.1", "localhost"}:
        print("AVISO: PUBLIC_DEMO está enlazada solo a localhost; para despliegue use --host 0.0.0.0 y un proxy HTTPS.", flush=True)
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Gestor de Horarios Escolares 0.6.3 · {RUNTIME_MODE}: http://{args.host}:{args.port}/{APP}?v=0_6_3", flush=True)
    print("LOCAL_PRIVATE admite datos REAL en localhost. PUBLIC_DEMO solo admite SYNTHETIC.", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
