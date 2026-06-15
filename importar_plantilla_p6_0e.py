#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import io
import json
import math
import re
import stat
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path, PurePosixPath
from typing import Any

PHASE = "P6-0E"
VERSION = "0.6.2"
APP_NAME = "Gestor de Horarios Escolares"
MAX_XLSX_BYTES = 30_000_000
MAX_MEMBERS = 512
MAX_MEMBER_BYTES = 50_000_000
MAX_TOTAL_BYTES = 150_000_000
MAX_RATIO = 250

NS_MAIN = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NS_REL = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"

EXPECTED_HEADERS: dict[str, list[str]] = {
    "00_Resumen": ["INDICADOR", "VALOR", "ESTADO", "NOTA"],
    "01_Instrucciones": ["PASO", "ACCIÓN", "REGLA"],
    "10_Proyecto_Centro": [
        "codigo_proyecto*", "titulo_proyecto*", "estado*", "codigo_centro*",
        "nombre_centro*", "tipo_centro*", "comunidad_autonoma*", "localidad*",
        "curso_academico*", "fecha_inicio", "fecha_fin", "zona_horaria*",
        "naturaleza_datos*", "privacidad*", "notas",
    ],
    "11_Tiempo": [
        "tipo_registro*", "codigo*", "nombre*", "orden*", "tipo_tramo",
        "hora_inicio", "hora_fin", "cuenta_presencia",
    ],
    "20_Grupos": [
        "codigo_grupo*", "nombre*", "etapa*", "nivel", "seccion",
        "codigo_tutor", "codigo_espacio_base", "activo*",
    ],
    "21_Profesorado": [
        "codigo_docente*", "nombre_mostrar*", "fraccion_jornada*", "itinerante*",
        "tramos_presencia_semanal", "limite_lectivo_semanal*",
        "objetivo_no_lectivos", "activo*", "observaciones",
    ],
    "22_Profesorado_Detalle": [
        "codigo_docente*", "tipo_registro*", "codigo_detalle", "valor_tipo*",
        "valor_numero", "confirmado", "notas",
    ],
    "30_Materias": ["codigo_materia*", "nombre*", "categoria*", "codigo_oficial"],
    "31_Espacios": ["codigo_espacio*", "nombre*", "tipo*", "capacidad", "activo*"],
    "40_Necesidades": [
        "codigo_necesidad*", "codigo_grupo*", "codigo_materia*",
        "sesiones_semanales*", "duracion_tramos*", "modalidad*",
        "participantes_requeridos*", "modo_docente*", "modo_espacio*",
        "activo*", "observaciones",
    ],
    "41_Necesidad_Detalle": ["codigo_necesidad*", "tipo_requisito*", "valor*"],
    "50_Disponibilidad": [
        "codigo_docente*", "codigo_dia*", "codigo_tramo*", "estado*", "motivo",
    ],
    "60_Actividades": [
        "codigo_actividad*", "tipo*", "etiqueta*", "ocurrencias_semanales*",
        "codigo_espacio", "notas",
    ],
    "61_Actividad_Detalle": ["codigo_actividad*", "tipo_detalle*", "valor*"],
    "70_Restricciones": [
        "codigo_restriccion*", "tipo*", "dureza*", "ambito*", "peso",
        "activo*", "parametros_json*", "notas",
    ],
    "71_Configuracion": [
        "codigo_perfil*", "backend_preferido*", "semilla*",
        "limite_tiempo_segundos*", "modo_presencia_minima*",
        "tramos_lectivos_semanales_esperados*", "lectura_cuenta_como_lectiva*",
        "permitir_avisos_en_borrador*",
    ],
    "90_Control": ["CONTROL", "TIPO", "INCIDENCIAS", "CRITERIO"],
    "99_Listas": [
        "ESTADO_PROYECTO", "SI_NO", "REGISTRO_TIEMPO", "TIPO_TRAMO",
        "NATURALEZA", "PRIVACIDAD", "DETALLE_DOCENTE",
        "CATEGORIA_MATERIA", "MODALIDAD", "MODO_DOCENTE",
        "MODO_ESPACIO", "REQUISITO", "DISPONIBILIDAD", "ACTIVIDAD",
        "DETALLE_ACTIVIDAD", "DUREZA", "AMBITO", "BACKEND",
        "PRESENCIA",
    ],
}
EXPECTED_SHEETS = list(EXPECTED_HEADERS)
DATA_SHEETS = [
    "10_Proyecto_Centro", "11_Tiempo", "20_Grupos", "21_Profesorado",
    "22_Profesorado_Detalle", "30_Materias", "31_Espacios",
    "40_Necesidades", "41_Necesidad_Detalle", "50_Disponibilidad",
    "60_Actividades", "61_Actividad_Detalle", "70_Restricciones",
    "71_Configuracion",
]
SINGLE_ROW_SHEETS = {"10_Proyecto_Centro", "71_Configuracion"}
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
ACADEMIC_RE = re.compile(r"^20\d{2}/20\d{2}$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

ENUMS = {
    "status": {"DRAFT", "PREVALIDATED", "CANDIDATE", "ACCEPTED", "ARCHIVED"},
    "dataNature": {"REAL", "ANONYMIZED", "SYNTHETIC"},
    "privacy": {"PRIVATE", "INTERNAL", "SYNTHETIC", "PUBLIC"},
    "slotKind": {"LECTIVE", "RECESS", "READING", "ENTRY", "EXIT", "NON_LECTIVE"},
    "subjectCategory": {"CURRICULAR", "TUTORSHIP", "SUPPORT", "ORGANIZATIONAL", "OTHER"},
    "modality": {"STANDARD", "SHARED_TEACHING", "SUPPORT", "SPLIT_GROUP"},
    "teacherMode": {"ANY_QUALIFIED", "FIXED", "ALLOWED_SET"},
    "spaceMode": {"NONE", "HOME", "FIXED", "ALLOWED_SET"},
    "availability": {"AVAILABLE", "UNAVAILABLE", "PREFERRED", "AVOID"},
    "activityType": {"MEETING", "RECESS_DUTY", "COORDINATION", "GUARD", "LEADERSHIP", "OTHER"},
    "hardness": {"HARD", "SOFT"},
    "scope": {"CENTER", "GROUP", "TEACHER", "SUBJECT", "SPACE", "SESSION"},
    "backend": {"AUTO", "HYBRID", "CP_SAT", "HEURISTIC"},
    "presenceMode": {"BLOCKING", "WARNING"},
}


@dataclass
class Issue:
    code: str
    category: str
    message: str
    severity: str = "BLOCKING"
    sheet: str | None = None
    row: int | None = None
    field: str | None = None
    detail: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "category": self.category,
            "severity": self.severity,
            "sheet": self.sheet,
            "row": self.row,
            "field": self.field,
            "message": self.message,
            "detail": self.detail,
        }


@dataclass
class Preflight:
    filename: str
    source_sha256: str
    issues: list[Issue] = field(default_factory=list)
    workbook: dict[str, Any] = field(default_factory=dict)
    project: dict[str, Any] | None = None
    defaults_applied: list[str] = field(default_factory=list)

    def add(self, code: str, category: str, message: str, *, severity: str = "BLOCKING", sheet: str | None = None, row: int | None = None, field: str | None = None, detail: str | None = None):
        self.issues.append(Issue(code, category, message, severity, sheet, row, field, detail))

    @property
    def classification(self) -> str:
        categories = {i.category for i in self.issues if i.severity == "BLOCKING"}
        if "STRUCTURE" in categories:
            return "NO_IMPORTABLE"
        if "CONTRADICTION" in categories:
            return "CONTRADICTORIO"
        if "COMPLETENESS" in categories:
            return "INCOMPLETO"
        return "APTO"

    def public_report(self, include_project: bool = False) -> dict[str, Any]:
        project = self.project or {}
        summary = {
            "groups": len(project.get("groups", [])),
            "teachers": len(project.get("teachers", [])),
            "subjects": len(project.get("subjects", [])),
            "spaces": len(project.get("spaces", [])),
            "teachingNeeds": len(project.get("teachingNeeds", [])),
            "availability": len(project.get("availability", [])),
            "organizationalActivities": len(project.get("organizationalActivities", [])),
            "constraints": len(project.get("constraints", [])),
            "unplacedSessions": len((project.get("schedule") or {}).get("sessions", [])),
            "blocking": sum(1 for i in self.issues if i.severity == "BLOCKING"),
            "warnings": sum(1 for i in self.issues if i.severity == "WARNING"),
            "information": sum(1 for i in self.issues if i.severity == "INFO"),
        }
        result = {
            "schemaId": "ghf_template_preflight_1.0",
            "phase": PHASE,
            "version": VERSION,
            "classification": self.classification,
            "canGenerateGhfProject": self.classification == "APTO",
            "filename": self.filename,
            "sourceSha256": self.source_sha256,
            "summary": summary,
            "identityPreview": {
                "projectId": (project.get("identity") or {}).get("projectId"),
                "title": (project.get("identity") or {}).get("title"),
                "center": (project.get("center") or {}).get("name"),
                "academicYear": (project.get("academicYear") or {}).get("label"),
                "dataNature": (project.get("metadata") or {}).get("dataNature"),
                "privacyClassification": (project.get("metadata") or {}).get("privacyClassification"),
            },
            "workbook": self.workbook,
            "defaultsApplied": self.defaults_applied,
            "issues": [issue.to_dict() for issue in self.issues],
        }
        if include_project:
            result["project"] = self.project
        return result


class WorkbookStructureError(ValueError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def canonical_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def safe_zip_name(name: str) -> bool:
    p = PurePosixPath(name)
    return bool(name) and not name.startswith(("/", "\\")) and ".." not in p.parts and "\\" not in name and not re.match(r"^[A-Za-z]:", name)


def col_index(ref: str) -> int:
    letters = re.match(r"[A-Z]+", ref)
    if not letters:
        return 0
    value = 0
    for ch in letters.group(0):
        value = value * 26 + ord(ch) - 64
    return value - 1


def parse_scalar(value: str | None, cell_type: str | None, shared: list[str], inline_text: str | None) -> Any:
    if cell_type == "inlineStr":
        return inline_text or ""
    if value is None:
        return ""
    if cell_type == "s":
        try:
            return shared[int(value)]
        except Exception:
            return ""
    if cell_type == "b":
        return value == "1"
    if cell_type in {"str", "e"}:
        return value
    try:
        number = float(value)
        return int(number) if number.is_integer() else number
    except Exception:
        return value


def read_xlsx(data: bytes) -> dict[str, Any]:
    if len(data) > MAX_XLSX_BYTES:
        raise WorkbookStructureError("El XLSX supera el tamaño máximo permitido.")
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except Exception as exc:
        raise WorkbookStructureError(f"No es un XLSX ZIP válido: {exc}") from exc
    with archive:
        infos = archive.infolist()
        if len(infos) > MAX_MEMBERS:
            raise WorkbookStructureError("El XLSX contiene demasiados miembros internos.")
        total = 0
        names: list[str] = []
        for info in infos:
            name = info.filename
            names.append(name)
            total += info.file_size
            if not safe_zip_name(name):
                raise WorkbookStructureError(f"Ruta interna no permitida: {name}")
            if info.flag_bits & 1:
                raise WorkbookStructureError(f"Miembro interno cifrado: {name}")
            mode = (info.external_attr >> 16) & 0o170000
            if mode == stat.S_IFLNK:
                raise WorkbookStructureError(f"Enlace simbólico no permitido: {name}")
            if info.file_size > MAX_MEMBER_BYTES:
                raise WorkbookStructureError(f"Miembro interno demasiado grande: {name}")
            if info.compress_size and info.file_size / info.compress_size > MAX_RATIO:
                raise WorkbookStructureError(f"Relación de compresión excesiva: {name}")
        if total > MAX_TOTAL_BYTES:
            raise WorkbookStructureError("El XLSX descomprimido supera el límite permitido.")
        if len(names) != len(set(names)):
            raise WorkbookStructureError("El XLSX contiene rutas internas duplicadas.")
        if archive.testzip() is not None:
            raise WorkbookStructureError("El XLSX contiene un miembro dañado.")
        if any(name.lower().endswith("vbaproject.bin") for name in names):
            raise WorkbookStructureError("La plantilla no admite macros.")
        if any(name.startswith("xl/externalLinks/") for name in names):
            raise WorkbookStructureError("La plantilla no admite enlaces externos.")
        required = {"xl/workbook.xml", "xl/_rels/workbook.xml.rels"}
        if not required.issubset(names):
            raise WorkbookStructureError("Faltan componentes obligatorios del libro.")

        shared: list[str] = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", NS_MAIN):
                shared.append("".join((node.text or "") for node in item.findall(".//m:t", NS_MAIN)))

        workbook_root = ET.fromstring(archive.read("xl/workbook.xml"))
        rels_root = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_map = {item.attrib["Id"]: item.attrib["Target"].lstrip("/") for item in rels_root.findall("r:Relationship", NS_REL)}
        sheets: dict[str, list[list[Any]]] = {}
        for sheet in workbook_root.findall("m:sheets/m:sheet", NS_MAIN):
            name = sheet.attrib.get("name", "")
            rel_id = sheet.attrib.get(RID)
            target = rel_map.get(rel_id or "")
            if not target:
                raise WorkbookStructureError(f"No se puede resolver la hoja {name}.")
            member = target if target.startswith("xl/") else "xl/" + target
            if member not in names:
                raise WorkbookStructureError(f"Falta el XML de la hoja {name}.")
            root = ET.fromstring(archive.read(member))
            parsed_rows: list[list[Any]] = []
            for row in root.findall(".//m:sheetData/m:row", NS_MAIN):
                row_number = int(row.attrib.get("r", "0") or 0)
                cells: dict[int, Any] = {}
                for cell in row.findall("m:c", NS_MAIN):
                    ref = cell.attrib.get("r", "A1")
                    idx = col_index(ref)
                    ctype = cell.attrib.get("t")
                    v = cell.find("m:v", NS_MAIN)
                    inline = "".join((node.text or "") for node in cell.findall(".//m:t", NS_MAIN)) if ctype == "inlineStr" else None
                    cells[idx] = parse_scalar(v.text if v is not None else None, ctype, shared, inline)
                if cells:
                    width = max(cells) + 1
                    values = [cells.get(i, "") for i in range(width)]
                else:
                    values = []
                parsed_rows.append([row_number, values])
            sheets[name] = parsed_rows
        return {"sheets": sheets, "memberCount": len(infos), "uncompressedBytes": total}


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "SI" if value else "NO"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def is_blank(value: Any) -> bool:
    return clean_text(value) == ""


def parse_bool(value: Any) -> bool | None:
    text = clean_text(value).upper()
    if text in {"SI", "SÍ", "TRUE", "1", "YES"}:
        return True
    if text in {"NO", "FALSE", "0"}:
        return False
    return None


def parse_int(value: Any) -> int | None:
    if is_blank(value):
        return None
    try:
        number = float(value)
        if not math.isfinite(number) or not number.is_integer():
            return None
        return int(number)
    except Exception:
        return None


def parse_float(value: Any) -> float | None:
    if is_blank(value):
        return None
    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except Exception:
        return None


def parse_date(value: Any) -> str | None:
    if is_blank(value):
        return None
    if isinstance(value, (int, float)):
        try:
            return (datetime(1899, 12, 30) + timedelta(days=float(value))).date().isoformat()
        except Exception:
            return None
    text = clean_text(value)
    try:
        return datetime.fromisoformat(text).date().isoformat()
    except Exception:
        return None


def parse_time(value: Any) -> str | None:
    if is_blank(value):
        return None
    if isinstance(value, (int, float)):
        fraction = float(value) % 1
        minutes = int(round(fraction * 24 * 60)) % (24 * 60)
        return f"{minutes // 60:02d}:{minutes % 60:02d}"
    text = clean_text(value)
    if re.match(r"^\d{1,2}:\d{2}(:\d{2})?$", text):
        parts = text.split(":")
        candidate = f"{int(parts[0]):02d}:{int(parts[1]):02d}"
        return candidate if TIME_RE.match(candidate) else None
    return None


def rows_for_sheet(workbook: dict[str, Any], sheet: str) -> tuple[list[str], list[dict[str, Any]]]:
    rows = workbook["sheets"].get(sheet, [])
    row_map = {number: values for number, values in rows}
    headers = [clean_text(x) for x in row_map.get(4, [])]
    expected = EXPECTED_HEADERS[sheet]
    data: list[dict[str, Any]] = []
    if sheet in SINGLE_ROW_SHEETS:
        candidate_rows = [5]
    else:
        candidate_rows = sorted(number for number in row_map if number >= 5)
    for number in candidate_rows:
        values = row_map.get(number, [])
        padded = list(values) + [""] * max(0, len(expected) - len(values))
        if not any(not is_blank(value) for value in padded[:len(expected)]):
            continue
        data.append({"_row": number, **{expected[idx].rstrip("*"): padded[idx] for idx in range(len(expected))}})
    return headers, data


def require_fields(pf: Preflight, sheet: str, row: dict[str, Any], fields: list[str]):
    for field_name in fields:
        if is_blank(row.get(field_name)):
            pf.add("REQUIRED_FIELD_MISSING", "COMPLETENESS", f"Falta el campo obligatorio «{field_name}».", sheet=sheet, row=row.get("_row"), field=field_name)


def check_enum(pf: Preflight, value: Any, allowed: set[str], *, sheet: str, row: int, field: str, category: str = "CONTRADICTION") -> str | None:
    text = clean_text(value).upper()
    if not text:
        return None
    if text not in allowed:
        pf.add("INVALID_ENUM", category, f"Valor no permitido en {field}: {text}.", sheet=sheet, row=row, field=field, detail=", ".join(sorted(allowed)))
        return None
    return text


def check_id(pf: Preflight, value: Any, *, sheet: str, row: int, field: str) -> str | None:
    text = clean_text(value)
    if not text:
        return None
    if not ID_RE.match(text):
        pf.add("INVALID_ID", "CONTRADICTION", f"Identificador no válido: {text}.", sheet=sheet, row=row, field=field)
        return None
    return text


def duplicate_issues(pf: Preflight, values: list[tuple[str, int]], sheet: str, label: str):
    seen: dict[str, int] = {}
    for value, row in values:
        if not value:
            continue
        if value in seen:
            pf.add("DUPLICATE_ID", "CONTRADICTION", f"{label} duplicado: {value}.", sheet=sheet, row=row, field="codigo", detail=f"Primera aparición en fila {seen[value]}.")
        else:
            seen[value] = row


def build_project(pf: Preflight, workbook: dict[str, Any]) -> dict[str, Any] | None:
    extracted: dict[str, list[dict[str, Any]]] = {}
    for sheet in DATA_SHEETS:
        headers, rows = rows_for_sheet(workbook, sheet)
        if headers != EXPECTED_HEADERS[sheet]:
            pf.add("HEADER_MISMATCH", "STRUCTURE", f"Los encabezados de {sheet} no coinciden con la plantilla P6-0D.", sheet=sheet, detail=f"Esperado: {EXPECTED_HEADERS[sheet]} · Observado: {headers}")
        extracted[sheet] = rows
    if pf.classification == "NO_IMPORTABLE":
        return None

    project_rows = extracted["10_Proyecto_Centro"]
    config_rows = extracted["71_Configuracion"]
    if len(project_rows) != 1:
        pf.add("PROJECT_ROW_COUNT", "COMPLETENESS", "Debe existir exactamente una fila de proyecto y centro.", sheet="10_Proyecto_Centro", detail=str(len(project_rows)))
    if len(config_rows) != 1:
        pf.add("CONFIG_ROW_COUNT", "COMPLETENESS", "Debe existir exactamente una fila de configuración.", sheet="71_Configuracion", detail=str(len(config_rows)))
    p_row = project_rows[0] if project_rows else {"_row": 5}
    c_row = config_rows[0] if config_rows else {"_row": 5}

    require_fields(pf, "10_Proyecto_Centro", p_row, [
        "codigo_proyecto", "titulo_proyecto", "estado", "codigo_centro",
        "nombre_centro", "tipo_centro", "comunidad_autonoma", "localidad",
        "curso_academico", "zona_horaria", "naturaleza_datos", "privacidad",
    ])
    require_fields(pf, "71_Configuracion", c_row, [
        "codigo_perfil", "backend_preferido", "semilla", "limite_tiempo_segundos",
        "modo_presencia_minima", "tramos_lectivos_semanales_esperados",
        "lectura_cuenta_como_lectiva", "permitir_avisos_en_borrador",
    ])

    now = utc_now()
    project_id = check_id(pf, p_row.get("codigo_proyecto"), sheet="10_Proyecto_Centro", row=p_row.get("_row", 5), field="codigo_proyecto") or clean_text(p_row.get("codigo_proyecto")) or "PENDING-PROJECT"
    center_id = check_id(pf, p_row.get("codigo_centro"), sheet="10_Proyecto_Centro", row=p_row.get("_row", 5), field="codigo_centro") or clean_text(p_row.get("codigo_centro")) or "PENDING-CENTER"
    original_status = check_enum(pf, p_row.get("estado"), ENUMS["status"], sheet="10_Proyecto_Centro", row=p_row.get("_row", 5), field="estado")
    data_nature = check_enum(pf, p_row.get("naturaleza_datos"), ENUMS["dataNature"], sheet="10_Proyecto_Centro", row=p_row.get("_row", 5), field="naturaleza_datos") or "REAL"
    privacy = check_enum(pf, p_row.get("privacidad"), ENUMS["privacy"], sheet="10_Proyecto_Centro", row=p_row.get("_row", 5), field="privacidad") or "PRIVATE"
    academic_year = clean_text(p_row.get("curso_academico"))
    if academic_year and not ACADEMIC_RE.match(academic_year):
        pf.add("INVALID_ACADEMIC_YEAR", "CONTRADICTION", "El curso académico debe tener formato 2026/2027.", sheet="10_Proyecto_Centro", row=p_row.get("_row"), field="curso_academico")
    start_date = parse_date(p_row.get("fecha_inicio"))
    end_date = parse_date(p_row.get("fecha_fin"))
    if not is_blank(p_row.get("fecha_inicio")) and not start_date:
        pf.add("INVALID_DATE", "CONTRADICTION", "Fecha de inicio no válida.", sheet="10_Proyecto_Centro", row=p_row.get("_row"), field="fecha_inicio")
    if not is_blank(p_row.get("fecha_fin")) and not end_date:
        pf.add("INVALID_DATE", "CONTRADICTION", "Fecha de fin no válida.", sheet="10_Proyecto_Centro", row=p_row.get("_row"), field="fecha_fin")
    if start_date and end_date and start_date > end_date:
        pf.add("DATE_RANGE_CONTRADICTION", "CONTRADICTION", "La fecha de inicio es posterior a la fecha de fin.", sheet="10_Proyecto_Centro", row=p_row.get("_row"))
    if original_status and original_status != "DRAFT":
        pf.add("STATUS_RESET_TO_DRAFT", "POLICY", f"El estado {original_status} se reinicia a DRAFT porque toda plantilla importada requiere revalidación.", severity="INFO", sheet="10_Proyecto_Centro", row=p_row.get("_row"), field="estado")

    days: list[dict[str, Any]] = []
    slots: list[dict[str, Any]] = []
    day_ids: list[tuple[str, int]] = []
    slot_ids: list[tuple[str, int]] = []
    for row in extracted["11_Tiempo"]:
        require_fields(pf, "11_Tiempo", row, ["tipo_registro", "codigo", "nombre", "orden"])
        kind = clean_text(row.get("tipo_registro")).upper()
        item_id = check_id(pf, row.get("codigo"), sheet="11_Tiempo", row=row["_row"], field="codigo") or clean_text(row.get("codigo"))
        order = parse_int(row.get("orden"))
        if order is None or order < 1:
            pf.add("INVALID_ORDER", "CONTRADICTION", "El orden debe ser un entero positivo.", sheet="11_Tiempo", row=row["_row"], field="orden")
        if kind == "DAY":
            day_ids.append((item_id, row["_row"]))
            days.append({"id": item_id, "label": clean_text(row.get("nombre")), "order": order or 1})
        elif kind == "SLOT":
            require_fields(pf, "11_Tiempo", row, ["tipo_tramo", "hora_inicio", "hora_fin"])
            slot_kind = check_enum(pf, row.get("tipo_tramo"), ENUMS["slotKind"], sheet="11_Tiempo", row=row["_row"], field="tipo_tramo") or "LECTIVE"
            start = parse_time(row.get("hora_inicio"))
            end = parse_time(row.get("hora_fin"))
            if not start:
                pf.add("INVALID_TIME", "CONTRADICTION", "Hora de inicio no válida.", sheet="11_Tiempo", row=row["_row"], field="hora_inicio")
            if not end:
                pf.add("INVALID_TIME", "CONTRADICTION", "Hora de fin no válida.", sheet="11_Tiempo", row=row["_row"], field="hora_fin")
            if start and end and start >= end:
                pf.add("TIME_RANGE_CONTRADICTION", "CONTRADICTION", "La hora de inicio debe ser anterior a la hora de fin.", sheet="11_Tiempo", row=row["_row"])
            counts = parse_bool(row.get("cuenta_presencia"))
            if not is_blank(row.get("cuenta_presencia")) and counts is None:
                pf.add("INVALID_BOOLEAN", "CONTRADICTION", "cuenta_presencia debe ser SI o NO.", sheet="11_Tiempo", row=row["_row"], field="cuenta_presencia")
            slot_ids.append((item_id, row["_row"]))
            slot = {"id": item_id, "label": clean_text(row.get("nombre")), "order": order or 1, "kind": slot_kind, "start": start or "00:00", "end": end or "00:01"}
            if counts is not None:
                slot["countsPresence"] = counts
            slots.append(slot)
        else:
            pf.add("INVALID_TIME_RECORD_TYPE", "CONTRADICTION", "tipo_registro debe ser DAY o SLOT.", sheet="11_Tiempo", row=row["_row"], field="tipo_registro")
    if not days:
        pf.add("NO_DAYS", "COMPLETENESS", "Debe existir al menos un día.", sheet="11_Tiempo")
    if not slots:
        pf.add("NO_SLOTS", "COMPLETENESS", "Debe existir al menos un tramo.", sheet="11_Tiempo")
    duplicate_issues(pf, day_ids, "11_Tiempo", "Día")
    duplicate_issues(pf, slot_ids, "11_Tiempo", "Tramo")
    if len({d["order"] for d in days}) != len(days):
        pf.add("DUPLICATE_DAY_ORDER", "CONTRADICTION", "Hay días con el mismo orden.", sheet="11_Tiempo")
    if len({s["order"] for s in slots}) != len(slots):
        pf.add("DUPLICATE_SLOT_ORDER", "CONTRADICTION", "Hay tramos con el mismo orden.", sheet="11_Tiempo")

    groups: list[dict[str, Any]] = []
    group_ids: list[tuple[str, int]] = []
    for row in extracted["20_Grupos"]:
        require_fields(pf, "20_Grupos", row, ["codigo_grupo", "nombre", "etapa", "activo"])
        gid = check_id(pf, row.get("codigo_grupo"), sheet="20_Grupos", row=row["_row"], field="codigo_grupo") or clean_text(row.get("codigo_grupo"))
        active = parse_bool(row.get("activo"))
        if active is None:
            pf.add("INVALID_BOOLEAN", "CONTRADICTION", "activo debe ser SI o NO.", sheet="20_Grupos", row=row["_row"], field="activo")
        group_ids.append((gid, row["_row"]))
        groups.append({
            "id": gid, "name": clean_text(row.get("nombre")), "stage": clean_text(row.get("etapa")),
            "level": clean_text(row.get("nivel")) or None, "section": clean_text(row.get("seccion")) or None,
            "tutorTeacherId": clean_text(row.get("codigo_tutor")) or None,
            "homeSpaceId": clean_text(row.get("codigo_espacio_base")) or None,
            "active": True if active is None else active,
        })
    if not groups:
        pf.add("NO_GROUPS", "COMPLETENESS", "Debe existir al menos un grupo.", sheet="20_Grupos")
    duplicate_issues(pf, group_ids, "20_Grupos", "Grupo")

    teachers: list[dict[str, Any]] = []
    teacher_ids: list[tuple[str, int]] = []
    teacher_map: dict[str, dict[str, Any]] = {}
    for row in extracted["21_Profesorado"]:
        require_fields(pf, "21_Profesorado", row, ["codigo_docente", "nombre_mostrar", "fraccion_jornada", "itinerante", "limite_lectivo_semanal", "activo"])
        tid = check_id(pf, row.get("codigo_docente"), sheet="21_Profesorado", row=row["_row"], field="codigo_docente") or clean_text(row.get("codigo_docente"))
        fraction = parse_float(row.get("fraccion_jornada"))
        if fraction is None or fraction <= 0 or fraction > 1:
            pf.add("INVALID_EMPLOYMENT_FRACTION", "CONTRADICTION", "fraccion_jornada debe ser mayor que 0 y menor o igual que 1.", sheet="21_Profesorado", row=row["_row"], field="fraccion_jornada")
        itinerant = parse_bool(row.get("itinerante"))
        active = parse_bool(row.get("activo"))
        if itinerant is None:
            pf.add("INVALID_BOOLEAN", "CONTRADICTION", "itinerante debe ser SI o NO.", sheet="21_Profesorado", row=row["_row"], field="itinerante")
        if active is None:
            pf.add("INVALID_BOOLEAN", "CONTRADICTION", "activo debe ser SI o NO.", sheet="21_Profesorado", row=row["_row"], field="activo")
        presence = parse_int(row.get("tramos_presencia_semanal"))
        lective = parse_float(row.get("limite_lectivo_semanal"))
        non_lective = parse_float(row.get("objetivo_no_lectivos"))
        if lective is None or lective < 0:
            pf.add("INVALID_WORKLOAD", "CONTRADICTION", "limite_lectivo_semanal debe ser un número no negativo.", sheet="21_Profesorado", row=row["_row"], field="limite_lectivo_semanal")
        if presence is not None and presence < 0:
            pf.add("INVALID_PRESENCE", "CONTRADICTION", "tramos_presencia_semanal no puede ser negativo.", sheet="21_Profesorado", row=row["_row"], field="tramos_presencia_semanal")
        teacher = {
            "id": tid, "displayName": clean_text(row.get("nombre_mostrar")), "specialties": [],
            "employment": {"fraction": fraction or 1.0, "itinerant": False if itinerant is None else itinerant},
            "workload": {"weeklyLectiveLimit": lective or 0, "reductions": []},
            "roles": [], "active": True if active is None else active,
        }
        if presence is not None:
            teacher["employment"]["weeklyPresenceSlots"] = presence
        if non_lective is not None:
            teacher["workload"]["targetNonLectiveSlots"] = non_lective
        teacher_ids.append((tid, row["_row"]))
        teachers.append(teacher)
        teacher_map[tid] = teacher
    if not teachers:
        pf.add("NO_TEACHERS", "COMPLETENESS", "Debe existir al menos un docente.", sheet="21_Profesorado")
    duplicate_issues(pf, teacher_ids, "21_Profesorado", "Docente")

    for row in extracted["22_Profesorado_Detalle"]:
        require_fields(pf, "22_Profesorado_Detalle", row, ["codigo_docente", "tipo_registro", "valor_tipo"])
        tid = clean_text(row.get("codigo_docente"))
        teacher = teacher_map.get(tid)
        if not teacher:
            pf.add("UNKNOWN_TEACHER_DETAIL", "CONTRADICTION", f"El detalle referencia un docente inexistente: {tid}.", sheet="22_Profesorado_Detalle", row=row["_row"], field="codigo_docente")
            continue
        detail_type = clean_text(row.get("tipo_registro")).upper()
        value_type = clean_text(row.get("valor_tipo"))
        if detail_type == "SPECIALTY":
            if value_type and value_type not in teacher["specialties"]:
                teacher["specialties"].append(value_type)
        elif detail_type == "REDUCTION":
            reduction_id = check_id(pf, row.get("codigo_detalle"), sheet="22_Profesorado_Detalle", row=row["_row"], field="codigo_detalle")
            weekly = parse_float(row.get("valor_numero"))
            if not reduction_id:
                pf.add("REDUCTION_ID_REQUIRED", "COMPLETENESS", "Una reducción requiere codigo_detalle.", sheet="22_Profesorado_Detalle", row=row["_row"], field="codigo_detalle")
            if weekly is None or weekly < 0:
                pf.add("REDUCTION_VALUE_INVALID", "CONTRADICTION", "Una reducción requiere valor_numero no negativo.", sheet="22_Profesorado_Detalle", row=row["_row"], field="valor_numero")
            teacher["workload"]["reductions"].append({"id": reduction_id or f"PENDING-RED-{row['_row']}", "type": value_type, "weeklySlots": weekly or 0, "notes": clean_text(row.get("notas")) or None})
        elif detail_type == "ROLE":
            confirmed = parse_bool(row.get("confirmado"))
            if not is_blank(row.get("confirmado")) and confirmed is None:
                pf.add("INVALID_BOOLEAN", "CONTRADICTION", "confirmado debe ser SI o NO.", sheet="22_Profesorado_Detalle", row=row["_row"], field="confirmado")
            teacher["roles"].append({"type": value_type, "confirmed": False if confirmed is None else confirmed, "notes": clean_text(row.get("notas")) or None})
        else:
            pf.add("UNKNOWN_TEACHER_DETAIL_TYPE", "CONTRADICTION", f"Tipo de detalle docente no reconocido: {detail_type}.", sheet="22_Profesorado_Detalle", row=row["_row"], field="tipo_registro")

    subjects: list[dict[str, Any]] = []
    subject_ids: list[tuple[str, int]] = []
    for row in extracted["30_Materias"]:
        require_fields(pf, "30_Materias", row, ["codigo_materia", "nombre", "categoria"])
        sid = check_id(pf, row.get("codigo_materia"), sheet="30_Materias", row=row["_row"], field="codigo_materia") or clean_text(row.get("codigo_materia"))
        category = check_enum(pf, row.get("categoria"), ENUMS["subjectCategory"], sheet="30_Materias", row=row["_row"], field="categoria") or "OTHER"
        subject_ids.append((sid, row["_row"]))
        subjects.append({"id": sid, "name": clean_text(row.get("nombre")), "category": category, "code": clean_text(row.get("codigo_oficial")) or None})
    if not subjects:
        pf.add("NO_SUBJECTS", "COMPLETENESS", "Debe existir al menos una materia.", sheet="30_Materias")
    duplicate_issues(pf, subject_ids, "30_Materias", "Materia")

    spaces: list[dict[str, Any]] = []
    space_ids: list[tuple[str, int]] = []
    for row in extracted["31_Espacios"]:
        require_fields(pf, "31_Espacios", row, ["codigo_espacio", "nombre", "tipo", "activo"])
        sid = check_id(pf, row.get("codigo_espacio"), sheet="31_Espacios", row=row["_row"], field="codigo_espacio") or clean_text(row.get("codigo_espacio"))
        capacity = parse_int(row.get("capacidad"))
        if not is_blank(row.get("capacidad")) and (capacity is None or capacity < 0):
            pf.add("INVALID_CAPACITY", "CONTRADICTION", "La capacidad debe ser un entero no negativo.", sheet="31_Espacios", row=row["_row"], field="capacidad")
        active = parse_bool(row.get("activo"))
        if active is None:
            pf.add("INVALID_BOOLEAN", "CONTRADICTION", "activo debe ser SI o NO.", sheet="31_Espacios", row=row["_row"], field="activo")
        space_ids.append((sid, row["_row"]))
        spaces.append({"id": sid, "name": clean_text(row.get("nombre")), "type": clean_text(row.get("tipo")), "capacity": capacity, "active": True if active is None else active})
    if not spaces:
        pf.add("NO_SPACES", "COMPLETENESS", "Debe existir al menos un espacio.", sheet="31_Espacios")
    duplicate_issues(pf, space_ids, "31_Espacios", "Espacio")

    needs: list[dict[str, Any]] = []
    need_ids: list[tuple[str, int]] = []
    need_map: dict[str, dict[str, Any]] = {}
    for row in extracted["40_Necesidades"]:
        require_fields(pf, "40_Necesidades", row, ["codigo_necesidad", "codigo_grupo", "codigo_materia", "sesiones_semanales", "duracion_tramos", "modalidad", "participantes_requeridos", "modo_docente", "modo_espacio", "activo"])
        nid = check_id(pf, row.get("codigo_necesidad"), sheet="40_Necesidades", row=row["_row"], field="codigo_necesidad") or clean_text(row.get("codigo_necesidad"))
        weekly = parse_int(row.get("sesiones_semanales"))
        duration = parse_int(row.get("duracion_tramos"))
        participants = parse_int(row.get("participantes_requeridos"))
        if weekly is None or weekly < 1:
            pf.add("INVALID_WEEKLY_SESSIONS", "CONTRADICTION", "sesiones_semanales debe ser un entero positivo.", sheet="40_Necesidades", row=row["_row"], field="sesiones_semanales")
        if duration is None or duration < 1:
            pf.add("INVALID_DURATION", "CONTRADICTION", "duracion_tramos debe ser un entero positivo.", sheet="40_Necesidades", row=row["_row"], field="duracion_tramos")
        if participants is None or participants < 1:
            pf.add("INVALID_PARTICIPANTS", "CONTRADICTION", "participantes_requeridos debe ser un entero positivo.", sheet="40_Necesidades", row=row["_row"], field="participantes_requeridos")
        modality = check_enum(pf, row.get("modalidad"), ENUMS["modality"], sheet="40_Necesidades", row=row["_row"], field="modalidad") or "STANDARD"
        teacher_mode = check_enum(pf, row.get("modo_docente"), ENUMS["teacherMode"], sheet="40_Necesidades", row=row["_row"], field="modo_docente") or "ANY_QUALIFIED"
        space_mode = check_enum(pf, row.get("modo_espacio"), ENUMS["spaceMode"], sheet="40_Necesidades", row=row["_row"], field="modo_espacio") or "NONE"
        active = parse_bool(row.get("activo"))
        if active is None:
            pf.add("INVALID_BOOLEAN", "CONTRADICTION", "activo debe ser SI o NO.", sheet="40_Necesidades", row=row["_row"], field="activo")
        need = {
            "id": nid, "groupId": clean_text(row.get("codigo_grupo")), "subjectId": clean_text(row.get("codigo_materia")),
            "weeklySessions": weekly or 1, "durationSlots": duration or 1, "modality": modality,
            "participantsRequired": participants or 1,
            "teacherRequirement": {"mode": teacher_mode, "fixedTeacherIds": [], "allowedTeacherIds": [], "requiredSpecialties": []},
            "spaceRequirement": {"mode": space_mode, "fixedSpaceId": None, "allowedSpaceIds": []},
            "active": True if active is None else active,
        }
        need_ids.append((nid, row["_row"]))
        needs.append(need)
        need_map[nid] = need
    if not needs:
        pf.add("NO_TEACHING_NEEDS", "COMPLETENESS", "Debe existir al menos una necesidad lectiva.", sheet="40_Necesidades")
    duplicate_issues(pf, need_ids, "40_Necesidades", "Necesidad")

    for row in extracted["41_Necesidad_Detalle"]:
        require_fields(pf, "41_Necesidad_Detalle", row, ["codigo_necesidad", "tipo_requisito", "valor"])
        nid = clean_text(row.get("codigo_necesidad"))
        need = need_map.get(nid)
        if not need:
            pf.add("UNKNOWN_NEED_DETAIL", "CONTRADICTION", f"El detalle referencia una necesidad inexistente: {nid}.", sheet="41_Necesidad_Detalle", row=row["_row"], field="codigo_necesidad")
            continue
        req_type = clean_text(row.get("tipo_requisito")).upper()
        value = clean_text(row.get("valor"))
        if req_type == "FIXED_TEACHER":
            need["teacherRequirement"]["fixedTeacherIds"].append(value)
        elif req_type == "ALLOWED_TEACHER":
            need["teacherRequirement"]["allowedTeacherIds"].append(value)
        elif req_type == "REQUIRED_SPECIALTY":
            need["teacherRequirement"]["requiredSpecialties"].append(value)
        elif req_type == "FIXED_SPACE":
            if need["spaceRequirement"].get("fixedSpaceId") and need["spaceRequirement"]["fixedSpaceId"] != value:
                pf.add("MULTIPLE_FIXED_SPACES", "CONTRADICTION", "Una necesidad no puede tener más de un espacio fijo.", sheet="41_Necesidad_Detalle", row=row["_row"], field="valor")
            need["spaceRequirement"]["fixedSpaceId"] = value
        elif req_type == "ALLOWED_SPACE":
            need["spaceRequirement"]["allowedSpaceIds"].append(value)
        else:
            pf.add("UNKNOWN_NEED_REQUIREMENT_TYPE", "CONTRADICTION", f"Tipo de requisito no reconocido: {req_type}.", sheet="41_Necesidad_Detalle", row=row["_row"], field="tipo_requisito")

    day_set = {x["id"] for x in days}
    slot_set = {x["id"] for x in slots}
    group_set = {x["id"] for x in groups}
    teacher_set = {x["id"] for x in teachers}
    subject_set = {x["id"] for x in subjects}
    space_set = {x["id"] for x in spaces}

    for group in groups:
        if group.get("tutorTeacherId") and group["tutorTeacherId"] not in teacher_set:
            pf.add("UNKNOWN_TUTOR", "CONTRADICTION", f"El grupo {group['id']} referencia un tutor inexistente.", sheet="20_Grupos", field="codigo_tutor", detail=group["tutorTeacherId"])
        if group.get("homeSpaceId") and group["homeSpaceId"] not in space_set:
            pf.add("UNKNOWN_HOME_SPACE", "CONTRADICTION", f"El grupo {group['id']} referencia un espacio base inexistente.", sheet="20_Grupos", field="codigo_espacio_base", detail=group["homeSpaceId"])

    for need in needs:
        if need["groupId"] not in group_set:
            pf.add("UNKNOWN_NEED_GROUP", "CONTRADICTION", f"La necesidad {need['id']} referencia un grupo inexistente.", sheet="40_Necesidades", detail=need["groupId"])
        if need["subjectId"] not in subject_set:
            pf.add("UNKNOWN_NEED_SUBJECT", "CONTRADICTION", f"La necesidad {need['id']} referencia una materia inexistente.", sheet="40_Necesidades", detail=need["subjectId"])
        tr = need["teacherRequirement"]
        sr = need["spaceRequirement"]
        for tid in tr["fixedTeacherIds"] + tr["allowedTeacherIds"]:
            if tid not in teacher_set:
                pf.add("UNKNOWN_NEED_TEACHER", "CONTRADICTION", f"La necesidad {need['id']} referencia un docente inexistente.", sheet="41_Necesidad_Detalle", detail=tid)
        for sid in ([sr["fixedSpaceId"]] if sr.get("fixedSpaceId") else []) + sr["allowedSpaceIds"]:
            if sid not in space_set:
                pf.add("UNKNOWN_NEED_SPACE", "CONTRADICTION", f"La necesidad {need['id']} referencia un espacio inexistente.", sheet="41_Necesidad_Detalle", detail=sid)
        if tr["mode"] == "FIXED" and len(set(tr["fixedTeacherIds"])) < need["participantsRequired"]:
            pf.add("INSUFFICIENT_FIXED_TEACHERS", "COMPLETENESS", f"La necesidad {need['id']} requiere {need['participantsRequired']} participantes y no tiene suficientes docentes fijos.", sheet="41_Necesidad_Detalle")
        if tr["mode"] == "ALLOWED_SET" and len(set(tr["allowedTeacherIds"])) < need["participantsRequired"]:
            pf.add("INSUFFICIENT_ALLOWED_TEACHERS", "COMPLETENESS", f"La necesidad {need['id']} requiere {need['participantsRequired']} participantes y el conjunto permitido es insuficiente.", sheet="41_Necesidad_Detalle")
        if tr["mode"] == "ANY_QUALIFIED" and not tr["requiredSpecialties"]:
            pf.add("ANY_QUALIFIED_WITHOUT_SPECIALTY", "COMPLETENESS", f"La necesidad {need['id']} usa ANY_QUALIFIED pero no declara especialidad requerida.", sheet="41_Necesidad_Detalle")
        if sr["mode"] == "HOME":
            group = next((g for g in groups if g["id"] == need["groupId"]), None)
            if group and not group.get("homeSpaceId"):
                pf.add("HOME_SPACE_MISSING", "COMPLETENESS", f"La necesidad {need['id']} usa HOME pero el grupo no tiene espacio base.", sheet="20_Grupos")
        if sr["mode"] == "FIXED" and not sr.get("fixedSpaceId"):
            pf.add("FIXED_SPACE_MISSING", "COMPLETENESS", f"La necesidad {need['id']} usa FIXED pero no declara espacio fijo.", sheet="41_Necesidad_Detalle")
        if sr["mode"] == "ALLOWED_SET" and not sr["allowedSpaceIds"]:
            pf.add("ALLOWED_SPACES_MISSING", "COMPLETENESS", f"La necesidad {need['id']} usa ALLOWED_SET pero no declara espacios permitidos.", sheet="41_Necesidad_Detalle")

    availability: list[dict[str, Any]] = []
    availability_keys: list[tuple[str, int]] = []
    for row in extracted["50_Disponibilidad"]:
        require_fields(pf, "50_Disponibilidad", row, ["codigo_docente", "codigo_dia", "codigo_tramo", "estado"])
        tid = clean_text(row.get("codigo_docente")); did = clean_text(row.get("codigo_dia")); sid = clean_text(row.get("codigo_tramo"))
        status = check_enum(pf, row.get("estado"), ENUMS["availability"], sheet="50_Disponibilidad", row=row["_row"], field="estado") or "AVAILABLE"
        key = f"{tid}|{did}|{sid}"
        availability_keys.append((key, row["_row"]))
        if tid not in teacher_set:
            pf.add("UNKNOWN_AVAILABILITY_TEACHER", "CONTRADICTION", "La disponibilidad referencia un docente inexistente.", sheet="50_Disponibilidad", row=row["_row"], detail=tid)
        if did not in day_set:
            pf.add("UNKNOWN_AVAILABILITY_DAY", "CONTRADICTION", "La disponibilidad referencia un día inexistente.", sheet="50_Disponibilidad", row=row["_row"], detail=did)
        if sid not in slot_set:
            pf.add("UNKNOWN_AVAILABILITY_SLOT", "CONTRADICTION", "La disponibilidad referencia un tramo inexistente.", sheet="50_Disponibilidad", row=row["_row"], detail=sid)
        availability.append({"teacherId": tid, "dayId": did, "slotId": sid, "status": status, "reason": clean_text(row.get("motivo")) or None})
    duplicate_issues(pf, availability_keys, "50_Disponibilidad", "Disponibilidad docente-día-tramo")

    activities: list[dict[str, Any]] = []
    activity_ids: list[tuple[str, int]] = []
    activity_map: dict[str, dict[str, Any]] = {}
    for row in extracted["60_Actividades"]:
        require_fields(pf, "60_Actividades", row, ["codigo_actividad", "tipo", "etiqueta", "ocurrencias_semanales"])
        aid = check_id(pf, row.get("codigo_actividad"), sheet="60_Actividades", row=row["_row"], field="codigo_actividad") or clean_text(row.get("codigo_actividad"))
        activity_type = check_enum(pf, row.get("tipo"), ENUMS["activityType"], sheet="60_Actividades", row=row["_row"], field="tipo") or "OTHER"
        occurrences = parse_int(row.get("ocurrencias_semanales"))
        if occurrences is None or occurrences < 1:
            pf.add("INVALID_ACTIVITY_OCCURRENCES", "CONTRADICTION", "ocurrencias_semanales debe ser un entero positivo.", sheet="60_Actividades", row=row["_row"], field="ocurrencias_semanales")
        activity = {"id": aid, "type": activity_type, "label": clean_text(row.get("etiqueta")), "weeklyOccurrences": occurrences or 1, "participantTeacherIds": [], "participantGroupIds": [], "allowedDayIds": [], "allowedSlotIds": [], "spaceId": clean_text(row.get("codigo_espacio")) or None}
        activity_ids.append((aid, row["_row"])); activities.append(activity); activity_map[aid] = activity
    duplicate_issues(pf, activity_ids, "60_Actividades", "Actividad")
    for row in extracted["61_Actividad_Detalle"]:
        require_fields(pf, "61_Actividad_Detalle", row, ["codigo_actividad", "tipo_detalle", "valor"])
        aid = clean_text(row.get("codigo_actividad")); activity = activity_map.get(aid)
        if not activity:
            pf.add("UNKNOWN_ACTIVITY_DETAIL", "CONTRADICTION", f"El detalle referencia una actividad inexistente: {aid}.", sheet="61_Actividad_Detalle", row=row["_row"])
            continue
        detail_type = clean_text(row.get("tipo_detalle")).upper(); value = clean_text(row.get("valor"))
        if detail_type == "TEACHER": activity["participantTeacherIds"].append(value)
        elif detail_type == "GROUP": activity["participantGroupIds"].append(value)
        elif detail_type == "DAY": activity["allowedDayIds"].append(value)
        elif detail_type == "SLOT": activity["allowedSlotIds"].append(value)
        else: pf.add("UNKNOWN_ACTIVITY_DETAIL_TYPE", "CONTRADICTION", f"Tipo de detalle de actividad no reconocido: {detail_type}.", sheet="61_Actividad_Detalle", row=row["_row"])
    for activity in activities:
        if activity.get("spaceId") and activity["spaceId"] not in space_set:
            pf.add("UNKNOWN_ACTIVITY_SPACE", "CONTRADICTION", f"La actividad {activity['id']} referencia un espacio inexistente.", sheet="60_Actividades", detail=activity["spaceId"])
        for tid in activity["participantTeacherIds"]:
            if tid not in teacher_set: pf.add("UNKNOWN_ACTIVITY_TEACHER", "CONTRADICTION", f"La actividad {activity['id']} referencia un docente inexistente.", sheet="61_Actividad_Detalle", detail=tid)
        for gid in activity["participantGroupIds"]:
            if gid not in group_set: pf.add("UNKNOWN_ACTIVITY_GROUP", "CONTRADICTION", f"La actividad {activity['id']} referencia un grupo inexistente.", sheet="61_Actividad_Detalle", detail=gid)
        for did in activity["allowedDayIds"]:
            if did not in day_set: pf.add("UNKNOWN_ACTIVITY_DAY", "CONTRADICTION", f"La actividad {activity['id']} referencia un día inexistente.", sheet="61_Actividad_Detalle", detail=did)
        for sid in activity["allowedSlotIds"]:
            if sid not in slot_set: pf.add("UNKNOWN_ACTIVITY_SLOT", "CONTRADICTION", f"La actividad {activity['id']} referencia un tramo inexistente.", sheet="61_Actividad_Detalle", detail=sid)
        if not activity["participantTeacherIds"] and not activity["participantGroupIds"]:
            pf.add("ACTIVITY_WITHOUT_PARTICIPANTS", "COMPLETENESS", f"La actividad {activity['id']} no tiene participantes.", sheet="61_Actividad_Detalle")

    constraints: list[dict[str, Any]] = []
    constraint_ids: list[tuple[str, int]] = []
    for row in extracted["70_Restricciones"]:
        require_fields(pf, "70_Restricciones", row, ["codigo_restriccion", "tipo", "dureza", "ambito", "activo", "parametros_json"])
        cid = check_id(pf, row.get("codigo_restriccion"), sheet="70_Restricciones", row=row["_row"], field="codigo_restriccion") or clean_text(row.get("codigo_restriccion"))
        hardness = check_enum(pf, row.get("dureza"), ENUMS["hardness"], sheet="70_Restricciones", row=row["_row"], field="dureza") or "HARD"
        scope = check_enum(pf, row.get("ambito"), ENUMS["scope"], sheet="70_Restricciones", row=row["_row"], field="ambito") or "CENTER"
        weight = parse_float(row.get("peso"))
        if not is_blank(row.get("peso")) and (weight is None or weight < 0):
            pf.add("INVALID_CONSTRAINT_WEIGHT", "CONTRADICTION", "El peso debe ser un número no negativo.", sheet="70_Restricciones", row=row["_row"], field="peso")
        active = parse_bool(row.get("activo"))
        if active is None: pf.add("INVALID_BOOLEAN", "CONTRADICTION", "activo debe ser SI o NO.", sheet="70_Restricciones", row=row["_row"], field="activo")
        try:
            parameters = json.loads(clean_text(row.get("parametros_json")) or "{}")
            if not isinstance(parameters, dict): raise ValueError("no es objeto")
        except Exception as exc:
            parameters = {}
            pf.add("INVALID_CONSTRAINT_JSON", "CONTRADICTION", "parametros_json debe contener un objeto JSON válido.", sheet="70_Restricciones", row=row["_row"], field="parametros_json", detail=str(exc))
        constraint_ids.append((cid, row["_row"]))
        constraints.append({"id": cid, "type": clean_text(row.get("tipo")), "hardness": hardness, "scope": scope, "weight": weight, "active": False if active is None else active, "parameters": parameters})
    duplicate_issues(pf, constraint_ids, "70_Restricciones", "Restricción")

    backend = check_enum(pf, c_row.get("backend_preferido"), ENUMS["backend"], sheet="71_Configuracion", row=c_row.get("_row", 5), field="backend_preferido") or "AUTO"
    presence_mode = check_enum(pf, c_row.get("modo_presencia_minima"), ENUMS["presenceMode"], sheet="71_Configuracion", row=c_row.get("_row", 5), field="modo_presencia_minima") or "BLOCKING"
    seed = parse_int(c_row.get("semilla")); time_limit = parse_int(c_row.get("limite_tiempo_segundos")); expected_slots = parse_int(c_row.get("tramos_lectivos_semanales_esperados"))
    if seed is None or seed < 0 or seed > 2147483647: pf.add("INVALID_SEED", "CONTRADICTION", "La semilla debe ser un entero entre 0 y 2147483647.", sheet="71_Configuracion", row=c_row.get("_row"), field="semilla")
    if time_limit is None or not (1 <= time_limit <= 86400): pf.add("INVALID_TIME_LIMIT", "CONTRADICTION", "El límite de tiempo debe estar entre 1 y 86400 segundos.", sheet="71_Configuracion", row=c_row.get("_row"), field="limite_tiempo_segundos")
    if expected_slots is None or expected_slots < 1: pf.add("INVALID_EXPECTED_SLOTS", "CONTRADICTION", "Los tramos lectivos esperados deben ser un entero positivo.", sheet="71_Configuracion", row=c_row.get("_row"), field="tramos_lectivos_semanales_esperados")
    count_reading = parse_bool(c_row.get("lectura_cuenta_como_lectiva")); allow_warnings = parse_bool(c_row.get("permitir_avisos_en_borrador"))
    if count_reading is None: pf.add("INVALID_BOOLEAN", "CONTRADICTION", "lectura_cuenta_como_lectiva debe ser SI o NO.", sheet="71_Configuracion", row=c_row.get("_row"), field="lectura_cuenta_como_lectiva")
    if allow_warnings is None: pf.add("INVALID_BOOLEAN", "CONTRADICTION", "permitir_avisos_en_borrador debe ser SI o NO.", sheet="71_Configuracion", row=c_row.get("_row"), field="permitir_avisos_en_borrador")

    sessions: list[dict[str, Any]] = []
    for need in needs:
        if not need.get("active", True):
            continue
        tr = need["teacherRequirement"]
        teacher_ids_for_session = list(dict.fromkeys(tr["fixedTeacherIds"])) if tr["mode"] == "FIXED" else []
        for occurrence in range(1, need["weeklySessions"] + 1):
            sessions.append({
                "id": f"SESSION:{need['id']}:{occurrence}", "state": "UNPLACED",
                "sourceNeedId": need["id"], "organizationalActivityId": None,
                "subjectId": need["subjectId"], "teacherIds": teacher_ids_for_session,
                "groupIds": [need["groupId"]], "placement": None, "locked": False,
                "lockReason": None, "origin": "IMPORTED",
            })
    for activity in activities:
        for occurrence in range(1, activity["weeklyOccurrences"] + 1):
            sessions.append({
                "id": f"SESSION:{activity['id']}:{occurrence}", "state": "UNPLACED",
                "sourceNeedId": None, "organizationalActivityId": activity["id"],
                "subjectId": None, "teacherIds": list(dict.fromkeys(activity["participantTeacherIds"])),
                "groupIds": list(dict.fromkeys(activity["participantGroupIds"])),
                "placement": None, "locked": False, "lockReason": None,
                "origin": "IMPORTED",
            })
    pf.add("UNPLACED_SESSIONS_MATERIALIZED", "POLICY", f"Se materializaron {len(sessions)} sesiones sin colocar a partir de necesidades y actividades.", severity="INFO")
    pf.add("DEFAULT_OBJECTIVES_APPLIED", "POLICY", "La plantilla P6-0D no contiene una hoja de objetivos; se aplica el perfil contractual BALANCED documentado.", severity="INFO", sheet="71_Configuracion")
    pf.defaults_applied.extend(["solverConfiguration.objectives: MINIMIZE-GAPS=1.0", "solverConfiguration.objectives: BALANCE-DAILY-LOAD=0.8", "identity.status: DRAFT", "schedule.status: DRAFT"])

    project = {
        "schemaId": "ghf_project_1.0", "schemaVersion": "1.0.0",
        "identity": {
            "projectId": project_id, "title": clean_text(p_row.get("titulo_proyecto")) or "Proyecto pendiente",
            "status": "DRAFT", "createdAt": now, "updatedAt": now,
            "contractId": "GHFPROJECT-1.0", "description": None,
        },
        "center": {
            "centerId": center_id, "name": clean_text(p_row.get("nombre_centro")) or "Centro pendiente",
            "centerType": clean_text(p_row.get("tipo_centro")) or "PENDIENTE",
            "autonomousCommunity": clean_text(p_row.get("comunidad_autonoma")) or "Pendiente",
            "locality": clean_text(p_row.get("localidad")) or "Pendiente", "responsibleRole": None,
        },
        "academicYear": {"label": academic_year or "2026/2027", "startDate": start_date, "endDate": end_date},
        "timeModel": {"days": sorted(days, key=lambda x: x["order"]), "slots": sorted(slots, key=lambda x: x["order"]), "timezone": clean_text(p_row.get("zona_horaria")) or "Europe/Madrid"},
        "groups": groups, "teachers": teachers, "subjects": subjects, "spaces": spaces,
        "teachingNeeds": needs, "availability": availability,
        "organizationalActivities": activities, "constraints": constraints,
        "workflowPolicy": {
            "directWriteAllowed": False, "previewRequired": True,
            "explicitAcceptanceRequired": True, "repairCreatesCopy": True,
            "blockHardConflicts": True, "importedDraftRequiresRevalidation": True,
            "allowWarningsInDraft": True if allow_warnings is None else allow_warnings,
            "automaticPlacement": False,
        },
        "solverConfiguration": {
            "profileId": check_id(pf, c_row.get("codigo_perfil"), sheet="71_Configuracion", row=c_row.get("_row", 5), field="codigo_perfil") or "PROFILE-BALANCED",
            "backendPreference": backend, "seed": seed or 0, "timeLimitSeconds": time_limit or 120,
            "objectives": [
                {"id": "MINIMIZE-GAPS", "weight": 1.0, "enabled": True},
                {"id": "BALANCE-DAILY-LOAD", "weight": 0.8, "enabled": True},
            ],
            "prevalidation": {"minimumPresenceMode": presence_mode, "weeklyLectiveSlotsExpected": expected_slots or 1, "countReadingAsLective": False if count_reading is None else count_reading},
        },
        "schedule": {"status": "DRAFT", "sessions": sessions, "candidateId": None, "acceptedAt": None},
        "metadata": {
            "dataNature": data_nature, "privacyClassification": privacy,
            "sourcePhase": "P6-0D", "sourceApplicationVersion": "0.6.1",
            "importedAt": now, "notes": clean_text(p_row.get("notas")) or None,
            "tags": ["P6-0E", "XLSX_TEMPLATE_IMPORT"],
        },
        "extensionReferences": [],
    }
    return project


def preflight_xlsx(data: bytes, filename: str = "plantilla.xlsx", include_project: bool = False) -> dict[str, Any]:
    pf = Preflight(filename=Path(filename).name, source_sha256=hashlib.sha256(data).hexdigest())
    try:
        workbook = read_xlsx(data)
        pf.workbook = {"sheetNames": list(workbook["sheets"]), "sheetCount": len(workbook["sheets"]), "memberCount": workbook["memberCount"], "uncompressedBytes": workbook["uncompressedBytes"]}
        missing = [sheet for sheet in EXPECTED_SHEETS if sheet not in workbook["sheets"]]
        extra = [sheet for sheet in workbook["sheets"] if sheet not in EXPECTED_SHEETS]
        if missing:
            pf.add("MISSING_SHEETS", "STRUCTURE", "Faltan hojas obligatorias de P6-0D.", detail=", ".join(missing))
        if extra:
            pf.add("EXTRA_SHEETS", "STRUCTURE", "El libro contiene hojas no contractuales; se ignorarán.", severity="WARNING", detail=", ".join(extra))
        for sheet in EXPECTED_SHEETS:
            if sheet not in workbook["sheets"]:
                continue
            row_map = {number: values for number, values in workbook["sheets"][sheet]}
            headers = [clean_text(x) for x in row_map.get(4, [])]
            if headers != EXPECTED_HEADERS[sheet]:
                pf.add("HEADER_MISMATCH", "STRUCTURE", f"Los encabezados de {sheet} no coinciden con el contrato P6-0D.", sheet=sheet, detail=f"Esperado: {EXPECTED_HEADERS[sheet]} · Observado: {headers}")
        if pf.classification != "NO_IMPORTABLE":
            pf.project = build_project(pf, workbook)
    except WorkbookStructureError as exc:
        pf.add("WORKBOOK_NOT_IMPORTABLE", "STRUCTURE", str(exc))
    except Exception as exc:
        pf.add("UNEXPECTED_IMPORT_ERROR", "STRUCTURE", "No se pudo analizar la plantilla.", detail=f"{type(exc).__name__}: {exc}")
    return pf.public_report(include_project=include_project)


def build_container(project: dict[str, Any], report: dict[str, Any]) -> bytes:
    if report.get("classification") != "APTO":
        raise ValueError(f"La plantilla no es apta: {report.get('classification')}")
    now = utc_now()
    project_bytes = canonical_json_bytes(project)
    audit_event = {
        "eventId": "AUDIT:P6-0E:IMPORT",
        "timestamp": now,
        "type": "XLSX_TEMPLATE_IMPORTED",
        "sourceFilename": report.get("filename"),
        "sourceSha256": report.get("sourceSha256"),
        "classification": report.get("classification"),
        "directWriteAllowed": False,
        "automaticPlacement": False,
        "unplacedSessions": report.get("summary", {}).get("unplacedSessions", 0),
    }
    audit_bytes = (json.dumps(audit_event, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    preflight_copy = dict(report)
    preflight_copy.pop("project", None)
    preflight_bytes = canonical_json_bytes(preflight_copy)
    index = {
        "schemaId": "ghf_traceability_index_1.0",
        "entries": [
            {"path": "traceability/audit.jsonl", "type": "AUDIT_LOG"},
            {"path": "traceability/import/preflight.json", "type": "IMPORT_PREFLIGHT"},
        ],
    }
    index_bytes = canonical_json_bytes(index)
    data_nature = project["metadata"]["dataNature"]
    privacy_classification = project["metadata"]["privacyClassification"]
    contains_personal = data_nature == "REAL"
    intended_use = "SYNTHETIC_TEST" if data_nature == "SYNTHETIC" else "ANONYMIZED_EXAMPLE" if data_nature == "ANONYMIZED" else "PRIVATE_CENTER_PROJECT"
    envelope = {
        "containerSchemaId": "ghf_container_1.0", "containerVersion": "1.0.0",
        "projectSchemaId": "ghf_project_1.0", "projectSchemaVersion": "1.0.0",
        "projectId": project["identity"]["projectId"], "createdAt": project["identity"]["createdAt"], "savedAt": now,
        "application": {"name": APP_NAME, "version": VERSION, "phase": "P6-0E-IMPORTADOR-PREFLIGHT"},
        "compatibility": {"minimumReaderVersion": "0.6.0", "maximumTestedReaderVersion": VERSION, "migrationRequired": False, "sourceSchemaId": "ghf_template_p6_0d", "sourceSchemaVersion": "0.6.1"},
        "integrity": {"algorithm": "SHA-256", "manifestPath": "manifest.sha256", "projectPath": "project.json", "projectSha256": hashlib.sha256(project_bytes).hexdigest()},
        "privacy": {"containsPersonalData": contains_personal, "intendedUse": intended_use, "publicReleaseAllowed": False, "classification": privacy_classification},
        "capabilities": {"required": ["CANONICAL_PROJECT", "EXPLICIT_ACCEPTANCE", "NO_DIRECT_WRITE"], "optional": ["XLSX_TEMPLATE_IMPORT", "UNPLACED_SESSION_MATERIALIZATION"]},
    }
    files = {
        "project.json": project_bytes,
        "traceability/audit.jsonl": audit_bytes,
        "traceability/import/preflight.json": preflight_bytes,
        "traceability/index.json": index_bytes,
    }
    envelope_bytes = canonical_json_bytes(envelope)
    files["envelope.json"] = envelope_bytes
    manifest = "".join(f"{hashlib.sha256(files[name]).hexdigest()}  {name}\n" for name in sorted(files)).encode("utf-8")
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(files):
            archive.writestr(name, files[name])
        archive.writestr("manifest.sha256", manifest)
    return output.getvalue()


def convert_xlsx_to_ghfproject(data: bytes, filename: str = "plantilla.xlsx") -> tuple[dict[str, Any], bytes | None]:
    report = preflight_xlsx(data, filename, include_project=True)
    project = report.pop("project", None)
    if report["classification"] != "APTO" or project is None:
        return report, None
    return report, build_container(project, report)


def safe_output_filename(report: dict[str, Any]) -> str:
    preview = report.get("identityPreview") or {}
    project_id = re.sub(r"[^A-Za-z0-9._-]+", "_", str(preview.get("projectId") or "Proyecto"))
    year = re.sub(r"[^0-9]+", "_", str(preview.get("academicYear") or "curso")).strip("_")
    return f"{project_id}_{year}_P6_0E.ghfproject"
