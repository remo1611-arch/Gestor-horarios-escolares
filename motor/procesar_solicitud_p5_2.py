#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.util
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "motor" / "runtime"
TEMPLATE = ROOT / "casos" / "PLANTILLA_SINTETICA_CANONICA_ENTRADA_v1_3.json"
sys.path.insert(0, str(RUNTIME))

from adapter_heuristico_v12 import solve as solve_heuristic  # type: ignore
from quality_canonical import upgrade_output  # type: ignore
from generar_vista_previa import generate as generate_preview  # type: ignore

REQUEST_SCHEMA = "ghf_generation_request_1.0"
RESPONSE_SCHEMA = "ghf_generation_response_1.0"
ALLOWED_MODES = {"COMPLETE", "PARTIAL", "REPAIR"}
ALLOWED_ENGINES = {"AUTO", "HYBRID", "HEURISTIC"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_data(value: Any) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_status(path: Path | None, **kwargs: Any) -> None:
    if not path:
        return
    current: dict[str, Any] = {}
    if path.exists():
        try:
            current = read_json(path)
        except Exception:
            current = {}
    current.update(kwargs)
    current["updatedAt"] = utc_now()
    write_json(path, current)


def ortools_available() -> tuple[bool, str | None]:
    spec = importlib.util.find_spec("ortools")
    if spec is None:
        return False, None
    try:
        import ortools  # type: ignore

        return True, getattr(ortools, "__version__", "desconocida")
    except Exception:
        return False, None


def validate_request(request: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if request.get("schemaId") != REQUEST_SCHEMA:
        errors.append("schemaId de solicitud no reconocido")
    if request.get("contractVersion") != "1.0":
        errors.append("contractVersion debe ser 1.0")
    if request.get("mode") not in ALLOWED_MODES:
        errors.append("modo no permitido")
    if request.get("enginePreference") not in ALLOWED_ENGINES:
        errors.append("enginePreference no permitido")
    if request.get("preserveAssignments") is not True:
        errors.append("preserveAssignments debe ser true")
    policy = request.get("policy") or {}
    if policy.get("directWriteAllowed") is not False:
        errors.append("directWriteAllowed debe ser false")
    if policy.get("requiresPreview") is not True:
        errors.append("requiresPreview debe ser true")
    if policy.get("requiresExplicitAcceptance") is not True:
        errors.append("requiresExplicitAcceptance debe ser true")
    if policy.get("targetMode") != "CREATE_SEPARATE_PREVIEW":
        errors.append("targetMode no permitido")
    snapshot = request.get("projectSnapshot")
    if not isinstance(snapshot, dict):
        errors.append("falta projectSnapshot")
    else:
        declared_project_hash = (request.get("sourceProject") or {}).get("projectSha256")
        if declared_project_hash and declared_project_hash != sha256_data(snapshot):
            errors.append("projectSha256 no coincide con projectSnapshot")
        if snapshot.get("generatorPolicy", {}).get("directWriteAllowed") is not False:
            errors.append("el proyecto no prohíbe escritura directa")
        sessions = snapshot.get("sesiones")
        if not isinstance(sessions, list) or not sessions:
            errors.append("el proyecto no contiene sesiones")
        elif len({str(s.get('id')) for s in sessions}) != len(sessions):
            errors.append("existen IDs de sesión duplicados")
    requested = request.get("requestedActivityIds")
    if not isinstance(requested, list):
        errors.append("requestedActivityIds debe ser una lista")
    elif len(requested) != len(set(requested)):
        errors.append("requestedActivityIds contiene duplicados")
    elif request.get("mode") != "COMPLETE" and not requested:
        errors.append("PARTIAL y REPAIR requieren actividades solicitadas")
    declared_request_hash = request.get("requestSha256")
    if declared_request_hash:
        probe = dict(request)
        probe["requestSha256"] = None
        if declared_request_hash != sha256_data(probe):
            errors.append("requestSha256 no coincide con la solicitud")
    run = request.get("run") or {}
    try:
        limit = int(run.get("timeLimitMs", 0))
        if limit < 100 or limit > 300_000:
            errors.append("timeLimitMs debe estar entre 100 y 300000")
    except Exception:
        errors.append("timeLimitMs no es válido")
    return errors


def is_synthetic_eligible(project: dict[str, Any]) -> bool:
    scenario = project.get("scenario") or {}
    nature = str(scenario.get("dataNature") or "").lower()
    kind = str(scenario.get("kind") or "").lower()
    return "sintet" in nature or "synthet" in nature or "sintet" in kind or project.get("p5_2Meta", {}).get("solverTemplateApproved") is True


def session_assignment(session: dict[str, Any]) -> dict[str, Any] | None:
    if not session.get("dayId") or not session.get("timeSlotId"):
        return None
    return {
        "dayId": session.get("dayId"),
        "timeSlotId": session.get("timeSlotId"),
        "teacherId": session.get("teacherId") or session.get("suggestedTeacherId"),
        "spaceId": session.get("spaceId"),
    }


def effective_teacher_limit(teacher: dict[str, Any]) -> int | None:
    values: list[int] = []
    if teacher.get("maxLectivePerWeek") is not None:
        values.append(int(teacher["maxLectivePerWeek"]))
    if teacher.get("baseLectivePerWeek") is not None:
        values.append(max(0, int(teacher["baseLectivePerWeek"]) - int(teacher.get("leadershipReductionSlots") or 0)))
    return min(values) if values else None


def availability_map(project: dict[str, Any]) -> dict[tuple[str, str, str], dict[str, bool]]:
    result: dict[tuple[str, str, str], dict[str, bool]] = {}
    for row in project.get("disponibilidad") or []:
        tid, did, sid = row.get("teacherId"), row.get("dayId"), row.get("timeSlotId")
        if not tid or not did or not sid:
            continue
        status = str(row.get("disponibilidad") or "").strip().lower()
        available = status not in {"no disponible", "bloqueado", "ausente"}
        result[(str(tid), str(did), str(sid))] = {
            "available": available,
            "present": bool(row.get("presencia", True)),
        }
    return result


def derive_manual_activity(session: dict[str, Any], template: dict[str, Any]) -> dict[str, Any]:
    slot_kinds = {s["id"]: s["kind"] for s in template["calendar"]["timeSlots"]}
    category = str(session.get("computeCategory") or "LECTIVO").upper()
    if category not in {"LECTIVO", "LD", "DC", "ORGANIZATIVO"}:
        category = "ORGANIZATIVO"
    teacher = session.get("teacherId") or session.get("suggestedTeacherId")
    group = session.get("groupId") or (session.get("targetId") if session.get("targetType") == "GROUP" else None)
    space = session.get("spaceId")
    allowed = ["TEACHING"] if category == "LECTIVO" else ["ENTRY", "TEACHING", "READING", "ORGANIZATIONAL"]
    return {
        "id": str(session["id"]),
        "category": category,
        "durationSlots": 1,
        "groupIds": [group] if group else [],
        "teacherCandidates": [teacher] if teacher else [],
        "requiredSpecialties": [],
        "spaceCandidates": [space] if space else [],
        "spaceRequired": bool(space),
        "linkedActivityIds": [],
        "locked": bool(session.get("locked")),
        "currentAssignment": session_assignment(session),
        "sourceStatus": "P5_2_MANUAL",
        "tags": [x for x in [session.get("areaId"), "P5_2_MANUAL"] if x],
        "allowedSlotKinds": allowed,
        "forbiddenSlotKinds": [k for k in set(slot_kinds.values()) if k not in allowed],
        "requiredSpaceAlternatives": [],
        "synchronizationGroup": None,
        "requiredTeacherIds": list(dict.fromkeys(session.get("participantTeacherIds") or [])),
        "siteId": "SITE-Centro Demo",
        "presenceEffect": "PRESENT",
        "organizationalSubtype": session.get("organizationalSubtype") or None,
    }


def build_solver_input(request: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    project = request["projectSnapshot"]
    if not is_synthetic_eligible(project):
        raise ValueError("REAL_DATA_NOT_CANONICALIZED: el escenario real/provisional no dispone de plantilla de motor aprobada")
    template = read_json(TEMPLATE)
    inp = copy.deepcopy(template)
    mode = request["mode"]
    solver_mode = "COMPLETE" if mode == "COMPLETE" else "PARTIAL"
    requested = set(str(x) for x in request.get("requestedActivityIds") or [])
    project_sessions = {str(s["id"]): s for s in project.get("sesiones") or [] if s.get("id")}
    template_activities = {str(a["id"]): a for a in inp["activities"]}
    unknown_requested = sorted(requested - set(project_sessions) - set(template_activities))
    if unknown_requested:
        raise ValueError(f"UNKNOWN_REQUESTED_ACTIVITY: {', '.join(unknown_requested[:10])}")

    # Recursos vivos controlados. Se conservan los límites estructurales del contrato 1.3.
    teachers_by_id = {str(t["id"]): t for t in project.get("docentes") or [] if t.get("id")}
    av = availability_map(project)
    for teacher in inp["resources"]["teachers"]:
        live = teachers_by_id.get(str(teacher["id"]))
        if live:
            teacher["active"] = live.get("activo", True) is not False
            if live.get("especialidad"):
                teacher["specialties"] = list(dict.fromkeys([live["especialidad"], *(teacher.get("specialties") or [])]))
            for row in teacher.get("availability") or []:
                key = (str(teacher["id"]), str(row["dayId"]), str(row["timeSlotId"]))
                if key in av:
                    row.update(av[key])
    groups_by_id = {str(g["id"]): g for g in project.get("grupos") or [] if g.get("id")}
    for group in inp["resources"]["groups"]:
        live = groups_by_id.get(str(group["id"]))
        if live:
            group["active"] = live.get("activo", True) is not False
            group["stage"] = live.get("etapa") or group.get("stage")
    spaces_by_id = {str(s["id"]): s for s in project.get("espacios") or [] if s.get("id")}
    for space in inp["resources"]["spaces"]:
        live = spaces_by_id.get(str(space["id"]))
        if live:
            space["active"] = live.get("activo", True) is not False
            space["concurrentCapacity"] = max(1, int(live.get("concurrentCapacity") or space.get("concurrentCapacity") or 1))
            space["features"] = list(dict.fromkeys([*(space.get("features") or []), *(live.get("features") or [])]))
            space["siteId"] = live.get("siteId") or space.get("siteId")

    # Superponer el estado actual del editor sobre las actividades canónicas.
    for aid, activity in template_activities.items():
        session = project_sessions.get(aid)
        if not session:
            activity["currentAssignment"] = None
            activity["locked"] = False
            continue
        current = session_assignment(session)
        activity["currentAssignment"] = current
        activity["locked"] = bool(session.get("locked"))
        live_teacher = session.get("teacherId") or session.get("suggestedTeacherId")
        if live_teacher and live_teacher in teachers_by_id:
            activity["teacherCandidates"] = list(dict.fromkeys([live_teacher, *(activity.get("teacherCandidates") or [])]))
        participants = [str(x) for x in session.get("participantTeacherIds") or [] if x]
        if participants:
            activity["requiredTeacherIds"] = list(dict.fromkeys([*(activity.get("requiredTeacherIds") or []), *participants]))

    # Incorporar sesiones manuales que no existan en la plantilla.
    for aid, session in project_sessions.items():
        if aid not in template_activities:
            manual = derive_manual_activity(session, inp)
            inp["activities"].append(manual)
            template_activities[aid] = manual

    # En modos locales se consideran las colocadas actuales y la selección solicitada.
    global_validation = mode == "COMPLETE"
    disabled_org_rules: list[str] = []
    if mode != "COMPLETE":
        included = set(requested)
        included.update(aid for aid, s in project_sessions.items() if session_assignment(s) is not None)
        inp["activities"] = [a for a in inp["activities"] if str(a["id"]) in included]
        for rule in inp.get("organizationalRules") or []:
            if rule.get("type") in {"CATEGORY_TARGET_PER_TEACHER", "MINIMUM_PRESENCE", "RECESS_ZONE_COVERAGE", "LEADERSHIP_LECTIVE_REDUCTION"}:
                if rule.get("active"):
                    disabled_org_rules.append(str(rule.get("id")))
                rule["active"] = False
        # Las fijaciones de actividades fuera del alcance no deben permanecer.
        ids = {str(a["id"]) for a in inp["activities"]}
        filtered = []
        for rule in inp.get("hardConstraints") or []:
            if rule.get("scope") == "ACTIVITY":
                entity_ids = [str(x) for x in rule.get("entityIds") or [] if str(x) in ids]
                if not entity_ids:
                    continue
                rule = copy.deepcopy(rule)
                rule["entityIds"] = entity_ids
            filtered.append(rule)
        inp["hardConstraints"] = filtered

    activity_ids = {str(a["id"]) for a in inp["activities"]}
    effective_requested = sorted(requested & activity_ids)
    inp["schemaId"] = "ghf_solver_input_1.3"
    inp["contractVersion"] = "1.3"
    inp["run"] = {
        "runId": f"RUN-{request['requestId']}",
        "projectId": request.get("sourceProject", {}).get("projectSha256", "")[:16] or "P5-2",
        "scenarioId": project.get("scenario", {}).get("id") or "P5-2",
        "mode": solver_mode,
        "seed": int(request.get("run", {}).get("seed") or 0),
        "timeLimitMs": int(request.get("run", {}).get("timeLimitMs") or 22000),
        "preserveAssignments": True,
        "requestedActivityIds": effective_requested,
        "cancellationTokenId": f"CANCEL-{request['requestId']}",
    }
    inp["provenance"] = {
        **(inp.get("provenance") or {}),
        "sourcePhase": "P5-4.1-IMPRESION-A4-PAGINACION-0.5.4.1",
        "sourceVersionId": request.get("sourceProject", {}).get("projectSha256"),
        "dataNature": project.get("scenario", {}).get("dataNature") or "UNKNOWN",
        "requestId": request["requestId"],
        "notes": "Entrada generada desde una copia P5-2. Los límites estructurales proceden de la plantilla canónica 1.3; el estado y disponibilidad se superponen desde el proyecto.",
    }
    scope = {
        "requestedMode": mode,
        "solverMode": solver_mode,
        "globalValidation": global_validation,
        "projectSessionCount": len(project_sessions),
        "canonicalActivityCount": len(template_activities),
        "consideredActivityCount": len(inp["activities"]),
        "requestedActivityCount": len(effective_requested),
        "preservedAssignmentCount": sum(1 for a in inp["activities"] if a.get("currentAssignment")),
        "lockedActivityCount": sum(1 for a in inp["activities"] if a.get("locked")),
        "disabledOrganizationalRuleIds": disabled_org_rules,
        "extraManualActivityCount": len(set(project_sessions) - set(read_json(TEMPLATE)["activities"][i]["id"] for i in range(len(read_json(TEMPLATE)["activities"])))),
        "teacherEffectiveLectiveLimits": {
            str(teacher["id"]): limit
            for teacher in inp["resources"]["teachers"]
            if (limit := effective_teacher_limit(teacher)) is not None
        },
        "capacityContractVersion": "solver-input-1.3",
    }
    return inp, scope


def safe_error_preview(request_id: str, status: str, message: str) -> dict[str, Any]:
    return {
        "schemaId": "ghf_schedule_preview_1.0",
        "previewVersion": "1.0",
        "proposalId": f"PREVIEW-{request_id}",
        "runId": f"RUN-{request_id}",
        "status": "REJECTED",
        "source": {},
        "summary": {"totalActivities": 0, "proposedAssignments": 0, "added": 0, "moved": 0, "unchanged": 0, "unassigned": 0, "preservedLocks": 0},
        "changes": [],
        "validation": {"solverStatus": status, "hardViolationCount": 0, "lockedChanges": 0, "validForAcceptance": False},
        "applyPolicy": {"mode": "NO_DIRECT_WRITE", "requiresExplicitAcceptance": True, "targetVersionMode": "CREATE_NEW_DRAFT", "directWriteAllowed": False},
        "message": message,
        "createdAt": utc_now(),
    }


def choose_engine(preference: str) -> tuple[str, dict[str, Any]]:
    available, version = ortools_available()
    if preference == "HYBRID" and not available:
        raise RuntimeError("ENGINE_UNAVAILABLE: OR-Tools no está instalado")
    if preference in {"AUTO", "HYBRID"} and available:
        from adapter_hibrido_p4_3 import solve as solve_hybrid  # type: ignore

        return "HYBRID", {"solve": solve_hybrid, "ortoolsAvailable": True, "ortoolsVersion": version}
    return "HEURISTIC", {"solve": solve_heuristic, "ortoolsAvailable": available, "ortoolsVersion": version, "fallbackReason": "OR-Tools no disponible" if preference == "AUTO" and not available else None}


def process_request(request: dict[str, Any], *, job_id: str | None = None, status_path: Path | None = None) -> dict[str, Any]:
    started = utc_now()
    t0 = time.perf_counter()
    request_id = str(request.get("requestId") or "REQ-UNKNOWN")
    response_id = f"RESP-P52-{uuid.uuid4().hex[:12].upper()}"
    errors = validate_request(request)
    if errors:
        message = "; ".join(errors)
        return {
            "schemaId": RESPONSE_SCHEMA,
            "contractVersion": "1.0",
            "responseId": response_id,
            "requestId": request_id,
            "jobId": job_id,
            "status": "ERROR",
            "createdAt": started,
            "finishedAt": utc_now(),
            "policy": {"directWriteAllowed": False, "requiresExplicitAcceptance": True, "targetMode": "CREATE_SEPARATE_PREVIEW"},
            "engine": {"selected": "NONE"},
            "scope": {},
            "solverOutput": None,
            "preview": safe_error_preview(request_id, "ERROR", message),
            "diagnostics": {"errors": errors, "warnings": []},
        }
    try:
        update_status(status_path, state="RUNNING", progress={"stage": "BUILD_INPUT", "assigned": 0, "elapsedMs": 0})
        solver_input, scope = build_solver_input(request)
        update_status(status_path, progress={"stage": "SELECT_ENGINE", "assigned": 0, "elapsedMs": round((time.perf_counter() - t0) * 1000)})
        engine_name, engine_meta = choose_engine(str(request.get("enginePreference") or "AUTO"))
        solve = engine_meta.pop("solve")
        update_status(status_path, progress={"stage": f"SOLVE_{engine_name}", "assigned": 0, "elapsedMs": round((time.perf_counter() - t0) * 1000)})
        base_output = solve(solver_input)
        update_status(status_path, progress={"stage": "QUALITY", "assigned": len(base_output.get("assignments") or []), "elapsedMs": round((time.perf_counter() - t0) * 1000)})
        quality_output = upgrade_output(solver_input, base_output)
        update_status(status_path, progress={"stage": "PREVIEW", "assigned": len(quality_output.get("assignments") or []), "elapsedMs": round((time.perf_counter() - t0) * 1000)})
        preview = generate_preview(solver_input, quality_output)
        if quality_output.get("qualityAnalysis"):
            preview["qualitySummary"] = quality_output["qualityAnalysis"].get("global")
        # Una reparación local nunca se presenta como validación global.
        if not scope["globalValidation"]:
            preview["validation"]["globalValidation"] = False
            preview["validation"]["validForAcceptance"] = preview["validation"].get("validForAcceptance", False)
            preview["scopeNotice"] = "La vista previa valida el alcance local solicitado; no sustituye una generación completa."
        status = str(quality_output.get("status") or "ERROR")
        warnings: list[str] = []
        if engine_meta.get("fallbackReason"):
            warnings.append(str(engine_meta["fallbackReason"]))
        if not scope["globalValidation"]:
            warnings.append("Validación local: se desactivaron reglas organizativas globales incompatibles con un subconjunto.")
        response = {
            "schemaId": RESPONSE_SCHEMA,
            "contractVersion": "1.0",
            "responseId": response_id,
            "requestId": request_id,
            "jobId": job_id,
            "status": status,
            "createdAt": started,
            "finishedAt": utc_now(),
            "timing": {"elapsedMs": round((time.perf_counter() - t0) * 1000)},
            "policy": {"directWriteAllowed": False, "requiresExplicitAcceptance": True, "targetMode": "CREATE_SEPARATE_PREVIEW"},
            "engine": {"requested": request.get("enginePreference"), "selected": engine_name, **engine_meta, "solver": quality_output.get("engine")},
            "scope": scope,
            "solverInputSummary": {
                "schemaId": solver_input.get("schemaId"),
                "run": solver_input.get("run"),
                "activityCount": len(solver_input.get("activities") or []),
                "inputSha256": sha256_data(solver_input),
            },
            "solverOutput": quality_output,
            "preview": preview,
            "diagnostics": {"errors": [], "warnings": warnings, "hardViolations": quality_output.get("hardViolations") or [], "error": quality_output.get("error")},
        }
        response["responseSha256"] = sha256_data({**response, "responseSha256": None})
        update_status(status_path, state="COMPLETED", progress={"stage": "DONE", "assigned": len(quality_output.get("assignments") or []), "elapsedMs": response["timing"]["elapsedMs"]})
        return response
    except Exception as exc:
        code = "PROCESSING_ERROR"
        text = str(exc)
        if ":" in text:
            code = text.split(":", 1)[0]
        response = {
            "schemaId": RESPONSE_SCHEMA,
            "contractVersion": "1.0",
            "responseId": response_id,
            "requestId": request_id,
            "jobId": job_id,
            "status": "ERROR",
            "createdAt": started,
            "finishedAt": utc_now(),
            "timing": {"elapsedMs": round((time.perf_counter() - t0) * 1000)},
            "policy": {"directWriteAllowed": False, "requiresExplicitAcceptance": True, "targetMode": "CREATE_SEPARATE_PREVIEW"},
            "engine": {"requested": request.get("enginePreference"), "selected": "NONE"},
            "scope": {},
            "solverOutput": None,
            "preview": safe_error_preview(request_id, "ERROR", text),
            "diagnostics": {"errors": [{"code": code, "message": text}], "warnings": []},
        }
        response["responseSha256"] = sha256_data({**response, "responseSha256": None})
        update_status(status_path, state="FAILED", progress={"stage": "ERROR", "assigned": 0, "elapsedMs": response["timing"]["elapsedMs"]}, error={"code": code, "message": text})
        return response


def main() -> int:
    parser = argparse.ArgumentParser(description="Procesa una solicitud P5-2 sin escribir sobre el proyecto de origen.")
    parser.add_argument("request")
    parser.add_argument("response")
    parser.add_argument("--job-id", default=None)
    parser.add_argument("--status", default=None)
    parser.add_argument("--dump-input", default=None)
    args = parser.parse_args()
    request_path = Path(args.request)
    response_path = Path(args.response)
    status_path = Path(args.status) if args.status else None
    request = read_json(request_path)
    if args.dump_input:
        try:
            solver_input, _ = build_solver_input(request)
            write_json(Path(args.dump_input), solver_input)
        except Exception:
            pass
    response = process_request(request, job_id=args.job_id, status_path=status_path)
    write_json(response_path, response)
    print(json.dumps({"status": response["status"], "preview": response.get("preview", {}).get("status"), "assigned": len((response.get("solverOutput") or {}).get("assignments") or []), "response": str(response_path)}, ensure_ascii=False))
    return 0 if response["status"] not in {"ERROR", "CANCELLED"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
