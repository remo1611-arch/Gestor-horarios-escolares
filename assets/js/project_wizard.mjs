import {
  createEmptyProject, normalizeProject, validateProject, syncOrganizationalActivities,
  uid, nowIso, normalizeStringList, manualDataProvenance,
} from './core.mjs';
import { semanticizeIssue } from './semantic_engine.mjs';

export const PROJECT_WIZARD_CONTRACT_VERSION = 'product-project-wizard-1.0';
export const PROJECT_WIZARD_STEPS = Object.freeze([
  { id: 1, label: 'Centro' },
  { id: 2, label: 'Calendario' },
  { id: 3, label: 'Datos' },
  { id: 4, label: 'Organización' },
  { id: 5, label: 'Revisión' },
]);
export const WIZARD_STORAGE_KEY = 'ghe.product.projectWizard.v1';

const DAYS = Object.freeze([
  { id: 'MON', label: 'Lunes' }, { id: 'TUE', label: 'Martes' },
  { id: 'WED', label: 'Miércoles' }, { id: 'THU', label: 'Jueves' },
  { id: 'FRI', label: 'Viernes' }, { id: 'SAT', label: 'Sábado' },
]);
const DEFAULT_PERIODS = Object.freeze([
  { id: 'evaluation_1', label: '1.ª evaluación', fromDate: '', toDate: '' },
  { id: 'evaluation_2', label: '2.ª evaluación', fromDate: '', toDate: '' },
  { id: 'evaluation_3', label: '3.ª evaluación', fromDate: '', toDate: '' },
]);

const clone = value => JSON.parse(JSON.stringify(value));
const asNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clean = value => String(value ?? '').trim();
const id = prefix => uid(`wizard_${prefix}`);

export function createProjectWizardState(options = {}) {
  const academicYear = clean(options.academicYear) || defaultAcademicYear();
  return {
    contractVersion: PROJECT_WIZARD_CONTRACT_VERSION,
    step: 1,
    startedAt: nowIso(),
    updatedAt: nowIso(),
    center: {
      projectName: clean(options.projectName) || 'Horario escolar',
      centerName: clean(options.centerName),
      centerType: clean(options.centerType) || 'CEIP',
      academicYear,
      responsible: clean(options.responsible),
      privacyMode: clean(options.privacyMode) || 'REAL_LOCAL',
      dataState: clean(options.dataState) || 'PENDING',
      turns: ['MORNING'],
      dayIds: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    },
    calendar: {
      startTime: '09:00',
      classCount: 6,
      classMinutes: 50,
      firstBreakAfter: 3,
      firstBreakMinutes: 30,
      secondBreakAfter: 0,
      secondBreakMinutes: 0,
      periods: clone(DEFAULT_PERIODS),
    },
    data: { teachers: [], groups: [], subjects: [], spaces: [], activities: [] },
    organization: {
      enabled: false,
      profileName: 'Organización del centro',
      ordinaryLd: 0,
      ordinaryDc: 0,
      maxSimultaneousLd: '',
      dcCoverageAllowed: true,
      requireExactTarget: false,
      toleranceSessions: 0,
      maxDailyCoverages: '',
      minimumPresence: '',
      teacherSettings: {},
      positions: [], reductions: [], services: [], breakZones: [],
    },
  };
}

export function restoreProjectWizardState(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : clone(raw);
    if (!parsed || parsed.contractVersion !== PROJECT_WIZARD_CONTRACT_VERSION) return null;
    return normalizeWizardState(parsed);
  } catch { return null; }
}

export function normalizeWizardState(input) {
  const base = createProjectWizardState();
  const value = input || {};
  const state = {
    ...base,
    ...value,
    center: { ...base.center, ...(value.center || {}) },
    calendar: { ...base.calendar, ...(value.calendar || {}) },
    data: { ...base.data, ...(value.data || {}) },
    organization: { ...base.organization, ...(value.organization || {}) },
  };
  state.step = Math.max(1, Math.min(5, asNumber(state.step, 1)));
  state.center.turns = unique(state.center.turns).filter(x => ['MORNING','AFTERNOON','EVENING'].includes(x));
  if (!state.center.turns.length) state.center.turns = ['MORNING'];
  state.center.dayIds = unique(state.center.dayIds).filter(x => DAYS.some(d => d.id === x));
  state.calendar.periods = (Array.isArray(state.calendar.periods) ? state.calendar.periods : clone(DEFAULT_PERIODS)).slice(0, 6).map((row, index) => ({
    id: clean(row?.id) || `evaluation_${index + 1}`,
    label: clean(row?.label) || `Periodo ${index + 1}`,
    fromDate: clean(row?.fromDate), toDate: clean(row?.toDate),
  }));
  while (state.calendar.periods.length < 3) state.calendar.periods.push(clone(DEFAULT_PERIODS[state.calendar.periods.length]));
  for (const key of ['teachers','groups','subjects','spaces','activities']) state.data[key] = Array.isArray(state.data[key]) ? state.data[key] : [];
  for (const key of ['positions','reductions','services','breakZones']) state.organization[key] = Array.isArray(state.organization[key]) ? state.organization[key] : [];
  state.organization.teacherSettings = state.organization.teacherSettings && typeof state.organization.teacherSettings === 'object' ? state.organization.teacherSettings : {};
  state.updatedAt = nowIso();
  return state;
}

export function addWizardRow(state, collection) {
  const target = state.data[collection] || state.organization[collection];
  if (!Array.isArray(target)) throw new Error(`Colección del asistente no válida: ${collection}`);
  const row = collection === 'teachers' ? { id:id('teacher'), name:'', specialty:'', weeklyTarget:0 }
    : collection === 'groups' ? { id:id('group'), name:'', stage:'', tutorTeacherId:'' }
    : collection === 'subjects' ? { id:id('subject'), name:'', stage:'' }
    : collection === 'spaces' ? { id:id('space'), name:'', tags:'AULA', capacity:1 }
    : collection === 'activities' ? { id:id('activity'), name:'', groupId:'', subjectId:'', teacherIds:[], weeklySessions:1, durationSlots:1, requiredSpaceTags:'AULA' }
    : collection === 'positions' ? { id:id('position'), teacherId:'', label:'', type:'OTHER', weeklySessions:1 }
    : collection === 'reductions' ? { id:id('reduction'), teacherId:'', label:'', type:'OTHER', weeklySessions:1 }
    : collection === 'services' ? { id:id('service'), name:'', kind:'GUARD', teacherIds:[], groupIds:[], weeklySessions:1 }
    : { id:id('break_zone'), name:'Zona de recreo', minimumStaff:1, useAllBreaks:true };
  target.push(row); state.updatedAt = nowIso(); return row;
}

export function removeWizardRow(state, collection, rowId) {
  const target = state.data[collection] || state.organization[collection];
  if (!Array.isArray(target)) return false;
  const index = target.findIndex(row => row.id === rowId);
  if (index < 0) return false;
  target.splice(index, 1);
  if (collection === 'teachers') {
    for (const group of state.data.groups) if (group.tutorTeacherId === rowId) group.tutorTeacherId = '';
    for (const activity of state.data.activities) activity.teacherIds = (activity.teacherIds || []).filter(id => id !== rowId);
    state.organization.positions = state.organization.positions.filter(row => row.teacherId !== rowId);
    state.organization.reductions = state.organization.reductions.filter(row => row.teacherId !== rowId);
    state.organization.services.forEach(row => row.teacherIds = (row.teacherIds || []).filter(id => id !== rowId));
    delete state.organization.teacherSettings[rowId];
  }
  if (collection === 'groups') {
    state.data.activities.forEach(row => { if (row.groupId === rowId) row.groupId = ''; });
    state.organization.services.forEach(row => row.groupIds = (row.groupIds || []).filter(id => id !== rowId));
  }
  if (collection === 'subjects') state.data.activities.forEach(row => { if (row.subjectId === rowId) row.subjectId = ''; });
  state.updatedAt = nowIso(); return true;
}

export function setWizardValue(state, path, value) {
  const parts = String(path || '').split('.').filter(Boolean);
  if (!parts.length) return;
  let target = state;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!target[parts[i]] || typeof target[parts[i]] !== 'object') target[parts[i]] = {};
    target = target[parts[i]];
  }
  target[parts.at(-1)] = value; state.updatedAt = nowIso();
}

export function setWizardRowValue(state, collection, rowId, field, value) {
  const rows = state.data[collection] || state.organization[collection];
  const row = rows?.find(item => item.id === rowId);
  if (!row) return false;
  row[field] = value; state.updatedAt = nowIso(); return true;
}

export function wizardCalendarPreview(state) {
  const errors = [];
  const dayIds = unique(state.center.dayIds).filter(dayId => DAYS.some(day => day.id === dayId));
  if (!dayIds.length) errors.push('Selecciona al menos un día lectivo.');
  const classCount = Math.max(1, Math.min(16, Math.trunc(asNumber(state.calendar.classCount, 0))));
  const classMinutes = Math.max(20, Math.min(180, Math.trunc(asNumber(state.calendar.classMinutes, 0))));
  if (!/^\d{2}:\d{2}$/.test(state.calendar.startTime || '')) errors.push('La hora de inicio no es válida.');
  const breaks = [
    { after: Math.trunc(asNumber(state.calendar.firstBreakAfter, 0)), minutes: Math.trunc(asNumber(state.calendar.firstBreakMinutes, 0)) },
    { after: Math.trunc(asNumber(state.calendar.secondBreakAfter, 0)), minutes: Math.trunc(asNumber(state.calendar.secondBreakMinutes, 0)) },
  ].filter(row => row.after > 0 && row.after < classCount && row.minutes > 0);
  const afters = new Set();
  for (const row of breaks) {
    if (afters.has(row.after)) errors.push('Los dos recreos no pueden comenzar después de la misma sesión.');
    afters.add(row.after);
  }
  let minute = parseTime(state.calendar.startTime);
  if (minute === null) minute = 9 * 60;
  const slots = [];
  for (let n = 1; n <= classCount; n += 1) {
    const start = formatTime(minute); minute += classMinutes;
    if (minute >= 24 * 60) errors.push('La jornada calculada supera las 24:00.');
    slots.push({ id:`S${n}`, label:`${n}.ª sesión`, kind:'CLASS', start, end:formatTime(minute) });
    const br = breaks.find(row => row.after === n);
    if (br) {
      const index = breaks.slice().sort((a,b)=>a.after-b.after).findIndex(row => row.after === br.after) + 1;
      const brStart = formatTime(minute); minute += br.minutes;
      slots.push({ id:`R${index}`, label:index === 1 ? 'Recreo' : `Recreo ${index}`, kind:'BREAK', start:brStart, end:formatTime(minute) });
    }
  }
  return { days: dayIds.map(dayId => clone(DAYS.find(day => day.id === dayId))), slots, errors:unique(errors) };
}

export function validateProjectWizard(state) {
  const normalized = normalizeWizardState(state);
  const blocking = [], missing = [], recommendations = [], completed = [];
  const add = (array, code, message, step, target = '') => {
    const severity=array===blocking?'ERROR':array===missing?'WARNING':'INFO';
    const semantic=semanticizeIssue({code,message,severity,blocksGeneration:array===blocking,blocksFinalization:array!==recommendations});
    array.push({...semantic,code,message:semantic.message,step,target});
  };
  if (!clean(normalized.center.centerName)) add(blocking,'CENTER_REQUIRED','Indica el nombre del centro.',1,'center.centerName');
  if (!clean(normalized.center.projectName)) add(blocking,'PROJECT_NAME_REQUIRED','Indica un nombre para el proyecto.',1,'center.projectName');
  if (!/^\d{4}[\/-]\d{4}$/.test(clean(normalized.center.academicYear))) add(blocking,'ACADEMIC_YEAR_INVALID','El curso académico debe tener un formato como 2026/2027.',1,'center.academicYear');
  if (!clean(normalized.center.responsible)) add(missing,'RESPONSIBLE_PENDING','Falta identificar a la persona responsable.',1,'center.responsible');
  const calendar = wizardCalendarPreview(normalized);
  for (const message of calendar.errors) add(blocking,'CALENDAR_INVALID',message,2,'calendar');
  if (calendar.days.length && calendar.slots.some(slot => slot.kind === 'CLASS')) completed.push('Centro y calendario básico');
  const collections = [['teachers','docentes'],['groups','grupos'],['subjects','materias o módulos'],['spaces','espacios'],['activities','actividades']];
  for (const [key, label] of collections) {
    const rows = normalized.data[key];
    const named = rows.filter(row => clean(row.name));
    if (!named.length) add(missing,`${key.toUpperCase()}_EMPTY`,`No se añadieron ${label}.`,3,key);
    else completed.push(`${named.length} ${label}`);
    const duplicateNames = duplicates(named.map(row => clean(row.name).toLocaleLowerCase('es')));
    if (duplicateNames.length) add(blocking,`${key.toUpperCase()}_DUPLICATED`,`Hay nombres duplicados en ${label}.`,3,key);
    if (rows.some(row => !clean(row.name))) add(blocking,`${key.toUpperCase()}_NAME_REQUIRED`,`Hay filas sin nombre en ${label}.`,3,key);
  }
  const teacherIds = new Set(normalized.data.teachers.map(row => row.id));
  const groupIds = new Set(normalized.data.groups.map(row => row.id));
  const subjectIds = new Set(normalized.data.subjects.map(row => row.id));
  for (const group of normalized.data.groups) if (group.tutorTeacherId && !teacherIds.has(group.tutorTeacherId)) add(blocking,'TUTOR_BROKEN',`${group.name || 'Un grupo'} tiene un tutor inexistente.`,4,'tutors');
  for (const activity of normalized.data.activities) {
    if (!groupIds.has(activity.groupId)) add(blocking,'ACTIVITY_GROUP_REQUIRED',`${activity.name || 'Una actividad'} necesita un grupo.`,3,'activities');
    if (activity.subjectId && !subjectIds.has(activity.subjectId)) add(blocking,'ACTIVITY_SUBJECT_BROKEN',`${activity.name || 'Una actividad'} usa una materia inexistente.`,3,'activities');
    if (!(activity.teacherIds || []).some(teacherId => teacherIds.has(teacherId))) add(blocking,'ACTIVITY_TEACHER_REQUIRED',`${activity.name || 'Una actividad'} necesita al menos un docente.`,3,'activities');
    if (asNumber(activity.weeklySessions, 0) < 1) add(blocking,'ACTIVITY_SESSIONS_REQUIRED',`${activity.name || 'Una actividad'} necesita sesiones semanales.`,3,'activities');
    if (asNumber(activity.durationSlots, 1) > 1) add(recommendations,'MULTISLOT_CP_SAT',`${activity.name}: los bloques de varios periodos necesitarán la optimización avanzada local.`,3,'activities');
  }
  if (normalized.organization.enabled) {
    completed.push('Organización del centro activada');
    if (!normalized.organization.positions.length && !normalized.organization.reductions.length && !normalized.organization.services.length) add(recommendations,'ORGANIZATION_MINIMAL','El perfil está activo, pero todavía no incluye cargos, reducciones ni servicios.',4,'organization');
  } else add(recommendations,'ORGANIZATION_DISABLED','La organización específica queda desactivada; puede configurarse después.',4,'organization');
  const periods = normalized.calendar.periods.filter(row => row.fromDate || row.toDate);
  if (periods.some(row => !row.fromDate || !row.toDate)) add(missing,'EVALUATION_PERIOD_INCOMPLETE','Hay periodos de evaluación con una fecha pendiente.',2,'periods');
  if (!periods.length) add(recommendations,'EVALUATION_PERIODS_PENDING','Los periodos de evaluación pueden configurarse después.',2,'periods');
  let project = null, projectValidation = null;
  try {
    project = buildProjectFromWizard(normalized);
    projectValidation = validateProject(project);
    for (const issue of projectValidation.issues) {
      if (issue.blocksGeneration && !blocking.some(row => row.message === issue.message)) add(blocking,issue.code,issue.message,5,'review');
    }
  } catch (error) { add(blocking,'BUILD_FAILED',error.message || String(error),5,'review'); }
  const requiredDataReady = ['teachers','groups','subjects','spaces','activities'].every(key => normalized.data[key].some(row => clean(row.name)));
  return {
    blocking:dedupeIssues(blocking), missing:dedupeIssues(missing), recommendations:dedupeIssues(recommendations), completed:unique(completed),
    canCreateDraft: blocking.length === 0,
    canGenerateAfterCreate: Boolean(requiredDataReady && projectValidation?.canGenerate && blocking.length === 0),
    project, projectValidation,
  };
}

export function buildProjectFromWizard(state) {
  const s = normalizeWizardState(state);
  const calendar = wizardCalendarPreview(s);
  if (calendar.errors.length) throw new Error(calendar.errors.join(' '));
  const privacyClass = s.center.privacyMode === 'SYNTHETIC' ? 'SYNTHETIC' : s.center.privacyMode === 'ANONYMIZED' ? 'ANONYMIZED' : 'REAL';
  const dataState = privacyClass === 'SYNTHETIC' ? 'SIMULATED' : ['CONFIRMED','PROVISIONAL','PENDING'].includes(s.center.dataState) ? s.center.dataState : 'PENDING';
  const p = createEmptyProject({
    name: clean(s.center.projectName), center: clean(s.center.centerName), academicYear: clean(s.center.academicYear),
    responsible: clean(s.center.responsible), privacyClass,
  });
  p.meta.dataState = dataState;
  p.setup = {
    ...p.setup, active:false, currentStep:5, completedSteps:[1,2,3,4,5], dismissedAt:nowIso(),
    productWizard: {
      contractVersion:PROJECT_WIZARD_CONTRACT_VERSION, centerType:s.center.centerType,
      turns:clone(s.center.turns), createdAt:nowIso(),
    },
  };
  p.calendar = { days:calendar.days, slots:calendar.slots };
  const provenance = () => ({
    ...manualDataProvenance({ sourceRef:'Asistente de creación de proyecto', verifiedBy:dataState === 'CONFIRMED' ? clean(s.center.responsible) : '', verifiedAt:dataState === 'CONFIRMED' ? today() : '' }, clean(s.center.responsible)),
    origin: privacyClass === 'SYNTHETIC' ? 'SYNTHETIC' : 'USER',
  });
  p.teachers = s.data.teachers.map(row => ({
    id:row.id, externalId:'', name:clean(row.name), role:'', specialty:clean(row.specialty), weeklyTarget:Math.max(0,asNumber(row.weeklyTarget,0)),
    unavailable:[], presence:[], coverageEligible:s.organization.teacherSettings[row.id]?.coverageEligible !== false,
    essentialProfiles:[], leadershipReduction:0, otherReduction:0, positions:[], reductions:[], ldQuota:0, dcQuota:0, quotaJustification:'',
    itinerary:{ enabled:Boolean(s.organization.teacherSettings[row.id]?.itineraryEnabled), presenceDays:unique(s.organization.teacherSettings[row.id]?.presenceDays).filter(dayId=>calendar.days.some(day=>day.id===dayId)), travelMinutes:Math.max(0,asNumber(s.organization.teacherSettings[row.id]?.travelMinutes,0)), state:dataState === 'CONFIRMED' ? 'CONFIRMED' : 'PROVISIONAL' },
    dataState, provenance:provenance(),
  }));
  p.groups = s.data.groups.map(row => ({ id:row.id, externalId:'', name:clean(row.name), stage:clean(row.stage), tutorTeacherId:clean(row.tutorTeacherId), dataState, provenance:provenance() }));
  p.subjects = s.data.subjects.map(row => ({ id:row.id, externalId:'', name:clean(row.name), stage:clean(row.stage), dataState, provenance:provenance() }));
  p.spaces = s.data.spaces.map(row => ({ id:row.id, externalId:'', name:clean(row.name), tags:normalizeStringList(row.tags).map(tag=>tag.toUpperCase()), capacity:Math.max(1,Math.trunc(asNumber(row.capacity,1))), dataState, provenance:provenance() }));
  p.activities = s.data.activities.map(row => ({
    id:row.id, externalId:'', name:clean(row.name), kind:'TEACHING', subjectId:clean(row.subjectId), groupId:clean(row.groupId), groupIds:row.groupId?[clean(row.groupId)]:[],
    teacherIds:unique(row.teacherIds), weeklySessions:Math.max(0,Math.trunc(asNumber(row.weeklySessions,0))), durationSlots:Math.max(1,Math.trunc(asNumber(row.durationSlots,1))),
    requiredSpaceTags:normalizeStringList(row.requiredSpaceTags).map(tag=>tag.toUpperCase()), allowedDays:[], allowedSlots:[], preferredDays:[], preferredSlots:[], fixedOccurrences:[],
    priority:50, mandatory:true, maxPerDay:1, consecutive:'NONE', source:'USER', dataState, provenance:provenance(),
  }));
  const teacherMap = new Map(p.teachers.map(row => [row.id,row]));
  for (const row of s.organization.positions) {
    const teacher = teacherMap.get(row.teacherId); if (!teacher || !clean(row.label)) continue;
    teacher.positions.push({ id:row.id, label:clean(row.label), type:clean(row.type)||'OTHER', weeklySessions:Math.max(0,asNumber(row.weeklySessions,0)), allowedDays:[], allowedSlots:[], active:true, dataState, provenance:provenance() });
  }
  for (const row of s.organization.reductions) {
    const teacher = teacherMap.get(row.teacherId); if (!teacher || !clean(row.label)) continue;
    teacher.reductions.push({ id:row.id, label:clean(row.label), type:clean(row.type)||'OTHER', weeklySessions:Math.max(0,asNumber(row.weeklySessions,0)), allowedDays:[], allowedSlots:[], active:true, dataState, provenance:provenance() });
  }
  p.organization.enabled = Boolean(s.organization.enabled);
  p.organization.profile = { ...p.organization.profile, name:clean(s.organization.profileName)||'Organización del centro', dataState, provenance:provenance() };
  Object.assign(p.organization.ldDc, {
    ordinaryLd:Math.max(0,asNumber(s.organization.ordinaryLd,0)), ordinaryDc:Math.max(0,asNumber(s.organization.ordinaryDc,0)),
    maxSimultaneousLd:clean(s.organization.maxSimultaneousLd)===''?null:Math.max(0,asNumber(s.organization.maxSimultaneousLd,0)), dcCoverageAllowed:Boolean(s.organization.dcCoverageAllowed),
    ldAllowedSlots:calendar.slots.filter(row=>row.kind==='CLASS').map(row=>row.id), dcAllowedSlots:calendar.slots.filter(row=>row.kind==='CLASS').map(row=>row.id),
  });
  Object.assign(p.organization.workloadPolicy, { requireExactTarget:Boolean(s.organization.requireExactTarget), toleranceSessions:Math.max(0,asNumber(s.organization.toleranceSessions,0)) });
  Object.assign(p.organization.coveragePolicy, { maxDailyCoverages:clean(s.organization.maxDailyCoverages)===''?null:Math.max(0,asNumber(s.organization.maxDailyCoverages,0)) });
  if (asNumber(s.organization.minimumPresence,0) > 0) p.organization.minimumPresence.push({ id:id('presence'), name:'Presencia mínima general', minimum:Math.trunc(asNumber(s.organization.minimumPresence,0)), profileTag:'', dayIds:calendar.days.map(row=>row.id), slotIds:calendar.slots.filter(row=>row.kind==='CLASS').map(row=>row.id), active:true, dataState, provenance:provenance() });
  const breakSlotIds = calendar.slots.filter(row=>row.kind==='BREAK').map(row=>row.id);
  p.organization.breakZones = s.organization.breakZones.filter(row=>clean(row.name)).map(row => ({ id:row.id, name:clean(row.name), slotIds:breakSlotIds, minimumStaff:Math.max(1,Math.trunc(asNumber(row.minimumStaff,1))), essentialProfileTags:[], excludedTeacherIds:[], active:true, dataState, provenance:provenance() }));
  p.organization.services = s.organization.services.filter(row=>clean(row.name)).map(row => ({
    id:row.id, name:clean(row.name), kind:clean(row.kind)||'OTHER', teacherIds:unique(row.teacherIds), groupIds:unique(row.groupIds), weeklySessions:Math.max(1,Math.trunc(asNumber(row.weeklySessions,1))),
    allowedDays:[], allowedSlots:[], requiredSpaceTags:[], zoneId:'', priority:50, mandatory:true, maxPerDay:1, active:true, dataState, provenance:provenance(),
  }));
  p.daily.settings.reportingPeriods = s.calendar.periods.filter(row=>row.fromDate&&row.toDate).map((row,index)=>({ id:clean(row.id)||`evaluation_${index+1}`, label:clean(row.label)||`Periodo ${index+1}`, fromDate:clean(row.fromDate), toDate:clean(row.toDate), kind:'EVALUATION', active:true }));
  p.daily.settings.reportingPeriodsState = p.daily.settings.reportingPeriods.length && p.daily.settings.reportingPeriods.every(row=>row.fromDate&&row.toDate) ? 'CONFIGURED' : 'PENDING_CONFIGURATION';
  p.audit.push({ id:uid('audit'), at:nowIso(), actor:clean(s.center.responsible)||'Usuario', action:'PROJECT_CREATED_WITH_PRODUCT_WIZARD', note:'Proyecto creado con el asistente guiado de producto P2.' });
  if (p.organization.enabled) syncOrganizationalActivities(p);
  return normalizeProject(p);
}

export function wizardSummary(state) {
  const calendar = wizardCalendarPreview(state);
  return {
    center: clean(state.center.centerName) || 'Centro pendiente',
    academicYear: clean(state.center.academicYear) || 'Curso pendiente',
    days: calendar.days.length,
    classSlots: calendar.slots.filter(row=>row.kind==='CLASS').length,
    breaks: calendar.slots.filter(row=>row.kind==='BREAK').length,
    teachers: state.data.teachers.length, groups: state.data.groups.length, subjects: state.data.subjects.length,
    spaces: state.data.spaces.length, activities: state.data.activities.length,
  };
}

export function saveProjectWizardState(state, storage = globalThis.sessionStorage) {
  try { storage?.setItem(WIZARD_STORAGE_KEY, JSON.stringify(normalizeWizardState(state))); return true; } catch { return false; }
}
export function loadProjectWizardState(storage = globalThis.sessionStorage) {
  try { return restoreProjectWizardState(storage?.getItem(WIZARD_STORAGE_KEY)); } catch { return null; }
}
export function clearProjectWizardState(storage = globalThis.sessionStorage) {
  try { storage?.removeItem(WIZARD_STORAGE_KEY); return true; } catch { return false; }
}
export function wizardDays() { return clone(DAYS); }

function defaultAcademicYear() { const now = new Date(); const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; return `${year}/${year+1}`; }
function unique(values) { return [...new Set(Array.isArray(values) ? values.map(String) : [])]; }
function duplicates(values) { const seen=new Set(), dup=new Set(); for(const value of values){if(!value)continue;if(seen.has(value))dup.add(value);seen.add(value);}return [...dup]; }
function dedupeIssues(rows) { const seen=new Set(); return rows.filter(row=>{const key=`${row.code}|${row.message}`;if(seen.has(key))return false;seen.add(key);return true;}); }
function parseTime(value) { const match=/^(\d{2}):(\d{2})$/.exec(String(value||'')); if(!match)return null; const h=Number(match[1]),m=Number(match[2]); return h<24&&m<60?h*60+m:null; }
function formatTime(minutes) { const value=((minutes%(24*60))+(24*60))%(24*60); return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`; }
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

