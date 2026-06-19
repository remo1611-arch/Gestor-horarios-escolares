export const DAY_LABELS = Object.freeze({
  MON: 'Lunes', TUE: 'Martes', WED: 'Miércoles', THU: 'Jueves', FRI: 'Viernes', SAT: 'Sábado', SUN: 'Domingo',
});

export const ACTIVITY_LABELS = Object.freeze({
  TRAVEL: 'Desplazamiento',
  REDUCTION: 'Reducción horaria',
  COORDINATION: 'Coordinación',
  GUARD: 'Guardia ordinaria',
  LD: 'Libre disposición',
  DC: 'Docencia compartida',
  OTHER: 'Tarea organizativa',
  BREAK_DUTY: 'Vigilancia de recreo',
  MEETING: 'Reunión',
  SUPPORT: 'Apoyo',
});

const clean = value => String(value ?? '').trim();

export function dayLabelFromId(id = '') {
  return DAY_LABELS[String(id || '').toUpperCase()] || clean(id) || 'Día';
}

export function publicDayLabel(calendarOrProject = {}, id = '') {
  const calendar = calendarOrProject.calendar || calendarOrProject;
  const row = (calendar.days || []).find(x => String(x.id) === String(id));
  return row?.label || dayLabelFromId(id);
}

export function publicSlotLabel(calendarOrProject = {}, id = '') {
  const calendar = calendarOrProject.calendar || calendarOrProject;
  const row = (calendar.slots || []).find(x => String(x.id) === String(id));
  return row?.label || clean(id) || 'Tramo';
}

export function replaceDayCodes(value = '') {
  return clean(value)
    .replace(/\bMON\b/g, 'Lunes')
    .replace(/\bTUE\b/g, 'Martes')
    .replace(/\bWED\b/g, 'Miércoles')
    .replace(/\bTHU\b/g, 'Jueves')
    .replace(/\bFRI\b/g, 'Viernes')
    .replace(/\bSAT\b/g, 'Sábado')
    .replace(/\bSUN\b/g, 'Domingo');
}

export function stripDayAndSlot(value = '') {
  return replaceDayCodes(value)
    .replace(/\s*[·\-]\s*(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)\s+S?\d+\b/gi, '')
    .replace(/\s*[·\-]\s*(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)\b/gi, '')
    .replace(/\s+S\d+\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function publicTeacherName(name = '') {
  const raw = clean(name);
  if (!raw) return 'Docente pendiente de asignar';
  if (/^Docente\s+pendiente(\s+\d+)?$/i.test(raw)) return 'Docente pendiente de asignar';
  return raw;
}

export function publicSpaceName(name = '') {
  const raw = clean(name);
  if (!raw || /^Otro$/i.test(raw)) return 'Espacio pendiente';
  return raw;
}

export function publicActivityKindLabel(kind = '') {
  const code = String(kind || '').toUpperCase();
  return ACTIVITY_LABELS[code] || stripDayAndSlot(kind) || 'Actividad';
}

export function publicActivityName(activity = {}, slotId = '') {
  const raw = clean(activity?.name || activity?.activity || 'Actividad');
  const kind = String(activity?.kind || activity?.activityKind || '').toUpperCase();
  const upper = raw.toUpperCase();

  if (/^Hora\s+de\s+leer\s*·/i.test(raw) || /lectura/i.test(raw) || String(slotId).toUpperCase().includes('READ')) return 'Lectura diaria';
  if (/^Entrada\s*·/i.test(raw)) return 'Entrada';
  if (/^Salida\s*·/i.test(raw)) return 'Salida';
  if (/^Recreo/i.test(raw)) return stripDayAndSlot(raw);
  if (/Vigilancia\s+sint[eé]tica/i.test(raw)) return 'Vigilancia de recreo';
  if (/Apoyo\s+sint[eé]tico\s+de\s+convivencia/i.test(raw)) return 'Apoyo de convivencia';
  if (/Reuni[oó]n\s+multipersona\s+sint[eé]tica/i.test(raw)) return 'Reunión de coordinación';

  for (const [code, label] of Object.entries(ACTIVITY_LABELS)) {
    if (kind === code || upper.startsWith(`${code} `) || upper.startsWith(`${code} SINTETICO`) || upper.startsWith(`${code} SINTÉTICO`)) return label;
  }

  return stripDayAndSlot(raw).split(' · ')[0] || raw;
}

export function publicNamesList(values = [], formatter = value => value) {
  const rows = values.map(value => formatter(value)).filter(Boolean);
  return rows.length ? rows.join(' · ') : '—';
}

export function publicDocumentStateLabel(status = '') {
  return status === 'FINAL' ? 'Documento oficial cerrado' : 'Borrador de trabajo · no apto para cierre oficial';
}
