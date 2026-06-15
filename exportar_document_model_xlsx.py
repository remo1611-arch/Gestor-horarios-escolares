#!/usr/bin/env python3
from __future__ import annotations

import argparse
import io
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from typing import Any, Iterable

MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
SCHEMA = "ghf_document_model_1.0"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def safe_text(value: Any, limit: int = 32767) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list, tuple)):
        value = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    text = str(value)
    text = text.replace("\x00", "")
    return text if len(text) <= limit else text[: limit - 1] + "…"


def yes_no(value: Any) -> str:
    return "Sí" if bool(value) else "No"


def join_list(value: Any, sep: str = ", ") -> str:
    if not value:
        return ""
    if isinstance(value, (list, tuple)):
        return sep.join(safe_text(x) for x in value)
    return safe_text(value)


def column_letter(index: int) -> str:
    out = ""
    while index:
        index, rem = divmod(index - 1, 26)
        out = chr(65 + rem) + out
    return out


def safe_sheet_name(name: str, used: set[str]) -> str:
    value = re.sub(r"[\\/*?:\[\]]", "_", name).strip() or "Hoja"
    value = value[:31]
    base = value
    suffix = 2
    while value.lower() in used:
        tail = f"_{suffix}"
        value = (base[: 31 - len(tail)] + tail)
        suffix += 1
    used.add(value.lower())
    return value


def xml_text(value: Any) -> str:
    return escape(safe_text(value), quote=False)


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


class XlsxSheet:
    def __init__(
        self,
        name: str,
        title: str,
        warning: str,
        headers: list[str],
        rows: list[list[Any]],
        widths: list[float] | None = None,
        numeric_columns: set[int] | None = None,
        decimal_columns: set[int] | None = None,
        freeze_row: int = 3,
        autofilter: bool = True,
        section_rows: set[int] | None = None,
    ):
        self.name = name
        self.title = title
        self.warning = warning
        self.headers = headers
        self.rows = rows
        self.widths = widths or [18.0] * max(1, len(headers))
        self.numeric_columns = numeric_columns or set()
        self.decimal_columns = decimal_columns or set()
        self.freeze_row = freeze_row
        self.autofilter = autofilter
        self.section_rows = section_rows or set()

    def to_xml(self) -> str:
        col_count = max(1, len(self.headers))
        last_col = column_letter(col_count)
        data_start = 4
        last_row = max(3, data_start - 1 + len(self.rows))
        dimension = f"A1:{last_col}{last_row}"
        cols = []
        for idx in range(1, col_count + 1):
            width = self.widths[idx - 1] if idx - 1 < len(self.widths) else 18.0
            cols.append(f'<col min="{idx}" max="{idx}" width="{float(width):.2f}" customWidth="1"/>')

        rows_xml: list[str] = []
        rows_xml.append(self._row_xml(1, [self.title] + [None] * (col_count - 1), style=1, height=26))
        rows_xml.append(self._row_xml(2, [self.warning] + [None] * (col_count - 1), style=2, height=30))
        rows_xml.append(self._row_xml(3, self.headers, style=3, height=24))
        for offset, values in enumerate(self.rows, start=data_start):
            style = 7 if offset in self.section_rows else None
            rows_xml.append(self._row_xml(offset, values, style=style))

        pane = ""
        if self.freeze_row > 0:
            pane = (
                f'<pane ySplit="{self.freeze_row}" topLeftCell="A{self.freeze_row + 1}" '
                'activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A4" sqref="A4"/>'
            )
        filter_xml = ""
        if self.autofilter and self.headers:
            filter_xml = f'<autoFilter ref="A3:{last_col}{last_row}"/>'
        merges = (
            f'<mergeCells count="2"><mergeCell ref="A1:{last_col}1"/>'
            f'<mergeCell ref="A2:{last_col}2"/></mergeCells>'
        )
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f'<dimension ref="{dimension}"/><sheetViews><sheetView workbookViewId="0">{pane}</sheetView></sheetViews>'
            '<sheetFormatPr defaultRowHeight="15"/>'
            f'<cols>{"".join(cols)}</cols><sheetData>{"".join(rows_xml)}</sheetData>{filter_xml}{merges}'
            '<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>'
            '</worksheet>'
        )

    def _row_xml(self, row_number: int, values: list[Any], style: int | None = None, height: int | None = None) -> str:
        attrs = [f'r="{row_number}"']
        if height:
            attrs.extend([f'ht="{height}"', 'customHeight="1"'])
        cells: list[str] = []
        col_count = max(len(self.headers), len(values))
        padded = list(values) + [None] * (col_count - len(values))
        for col_index, value in enumerate(padded, start=1):
            ref = f"{column_letter(col_index)}{row_number}"
            cell_style = style
            if cell_style is None:
                if col_index - 1 in self.decimal_columns and isinstance(value, float) and not value.is_integer():
                    cell_style = 6
                elif col_index - 1 in self.numeric_columns or is_number(value):
                    cell_style = 5
                else:
                    cell_style = 4
            if value is None:
                cells.append(f'<c r="{ref}" s="{cell_style}"/>')
            elif is_number(value):
                cells.append(f'<c r="{ref}" s="{cell_style}"><v>{value}</v></c>')
            else:
                text = xml_text(value)
                cells.append(
                    f'<c r="{ref}" s="{cell_style}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>'
                )
        return f'<row {" ".join(attrs)}>{"".join(cells)}</row>'


def warning_text(model: dict[str, Any]) -> str:
    metadata = model.get("metadata") or {}
    label = safe_text(metadata.get("natureLabel") or "DATOS DEL PROYECTO")
    warning = safe_text(metadata.get("natureWarning") or "Revisar antes de utilizar como horario definitivo.")
    return f"{label} · {warning}"


def title_prefix(model: dict[str, Any]) -> str:
    metadata = model.get("metadata") or {}
    return f"{safe_text(metadata.get('center') or 'Centro')} · {safe_text(metadata.get('course') or '')}".strip(" ·")


def build_sheets(model: dict[str, Any]) -> list[XlsxSheet]:
    if model.get("schemaId") != SCHEMA:
        raise ValueError(f"Esquema no admitido: {model.get('schemaId')!r}; se esperaba {SCHEMA!r}")

    metadata = model.get("metadata") or {}
    metrics = model.get("metrics") or {}
    quality = model.get("quality") or {}
    validation = model.get("validation") or {}
    trace = model.get("traceability") or {}
    entities = model.get("entities") or {}
    collections = model.get("collections") or {}
    sessions = model.get("sessions") or []
    warning = warning_text(model)
    prefix = title_prefix(model)

    sheets: list[XlsxSheet] = []

    summary_rows: list[list[Any]] = [
        ["PROYECTO", None, None, None],
        ["Centro", metadata.get("center"), "Curso", metadata.get("course")],
        ["Proyecto", metadata.get("projectId") or "—", "Estado", metadata.get("projectStatus")],
        ["Fase", metadata.get("projectPhase"), "Versión", metadata.get("projectVersion")],
        ["Escenario", metadata.get("scenarioLabel"), "Naturaleza", metadata.get("dataNature")],
        ["Generado", model.get("generatedAt"), "DocumentModel", model.get("schemaId")],
        ["MÉTRICAS", None, None, None],
        ["Sesiones fuente", metrics.get("sourceSessionCount"), "Colocadas", metrics.get("placedSessionCount")],
        ["Sin colocar", metrics.get("unplacedSessionCount"), "Multipersona", metrics.get("multiParticipantCount")],
        ["Grupos", len(entities.get("groups") or []), "Docentes", len(entities.get("teachers") or [])],
        ["Espacios", len(entities.get("spaces") or []), "Recreos", metrics.get("breakCount")],
        ["Reuniones", metrics.get("meetingCount"), "Apoyos", metrics.get("supportCount")],
        ["VALIDACIÓN", None, None, None],
        ["Veredicto estructural", (validation.get("structural") or {}).get("verdict"), "Bloqueos", (validation.get("schedule") or {}).get("blockers")],
        ["Revisiones", (validation.get("schedule") or {}).get("reviews"), "Completo", yes_no((validation.get("schedule") or {}).get("complete"))],
        ["CALIDAD", None, None, None],
        ["Infracciones obligatorias", quality.get("hardViolationCount"), "Penalización", quality.get("softPenalty")],
        ["Calidad normalizada", quality.get("normalizedQuality"), "Preferencias activas", quality.get("activePreferenceCount")],
        ["Preferencias satisfechas", quality.get("satisfiedPreferenceCount"), "Asignaciones", quality.get("assignmentCount")],
    ]
    sheets.append(
        XlsxSheet(
            "Resumen",
            f"Resumen del horario · {prefix}",
            warning,
            ["Indicador", "Valor", "Indicador", "Valor"],
            summary_rows,
            [28, 45, 28, 45],
            numeric_columns={1, 3},
            decimal_columns={1, 3},
            autofilter=False,
            section_rows={4, 10, 16, 19},
        )
    )

    teacher_by_id = {str(x.get("id")): x for x in entities.get("teachers") or []}
    group_by_id = {str(x.get("id")): x for x in entities.get("groups") or []}

    group_rows = []
    for g in entities.get("groups") or []:
        tutor = teacher_by_id.get(str(g.get("tutorId"))) or {}
        group_rows.append([
            g.get("id"), g.get("nombre"), g.get("etapa"), g.get("nivel"), g.get("linea"),
            g.get("tutorId"), tutor.get("nombre") or g.get("tutorTexto"), yes_no(g.get("activo", True)),
            g.get("sourceId"), g.get("observaciones"),
        ])
    sheets.append(XlsxSheet("Grupos", f"Grupos · {prefix}", warning,
        ["ID", "Grupo", "Etapa", "Nivel", "Línea", "Tutor ID", "Tutor/a", "Activo", "Origen", "Observaciones"],
        group_rows, [16, 24, 16, 12, 10, 16, 30, 10, 18, 35]))

    teacher_rows = []
    for t in entities.get("teachers") or []:
        teacher_rows.append([
            t.get("id"), t.get("nombre"), t.get("especialidad"), t.get("tipoDocente"), t.get("jornada"),
            yes_no(t.get("itinerante")), t.get("centroBase"), t.get("diasPresenciaTexto"), t.get("cargoFuncion"),
            t.get("ldObjetivo"), t.get("dcObjetivo"), t.get("reduccionObjetivo"), t.get("sourceStatus"),
            t.get("sourceConfidence"), t.get("controlExcel"), t.get("observaciones"),
        ])
    sheets.append(XlsxSheet("Docentes", f"Docentes · {prefix}", warning,
        ["ID", "Nombre", "Especialidad", "Tipo", "Jornada", "Itinerante", "Centro base", "Días/presencia", "Cargo", "LD", "DC", "Reducción", "Estado fuente", "Confianza", "Control", "Observaciones"],
        teacher_rows, [15, 32, 28, 18, 14, 11, 18, 38, 24, 8, 8, 10, 22, 12, 35, 40], numeric_columns={9,10,11}))

    space_rows = []
    for s in entities.get("spaces") or []:
        space_rows.append([
            s.get("id"), s.get("nombre"), s.get("concurrentCapacity"), s.get("siteId"), yes_no(s.get("virtual")),
            join_list(s.get("features")),
        ])
    sheets.append(XlsxSheet("Espacios", f"Espacios · {prefix}", warning,
        ["ID", "Espacio", "Capacidad concurrente", "Sede", "Derivado", "Características"],
        space_rows, [18, 32, 20, 18, 12, 40], numeric_columns={2}))

    session_headers = [
        "ID", "Actividad", "Categoría", "Subtipo", "Grupo ID", "Grupo", "Docentes ID", "Docentes",
        "Espacio ID", "Espacio", "Día ID", "Día", "Tramo ID", "Tramo", "Colocada", "Bloqueada",
        "Origen", "Estado fuente", "Notas",
    ]
    def session_row(s: dict[str, Any]) -> list[Any]:
        return [
            s.get("id"), s.get("title"), s.get("category"), s.get("organizationalSubtype"), s.get("groupId"),
            s.get("groupName"), join_list(s.get("teacherIds")), join_list(s.get("teacherNames")), s.get("spaceId"),
            s.get("spaceName"), s.get("dayId"), s.get("dayName"), s.get("timeSlotId"), s.get("timeSlotName"),
            yes_no(s.get("placed")), yes_no(s.get("locked")), s.get("source"), s.get("sourceStatus"), s.get("notes"),
        ]
    session_widths = [20, 27, 15, 20, 16, 23, 24, 38, 18, 26, 12, 14, 14, 16, 11, 11, 25, 22, 42]
    sheets.append(XlsxSheet("Sesiones", f"Sesiones · {prefix}", warning, session_headers,
        [session_row(s) for s in sessions], session_widths))

    for sheet_name, title, collection_key in [
        ("Recreos", "Cuadrante de recreos", "breaks"),
        ("Reuniones", "Reuniones", "meetings"),
        ("Apoyos", "Apoyos y docencia compartida", "supports"),
    ]:
        rows = [session_row(s) for s in collections.get(collection_key) or []]
        if not rows:
            rows = [["Sin registros"] + [None] * (len(session_headers) - 1)]
        sheets.append(XlsxSheet(sheet_name, f"{title} · {prefix}", warning, session_headers, rows, session_widths))

    leadership_rows = []
    for item in collections.get("leadership") or []:
        t = item.get("teacher") or {}
        cap = item.get("capacity") or {}
        leadership_rows.append([
            t.get("id"), t.get("nombre"), t.get("cargoFuncion"), t.get("especialidad"),
            t.get("reduccionObjetivo"), cap.get("effective"), cap.get("capacity"), cap.get("assigned"),
            cap.get("remaining"), t.get("ldObjetivo"), t.get("dcObjetivo"), len(item.get("sessions") or []),
        ])
    sheets.append(XlsxSheet("Equipo_directivo", f"Equipo directivo · {prefix}", warning,
        ["ID", "Docente", "Cargo", "Especialidad", "Reducción", "Límite efectivo", "Capacidad", "Lectivas asignadas", "Restantes", "LD", "DC", "Actividades totales"],
        leadership_rows, [15, 32, 24, 28, 12, 15, 12, 18, 11, 8, 8, 18], numeric_columns={4,5,6,7,8,9,10,11}))

    structural = validation.get("structural") or {}
    schedule = validation.get("schedule") or {}
    validation_rows: list[list[Any]] = [
        ["RESUMEN", None, None, None, None],
        ["Veredicto", structural.get("verdict"), "Bloqueos", schedule.get("blockers"), None],
        ["Revisiones", schedule.get("reviews"), "Sin colocar", schedule.get("unplaced"), None],
        ["Total", schedule.get("total"), "Completo", yes_no(schedule.get("complete")), None],
        ["INCIDENCIAS", None, None, None, None],
    ]
    issues = structural.get("issues") or schedule.get("issues") or []
    if issues:
        for issue in issues:
            validation_rows.append([
                issue.get("severity") or issue.get("severidad"), issue.get("code") or issue.get("codigo"),
                issue.get("description") or issue.get("message") or issue.get("descripcion"),
                issue.get("entity") or issue.get("entidad"), issue.get("id") or issue.get("entityId"),
            ])
    else:
        validation_rows.append(["Sin incidencias", None, None, None, None])
    sheets.append(XlsxSheet("Validacion", f"Validación · {prefix}", warning,
        ["Severidad/Indicador", "Código/Valor", "Descripción/Indicador", "Entidad/Valor", "ID"],
        validation_rows, [22, 22, 60, 28, 24], numeric_columns={1,3}, autofilter=False,
        section_rows={4,8}))

    quality_rows = [[key, value] for key, value in quality.items()]
    sheets.append(XlsxSheet("Calidad", f"Calidad · {prefix}", warning,
        ["Indicador", "Valor"], quality_rows, [36, 24], numeric_columns={1}, decimal_columns={1}))

    trace_rows: list[list[Any]] = [
        ["PROYECTO", None, None, None],
        ["Proyecto", trace.get("projectId") or "—", None, None],
        ["Esquema", trace.get("schemaId"), None, None],
        ["Fase", trace.get("phaseId"), None, None],
        ["Versión", trace.get("appVersion"), None, None],
        ["Estado", trace.get("status"), None, None],
        ["Proyecto base SHA-256", trace.get("baseProjectSha256"), None, None],
        ["Salida solver SHA-256", trace.get("solverOutputSha256"), None, None],
        ["Proyecto aceptado SHA-256", trace.get("acceptedProjectSha256"), None, None],
        ["AUDITORÍA", None, None, None],
        ["Fecha", "Acción", "Responsable", "Detalle"],
    ]
    audit_start = len(trace_rows) + 3
    for item in trace.get("auditLog") or []:
        trace_rows.append([item.get("timestamp"), item.get("action"), item.get("actor") or item.get("responsible"), item.get("detail")])
    sheets.append(XlsxSheet("Trazabilidad", f"Trazabilidad · {prefix}", warning,
        ["Campo/Fecha", "Valor/Acción", "Responsable", "Detalle"], trace_rows,
        [28, 45, 28, 90], autofilter=False, section_rows={4,13}))

    return sheets


def styles_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0000"/></numFmts>
<fonts count="4">
 <font><sz val="10"/><name val="Aptos"/><family val="2"/></font>
 <font><b/><color rgb="FFFFFFFF"/><sz val="15"/><name val="Aptos Display"/><family val="2"/></font>
 <font><b/><color rgb="FF991B1B"/><sz val="10"/><name val="Aptos"/><family val="2"/></font>
 <font><b/><color rgb="FF155E75"/><sz val="10"/><name val="Aptos"/><family val="2"/></font>
</fonts>
<fills count="7">
 <fill><patternFill patternType="none"/></fill>
 <fill><patternFill patternType="gray125"/></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FF0F3F4B"/><bgColor indexed="64"/></patternFill></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FFFFF7ED"/><bgColor indexed="64"/></patternFill></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FF0E7490"/><bgColor indexed="64"/></patternFill></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FFE6F4F7"/><bgColor indexed="64"/></patternFill></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FFF0FDF4"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
 <border><left/><right/><top/><bottom/><diagonal/></border>
 <border><left style="thin"><color rgb="FFD6DEE6"/></left><right style="thin"><color rgb="FFD6DEE6"/></right><top style="thin"><color rgb="FFD6DEE6"/></top><bottom style="thin"><color rgb="FFD6DEE6"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
 <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
 <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
 <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
 <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
 <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
 <xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>
 <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>
 <xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>'''


def workbook_xml(sheet_names: list[str]) -> str:
    sheet_tags = "".join(
        f'<sheet name="{escape(name, quote=True)}" sheetId="{idx}" r:id="rId{idx}"/>'
        for idx, name in enumerate(sheet_names, start=1)
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="15000"/></bookViews>'
        f'<sheets>{sheet_tags}</sheets><calcPr calcId="191029"/></workbook>'
    )


def workbook_rels_xml(sheet_count: int) -> str:
    rels = [
        f'<Relationship Id="rId{idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{idx}.xml"/>'
        for idx in range(1, sheet_count + 1)
    ]
    rels.append(
        f'<Relationship Id="rId{sheet_count + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + "".join(rels)
        + '</Relationships>'
    )


def content_types_xml(sheet_count: int) -> str:
    overrides = "".join(
        f'<Override PartName="/xl/worksheets/sheet{idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        for idx in range(1, sheet_count + 1)
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
        + overrides
        + '</Types>'
    )


def root_rels_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
 <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
 <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''


def core_xml(model: dict[str, Any]) -> str:
    created = xml_text(model.get("generatedAt") or utc_now())
    title = xml_text(f"Horario Centro Demo · {title_prefix(model)}")
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
 <dc:title>{title}</dc:title><dc:creator>Gestor de Horarios Escolares</dc:creator><cp:lastModifiedBy>Gestor de Horarios Escolares</cp:lastModifiedBy>
 <dcterms:created xsi:type="dcterms:W3CDTF">{created}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{xml_text(utc_now())}</dcterms:modified>
</cp:coreProperties>'''


def app_xml(sheet_names: list[str]) -> str:
    titles = "".join(f'<vt:lpstr>{xml_text(name)}</vt:lpstr>' for name in sheet_names)
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
 <Application>Gestor de Horarios Escolares</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop>
 <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Hojas</vt:lpstr></vt:variant><vt:variant><vt:i4>{len(sheet_names)}</vt:i4></vt:variant></vt:vector></HeadingPairs>
 <TitlesOfParts><vt:vector size="{len(sheet_names)}" baseType="lpstr">{titles}</vt:vector></TitlesOfParts>
 <Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion>
</Properties>'''


def build_xlsx_bytes(model: dict[str, Any]) -> bytes:
    sheets = build_sheets(model)
    used: set[str] = set()
    for sheet in sheets:
        sheet.name = safe_sheet_name(sheet.name, used)
    names = [s.name for s in sheets]
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        archive.writestr("[Content_Types].xml", content_types_xml(len(sheets)))
        archive.writestr("_rels/.rels", root_rels_xml())
        archive.writestr("docProps/core.xml", core_xml(model))
        archive.writestr("docProps/app.xml", app_xml(names))
        archive.writestr("xl/workbook.xml", workbook_xml(names))
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml(len(sheets)))
        archive.writestr("xl/styles.xml", styles_xml())
        for idx, sheet in enumerate(sheets, start=1):
            archive.writestr(f"xl/worksheets/sheet{idx}.xml", sheet.to_xml())
    return buffer.getvalue()


def export_document_model_xlsx(model: dict[str, Any], output: str | Path) -> Path:
    path = Path(output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(build_xlsx_bytes(model))
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Exporta ghf_document_model_1.0 a XLSX sin recalcular el horario.")
    parser.add_argument("input", help="DocumentModel JSON o - para stdin")
    parser.add_argument("output", help="Ruta XLSX de salida")
    args = parser.parse_args()
    raw = sys.stdin.read() if args.input == "-" else Path(args.input).read_text(encoding="utf-8")
    model = json.loads(raw)
    path = export_document_model_xlsx(model, args.output)
    print(json.dumps({"ok": True, "schemaId": model.get("schemaId"), "output": str(path), "bytes": path.stat().st_size}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
