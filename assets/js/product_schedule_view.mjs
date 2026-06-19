import { analyzeDataState, nameOf } from './core.mjs';
import { reviewOfficialClosure } from './product_review.mjs';
import {
  publicDayLabel, publicSlotLabel, publicTeacherName, publicSpaceName, publicActivityName, publicActivityKindLabel,
} from './public_labels.mjs';

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function metricCard(value, label, extraClass = '') {
  return `<article class="schedule-metric ${extraClass}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></article>`;
}

export function dayPublicLabel(project, id) { return publicDayLabel(project, id); }
export function slotPublicLabel(project, id) { return publicSlotLabel(project, id); }
export { publicTeacherName, publicSpaceName, publicActivityName };


function dataStateValue(entity = {}) {
  return String(entity?.dataState || entity?.provenance?.status || '').toUpperCase();
}

function dataStateBadge(entity = {}) {
  const state = dataStateValue(entity);
  if (state === 'PENDING' || state === 'UNKNOWN') return '<span class="mini-badge warn">Pendiente</span>';
  if (state === 'PROVISIONAL') return '<span class="mini-badge warn">Provisional</span>';
  // SIMULATED se informa una sola vez en el resumen para no saturar cada celda.
  return '';
}

function isPendingTeacher(teacher = {}) {
  return /docente\s+pendiente/i.test(teacher.name || '') || ['PENDING', 'UNKNOWN'].includes(dataStateValue(teacher));
}

function isSimulationProject(project = {}, assignments = []) {
  const activities = project.activities || [];
  const simulatedActivities = activities.filter(a => dataStateValue(a) === 'SIMULATED').length;
  const simulatedAssignments = assignments.filter(a => {
    const activity = activities.find(row => row.id === a.activityId);
    return dataStateValue(activity) === 'SIMULATED';
  }).length;
  return simulatedActivities > 0 || simulatedAssignments > 0 || /provisional|simul/i.test(project?.meta?.status || project?.meta?.name || '');
}

function scheduleIssues(project = {}, assignments = []) {
  const closure = reviewOfficialClosure(project);
  const dataState = analyzeDataState(project);
  const pendingTeacherCount = (project.teachers || []).filter(isPendingTeacher).length;
  const pendingData = Number(dataState?.summary?.PENDING || 0) + Number(dataState?.summary?.UNKNOWN || 0);
  const latestRun = project.generationRuns?.at?.(-1) || null;
  const latestStatus = latestRun?.response?.status || latestRun?.status || '';
  const items = [];

  if (pendingTeacherCount) items.push({ level: 'warning', text: `${pendingTeacherCount} puestos docentes pendientes de confirmar.` });
  if (pendingData) items.push({ level: 'warning', text: `${pendingData} datos marcados como pendientes o desconocidos.` });
  if (isSimulationProject(project, assignments)) items.push({ level: 'info', text: 'Horario de referencia provisional: no debe cerrarse como oficial sin revisión humana.' });
  if (latestStatus === 'ERROR') items.push({ level: 'warning', text: 'La última generación avanzada no terminó correctamente; el horario guardado no se modificó.' });
  if (closure.blockers?.length) items.push({ level: 'warning', text: `${closure.blockers.length} condición(es) impiden el cierre oficial.` });

  return { closure, pendingTeacherCount, pendingData, latestStatus, items };
}

export function resolveScheduleFilter(project, currentFilter = 'ALL', { technicalMode = false } = {}) {
  if (technicalMode) return currentFilter || 'ALL';
  if ((!currentFilter || currentFilter === 'ALL') && project?.groups?.length) return `G:${project.groups[0].id}`;
  return currentFilter || 'ALL';
}

export function renderScheduleOverview(project = {}, assignments = [], { technicalMode = false } = {}) {
  const groups = (project.groups || []).length;
  const teachers = (project.teachers || []).length;
  const spaces = (project.spaces || []).length;
  const placed = assignments.length;
  const { closure, pendingTeacherCount, pendingData, items } = scheduleIssues(project, assignments);
  const canClose = !closure.blockers?.length && !pendingTeacherCount && !pendingData;
  const simulation = isSimulationProject(project, assignments);
  const issueList = items.length
    ? `<ol class="schedule-action-list">${items.slice(0, 5).map(item => `<li class="${item.level}">${escapeHtml(item.text)}</li>`).join('')}</ol>`
    : '<p class="muted">No se detectan prioridades críticas en esta vista.</p>';

  return `<section class="schedule-hero card" aria-labelledby="scheduleHeroTitle">
    <div class="schedule-hero-head">
      <div>
        <p class="eyebrow">Resumen para revisión</p>
        <h2 id="scheduleHeroTitle">Horario provisional</h2>
        <p>Revisa primero por grupo, docente o espacio para evitar una tabla excesivamente grande.</p>
      </div>
      <span class="badge ${canClose ? 'ok' : 'warn'}">${canClose ? 'Sin bloqueos de cierre' : 'No apto para cierre oficial'}</span>
    </div>
    ${simulation ? '<div class="notice inline info"><b>Horario de trabajo simulado.</b> Úsalo para validar el modelo y la carga de datos; no equivale a un horario oficial.</div>' : ''}
    <div class="schedule-metrics" aria-label="Indicadores del horario">
      ${metricCard(placed, 'sesiones colocadas')}
      ${metricCard(groups, 'grupos')}
      ${metricCard(teachers, 'docentes')}
      ${metricCard(spaces, 'espacios')}
      ${metricCard(pendingTeacherCount, 'puestos docentes pendientes', pendingTeacherCount ? 'attention' : '')}
      ${metricCard(pendingData, 'datos por confirmar', pendingData ? 'attention' : '')}
    </div>
    <div class="schedule-next-actions">
      <div>
        <h3>Qué falta para cerrar</h3>
        ${issueList}
      </div>
      <div class="schedule-user-flow" aria-label="Recorrido recomendado">
        <span>1. Revisar grupos</span>
        <span>2. Revisar docentes</span>
        <span>3. Revisar servicios</span>
        <span>4. Validación y cierre</span>
      </div>
    </div>
  </section>`;
}

function filterOption(value, label, current) {
  return `<option value="${escapeHtml(value)}" ${current === value ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

export function renderScheduleControls(project = {}, { current = 'ALL', search = '', editor = false, technicalMode = false } = {}) {
  const allOption = technicalMode ? filterOption('ALL', 'Vista completa', current) : '';
  const groups = (project.groups || []).map(g => filterOption(`G:${g.id}`, `Grupo · ${g.name}`, current)).join('');
  const teachers = (project.teachers || []).map(t => filterOption(`T:${t.id}`, `Docente · ${publicTeacherName(t.name)}`, current)).join('');
  const spaces = (project.spaces || []).map(sp => filterOption(`S:${sp.id}`, `Espacio · ${publicSpaceName(sp.name)}`, current)).join('');
  const button = editor
    ? `<button class="btn secondary" data-action="save-scenario" ${project.assignments?.length ? '' : 'disabled'}>Guardar alternativa</button>`
    : '<button class="btn secondary" type="button" data-schedule-tab="review">Revisar y editar</button>';

  return `<section class="schedule-controls" aria-label="Filtros del horario">
    <label>Vista<select id="scheduleFilter">${allOption}<optgroup label="Grupos">${groups}</optgroup><optgroup label="Docentes">${teachers}</optgroup><optgroup label="Espacios">${spaces}</optgroup></select></label>
    <label>Buscar<input id="editorSearch" value="${escapeHtml(search)}" placeholder="Materia, grupo, docente o espacio"></label>
    <div class="schedule-controls-actions">${button}${technicalMode ? '<span class="badge warn">Mantenimiento</span>' : ''}</div>
  </section>`;
}

export function assignmentPublicParts(project = {}, assignment = {}) {
  const activity = (project.activities || []).find(x => x.id === assignment.activityId) || {};
  const space = (project.spaces || []).find(x => x.id === assignment.spaceId) || {};
  const groups = (activity.groupIds || []).map(id => nameOf(project.groups || [], id)).filter(Boolean).join(', ');
  const teachers = (activity.teacherIds || []).map(id => publicTeacherName(nameOf(project.teachers || [], id))).filter(Boolean).join(', ') || 'Docente pendiente de asignar';

  return {
    activity,
    space,
    title: publicActivityName(activity, assignment.slotId),
    groups,
    teachers,
    spaceName: publicSpaceName(space.name),
    stateBadge: dataStateBadge(activity),
  };
}

export function matchesScheduleFilter(project = {}, assignment = {}, filter = 'ALL') {
  if (!filter || filter === 'ALL') return true;
  const activity = (project.activities || []).find(x => x.id === assignment.activityId);
  if (filter.startsWith('G:')) return Boolean(activity?.groupIds?.includes(filter.slice(2)));
  if (filter.startsWith('T:')) return Boolean(activity?.teacherIds?.includes(filter.slice(2)));
  if (filter.startsWith('S:')) return assignment.spaceId === filter.slice(2);
  return true;
}

export function matchesScheduleSearch(project = {}, assignment = {}, query = '') {
  const q = String(query || '').trim().toLocaleLowerCase('es');
  if (!q) return true;
  const activity = (project.activities || []).find(x => x.id === assignment.activityId) || {};
  const space = (project.spaces || []).find(x => x.id === assignment.spaceId) || {};
  const text = [
    activity.name,
    publicActivityName(activity, assignment.slotId),
    space.name,
    publicSpaceName(space.name),
    ...(activity.groupIds || []).map(id => nameOf(project.groups || [], id)),
    ...(activity.teacherIds || []).map(id => nameOf(project.teachers || [], id)),
    ...(activity.teacherIds || []).map(id => publicTeacherName(nameOf(project.teachers || [], id))),
  ].join(' ').toLocaleLowerCase('es');
  return text.includes(q);
}

export function visibleScheduleAssignmentIds(project = {}, assignments = [], filter = 'ALL', search = '') {
  return assignments.filter(a => matchesScheduleFilter(project, a, filter) && matchesScheduleSearch(project, a, search)).map(a => a.id);
}


function groupContext(project = {}, assignments = [], filter = 'ALL') {
  if (!String(filter || '').startsWith('G:')) return '';
  const groupId = String(filter).slice(2);
  const group = (project.groups || []).find(row => row.id === groupId);
  if (!group) return '';
  const tutor = publicTeacherName(nameOf(project.teachers || [], group.tutorTeacherId));
  const related = (project.activities || []).filter(activity => (activity.groupIds || []).includes(groupId));
  const teacherIds = new Set();
  const pending = [];
  const subjectRows = [];
  for (const activity of related) {
    const title = publicActivityName(activity);
    const ids = activity.teacherIds || [];
    if (!ids.length) pending.push(title);
    for (const teacherId of ids) {
      teacherIds.add(teacherId);
      const teacherName = publicTeacherName(nameOf(project.teachers || [], teacherId));
      if (/pendiente de asignar/i.test(teacherName)) pending.push(title);
      subjectRows.push(`${title}: ${teacherName}`);
    }
  }
  const visibleTeachers = [...teacherIds].map(id => publicTeacherName(nameOf(project.teachers || [], id))).filter(Boolean);
  const uniqueTeachers = [...new Set(visibleTeachers)];
  const pendingUnique = [...new Set(pending)].slice(0, 6);
  const details = subjectRows.length ? `<details class="group-team-detail"><summary>Ver equipo docente</summary><ul>${[...new Set(subjectRows)].slice(0, 30).map(row => `<li>${escapeHtml(row)}</li>`).join('')}</ul></details>` : '';
  return `<section class="group-context-card" aria-label="Datos del grupo seleccionado">
    <div><span class="context-label">Grupo</span><b>${escapeHtml(group.name || 'Grupo')}</b><small>${escapeHtml(group.stage || 'Etapa sin indicar')}</small></div>
    <div><span class="context-label">Tutor/a</span><b>${escapeHtml(tutor)}</b></div>
    <div><span class="context-label">Equipo docente</span><b>${uniqueTeachers.length}</b><small>${pendingUnique.length ? `${pendingUnique.length} pendiente(s)` : 'sin pendientes detectados'}</small></div>
    ${pendingUnique.length ? `<div class="context-warning"><span class="context-label">Pendientes del grupo</span><small>${pendingUnique.map(escapeHtml).join(' · ')}</small></div>` : ''}
    ${details}
  </section>`;
}

function filterCaption(project = {}, filter = 'ALL') {
  if (filter === 'ALL') return 'Vista completa';
  if (filter.startsWith('G:')) return `Horario del grupo ${nameOf(project.groups || [], filter.slice(2))}`;
  if (filter.startsWith('T:')) return `Horario de ${publicTeacherName(nameOf(project.teachers || [], filter.slice(2)))}`;
  if (filter.startsWith('S:')) return `Ocupación de ${publicSpaceName(nameOf(project.spaces || [], filter.slice(2)))}`;
  return 'Horario filtrado';
}

function lessonHtml(project, assignment, { interactive, selected, locked }) {
  const parts = assignmentPublicParts(project, assignment);
  const badges = `${parts.stateBadge || ''}${locked ? '<span class="mini-badge warn">Bloqueada</span>' : ''}`;
  const groups = parts.groups ? `<span class="lesson-group">${escapeHtml(parts.groups)}</span>` : '';
  const details = `${escapeHtml(parts.teachers)}${parts.spaceName ? ` · ${escapeHtml(parts.spaceName)}` : ''}`;
  const inner = `<b>${escapeHtml(parts.title)}</b>${badges ? `<span class="lesson-badges">${badges}</span>` : ''}${groups}<small>${details}</small>`;
  if (!interactive) return `<article class="lesson user-lesson">${inner}</article>`;
  return `<button class="lesson lesson-button editor-lesson ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}" data-action="select-assignment" data-id="${escapeHtml(assignment.id)}" draggable="${locked ? 'false' : 'true'}" aria-pressed="${selected ? 'true' : 'false'}" aria-label="${escapeHtml(parts.title)}. ${escapeHtml(dayPublicLabel(project, assignment.dayId))}, ${escapeHtml(slotPublicLabel(project, assignment.slotId))}${locked ? '. Bloqueada' : ''}"><span class="lesson-select-mark" aria-hidden="true">${selected ? '✓' : '○'}</span>${inner}</button>`;
}

export function renderScheduleGrid(project = {}, assignments = [], {
  filter = 'ALL',
  search = '',
  interactive = false,
  editorSelection = new Set(),
  lockedIds = new Set(),
} = {}) {
  const current = filter || 'ALL';
  const filtered = assignments.filter(a => matchesScheduleFilter(project, a, current) && matchesScheduleSearch(project, a, search));
  const days = project.calendar?.days || [];
  const slots = project.calendar?.slots || [];
  const caption = filterCaption(project, current);
  const context = groupContext(project, assignments, current);
  const cellContent = (dayId, slotId) => {
    const rows = filtered.filter(a => a.dayId === dayId && a.slotId === slotId);
    if (!rows.length) return '<span class="cell-empty" aria-label="Sin sesiones">—</span>';
    return rows.map(a => lessonHtml(project, a, { interactive, selected: editorSelection.has(a.id), locked: lockedIds.has(a.id) })).join('');
  };

  return `${context}<div class="schedule-board" role="region" aria-label="${escapeHtml(caption)}" tabindex="0">
    <table class="schedule-grid editor-grid user-schedule-grid">
      <caption>${escapeHtml(caption)}</caption>
      <thead><tr><th scope="col">Tramo</th>${days.map(d => `<th scope="col">${escapeHtml(d.label || dayPublicLabel(project, d.id))}</th>`).join('')}</tr></thead>
      <tbody>${slots.map(slot => `<tr class="${slot.kind !== 'CLASS' ? 'nonclass' : ''}"><th scope="row">${escapeHtml(slot.label || slotPublicLabel(project, slot.id))}</th>${days.map(day => `<td ${interactive ? `data-editor-target data-day="${escapeHtml(day.id)}" data-slot="${escapeHtml(slot.id)}" tabindex="0" role="button" aria-label="Destino ${escapeHtml(day.label || dayPublicLabel(project, day.id))}, ${escapeHtml(slot.label || slotPublicLabel(project, slot.id))}"` : ''}>${cellContent(day.id, slot.id)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  </div>`;
}
