import { stableStringify } from './canonical_json.mjs';
import { analyzeMultidimensionalQuality } from './product_multidimensional_quality.mjs';
import {
  EDUCATIONAL_DOMAIN_CONTRACT_VERSION, defaultEducationalDomain4, normalizeEducationalDomain4,
  normalizeTeacherDomain4, normalizeGroupDomain4, normalizeSpaceDomain4, normalizeActivityDomain4,
  normalizeAssignmentDomain4, validateEducationalDomain4, requiredOccurrencesForActivity,
} from './educational_domain_4.mjs';
export { EDUCATIONAL_DOMAIN_CONTRACT_VERSION } from './educational_domain_4.mjs';
import {
  ORGANIZATIONAL_DOMAIN_CONTRACT_VERSION, normalizePresencePlan, normalizePresencePolicy,
  normalizeOrganizationalService41, normalizeAnchoredSegments, teacherPresenceDecision,
  serviceAllowedSlotKinds, anchoredSegmentRelations, validateOrganizationalDomain41,
} from './organizational_domain_4_1.mjs';
export { ORGANIZATIONAL_DOMAIN_CONTRACT_VERSION } from './organizational_domain_4_1.mjs';
export { stableStringify };
export const APP_VERSION = '0.6.0-alpha.25';
export const SCHEMA_VERSION = '4.0';
export const CONTRACT_VERSION = '3.0';
export const HISTORY_CONTRACT_VERSION = 'history-contract-1.0';
export const DATA_CONTRACT_VERSION = 'data-contract-1.0';
export const ORGANIZATIONAL_CONTRACT_VERSION = 'organizational-contract-1.0';
export const GENERATION_EXECUTION_CONTRACT_VERSION = 'generation-execution-contract-1.0';
export const CP_SAT_EXECUTION_CONTRACT_VERSION = 'cp-sat-execution-contract-1.0';
export const MANUAL_EDITOR_CONTRACT_VERSION = 'manual-editor-contract-1.0';
export const DAILY_OPERATIONS_CONTRACT_VERSION = 'daily-operations-contract-1.0';
export const DOCUMENT_MODEL_CONTRACT_VERSION = 'document-model-contract-1.0';

export const DATA_STATES = ['CONFIRMED', 'PROVISIONAL', 'SIMULATED', 'PENDING'];
export const DATA_ORIGINS = ['USER', 'IMPORT', 'SYNTHETIC', 'MIGRATED', 'SYSTEM'];
export const PRIVACY_CLASSES = ['SYNTHETIC', 'ANONYMIZED', 'REAL'];
export const ACTIVITY_KINDS = ['TEACHING', 'SUPPORT', 'LD', 'DC', 'REDUCTION', 'COORDINATION', 'GUARD', 'BREAK_DUTY', 'MEETING', 'TRAVEL', 'OTHER'];
export const ORGANIZATIONAL_SERVICE_KINDS = ['SUPPORT', 'GUARD', 'BREAK_DUTY', 'MEETING', 'TRAVEL', 'OTHER'];
export const POSITION_TYPES = ['LEADERSHIP', 'COORDINATION', 'TUTORSHIP', 'OTHER'];
export const REDUCTION_TYPES = ['LEADERSHIP', 'COORDINATION', 'AGE', 'PART_TIME', 'OTHER'];
export const CONSTRAINT_LEVELS = ['HARD', 'SOFT', 'INFO'];

export const DAYS = [
  { id: 'MON', label: 'Lunes' },
  { id: 'TUE', label: 'Martes' },
  { id: 'WED', label: 'Miércoles' },
  { id: 'THU', label: 'Jueves' },
  { id: 'FRI', label: 'Viernes' },
];

export const DEFAULT_SLOTS = [
  { id: 'S1', label: '1.ª sesión', kind: 'CLASS', start: '09:00', end: '09:50' },
  { id: 'S2', label: '2.ª sesión', kind: 'CLASS', start: '09:50', end: '10:40' },
  { id: 'S3', label: '3.ª sesión', kind: 'CLASS', start: '10:40', end: '11:30' },
  { id: 'R1', label: 'Recreo', kind: 'BREAK', start: '11:30', end: '12:00' },
  { id: 'S4', label: '4.ª sesión', kind: 'CLASS', start: '12:00', end: '12:50' },
  { id: 'S5', label: '5.ª sesión', kind: 'CLASS', start: '12:50', end: '13:40' },
];

export const deepClone = (value) => JSON.parse(JSON.stringify(value));
export const nowIso = () => new Date().toISOString();
export const localDateIso = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const uid = (prefix = 'id') => `${prefix}_${cryptoRandom()}`;
export const slotKey = (dayId, slotId) => `${dayId}:${slotId}`;

function cryptoRandom() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export const statusLabel = (state) => ({
  CONFIRMED: 'Confirmado',
  PROVISIONAL: 'Provisional',
  SIMULATED: 'Simulado',
  PENDING: 'Pendiente',
}[state] || state || 'Sin clasificar');

export const privacyLabel = (value) => ({
  SYNTHETIC: 'Proyecto de ejemplo',
  ANONYMIZED: 'Proyecto sin datos personales',
  REAL: 'Proyecto del centro',
}[value] || 'Sin clasificar');

export const activityKindLabel = (value) => ({
  TEACHING: 'Docencia',
  SUPPORT: 'Apoyo o codocencia',
  LD: 'LD',
  DC: 'DC',
  REDUCTION: 'Reducción horaria',
  COORDINATION: 'Cargo o coordinación',
  GUARD: 'Guardia programada',
  BREAK_DUTY: 'Vigilancia de recreo',
  MEETING: 'Reunión',
  TRAVEL: 'Desplazamiento de itinerancia',
  OTHER: 'Otra actividad',
}[value] || value || 'Actividad');


export const dataOriginLabel = (value) => ({
  USER: 'Introducción manual',
  IMPORT: 'Importación revisada',
  SYNTHETIC: 'Dato sintético',
  MIGRATED: 'Dato migrado',
  SYSTEM: 'Generado por el sistema',
}[value] || 'Procedencia no clasificada');

export function normalizeDataProvenance(value = {}, fallbackOrigin = 'USER') {
  const origin = DATA_ORIGINS.includes(value?.origin) ? value.origin : fallbackOrigin;
  return {
    origin,
    sourceRef: String(value?.sourceRef || '').trim(),
    sourceFile: String(value?.sourceFile || '').trim(),
    sourceRow: Number.isInteger(Number(value?.sourceRow)) && Number(value.sourceRow) > 0 ? Number(value.sourceRow) : null,
    importId: String(value?.importId || '').trim(),
    importedAt: String(value?.importedAt || '').trim(),
    validFrom: String(value?.validFrom || '').trim(),
    validTo: String(value?.validTo || '').trim(),
    verifiedBy: String(value?.verifiedBy || '').trim(),
    verifiedAt: String(value?.verifiedAt || '').trim(),
    note: String(value?.note || '').trim(),
  };
}

export function manualDataProvenance(previous = null, actor = '') {
  const base = normalizeDataProvenance(previous || {}, 'USER');
  return {
    ...base,
    origin: base.origin === 'IMPORT' || base.origin === 'SYNTHETIC' ? base.origin : 'USER',
    sourceRef: base.sourceRef || 'Edición manual en la aplicación',
    verifiedBy: base.verifiedBy || String(actor || '').trim(),
  };
}

export function createEmptyProject({
  name = 'Nuevo proyecto',
  center = '',
  academicYear = '2026/2027',
  responsible = '',
  privacyClass = 'ANONYMIZED',
} = {}) {
  const createdAt = nowIso();
  const project = {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      contractVersion: CONTRACT_VERSION,
      appVersion: APP_VERSION,
      historyContractVersion: HISTORY_CONTRACT_VERSION,
      dataContractVersion: DATA_CONTRACT_VERSION,
      organizationalContractVersion: ORGANIZATIONAL_CONTRACT_VERSION,
      generationExecutionContractVersion: GENERATION_EXECUTION_CONTRACT_VERSION,
      cpSatExecutionContractVersion: CP_SAT_EXECUTION_CONTRACT_VERSION,
      manualEditorContractVersion: MANUAL_EDITOR_CONTRACT_VERSION,
      dailyOperationsContractVersion: DAILY_OPERATIONS_CONTRACT_VERSION,
      educationalDomainContractVersion: EDUCATIONAL_DOMAIN_CONTRACT_VERSION,
      organizationalDomainContractVersion: ORGANIZATIONAL_DOMAIN_CONTRACT_VERSION,
      projectId: uid('project'),
      revisionId: uid('rev'),
      revisionNumber: 1,
      name,
      center,
      academicYear,
      responsible,
      status: 'DRAFT',
      dataState: 'PENDING',
      privacyClass,
      createdAt,
      updatedAt: createdAt,
      lastExportAt: null,
      lastAcceptedAt: null,
    },
    setup: {
      active: true,
      currentStep: 1,
      completedSteps: [],
      dismissedAt: null,
    },
    calendar: { days: deepClone(DAYS), slots: deepClone(DEFAULT_SLOTS) },
    settings: {
      completionPolicy: 'ALLOW_PARTIAL',
      autosave: true,
      requireExplicitAcceptance: true,
      language: 'es',
      allowWarningsOnGeneration: true,
    },
    organization: defaultOrganization(),
    domain: defaultEducationalDomain4(),
    subjects: [],
    teachers: [],
    groups: [],
    spaces: [],
    activities: [],
    assignments: [],
    proposals: [],
    generationRuns: [],
    scenarios: [],
    constraints: [],
    locks: [],
    editCommands: [],
    history: [],
    acceptanceReceipts: [],
    imports: [],
    archives: [],
    daily: {
      contractVersion: DAILY_OPERATIONS_CONTRACT_VERSION,
      settings: {
        recommendationBalanceScope: 'COURSE',
        historyPenaltyPerWeight: 6,
        weightUnitMinutes: 50,
        reportingPeriodsState: 'PENDING_CONFIGURATION',
        reportingPeriods: [],
        balanceWeights: {
          DEFAULT: 1,
          FREE_COVERAGE: 1,
          SCHEDULED_GUARD: 0.85,
          DC_RELEASE: 1.15,
          RELEASED_ACTIVITY: 1.1,
          TEMP_SUBSTITUTION: 0.75,
          BREAK_DUTY: 0.75,
          MANUAL_GUARD: 1,
        },
      },
      absences: [],
      coverages: [],
      incidents: [],
      guards: [],
      recoveries: [],
      temporarySubstitutions: [],
    },
    audit: [
      {
        id: uid('audit'),
        at: createdAt,
        actor: responsible || 'Usuario',
        action: 'PROJECT_CREATED',
        note: 'Proyecto creado',
      },
    ],
  };
  project.meta.structuralFingerprint = structuralFingerprint(project);
  return project;
}

function defaultOrganization() {
  return {
    enabled: false,
    profile: {
      id: 'generic-1.0',
      name: 'Perfil organizativo del centro',
      version: '1.0',
      dataState: 'PENDING',
    },
    ldDc: {
      ordinaryLd: 2,
      ordinaryDc: 2,
      ldAllowedSlots: [],
      dcAllowedSlots: [],
      placement: 'FLEXIBLE',
      grouping: 'FLEXIBLE',
      maxSimultaneousLd: null,
      dcCoverageAllowed: true,
    },
    workloadPolicy: {
      requireExactTarget: false,
      toleranceSessions: 0,
      countedKinds: ['TEACHING','SUPPORT','LD','DC','REDUCTION','COORDINATION','GUARD','BREAK_DUTY','MEETING','TRAVEL','OTHER'],
    },
    coveragePolicy: {
      enabled: true,
      releasableKinds: ['DC'],
      presenceExcludingKinds: ['LD','REDUCTION'],
      preserveEssentialPresence: true,
      excludeItinerantWhenAbsent: true,
      maxDailyCoverages: null,
    },
    presencePolicy: normalizePresencePolicy({}),
    minimumPresence: [],
    breakZones: [],
    services: [],
    anchoredSegments: [],
    rules: [],
    preferences: [],
    sync: { lastAt: null, lastFingerprint: null, contractVersion: ORGANIZATIONAL_CONTRACT_VERSION },
  };
}

export function createDemoProject() {
  const p = createEmptyProject({
    name: 'Simulación operativa',
    center: 'Centro de demostración',
    academicYear: '2026/2027',
    responsible: 'Jefatura de estudios',
    privacyClass: 'SYNTHETIC',
  });
  p.meta.dataState = 'SIMULATED';
  p.setup.active = false;
  p.setup.completedSteps = [1,2,3,4,5,6,7,8,9];
  p.subjects = [
    { id: 'sub1', name: 'Lengua', stage: 'Primaria', dataState: 'SIMULATED' },
    { id: 'sub2', name: 'Matemáticas', stage: 'Primaria', dataState: 'SIMULATED' },
    { id: 'sub3', name: 'Inglés', stage: 'Primaria', dataState: 'SIMULATED' },
    { id: 'sub4', name: 'Educación Física', stage: 'Primaria', dataState: 'SIMULATED' },
  ];
  p.teachers = [
    teacher('t1', 'Docente 01', 'Tutora 1.º A', 20, { coverageEligible: true, ldQuota: 2, dcQuota: 2 }),
    teacher('t2', 'Docente 02', 'Tutor 2.º A', 20, { coverageEligible: true, ldQuota: 2, dcQuota: 2 }),
    teacher('t3', 'Docente 03', 'Inglés', 18, { coverageEligible: true, ldQuota: 2, dcQuota: 2 }),
    teacher('t4', 'Docente 04', 'Educación Física', 18, { coverageEligible: true, ldQuota: 2, dcQuota: 2 }),
    teacher('t5', 'Docente 05', 'Apoyo', 18, { coverageEligible: true, essentialProfiles: ['APOYO'], ldQuota: 2, dcQuota: 2 }),
  ];
  p.groups = [
    { id: 'g1', name: '1.º Primaria A', stage: 'Primaria', tutorTeacherId: 't1', dataState: 'SIMULATED' },
    { id: 'g2', name: '2.º Primaria A', stage: 'Primaria', tutorTeacherId: 't2', dataState: 'SIMULATED' },
  ];
  p.spaces = [
    { id: 'sp1', name: 'Aula 1.º A', tags: ['AULA'], capacity: 1, dataState: 'SIMULATED' },
    { id: 'sp2', name: 'Aula 2.º A', tags: ['AULA'], capacity: 1, dataState: 'SIMULATED' },
    { id: 'sp3', name: 'Gimnasio', tags: ['DEPORTIVO'], capacity: 1, dataState: 'SIMULATED' },
    { id: 'sp4', name: 'Zona de recreo A', tags: ['RECREO'], capacity: 2, dataState: 'SIMULATED' },
  ];
  p.activities = [
    activity('a1', 'Lengua', 'g1', ['t1'], 5, ['AULA'], { subjectId: 'sub1' }),
    activity('a2', 'Matemáticas', 'g1', ['t1'], 5, ['AULA'], { subjectId: 'sub2' }),
    activity('a3', 'Inglés', 'g1', ['t3'], 3, ['AULA'], { subjectId: 'sub3' }),
    activity('a4', 'Educación Física', 'g1', ['t4'], 2, ['DEPORTIVO'], { subjectId: 'sub4' }),
    activity('a5', 'Lengua', 'g2', ['t2'], 5, ['AULA'], { subjectId: 'sub1' }),
    activity('a6', 'Matemáticas', 'g2', ['t2'], 5, ['AULA'], { subjectId: 'sub2' }),
    activity('a7', 'Inglés', 'g2', ['t3'], 3, ['AULA'], { subjectId: 'sub3' }),
    activity('a8', 'Educación Física', 'g2', ['t4'], 2, ['DEPORTIVO'], { subjectId: 'sub4' }),
    activity('a9', 'Apoyo compartido', 'g1', ['t1', 't5'], 1, ['AULA'], {
      kind: 'SUPPORT', preferredDays: ['TUE', 'THU'],
    }),
  ];
  p.organization.enabled = true;
  p.organization.profile = {
    id: 'demo-primary-1.0', name: 'Perfil demostrativo de Primaria', version: '1.0', dataState: 'SIMULATED',
  };
  p.organization.ldDc.ldAllowedSlots = ['S1', 'S5'];
  p.organization.ldDc.dcAllowedSlots = ['S1', 'S5'];
  p.organization.ldDc.maxSimultaneousLd = 3;
  p.organization.minimumPresence = [
    { id: 'min1', dayIds: DAYS.map(d=>d.id), slotIds: ['S1','S2','S3','S4','S5'], minimum: 2, profileTag: '', dataState: 'SIMULATED' },
  ];
  p.organization.breakZones = [
    { id: 'bz1', name: 'Zona de recreo A', slotIds: ['R1'], minimumStaff: 1, essentialProfileTags: [], excludedTeacherIds: [], dataState: 'SIMULATED' },
  ];
  syncOrganizationalActivities(p);
  for (const collection of [p.subjects, p.teachers, p.groups, p.spaces, p.activities]) {
    for (const row of collection) {
      row.externalId = row.externalId || '';
      row.provenance = normalizeDataProvenance({ origin:'SYNTHETIC', sourceRef:'Fixture público de demostración' }, 'SYNTHETIC');
    }
  }
  p.audit.push({
    id: uid('audit'), at: nowIso(), actor: 'Sistema', action: 'DEMO_LOADED', note: 'Datos ficticios para pruebas',
  });
  const normalized = normalizeProject(p);
  normalized.meta.structuralFingerprint = structuralFingerprint(normalized);
  return normalized;
}

function teacher(id, name, role, weeklyTarget, extra = {}) {
  return {
    id,
    name,
    role,
    specialty: '',
    weeklyTarget,
    unavailable: [],
    presence: [],
    coverageEligible: true,
    essentialProfiles: [],
    leadershipReduction: 0,
    otherReduction: 0,
    positions: [],
    reductions: [],
    ldQuota: 0,
    dcQuota: 0,
    quotaJustification: '',
    itinerary: { enabled: false, presenceDays: [], travelMinutes: 0, state: 'CONFIRMED' },
    dataState: 'SIMULATED',
    ...extra,
  };
}

function activity(id, name, groupId, teacherIds, weeklySessions, requiredSpaceTags, extra = {}) {
  return {
    id,
    name,
    kind: 'TEACHING',
    subjectId: '',
    groupId,
    groupIds: groupId ? [groupId] : [],
    teacherIds,
    weeklySessions,
    durationSlots: 1,
    requiredSpaceTags,
    allowedDays: [],
    allowedSlots: [],
    preferredDays: [],
    preferredSlots: [],
    fixedOccurrences: [],
    priority: 50,
    mandatory: true,
    maxPerDay: 1,
    consecutive: 'NONE',
    source: 'USER',
    dataState: 'SIMULATED',
    ...extra,
  };
}

export function migrateProject(input) {
  const source = deepClone(input || {});
  const from = String(source?.meta?.schemaVersion || '2.0');
  const report = { from, to: SCHEMA_VERSION, changed: false, steps: [], warnings: [] };
  if (!source.meta) source.meta = {};

  if (compareVersions(from, '2.1') < 0) {
    source.setup = source.setup || { active: false, currentStep: 1, completedSteps: [], dismissedAt: null };
    source.organization = source.organization || defaultOrganization();
    source.subjects = Array.isArray(source.subjects) ? source.subjects : [];
    source.acceptanceReceipts = Array.isArray(source.acceptanceReceipts) ? source.acceptanceReceipts : [];
    source.imports = Array.isArray(source.imports) ? source.imports : [];
    source.archives = Array.isArray(source.archives) ? source.archives : [];
    source.daily = source.daily || {};
    source.daily.recoveries = Array.isArray(source.daily.recoveries) ? source.daily.recoveries : [];
    source.daily.temporarySubstitutions = Array.isArray(source.daily.temporarySubstitutions) ? source.daily.temporarySubstitutions : [];
    for (const t of source.teachers || []) Object.assign(t, normalizeTeacher(t));
    for (const a of source.activities || []) Object.assign(a, normalizeActivity(a));
    report.changed = true;
    report.steps.push('2.0→2.1: asistente, organización, materias, recibos, importaciones y gestión diaria ampliada.');
  }

  if (compareVersions(from, '2.2') < 0) {
    source.meta.contractVersion = CONTRACT_VERSION;
    source.meta.privacyClass = source.meta.privacyClass || (source.meta.dataState === 'SIMULATED' ? 'SYNTHETIC' : 'ANONYMIZED');
    source.meta.revisionNumber = Number(source.meta.revisionNumber || 1);
    source.meta.lastExportAt = source.meta.lastExportAt || null;
    source.meta.lastAcceptedAt = source.meta.lastAcceptedAt || null;
    report.changed = true;
    report.steps.push('2.1→2.2: clasificación de privacidad, numeración de revisión y trazabilidad de exportación/aceptación.');
  }

  if (compareVersions(from, '2.3') < 0) {
    source.editCommands = Array.isArray(source.editCommands) ? source.editCommands : [];
    source.meta.contractVersion = CONTRACT_VERSION;
    report.changed = true;
    report.steps.push('2.2→2.3: historial inmediato de deshacer/rehacer y contrato de intercambio de datos.');
  }

  if (compareVersions(from, '2.4') < 0) {
    source.meta.historyContractVersion = HISTORY_CONTRACT_VERSION;
    source.history = (Array.isArray(source.history) ? source.history : []).map(markLegacyHistoryEntry);
    source.scenarios = (Array.isArray(source.scenarios) ? source.scenarios : []).map(markLegacyScenarioEntry);
    const legacyHistory = source.history.filter(row => row.restorable === false).length;
    const legacyScenarios = source.scenarios.filter(row => row.restorable === false).length;
    if (legacyHistory) report.warnings.push(`${legacyHistory} versión(es) antiguas se conservan como referencia, pero no se declaran restaurables porque no contienen el estado completo.`);
    if (legacyScenarios) report.warnings.push(`${legacyScenarios} alternativa(s) antiguas se conservan como referencia de horario, pero no se declaran restaurables porque no contienen contexto estructural completo.`);
    report.changed = true;
    report.steps.push('2.3→2.4: contrato histórico 1.0, snapshots estructurales SHA-256, restauración exacta y alternativas verificables.');
  }

  if (compareVersions(from, '2.5') < 0) {
    const collections = ['subjects','teachers','groups','spaces','activities'];
    for (const key of collections) {
      source[key] = (Array.isArray(source[key]) ? source[key] : []).map(row => ({
        ...row,
        externalId: String(row?.externalId || ''),
        provenance: normalizeDataProvenance(row?.provenance || {
          origin: 'MIGRATED',
          sourceRef: 'Migración de esquema 2.4→2.5',
        }, 'MIGRATED'),
      }));
    }
    source.meta.dataContractVersion = DATA_CONTRACT_VERSION;
    report.changed = true;
    report.steps.push('2.4→2.5: procedencia y vigencia normalizadas, identificadores externos e importación profesional revisable.');
  }


  if (compareVersions(from, '2.6') < 0) {
    source.organization = source.organization || defaultOrganization();
    source.organization.services = Array.isArray(source.organization.services) ? source.organization.services : [];
    source.organization.workloadPolicy = source.organization.workloadPolicy || defaultOrganization().workloadPolicy;
    source.organization.coveragePolicy = source.organization.coveragePolicy || defaultOrganization().coveragePolicy;
    source.teachers = (Array.isArray(source.teachers) ? source.teachers : []).map(t => {
      const positions = Array.isArray(t.positions) ? t.positions : [];
      const reductions = Array.isArray(t.reductions) ? t.reductions : [];
      if (!positions.length && Number(t.leadershipReduction || 0) > 0) {
        positions.push({
          id: `position_legacy_${t.id || uid('teacher')}`,
          label: t.role || 'Cargo directivo o de coordinación',
          type: 'LEADERSHIP', weeklySessions: Number(t.leadershipReduction),
          allowedDays: [], allowedSlots: [], dataState: t.dataState || 'PENDING',
          provenance: normalizeDataProvenance({ origin:'MIGRATED', sourceRef:'Migración de reducción por cargo 2.5→2.6' }, 'MIGRATED'),
        });
      }
      if (!reductions.length && Number(t.otherReduction || 0) > 0) {
        reductions.push({
          id: `reduction_legacy_${t.id || uid('teacher')}`,
          label: 'Otras reducciones heredadas', type: 'OTHER', weeklySessions: Number(t.otherReduction),
          allowedDays: [], allowedSlots: [], dataState: t.dataState || 'PENDING',
          provenance: normalizeDataProvenance({ origin:'MIGRATED', sourceRef:'Migración de otras reducciones 2.5→2.6' }, 'MIGRATED'),
        });
      }
      return { ...t, positions, reductions };
    });
    source.meta.organizationalContractVersion = ORGANIZATIONAL_CONTRACT_VERSION;
    report.changed = true;
    report.steps.push('2.5→2.6: contrato organizativo 1.0, cargos y reducciones estructurados, servicios, coberturas e itinerancias configurables.');
  }


  if (compareVersions(from, '2.7') < 0) {
    source.generationRuns = Array.isArray(source.generationRuns) ? source.generationRuns : [];
    source.meta.generationExecutionContractVersion = GENERATION_EXECUTION_CONTRACT_VERSION;
    report.changed = true;
    report.steps.push('2.6→2.7: ejecución heurística no bloqueante, progreso, cancelación, límite temporal y recibos de generación.');
  }

  if (compareVersions(from, '2.8') < 0) {
    source.generationRuns = Array.isArray(source.generationRuns) ? source.generationRuns : [];
    source.meta.cpSatExecutionContractVersion = CP_SAT_EXECUTION_CONTRACT_VERSION;
    report.changed = true;
    report.steps.push('2.7→2.8: adaptador OR-Tools CP-SAT explícito, estados formales y canal local/manual sin sustitución silenciosa.');
  }

  if (compareVersions(from, '2.9') < 0) {
    source.editCommands = Array.isArray(source.editCommands) ? source.editCommands : [];
    source.meta.manualEditorContractVersion = MANUAL_EDITOR_CONTRACT_VERSION;
    report.changed = true;
    report.steps.push('2.8→2.9: editor manual profesional, comandos atómicos, edición múltiple y recuperación lineal.');
  }


  if (compareVersions(from, '3.0') < 0) {
    source.daily = source.daily || {};
    source.daily.contractVersion = DAILY_OPERATIONS_CONTRACT_VERSION;
    source.daily.settings = {
      ...createEmptyProject().daily.settings,
      ...(source.daily.settings || {}),
      balanceWeights: {
        ...createEmptyProject().daily.settings.balanceWeights,
        ...(source.daily.settings?.balanceWeights || {}),
      },
    };
    for (const key of ['absences','coverages','incidents','guards','recoveries','temporarySubstitutions']) {
      source.daily[key] = Array.isArray(source.daily[key]) ? source.daily[key] : [];
    }
    source.meta.dailyOperationsContractVersion = DAILY_OPERATIONS_CONTRACT_VERSION;
    report.changed = true;
    report.steps.push('2.9→3.0: gestión diaria 1.0, servicios realizados, consecuencias operativas, equilibrio histórico e informes por periodo.');
  }


  if (compareVersions(from, '4.0') < 0) {
    source.domain = normalizeEducationalDomain4(source.domain || defaultEducationalDomain4());
    source.teachers = (Array.isArray(source.teachers) ? source.teachers : []).map(normalizeTeacherDomain4);
    source.groups = (Array.isArray(source.groups) ? source.groups : []).map(normalizeGroupDomain4);
    source.spaces = (Array.isArray(source.spaces) ? source.spaces : []).map(normalizeSpaceDomain4);
    source.activities = (Array.isArray(source.activities) ? source.activities : []).map(row=>normalizeActivityDomain4(row,source.domain));
    source.assignments = (Array.isArray(source.assignments) ? source.assignments : []).map(row=>normalizeAssignmentDomain4(row,source.domain));
    source.meta.educationalDomainContractVersion = EDUCATIONAL_DOMAIN_CONTRACT_VERSION;
    report.changed = true;
    report.steps.push('3.0→4.0: dominio educativo 4.0, ciclos semanales, sedes, desplazamientos, recursos, relaciones, desdobles y referencias explícitas.');
  }

  source.meta.schemaVersion = SCHEMA_VERSION;
  source.meta.appVersion = APP_VERSION;
  source.meta.contractVersion = CONTRACT_VERSION;
  source.meta.historyContractVersion = HISTORY_CONTRACT_VERSION;
  source.meta.dataContractVersion = DATA_CONTRACT_VERSION;
  source.meta.organizationalContractVersion = ORGANIZATIONAL_CONTRACT_VERSION;
  source.meta.generationExecutionContractVersion = GENERATION_EXECUTION_CONTRACT_VERSION;
  source.meta.cpSatExecutionContractVersion = CP_SAT_EXECUTION_CONTRACT_VERSION;
  source.meta.manualEditorContractVersion = MANUAL_EDITOR_CONTRACT_VERSION;
  source.meta.dailyOperationsContractVersion = DAILY_OPERATIONS_CONTRACT_VERSION;
  source.meta.educationalDomainContractVersion = EDUCATIONAL_DOMAIN_CONTRACT_VERSION;
  return { project: source, report };
}

function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

export function normalizeProject(input) {
  const inputSchemaVersion=String(input?.meta?.schemaVersion||'1.0');
  const migratingToDomain4=compareVersions(inputSchemaVersion,'4.0')<0;
  const legacyInputFingerprint=migratingToDomain4?legacyStructuralFingerprint3(input):String(input?.meta?.legacyStructuralFingerprint3||'');
  const base = createEmptyProject();
  const migrated = migrateProject(input).project;
  const p = deepClone(migrated || {});
  p.meta = { ...base.meta, ...(p.meta || {}) };
  p.setup = { ...base.setup, ...(p.setup || {}) };
  p.calendar = {
    days: p.calendar?.days?.length ? p.calendar.days : deepClone(DAYS),
    slots: p.calendar?.slots?.length ? p.calendar.slots : deepClone(DEFAULT_SLOTS),
  };
  p.settings = { ...base.settings, ...(p.settings || {}) };
  p.organization = normalizeOrganization(p.organization, base.organization);
  p.domain = normalizeEducationalDomain4(p.domain || base.domain);

  for (const key of [
    'subjects','teachers','groups','spaces','activities','assignments','proposals','generationRuns','scenarios',
    'constraints','locks','editCommands','history','acceptanceReceipts','imports','archives','audit',
  ]) {
    if (!Array.isArray(p[key])) p[key] = [];
  }

  p.teachers = p.teachers.map(normalizeTeacher);
  p.activities = p.activities.map(normalizeActivity).map(row=>normalizeActivityDomain4(row,p.domain));
  p.assignments = p.assignments.map(row=>normalizeAssignmentDomain4(row,p.domain));
  p.proposals = p.proposals.map(proposal=>({...proposal,assignments:(proposal.assignments||[]).map(row=>normalizeAssignmentDomain4(row,p.domain))}));
  p.groups = p.groups.map((g) => normalizeGroupDomain4(normalizeNamedDataRow(g, { stage:'', tutorTeacherId:'', homeSiteId:'', size:0 }, 'group')));
  p.spaces = p.spaces.map((row) => normalizeSpaceDomain4(normalizeNamedDataRow(row, { tags:[], capacity:1, seatCapacity:0, siteId:'', resourceIds:[], equivalentSpaceIds:[] }, 'space')));
  p.subjects = p.subjects.map((row) => normalizeNamedDataRow(row, { stage:'' }, 'subject'));
  p.history = p.history.map(normalizeHistoryEntry);
  p.scenarios = p.scenarios.map(normalizeScenarioEntry);

  p.daily = normalizeDaily(p.daily, base.daily);
  compactEditCommands(p);

  p.meta.schemaVersion = SCHEMA_VERSION;
  p.meta.contractVersion = CONTRACT_VERSION;
  p.meta.appVersion = APP_VERSION;
  p.meta.historyContractVersion = HISTORY_CONTRACT_VERSION;
  p.meta.dataContractVersion = DATA_CONTRACT_VERSION;
  p.meta.organizationalContractVersion = ORGANIZATIONAL_CONTRACT_VERSION;
  p.meta.generationExecutionContractVersion = GENERATION_EXECUTION_CONTRACT_VERSION;
  p.meta.cpSatExecutionContractVersion = CP_SAT_EXECUTION_CONTRACT_VERSION;
  p.meta.manualEditorContractVersion = MANUAL_EDITOR_CONTRACT_VERSION;
  p.meta.dailyOperationsContractVersion = DAILY_OPERATIONS_CONTRACT_VERSION;
  p.meta.educationalDomainContractVersion = EDUCATIONAL_DOMAIN_CONTRACT_VERSION;
  p.meta.organizationalDomainContractVersion = ORGANIZATIONAL_DOMAIN_CONTRACT_VERSION;
  if(legacyInputFingerprint)p.meta.legacyStructuralFingerprint3=legacyInputFingerprint;
  if(migratingToDomain4&&p.organization?.sync?.lastFingerprint)p.organization.sync.lastFingerprint=organizationalDefinitionFingerprintNormalized(p);
  p.meta.structuralFingerprint = structuralFingerprint(p);
  if(migratingToDomain4){
    for(const proposal of p.proposals){
      if(proposal.sourceFingerprint&&proposal.sourceFingerprint!==p.meta.structuralFingerprint)proposal.legacySourceFingerprint=proposal.sourceFingerprint;
      if(proposal.baseRevisionId===p.meta.revisionId)proposal.sourceFingerprint=p.meta.structuralFingerprint;
    }
  }
  return p;
}



function normalizeReportingPeriods(value = []) {
  return (Array.isArray(value) ? value : []).map((row,index)=>({
    id:String(row?.id || `reporting_period_${index+1}`),
    label:String(row?.label || `Periodo ${index+1}`).trim(),
    fromDate:String(row?.fromDate || '').trim(),
    toDate:String(row?.toDate || '').trim(),
    kind:['EVALUATION','COURSE','CUSTOM'].includes(row?.kind) ? row.kind : 'EVALUATION',
    active:row?.active !== false,
  })).filter(row=>row.label || row.fromDate || row.toDate);
}

function normalizeDaily(value = {}, base) {
  const daily = { ...deepClone(base), ...(value || {}) };
  daily.contractVersion = DAILY_OPERATIONS_CONTRACT_VERSION;
  daily.settings = {
    ...deepClone(base.settings),
    ...(value?.settings || {}),
    balanceWeights: {
      ...deepClone(base.settings.balanceWeights),
      ...(value?.settings?.balanceWeights || {}),
    },
    reportingPeriodsState: ['CONFIGURED','PENDING_CONFIGURATION'].includes(value?.settings?.reportingPeriodsState)
      ? value.settings.reportingPeriodsState : 'PENDING_CONFIGURATION',
    reportingPeriods: normalizeReportingPeriods(value?.settings?.reportingPeriods || []),
  };
  for (const key of ['absences','coverages','incidents','guards','recoveries','temporarySubstitutions']) {
    if (!Array.isArray(daily[key])) daily[key] = [];
  }
  daily.absences = daily.absences.map(row => ({
    id:String(row?.id || uid('absence')), createdAt:String(row?.createdAt || ''), updatedAt:String(row?.updatedAt || row?.createdAt || ''),
    date:String(row?.date || ''), dayId:String(row?.dayId || ''), slotIds:[...new Set(Array.isArray(row?.slotIds) ? row.slotIds.map(String) : (row?.slotId ? [String(row.slotId)] : []))],
    teacherId:String(row?.teacherId || ''), status:['DRAFT','CONFIRMED','CANCELLED','FINISHED'].includes(row?.status) ? row.status : 'DRAFT',
    operationalNote:String(row?.operationalNote || ''), privateReason:String(row?.privateReason || ''), createdBy:String(row?.createdBy || ''),
    affectedAssignmentIds:[...new Set((row?.affectedAssignmentIds || []).map(String))], confirmedAt:String(row?.confirmedAt || ''),
    cancelledAt:String(row?.cancelledAt || ''), cancellationReason:String(row?.cancellationReason || ''), finishedAt:String(row?.finishedAt || ''),
  }));
  daily.coverages = daily.coverages.map(row => ({
    id:String(row?.id || uid('coverage')), absenceId:String(row?.absenceId || ''), assignmentId:String(row?.assignmentId || ''), activityId:String(row?.activityId || ''),
    dayId:String(row?.dayId || ''), slotId:String(row?.slotId || ''), status:['PENDING','PROPOSED','ASSIGNED','COMMUNICATED','COMPLETED','CANCELLED','UNCOVERED'].includes(row?.status) ? row.status : 'PENDING',
    coverTeacherId:String(row?.coverTeacherId || ''), createdAt:String(row?.createdAt || ''), updatedAt:String(row?.updatedAt || row?.createdAt || ''),
    proposedAt:String(row?.proposedAt || ''), assignedAt:String(row?.assignedAt || ''), completedAt:String(row?.completedAt || ''), cancelledAt:String(row?.cancelledAt || ''), uncoveredAt:String(row?.uncoveredAt || ''),
    decisionReason:String(row?.decisionReason || ''), completionNote:String(row?.completionNote || ''), responsible:String(row?.responsible || ''), releasedAssignmentId:String(row?.releasedAssignmentId || ''),
    recommendation:row?.recommendation && typeof row.recommendation==='object' ? deepClone(row.recommendation) : null,
    decision:row?.decision && typeof row.decision==='object' ? deepClone(row.decision) : null,
    communication:row?.communication && typeof row.communication==='object' ? deepClone(row.communication) : null,
    reconciliationState:['CURRENT','OBSOLETE'].includes(row?.reconciliationState) ? row.reconciliationState : 'CURRENT',
    obsoleteAt:String(row?.obsoleteAt || ''), obsoleteReason:String(row?.obsoleteReason || ''),
  }));
  daily.incidents = daily.incidents.map(row => ({
    id:String(row?.id || uid('incident')), absenceId:String(row?.absenceId || ''), coverageId:String(row?.coverageId || ''), assignmentId:String(row?.assignmentId || ''), activityId:String(row?.activityId || ''),
    date:String(row?.date || ''), dayId:String(row?.dayId || ''), slotId:String(row?.slotId || ''), type:['UNCHANGED','DISPLACED','SUSPENDED','CANCELLED','RECOVERY_REQUIRED'].includes(row?.type) ? row.type : (row?.impactType || 'SUSPENDED'),
    status:['OPEN','RESOLVED','CANCELLED'].includes(row?.status) ? row.status : 'OPEN', destination:row?.destination && typeof row.destination==='object' ? deepClone(row.destination) : null,
    operationalNote:String(row?.operationalNote || row?.publicNote || ''), privateNote:String(row?.privateNote || ''), recoveryId:String(row?.recoveryId || ''), responsible:String(row?.responsible || ''),
    createdAt:String(row?.createdAt || ''), updatedAt:String(row?.updatedAt || row?.createdAt || ''), resolvedAt:String(row?.resolvedAt || ''), resolutionNote:String(row?.resolutionNote || ''),
  }));
  daily.guards = daily.guards.map(row => ({
    id:String(row?.id || uid('performed_service')), coverageId:String(row?.coverageId || ''), absenceId:String(row?.absenceId || ''), teacherId:String(row?.teacherId || ''),
    date:String(row?.date || ''), dayId:String(row?.dayId || ''), slotId:String(row?.slotId || ''), activityId:String(row?.activityId || ''), assignmentId:String(row?.assignmentId || ''),
    sourceType:String(row?.sourceType || 'MANUAL_GUARD'), durationMinutes:Number(row?.durationMinutes || 0), weight:Number(row?.weight || 0), status:row?.status==='CANCELLED' ? 'CANCELLED' : 'COMPLETED',
    completedAt:String(row?.completedAt || row?.createdAt || ''), cancelledAt:String(row?.cancelledAt || ''), cancellationReason:String(row?.cancellationReason || ''), operationalNote:String(row?.operationalNote || ''), privateNote:String(row?.privateNote || ''), responsible:String(row?.responsible || ''),
  }));
  daily.recoveries = daily.recoveries.map(row => ({
    id:String(row?.id || uid('recovery')), coverageId:String(row?.coverageId || ''), incidentId:String(row?.incidentId || ''), activityId:String(row?.activityId || ''),
    status:['NOT_APPLICABLE','PENDING','SCHEDULED','COMPLETED','CANCELLED_WITH_REASON'].includes(row?.status) ? row.status : 'PENDING', plannedDate:String(row?.plannedDate || ''),
    publicNote:String(row?.publicNote || row?.note || ''), privateNote:String(row?.privateNote || ''), cancellationReason:String(row?.cancellationReason || ''), responsible:String(row?.responsible || ''),
    createdAt:String(row?.createdAt || ''), updatedAt:String(row?.updatedAt || row?.createdAt || ''), completedAt:String(row?.completedAt || ''),
  }));
  daily.temporarySubstitutions = daily.temporarySubstitutions.map(row => ({
    id:String(row?.id || uid('temporary_substitution')), absentTeacherId:String(row?.absentTeacherId || ''), substituteTeacherId:String(row?.substituteTeacherId || ''),
    startDate:String(row?.startDate || ''), endDate:String(row?.endDate || ''), scopeActivityIds:[...new Set((row?.scopeActivityIds || []).map(String))],
    operationalNote:String(row?.operationalNote || ''), privateNote:String(row?.privateNote || ''), status:['PLANNED','ACTIVE','FINISHED','CANCELLED'].includes(row?.status) ? row.status : 'PLANNED',
    createdAt:String(row?.createdAt || ''), updatedAt:String(row?.updatedAt || row?.createdAt || ''), responsible:String(row?.responsible || ''), finishedAt:String(row?.finishedAt || ''), cancelledAt:String(row?.cancelledAt || ''), cancellationReason:String(row?.cancellationReason || ''),
  }));
  return daily;
}

function normalizeOrganization(value, base) {
  const org = { ...deepClone(base), ...(value || {}) };
  org.profile = {
    ...base.profile,
    ...(value?.profile || {}),
    id: String(value?.profile?.id || base.profile.id || 'generic-1.0'),
    name: String(value?.profile?.name || base.profile.name || '').trim(),
    version: String(value?.profile?.version || base.profile.version || '').trim(),
    dataState: DATA_STATES.includes(value?.profile?.dataState) ? value.profile.dataState : base.profile.dataState,
    provenance: normalizeDataProvenance(value?.profile?.provenance || {}, value?.profile?.provenance ? 'USER' : 'MIGRATED'),
  };
  org.ldDc = { ...base.ldDc, ...(value?.ldDc || {}) };
  org.workloadPolicy = { ...base.workloadPolicy, ...(value?.workloadPolicy || {}) };
  org.coveragePolicy = { ...base.coveragePolicy, ...(value?.coveragePolicy || {}) };
  org.presencePolicy = normalizePresencePolicy(value?.presencePolicy || base.presencePolicy);
  org.workloadPolicy.countedKinds = normalizeStringList(org.workloadPolicy.countedKinds).filter(x=>ACTIVITY_KINDS.includes(x));
  org.coveragePolicy.releasableKinds = normalizeStringList(org.coveragePolicy.releasableKinds).filter(x=>ACTIVITY_KINDS.includes(x));
  org.coveragePolicy.presenceExcludingKinds = normalizeStringList(org.coveragePolicy.presenceExcludingKinds).filter(x=>ACTIVITY_KINDS.includes(x));
  org.sync = { ...base.sync, ...(value?.sync || {}), contractVersion: ORGANIZATIONAL_CONTRACT_VERSION };
  org.minimumPresence = (Array.isArray(value?.minimumPresence) ? value.minimumPresence : []).map(normalizeMinimumPresenceRule);
  org.breakZones = (Array.isArray(value?.breakZones) ? value.breakZones : []).map(normalizeBreakZone);
  org.rules = (Array.isArray(value?.rules) ? value.rules : []).map(row=>normalizeOrganizationRule(row, 'HARD'));
  org.preferences = (Array.isArray(value?.preferences) ? value.preferences : []).map(row=>normalizeOrganizationRule(row, 'SOFT'));
  org.services = (Array.isArray(value?.services) ? value.services : []).map(normalizeOrganizationService);
  org.anchoredSegments = normalizeAnchoredSegments(value?.anchoredSegments);
  return org;
}

function normalizeOrganizationService(value = {}) {
  return {
    id: value.id || uid('org_service'),
    name: String(value.name || '').trim(),
    kind: ORGANIZATIONAL_SERVICE_KINDS.includes(value.kind) ? value.kind : 'OTHER',
    teacherIds: normalizeStringList(value.teacherIds),
    groupIds: normalizeStringList(value.groupIds),
    weeklySessions: Number(value.weeklySessions || 0),
    allowedDays: normalizeStringList(value.allowedDays),
    allowedSlots: normalizeStringList(value.allowedSlots),
    requiredSpaceTags: normalizeStringList(value.requiredSpaceTags),
    weekPattern: value.weekPattern || { mode:'ALL', weekIds:[] },
    allowedSiteIds: normalizeStringList(value.allowedSiteIds),
    preferredSiteIds: normalizeStringList(value.preferredSiteIds),
    allowedSpaceIds: normalizeStringList(value.allowedSpaceIds),
    preferredSpaceIds: normalizeStringList(value.preferredSpaceIds),
    alternativeSpaceIds: normalizeStringList(value.alternativeSpaceIds),
    requiredResourceIds: normalizeStringList(value.requiredResourceIds),
    preferredResourceIds: normalizeStringList(value.preferredResourceIds),
    relationIds: normalizeStringList(value.relationIds),
    splitSetId: String(value.splitSetId || ''),
    concurrencyKey: String(value.concurrencyKey || ''),
    zoneId: String(value.zoneId || '').trim(),
    priority: Number(value.priority ?? 50),
    mandatory: value.mandatory !== false,
    maxPerDay: Number(value.maxPerDay || 1),
    active: value.active !== false,
    dataState: DATA_STATES.includes(value.dataState) ? value.dataState : 'PENDING',
    provenance: normalizeDataProvenance(value.provenance || {}, value.provenance ? 'USER' : 'MIGRATED'),
    ...normalizeOrganizationalService41(value),
  };
}

function normalizePosition(value = {}) {
  return {
    id: value.id || uid('position'),
    label: String(value.label || '').trim(),
    type: POSITION_TYPES.includes(value.type) ? value.type : 'OTHER',
    weeklySessions: Number(value.weeklySessions || 0),
    allowedDays: normalizeStringList(value.allowedDays),
    allowedSlots: normalizeStringList(value.allowedSlots),
    active: value.active !== false,
    dataState: DATA_STATES.includes(value.dataState) ? value.dataState : 'PENDING',
    provenance: normalizeDataProvenance(value.provenance || {}, value.provenance ? 'USER' : 'MIGRATED'),
  };
}

function normalizeReduction(value = {}) {
  return {
    id: value.id || uid('reduction'),
    label: String(value.label || '').trim(),
    type: REDUCTION_TYPES.includes(value.type) ? value.type : 'OTHER',
    weeklySessions: Number(value.weeklySessions || 0),
    allowedDays: normalizeStringList(value.allowedDays),
    allowedSlots: normalizeStringList(value.allowedSlots),
    active: value.active !== false,
    dataState: DATA_STATES.includes(value.dataState) ? value.dataState : 'PENDING',
    provenance: normalizeDataProvenance(value.provenance || {}, value.provenance ? 'USER' : 'MIGRATED'),
  };
}

function normalizeMinimumPresenceRule(value = {}) {
  return {
    id: value.id || uid('presence_rule'),
    name: String(value.name || '').trim(),
    minimum: Number(value.minimum || 0),
    profileTag: String(value.profileTag || '').trim().toUpperCase(),
    dayIds: normalizeStringList(value.dayIds),
    slotIds: normalizeStringList(value.slotIds),
    active: value.active !== false,
    dataState: DATA_STATES.includes(value.dataState) ? value.dataState : 'PENDING',
    provenance: normalizeDataProvenance(value.provenance || {}, value.provenance ? 'USER' : 'MIGRATED'),
  };
}

function normalizeBreakZone(value = {}) {
  return {
    id: value.id || uid('break_zone'),
    name: String(value.name || '').trim(),
    slotIds: normalizeStringList(value.slotIds),
    minimumStaff: Number(value.minimumStaff || 0),
    essentialProfileTags: normalizeStringList(value.essentialProfileTags).map(x=>x.toUpperCase()),
    excludedTeacherIds: normalizeStringList(value.excludedTeacherIds),
    active: value.active !== false,
    dataState: DATA_STATES.includes(value.dataState) ? value.dataState : 'PENDING',
    provenance: normalizeDataProvenance(value.provenance || {}, value.provenance ? 'USER' : 'MIGRATED'),
  };
}

function normalizeOrganizationRule(value = {}, fallbackLevel = 'HARD') {
  const level = CONSTRAINT_LEVELS.includes(value.level) ? value.level : fallbackLevel;
  return {
    id: value.id || uid('org_rule'),
    label: String(value.label || '').trim(),
    level,
    type: String(value.type || '').trim(),
    activityId: String(value.activityId || '').trim(),
    teacherId: String(value.teacherId || '').trim(),
    groupId: String(value.groupId || '').trim(),
    kind: String(value.kind || '').trim(),
    dayId: String(value.dayId || '').trim(),
    slotId: String(value.slotId || '').trim(),
    value: String(value.value || '').trim(),
    weight: Number(value.weight || 0),
    active: value.active !== false,
    dataState: DATA_STATES.includes(value.dataState) ? value.dataState : 'PENDING',
    provenance: normalizeDataProvenance(value.provenance || {}, value.provenance ? 'USER' : 'MIGRATED'),
  };
}

function normalizeNamedDataRow(value = {}, defaults = {}, prefix = 'row') {
  const row = { ...defaults, ...value };
  return {
    ...row,
    id: row.id || uid(prefix),
    externalId: String(row.externalId || '').trim(),
    name: String(row.name || '').trim(),
    dataState: DATA_STATES.includes(row.dataState) ? row.dataState : 'PENDING',
    provenance: normalizeDataProvenance(row.provenance || {}, row.provenance ? 'USER' : 'MIGRATED'),
  };
}

function normalizeTeacher(value = {}) {
  const itinerary = {
    enabled: false,
    presenceDays: [],
    travelMinutes: 0,
    state: 'CONFIRMED',
    ...(value.itinerary || {}),
  };
  return normalizeTeacherDomain4({
    id: value.id || uid('teacher'),
    externalId: String(value.externalId || '').trim(),
    name: value.name || '',
    role: value.role || '',
    specialty: value.specialty || '',
    weeklyTarget: Number(value.weeklyTarget || 0),
    unavailable: Array.isArray(value.unavailable) ? value.unavailable : [],
    presence: Array.isArray(value.presence) ? value.presence : [],
    presencePlan: normalizePresencePlan(value.presencePlan),
    coverageEligible: value.coverageEligible !== false,
    essentialProfiles: Array.isArray(value.essentialProfiles) ? value.essentialProfiles : [],
    leadershipReduction: Number(value.leadershipReduction || 0),
    otherReduction: Number(value.otherReduction || 0),
    positions: (Array.isArray(value.positions) ? value.positions : []).map(normalizePosition),
    reductions: (Array.isArray(value.reductions) ? value.reductions : []).map(normalizeReduction),
    ldQuota: Number(value.ldQuota || 0),
    dcQuota: Number(value.dcQuota || 0),
    quotaJustification: value.quotaJustification || '',
    homeSiteId: value.homeSiteId || '',
    allowedSiteIds: Array.isArray(value.allowedSiteIds) ? value.allowedSiteIds : [],
    itinerary,
    dataState: DATA_STATES.includes(value.dataState) ? value.dataState : 'PENDING',
    provenance: normalizeDataProvenance(value.provenance || {}, value.provenance ? 'USER' : 'MIGRATED'),
    });
}

function normalizeActivity(value = {}) {
  const groupIds = Array.isArray(value.groupIds)
    ? value.groupIds
    : value.groupId ? [value.groupId] : [];
  return {
    id: value.id || uid('activity'),
    externalId: String(value.externalId || '').trim(),
    name: value.name || '',
    kind: ACTIVITY_KINDS.includes(value.kind) ? value.kind : 'TEACHING',
    subjectId: value.subjectId || '',
    groupId: value.groupId || groupIds[0] || '',
    groupIds,
    teacherIds: Array.isArray(value.teacherIds) ? value.teacherIds : [],
    weeklySessions: Number(value.weeklySessions || 0),
    durationSlots: Number(value.durationSlots || 1),
    weekPattern: value.weekPattern || { mode:'ALL', weekIds:[] },
    requiredSpaceTags: normalizeStringList(value.requiredSpaceTags),
    allowedSiteIds: normalizeStringList(value.allowedSiteIds),
    preferredSiteIds: normalizeStringList(value.preferredSiteIds),
    allowedSpaceIds: normalizeStringList(value.allowedSpaceIds),
    preferredSpaceIds: normalizeStringList(value.preferredSpaceIds),
    alternativeSpaceIds: normalizeStringList(value.alternativeSpaceIds),
    requiredResourceIds: normalizeStringList(value.requiredResourceIds),
    preferredResourceIds: normalizeStringList(value.preferredResourceIds),
    relationIds: normalizeStringList(value.relationIds),
    splitSetId: String(value.splitSetId || ''),
    concurrencyKey: String(value.concurrencyKey || ''),
    allowedDays: normalizeStringList(value.allowedDays),
    allowedSlots: normalizeStringList(value.allowedSlots),
    preferredDays: normalizeStringList(value.preferredDays),
    preferredSlots: normalizeStringList(value.preferredSlots),
    fixedOccurrences: Array.isArray(value.fixedOccurrences) ? value.fixedOccurrences : [],
    priority: Number(value.priority ?? 50),
    mandatory: value.mandatory !== false,
    maxPerDay: Number(value.maxPerDay || 1),
    consecutive: value.consecutive || 'NONE',
    source: value.source || 'USER',
    organizationKey: String(value.organizationKey || ''),
    organizationalDefinitionId: String(value.organizationalDefinitionId || ''),
    organizationalDefinitionType: String(value.organizationalDefinitionType || ''),
    zoneId: String(value.zoneId || '').trim(),
    allowedSlotKinds: normalizeStringList(value.allowedSlotKinds).filter(x=>['CLASS','BREAK','OTHER'].includes(x)),
    serviceType: String(value.serviceType || ''),
    presenceRequirement: String(value.presenceRequirement || ''),
    balanceWeight: Number(value.balanceWeight ?? 1),
    serviceSiteId: String(value.serviceSiteId || value.siteId || '').trim(),
    dataState: DATA_STATES.includes(value.dataState) ? value.dataState : 'PENDING',
    provenance: normalizeDataProvenance(value.provenance || {}, value.provenance ? 'USER' : 'MIGRATED'),
  };
}

export function normalizeStringList(value) {
  if (Array.isArray(value)) return value.map(String).map(x=>x.trim()).filter(Boolean);
  return String(value || '').split(/[|;,]/).map(x=>x.trim()).filter(Boolean);
}

export function validateProject(input) {
  const p = normalizeProject(input);
  const issues = [];
  const push = (severity, code, message, entity = null, options = {}) => {
    issues.push({
      id: uid('issue'), severity, code, message, entity,
      blocksGeneration: options.blocksGeneration ?? severity === 'ERROR',
      blocksFinalization: options.blocksFinalization ?? severity === 'ERROR',
      suggestedAction: options.suggestedAction || '',
    });
  };

  if (!p.meta.name?.trim()) push('ERROR', 'PROJECT_NAME_REQUIRED', 'El proyecto necesita un nombre.');
  if (!p.meta.center?.trim()) push('WARNING', 'CENTER_PENDING', 'Falta indicar el centro.', null, { blocksFinalization: true });
  if (!p.meta.academicYear?.trim()) push('ERROR', 'ACADEMIC_YEAR_REQUIRED', 'Falta indicar el curso académico.');
  if (!PRIVACY_CLASSES.includes(p.meta.privacyClass)) push('ERROR', 'PRIVACY_CLASS_INVALID', 'La clasificación de privacidad no es válida.');

  checkUnique(p.subjects, 'materias', push);
  checkUnique(p.teachers, 'docentes', push);
  checkUnique(p.groups, 'grupos', push);
  checkUnique(p.spaces, 'espacios', push);
  checkUnique(p.activities, 'actividades', push);

  const teacherIds = new Set(p.teachers.map(x => x.id));
  const groupIds = new Set(p.groups.map(x => x.id));
  const subjectIds = new Set(p.subjects.map(x => x.id));
  const spaceIds = new Set(p.spaces.map(x => x.id));
  const activityIds = new Set(p.activities.map(x => x.id));
  const dayIds = new Set(p.calendar.days.map(x => x.id));
  const slotIds = new Set(p.calendar.slots.map(x => x.id));

  for (const g of p.groups) {
    if (!g.name?.trim()) push('ERROR','GROUP_NAME_REQUIRED','Hay un grupo sin nombre.',g.id);
    if (g.tutorTeacherId && !teacherIds.has(g.tutorTeacherId)) push('ERROR','GROUP_TUTOR_BROKEN',`El tutor de ${g.name} no existe.`,g.id);
  }

  for (const t of p.teachers) {
    if (!t.name?.trim()) push('ERROR','TEACHER_NAME_REQUIRED','Hay un docente sin nombre.',t.id);
    for (const row of t.presencePlan || []) {
      if (!dayIds.has(row.dayId) || !slotIds.has(row.slotId)) push('ERROR','PRESENCE_PLAN_TIME_BROKEN',`${t.name}: la planificación de presencia usa una franja inexistente.`,t.id);
    }
    const invalidKeys = [...(t.unavailable || []), ...(t.presence || [])].filter(key => {
      const [dayId, slotId] = String(key).split(':');
      return !dayIds.has(dayId) || !slotIds.has(slotId);
    });
    if (invalidKeys.length) push('ERROR','TEACHER_TIME_REFERENCE_INVALID',`${t.name}: hay franjas de presencia o disponibilidad que ya no existen.`,t.id);
    if (t.itinerary?.enabled) {
      if (!t.itinerary.presenceDays?.length) push('WARNING','ITINERARY_PRESENCE_PENDING',`${t.name}: falta indicar los días de presencia de la itinerancia.`,t.id,{ blocksFinalization: true });
      for(const dayId of t.itinerary.presenceDays||[]) if(!dayIds.has(dayId)) push('ERROR','ITINERARY_DAY_INVALID',`${t.name}: la itinerancia usa un día inexistente.`,t.id);
      if (Number(t.itinerary.travelMinutes || 0) < 0) push('ERROR','ITINERARY_TRAVEL_INVALID',`${t.name}: el desplazamiento no puede ser negativo.`,t.id);
      if (t.itinerary.state !== 'CONFIRMED') push('WARNING','ITINERARY_PROVISIONAL',`${t.name}: la itinerancia sigue provisional.`,t.id,{ blocksFinalization: true });
    }
  }

  for (const a of p.activities) {
    if (!a.name?.trim()) push('ERROR','ACTIVITY_NAME_REQUIRED','Hay una actividad sin nombre.',a.id);
    const requiresGroup = ['TEACHING','SUPPORT'].includes(a.kind);
    if (requiresGroup && !a.groupIds.length) push('ERROR','ACTIVITY_GROUP_REQUIRED',`${a.name}: falta el grupo.`,a.id);
    for (const g of a.groupIds) if (!groupIds.has(g)) push('ERROR','ACTIVITY_GROUP_BROKEN',`${a.name}: un grupo no existe.`,a.id);
    if (a.subjectId && !subjectIds.has(a.subjectId)) push('ERROR','ACTIVITY_SUBJECT_BROKEN',`${a.name}: la materia no existe.`,a.id);
    if (!a.teacherIds.length) push('ERROR','ACTIVITY_TEACHER_REQUIRED',`${a.name}: falta profesorado.`,a.id);
    for (const t of a.teacherIds) if (!teacherIds.has(t)) push('ERROR','ACTIVITY_TEACHER_BROKEN',`${a.name}: un docente no existe.`,a.id);
    if (!Number.isInteger(Number(a.weeklySessions)) || Number(a.weeklySessions) < 1) push('ERROR','ACTIVITY_WEEKLY_INVALID',`${a.name}: las sesiones semanales deben ser un entero positivo.`,a.id);
    if (!Number.isInteger(Number(a.durationSlots)) || Number(a.durationSlots) < 1) push('ERROR','ACTIVITY_DURATION_INVALID',`${a.name}: la duración debe ser un entero positivo.`,a.id);
    else if (Number(a.durationSlots) > 1) push('INFO','HEURISTIC_MULTISLOT_REQUIRES_CP_SAT',`${a.name}: una actividad de ${a.durationSlots} tramos requiere OR-Tools CP-SAT; la heurística web y el editor manual no la colocan.`,a.id,{blocksGeneration:false,blocksFinalization:false,suggestedAction:'Usar el motor CP-SAT o convertir la actividad a tramos unitarios.'});
    for (const f of a.fixedOccurrences || []) {
      if (!dayIds.has(f.dayId) || !slotIds.has(f.slotId)) push('ERROR','FIXED_OCCURRENCE_INVALID',`${a.name}: una colocación fija usa un día o tramo inexistente.`,a.id);
    }
    if (a.requiredSpaceTags.length && !p.spaces.some(s=>a.requiredSpaceTags.every(tag=>(s.tags||[]).includes(tag)))) {
      push('ERROR','NO_COMPATIBLE_SPACE',`${a.name}: no existe un espacio compatible con ${a.requiredSpaceTags.join(', ')}.`,a.id);
    }
  }

  validateAcceptedAssignments(p, push, { activityIds, spaceIds, dayIds, slotIds });
  validateOrganization(p, push);
  validateLocks(p, push);
  validateDaily(p, push);
  const domainValidation = validateEducationalDomain4(p);
  for (const issue of domainValidation.issues) push(issue.severity, issue.code, issue.message, issue.entity, {
    blocksGeneration: issue.blocksGeneration,
    blocksFinalization: issue.blocksFinalization,
  });

  const organizationalDomainValidation = validateOrganizationalDomain41(p);
  for (const issue of organizationalDomainValidation.issues) push(issue.severity, issue.code, issue.message, issue.entity, {
    blocksGeneration: issue.severity === 'ERROR',
    blocksFinalization: issue.severity !== 'INFO',
  });

  validateDataEvidence(p, push);

  const data = analyzeDataState(p);
  if (data.PENDING > 0) push('WARNING','PENDING_DATA',`Hay ${data.PENDING} elementos pendientes de confirmar.`,null,{ blocksFinalization: true });
  if (data.PROVISIONAL > 0) push('INFO','PROVISIONAL_DATA',`Hay ${data.PROVISIONAL} elementos provisionales.`,null,{ blocksFinalization: true });
  if (data.SIMULATED > 0 && p.meta.privacyClass === 'REAL') push('WARNING','SIMULATED_IN_REAL_PROJECT',`Hay ${data.SIMULATED} elementos simulados dentro de un proyecto del centro.`,null,{ blocksFinalization: true });

  const errors = issues.filter(x => x.severity === 'ERROR');
  const warnings = issues.filter(x => x.severity === 'WARNING');
  return {
    issues,
    errors,
    warnings,
    canGenerate: !issues.some(x=>x.blocksGeneration),
    canFinalize: !issues.some(x=>x.blocksFinalization),
    readiness: analyzeReadiness(p, issues),
  };
}

function checkUnique(rows, label, push) {
  const seenIds = new Set();
  const seenNames = new Set();
  const seenExternalIds = new Set();
  for (const row of rows) {
    if (!row.id) push('ERROR','ID_REQUIRED',`Hay un elemento de ${label} sin identificador.`);
    else if (seenIds.has(row.id)) push('ERROR','ID_DUPLICATED',`Hay identificadores duplicados en ${label}: ${row.id}.`,row.id);
    seenIds.add(row.id);
    const normalizedName = String(row.name || '').trim().toLocaleLowerCase('es');
    if (normalizedName && seenNames.has(normalizedName)) push('WARNING','NAME_DUPLICATED',`Posible duplicado en ${label}: ${row.name}.`,row.id,{ blocksFinalization: false });
    if (normalizedName) seenNames.add(normalizedName);
    const externalId = String(row.externalId || '').trim().toLocaleLowerCase('es');
    if (externalId && seenExternalIds.has(externalId)) push('ERROR','EXTERNAL_ID_DUPLICATED',`Hay códigos externos duplicados en ${label}: ${row.externalId}.`,row.id);
    if (externalId) seenExternalIds.add(externalId);
  }
}

function validateDataEvidence(p, push) {
  const today = localDateIso();
  const teacherDefinitions=p.teachers.flatMap(t=>[
    ...(t.positions||[]).map(row=>({...row,name:`${t.name} · ${row.label}`})),
    ...(t.reductions||[]).map(row=>({...row,name:`${t.name} · ${row.label}`})),
  ]);
  const collections = [
    ['materia',p.subjects],['docente',p.teachers],['grupo',p.groups],['espacio',p.spaces],['actividad',p.activities],
    ['cargo o reducción',teacherDefinitions],['servicio organizativo',p.organization.services||[]],['segmento anclado',p.organization.anchoredSegments||[]],
  ];
  for (const [label,rows] of collections) for (const row of rows) {
    const provenance = normalizeDataProvenance(row.provenance || {}, 'MIGRATED');
    if (!DATA_ORIGINS.includes(provenance.origin)) push('WARNING','DATA_ORIGIN_INVALID',`${row.name || label}: la procedencia no está clasificada.`,row.id,{blocksFinalization:true});
    for (const [field,value] of [['validFrom',provenance.validFrom],['validTo',provenance.validTo],['verifiedAt',provenance.verifiedAt]]) {
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) push('ERROR','DATA_DATE_INVALID',`${row.name || label}: ${field} no usa el formato AAAA-MM-DD.`,row.id);
    }
    if (provenance.validFrom && provenance.validTo && provenance.validTo < provenance.validFrom) push('ERROR','DATA_VALIDITY_RANGE_INVALID',`${row.name || label}: la vigencia termina antes de comenzar.`,row.id);
    if (provenance.validTo && provenance.validTo < today) push('WARNING','DATA_EXPIRED',`${row.name || label}: la vigencia terminó el ${provenance.validTo}.`,row.id,{blocksFinalization:true});
    if (provenance.validFrom && provenance.validFrom > today) push('INFO','DATA_NOT_YET_VALID',`${row.name || label}: la vigencia comienza el ${provenance.validFrom}.`,row.id,{blocksFinalization:true});
    if (provenance.origin === 'IMPORT' && !provenance.sourceRef && !provenance.sourceFile) push('WARNING','DATA_SOURCE_MISSING',`${row.name || label}: falta identificar la procedencia de la importación.`,row.id,{blocksFinalization:true});
  }
}

function validateAcceptedAssignments(p, push, refs) {
  const occupancy = { teacher: new Map(), group: new Map(), space: new Map() };
  for (const asg of p.assignments) {
    if (!refs.activityIds.has(asg.activityId)) push('ERROR','ASSIGNMENT_ACTIVITY_BROKEN','Una sesión apunta a una actividad inexistente.',asg.id);
    if (asg.spaceId && !refs.spaceIds.has(asg.spaceId)) push('ERROR','ASSIGNMENT_SPACE_BROKEN','Una sesión apunta a un espacio inexistente.',asg.id);
    if (!refs.dayIds.has(asg.dayId) || !refs.slotIds.has(asg.slotId)) push('ERROR','ASSIGNMENT_TIME_BROKEN','Una sesión usa un día o tramo inexistente.',asg.id);
    const a = p.activities.find(x => x.id === asg.activityId);
    if (!a) continue;
    const key = slotKey(asg.dayId, asg.slotId);
    for (const t of a.teacherIds || []) addOccupancy(occupancy.teacher, `${t}|${key}`, asg, 'TEACHER_CONFLICT', `El docente ${nameOf(p.teachers,t)} tiene dos actividades a la vez.`, push);
    for (const g of a.groupIds || []) addOccupancy(occupancy.group, `${g}|${key}`, asg, 'GROUP_CONFLICT', `El grupo ${nameOf(p.groups,g)} tiene dos actividades a la vez.`, push);
    if (asg.spaceId) {
      const capacity = Number(p.spaces.find(s=>s.id===asg.spaceId)?.capacity || 1);
      addOccupancy(occupancy.space, `${asg.spaceId}|${key}`, asg, 'SPACE_CONFLICT', `El espacio ${nameOf(p.spaces,asg.spaceId)} supera su capacidad simultánea.`, push, capacity);
    }
    for (const t of a.teacherIds || []) {
      const teacherRow = p.teachers.find(x=>x.id===t);
      const assignmentSiteId = p.spaces.find(space=>space.id===asg.spaceId)?.siteId || a.serviceSiteId || '';
      const presenceDecision = teacherPresenceDecision(teacherRow, asg.dayId, asg.slotId, {siteId:assignmentSiteId,purpose:'SCHEDULE',policy:p.organization?.presencePolicy});
      if (!presenceDecision.allowed) push('ERROR','TEACHER_UNAVAILABLE',`${teacherRow?.name || t} tiene una sesión incompatible con su presencia: ${presenceDecision.reason}`,asg.id);
      if (teacherRow?.itinerary?.enabled && teacherRow.itinerary.presenceDays?.length && !teacherRow.itinerary.presenceDays.includes(asg.dayId)) {
        push('ERROR','ITINERARY_DAY_CONFLICT',`${teacherRow.name} no está presente en el centro ese día.`,asg.id);
      }
    }
  }
}

function addOccupancy(map, key, asg, code, message, push, capacity = 1) {
  const rows = map.get(key) || [];
  rows.push(asg);
  map.set(key, rows);
  if (rows.length > capacity) push('ERROR', code, message, asg.id);
}

function teacherUnavailable(teacherRow, key) {
  if (!teacherRow) return false;
  if (teacherRow.unavailable?.includes(key)) return true;
  if (teacherRow.presence?.length && !teacherRow.presence.includes(key)) return true;
  return false;
}

function validateOrganization(p, push) {
  if (!p.organization.enabled) return;
  const org = p.organization;
  if (!org.profile.name?.trim()) push('ERROR','ORG_PROFILE_NAME_REQUIRED','El perfil organizativo necesita un nombre.');
  if (!org.profile.version?.trim()) push('ERROR','ORG_PROFILE_VERSION_REQUIRED','El perfil organizativo necesita una versión.');
  if (p.meta.organizationalContractVersion !== ORGANIZATIONAL_CONTRACT_VERSION) {
    push('ERROR','ORG_CONTRACT_VERSION_INVALID','El proyecto no declara el contrato organizativo vigente.');
  }
  if (p.meta.organizationalDomainContractVersion !== ORGANIZATIONAL_DOMAIN_CONTRACT_VERSION) push('ERROR','ORG_DOMAIN_CONTRACT_VERSION_INVALID','El proyecto no declara el dominio organizativo 4.1.');

  const ordinaryLd = Number(org.ldDc.ordinaryLd || 0);
  const ordinaryDc = Number(org.ldDc.ordinaryDc || 0);
  if (![ordinaryLd,ordinaryDc].every(Number.isInteger) || ordinaryLd < 0 || ordinaryDc < 0) {
    push('ERROR','ORG_ORDINARY_QUOTA_INVALID','Las cuotas ordinarias LD/DC deben ser enteros no negativos.');
  }
  const maxSimultaneousLd = org.ldDc.maxSimultaneousLd;
  if (maxSimultaneousLd !== null && maxSimultaneousLd !== '' && (!Number.isInteger(Number(maxSimultaneousLd)) || Number(maxSimultaneousLd) < 0)) {
    push('ERROR','MAX_SIMULTANEOUS_LD_INVALID','El máximo de LD simultáneas debe ser un entero no negativo.');
  }

  const tolerance = Number(org.workloadPolicy.toleranceSessions || 0);
  if (!Number.isInteger(tolerance) || tolerance < 0) push('ERROR','WORKLOAD_TOLERANCE_INVALID','La tolerancia de carga debe ser un entero no negativo.');
  if (!(org.workloadPolicy.countedKinds || []).length) push('ERROR','WORKLOAD_KINDS_REQUIRED','Selecciona al menos un tipo de actividad que compute en la carga.');
  for (const kind of org.workloadPolicy.countedKinds || []) if (!ACTIVITY_KINDS.includes(kind)) push('ERROR','WORKLOAD_KIND_INVALID',`El tipo ${kind} no es válido en el cómputo de carga.`);
  const maxDailyCoverages = org.coveragePolicy.maxDailyCoverages;
  if (maxDailyCoverages !== null && maxDailyCoverages !== '' && (!Number.isInteger(Number(maxDailyCoverages)) || Number(maxDailyCoverages) < 0)) {
    push('ERROR','MAX_DAILY_COVERAGES_INVALID','El máximo diario de coberturas debe ser un entero no negativo.');
  }
  for (const kind of [...(org.coveragePolicy.releasableKinds || []), ...(org.coveragePolicy.presenceExcludingKinds || [])]) {
    if (!ACTIVITY_KINDS.includes(kind)) push('ERROR','COVERAGE_POLICY_KIND_INVALID',`El tipo ${kind} no es válido en la política de coberturas.`);
  }

  const teacherIds = new Set(p.teachers.map(t=>t.id));
  const groupIds = new Set(p.groups.map(g=>g.id));
  const dayIds = new Set(p.calendar.days.map(d=>d.id));
  const slotIds = new Set(p.calendar.slots.map(s=>s.id));
  const zoneIds = new Set(org.breakZones.map(z=>z.id));

  for (const t of p.teachers) {
    const ld = Number(t.ldQuota ?? ordinaryLd);
    const dc = Number(t.dcQuota ?? ordinaryDc);
    if (ld < 0 || dc < 0 || !Number.isInteger(ld) || !Number.isInteger(dc)) push('ERROR','LD_DC_QUOTA_INVALID',`${t.name}: las cuotas LD/DC deben ser enteros no negativos.`,t.id);
    if ((ld !== ordinaryLd || dc !== ordinaryDc) && !t.quotaJustification?.trim()) {
      push('WARNING','LD_DC_JUSTIFICATION_REQUIRED',`${t.name}: una cuota distinta de la ordinaria necesita justificación.`,t.id,{ blocksFinalization: true });
    }
    validateTeacherDefinitions(t, p, push);
    const structuralSessions = [...(t.positions||[]),...(t.reductions||[])]
      .filter(x=>x.active!==false)
      .reduce((sum,x)=>sum+Number(x.weeklySessions||0),0);
    if (structuralSessions > Number(t.weeklyTarget || 0) && Number(t.weeklyTarget || 0) > 0) {
      push('ERROR','TEACHER_STRUCTURAL_LOAD_EXCEEDS_TARGET',`${t.name}: cargos y reducciones (${structuralSessions}) superan la carga objetivo (${t.weeklyTarget}).`,t.id);
    }
  }

  for (const z of org.breakZones.filter(x=>x.active!==false)) {
    if (!z.name?.trim()) push('ERROR','BREAK_ZONE_NAME_REQUIRED','Hay una zona de recreo sin nombre.',z.id);
    if (!Number.isInteger(Number(z.minimumStaff)) || Number(z.minimumStaff) < 1) push('ERROR','BREAK_ZONE_MINIMUM_INVALID',`${z.name}: el mínimo debe ser un entero positivo.`,z.id);
    if (!(z.slotIds || []).length) push('WARNING','BREAK_ZONE_SLOT_REQUIRED',`${z.name}: falta asignar un tramo de recreo.`,z.id,{blocksFinalization:true});
    for (const slotId of z.slotIds || []) {
      const slot = p.calendar.slots.find(s=>s.id===slotId);
      if (!slot || slot.kind !== 'BREAK') push('ERROR','BREAK_ZONE_SLOT_INVALID',`${z.name}: una franja no es de recreo.`,z.id);
    }
    for (const teacherId of z.excludedTeacherIds || []) if (!teacherIds.has(teacherId)) push('ERROR','BREAK_ZONE_EXCLUDED_TEACHER_BROKEN',`${z.name}: una exclusión apunta a un docente inexistente.`,z.id);
  }

  for (const r of org.minimumPresence.filter(x=>x.active!==false)) {
    if (!Number.isInteger(Number(r.minimum)) || Number(r.minimum) < 0) push('ERROR','MINIMUM_PRESENCE_INVALID','Una regla de presencia mínima tiene un valor no válido.',r.id);
    if (!(r.dayIds || []).length || !(r.slotIds || []).length) push('WARNING','MINIMUM_PRESENCE_SCOPE_REQUIRED','Una regla de presencia mínima no tiene días o tramos definidos.',r.id,{blocksFinalization:true});
    for (const d of r.dayIds || []) if (!dayIds.has(d)) push('ERROR','MINIMUM_PRESENCE_DAY_INVALID','Una regla de presencia mínima usa un día inexistente.',r.id);
    for (const s of r.slotIds || []) if (!slotIds.has(s)) push('ERROR','MINIMUM_PRESENCE_SLOT_INVALID','Una regla de presencia mínima usa un tramo inexistente.',r.id);
  }

  const serviceIds = new Set();
  for (const service of (org.services || []).filter(x=>x.active!==false)) {
    if (serviceIds.has(service.id)) push('ERROR','ORG_SERVICE_ID_DUPLICATED',`Hay servicios organizativos duplicados: ${service.id}.`,service.id);
    serviceIds.add(service.id);
    if (!service.name?.trim()) push('ERROR','ORG_SERVICE_NAME_REQUIRED','Hay un servicio organizativo sin nombre.',service.id);
    if (!ORGANIZATIONAL_SERVICE_KINDS.includes(service.kind)) push('ERROR','ORG_SERVICE_KIND_INVALID',`${service.name || 'Servicio'}: tipo no válido.`,service.id);
    if (!Number.isInteger(Number(service.weeklySessions)) || Number(service.weeklySessions) < 1) push('ERROR','ORG_SERVICE_WEEKLY_INVALID',`${service.name || 'Servicio'}: las sesiones deben ser un entero positivo.`,service.id);
    if (!(service.teacherIds || []).length) push('ERROR','ORG_SERVICE_TEACHER_REQUIRED',`${service.name || 'Servicio'}: falta profesorado.`,service.id);
    if (new Set(service.teacherIds || []).size !== (service.teacherIds || []).length) push('ERROR','ORG_SERVICE_TEACHER_DUPLICATED',`${service.name || 'Servicio'}: hay docentes repetidos.`,service.id);
    if (new Set(service.groupIds || []).size !== (service.groupIds || []).length) push('ERROR','ORG_SERVICE_GROUP_DUPLICATED',`${service.name || 'Servicio'}: hay grupos repetidos.`,service.id);
    if (service.kind === 'SUPPORT' && !(service.groupIds || []).length) push('ERROR','SUPPORT_SERVICE_GROUP_REQUIRED',`${service.name || 'Apoyo'}: falta el grupo destinatario.`,service.id);
    for (const id of service.teacherIds || []) if (!teacherIds.has(id)) push('ERROR','ORG_SERVICE_TEACHER_BROKEN',`${service.name || 'Servicio'}: un docente no existe.`,service.id);
    for (const id of service.groupIds || []) if (!groupIds.has(id)) push('ERROR','ORG_SERVICE_GROUP_BROKEN',`${service.name || 'Servicio'}: un grupo no existe.`,service.id);
    for (const id of service.allowedDays || []) if (!dayIds.has(id)) push('ERROR','ORG_SERVICE_DAY_BROKEN',`${service.name || 'Servicio'}: un día no existe.`,service.id);
    for (const id of service.allowedSlots || []) if (!slotIds.has(id)) push('ERROR','ORG_SERVICE_SLOT_BROKEN',`${service.name || 'Servicio'}: un tramo no existe.`,service.id);
    if (service.kind === 'BREAK_DUTY') {
      if (!service.zoneId) push('ERROR','BREAK_SERVICE_ZONE_REQUIRED',`${service.name || 'Vigilancia'}: falta la zona de recreo.`,service.id);
      else if (!zoneIds.has(service.zoneId)) push('ERROR','BREAK_SERVICE_ZONE_BROKEN',`${service.name || 'Vigilancia'}: la zona no existe.`,service.id);
      else {
        const zone=org.breakZones.find(z=>z.id===service.zoneId);
        for(const teacherId of service.teacherIds||[]){
          if(zone?.excludedTeacherIds?.includes(teacherId)) push('ERROR','BREAK_SERVICE_TEACHER_EXCLUDED',`${service.name}: ${nameOf(p.teachers,teacherId)} está excluido/a de la zona.`,service.id);
          if(zone?.essentialProfileTags?.length){const teacher=p.teachers.find(t=>t.id===teacherId);if(!zone.essentialProfileTags.some(tag=>teacher?.essentialProfiles?.includes(tag)))push('ERROR','BREAK_SERVICE_PROFILE_REQUIRED',`${service.name}: ${teacher?.name||teacherId} no tiene un perfil habilitado para la zona.`,service.id);}
        }
      }
      for (const id of service.allowedSlots || []) if (p.calendar.slots.find(x=>x.id===id)?.kind !== 'BREAK') push('ERROR','BREAK_SERVICE_SLOT_INVALID',`${service.name || 'Vigilancia'}: usa un tramo que no es recreo.`,service.id);
    }
  }

  const supportedRuleTypes=new Set(['FORBID_DAY','FORBID_SLOT','REQUIRE_DAY','REQUIRE_SLOT','REQUIRE_SPACE_TAG','PREFER_DAY','PREFER_SLOT','AVOID_LAST_SLOT','AVOID_FIRST_SLOT','AVOID_EDGE_SLOTS']);
  const rules=[...(org.rules||[]),...(org.preferences||[])].filter(x=>x.active!==false);
  for(const rule of rules){
    if(!rule.label?.trim()) push('WARNING','ORG_RULE_LABEL_REQUIRED','Hay una regla organizativa sin descripción.',rule.id,{blocksFinalization:true});
    if(!supportedRuleTypes.has(rule.type)) push('ERROR','ORG_RULE_TYPE_INVALID',`${rule.label||'Regla'}: el tipo de regla no es válido.`,rule.id);
    if(rule.activityId&&!p.activities.some(x=>x.id===rule.activityId)) push('ERROR','ORG_RULE_ACTIVITY_BROKEN',`${rule.label||'Regla'}: la actividad indicada no existe.`,rule.id);
    if(rule.teacherId&&!teacherIds.has(rule.teacherId)) push('ERROR','ORG_RULE_TEACHER_BROKEN',`${rule.label||'Regla'}: el docente indicado no existe.`,rule.id);
    if(rule.groupId&&!groupIds.has(rule.groupId)) push('ERROR','ORG_RULE_GROUP_BROKEN',`${rule.label||'Regla'}: el grupo indicado no existe.`,rule.id);
    if(rule.kind&&!ACTIVITY_KINDS.includes(rule.kind)) push('ERROR','ORG_RULE_KIND_BROKEN',`${rule.label||'Regla'}: el tipo de actividad no existe.`,rule.id);
    if(rule.dayId&&!dayIds.has(rule.dayId)) push('ERROR','ORG_RULE_DAY_BROKEN',`${rule.label||'Regla'}: el día indicado no existe.`,rule.id);
    if(rule.slotId&&!slotIds.has(rule.slotId)) push('ERROR','ORG_RULE_SLOT_BROKEN',`${rule.label||'Regla'}: el tramo indicado no existe.`,rule.id);
    const soft=rule.level==='SOFT'||(org.preferences||[]).some(x=>x.id===rule.id);
    if(soft&&Number(rule.weight||0)<0) push('ERROR','ORG_RULE_WEIGHT_INVALID',`${rule.label||'Regla'}: el peso no puede ser negativo.`,rule.id);
    if(['FORBID_DAY','REQUIRE_DAY','PREFER_DAY'].includes(rule.type)&&!rule.dayId) push('ERROR','ORG_RULE_DAY_REQUIRED',`${rule.label||'Regla'}: falta seleccionar el día.`,rule.id);
    if(['FORBID_SLOT','REQUIRE_SLOT','PREFER_SLOT'].includes(rule.type)&&!rule.slotId) push('ERROR','ORG_RULE_SLOT_REQUIRED',`${rule.label||'Regla'}: falta seleccionar el tramo.`,rule.id);
    if(rule.type==='REQUIRE_SPACE_TAG'&&!rule.value?.trim()) push('ERROR','ORG_RULE_SPACE_TAG_REQUIRED',`${rule.label||'Regla'}: falta la etiqueta de espacio.`,rule.id);
  }

  validateOrganizationSync(p,push);
  if (org.workloadPolicy.requireExactTarget) {
    for (const row of organizationalLoadSummaryNormalized(p)) {
      if (Math.abs(row.difference) > tolerance) push('WARNING','WORKLOAD_TARGET_MISMATCH',`${row.teacherName}: la carga computable es ${row.planned} y el objetivo ${row.target}.`,row.teacherId,{blocksFinalization:true});
    }
  }

  if (p.assignments.length) {
    validateMaxSimultaneousLd(p, push);
    validateMinimumPresence(p, push);
    validateBreakCoverage(p, push);
  }
}

function validateTeacherDefinitions(t, p, push) {
  const dayIds = new Set(p.calendar.days.map(d=>d.id));
  const slotIds = new Set(p.calendar.slots.map(s=>s.id));
  const seen = new Set();
  for (const [label,rows,types] of [
    ['cargo',t.positions||[],POSITION_TYPES],
    ['reducción',t.reductions||[],REDUCTION_TYPES],
  ]) {
    for (const row of rows) {
      if (seen.has(row.id)) push('ERROR','TEACHER_ORG_DEFINITION_ID_DUPLICATED',`${t.name}: hay identificadores repetidos en cargos o reducciones.`,t.id);
      seen.add(row.id);
      if (!row.label?.trim()) push('ERROR','TEACHER_ORG_LABEL_REQUIRED',`${t.name}: hay un ${label} sin denominación.`,t.id);
      if (!types.includes(row.type)) push('ERROR','TEACHER_ORG_TYPE_INVALID',`${t.name}: un ${label} tiene un tipo no válido.`,t.id);
      if (!Number.isInteger(Number(row.weeklySessions)) || Number(row.weeklySessions) < 1) push('ERROR','TEACHER_ORG_SESSIONS_INVALID',`${t.name}: ${row.label || label} debe tener sesiones enteras positivas.`,t.id);
      for (const id of row.allowedDays || []) if (!dayIds.has(id)) push('ERROR','TEACHER_ORG_DAY_BROKEN',`${t.name}: ${row.label || label} usa un día inexistente.`,t.id);
      for (const id of row.allowedSlots || []) if (!slotIds.has(id)) push('ERROR','TEACHER_ORG_SLOT_BROKEN',`${t.name}: ${row.label || label} usa un tramo inexistente.`,t.id);
    }
  }
}

function validateOrganizationSync(p,push) {
  const expected = organizationalActivitySpecs(p);
  const actual = p.activities.filter(a=>a.source==='ORG_SYNC');
  const byKey = new Map(actual.map(a=>[a.organizationKey,a]));
  const mismatch = expected.length !== actual.length || expected.some(spec=>{
    const row=byKey.get(spec.organizationKey);
    return !row || row.kind!==spec.kind || Number(row.weeklySessions)!==Number(spec.weeklySessions)
      || stableStringify(row.teacherIds)!==stableStringify(spec.teacherIds)
      || stableStringify(row.groupIds)!==stableStringify(spec.groupIds)
      || stableStringify(row.allowedDays)!==stableStringify(spec.allowedDays)
      || stableStringify(row.allowedSlots)!==stableStringify(spec.allowedSlots)
      || stableStringify(row.requiredSpaceTags)!==stableStringify(spec.requiredSpaceTags)
      || Number(row.durationSlots)!==Number(spec.durationSlots)
      || stableStringify(row.allowedSlotKinds)!==stableStringify(spec.allowedSlotKinds)
      || String(row.serviceType||'')!==String(spec.serviceType||'')
      || String(row.presenceRequirement||'')!==String(spec.presenceRequirement||'')
      || Number(row.balanceWeight||0)!==Number(spec.balanceWeight||0)
      || String(row.serviceSiteId||'')!==String(spec.serviceSiteId||'')
      || String(row.zoneId||'')!==String(spec.zoneId||'');
  });
  const fingerprint = organizationalDefinitionFingerprint(p);
  if (mismatch || p.organization.sync?.lastFingerprint !== fingerprint || p.organization.sync?.contractVersion !== ORGANIZATIONAL_CONTRACT_VERSION) {
    push('WARNING','ORG_SYNC_PENDING','El contrato organizativo cambió y debe sincronizarse antes de cerrar el horario.',null,{blocksFinalization:true,suggestedAction:'Guardar y sincronizar la organización.'});
  }
}

function validateMaxSimultaneousLd(p, push) {
  const max = Number(p.organization.ldDc.maxSimultaneousLd || 0);
  if (!max) return;
  const counts = new Map();
  for (const asg of p.assignments) {
    const a = p.activities.find(x=>x.id===asg.activityId);
    if (a?.kind !== 'LD') continue;
    const key = slotKey(asg.dayId, asg.slotId);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const [key,count] of counts) if (count > max) push('ERROR','MAX_SIMULTANEOUS_LD_EXCEEDED',`Hay ${count} LD simultáneas en ${friendlySlot(p,key)} y el máximo es ${max}.`);
}

function validateMinimumPresence(p, push) {
  for (const rule of p.organization.minimumPresence.filter(x=>x.active!==false)) {
    for (const dayId of rule.dayIds || []) {
      for (const slotId of rule.slotIds || []) {
        const key = slotKey(dayId, slotId);
        const present = p.teachers.filter(t => {
          if (rule.profileTag && !t.essentialProfiles?.includes(rule.profileTag)) return false;
          const presenceDecision=teacherPresenceDecision(t,dayId,slotId,{purpose:'SCHEDULE',policy:p.organization?.presencePolicy});
          if(!presenceDecision.allowed)return false;
          const excludingKinds = new Set(p.organization.coveragePolicy?.presenceExcludingKinds || ['LD']);
          const occupiedOutsidePresence = p.assignments.some(asg => {
            if (asg.dayId !== dayId || asg.slotId !== slotId) return false;
            const a = p.activities.find(x=>x.id===asg.activityId);
            return excludingKinds.has(a?.kind) && a.teacherIds.includes(t.id);
          });
          return !occupiedOutsidePresence;
        }).length;
        if (present < Number(rule.minimum)) push('ERROR','MINIMUM_PRESENCE_NOT_MET',`La presencia mínima en ${friendlySlot(p,key)} es ${rule.minimum} y solo quedan ${present} docentes computables.`);
      }
    }
  }
}

function validateBreakCoverage(p, push) {
  for (const zone of p.organization.breakZones.filter(x=>x.active!==false)) {
    for (const day of p.calendar.days) {
      for (const slotId of zone.slotIds || []) {
        const count = p.assignments.filter(asg => {
          if (asg.dayId !== day.id || asg.slotId !== slotId) return false;
          const a = p.activities.find(x=>x.id===asg.activityId);
          return a?.kind === 'BREAK_DUTY' && (a.zoneId===zone.id || a.requiredSpaceTags?.includes(`ZONE:${zone.id}`));
        }).length;
        if (count < Number(zone.minimumStaff)) push('WARNING','BREAK_COVERAGE_PENDING',`${zone.name}: faltan ${Number(zone.minimumStaff)-count} vigilancia(s) el ${day.label}.`,zone.id,{ blocksFinalization: true });
      }
    }
  }
}

function validateLocks(p, push) {
  for (const lock of p.locks) {
    if (!lock.reason?.trim()) push('WARNING','LOCK_REASON_REQUIRED','Hay un bloqueo sin motivo.',lock.id,{ blocksFinalization: true });
    if (!lock.createdBy?.trim()) push('WARNING','LOCK_OWNER_REQUIRED','Hay un bloqueo sin responsable.',lock.id,{ blocksFinalization: true });
  }
}

function validateDaily(p, push) {
  const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  const configuredPeriods=(p.daily?.settings?.reportingPeriods||[]).filter(x=>x.active!==false);
  for(const period of configuredPeriods){
    if(!period.label?.trim()) push('ERROR','REPORTING_PERIOD_LABEL_REQUIRED','Hay un periodo de informe sin denominación.',period.id);
    if(!isDate(period.fromDate)||!isDate(period.toDate)||period.toDate<period.fromDate) push('ERROR','REPORTING_PERIOD_DATES_INVALID',`${period.label||'Periodo'}: las fechas no son válidas o están invertidas.`,period.id);
  }
  const ordered=[...configuredPeriods].sort((a,b)=>a.fromDate.localeCompare(b.fromDate));
  for(let i=1;i<ordered.length;i+=1) if(ordered[i].fromDate<=ordered[i-1].toDate) push('ERROR','REPORTING_PERIOD_OVERLAP',`${ordered[i-1].label} y ${ordered[i].label} se solapan.`,ordered[i].id);

  const teacherIds = new Set(p.teachers.map(x=>x.id));
  const activityIds = new Set(p.activities.map(x=>x.id));
  const assignmentIds = new Set(p.assignments.map(x=>x.id));
  const dayIds = new Set(p.calendar.days.map(x=>x.id));
  const slotIds = new Set(p.calendar.slots.map(x=>x.id));
  const absenceIds = new Set(p.daily.absences.map(x=>x.id));
  const coverageIds = new Set(p.daily.coverages.map(x=>x.id));
  const incidentIds = new Set((p.daily.incidents||[]).map(x=>x.id));

  if (p.meta.dailyOperationsContractVersion !== DAILY_OPERATIONS_CONTRACT_VERSION || p.daily.contractVersion !== DAILY_OPERATIONS_CONTRACT_VERSION) {
    push('ERROR','DAILY_CONTRACT_VERSION_INVALID','La gestión diaria no declara el contrato vigente.');
  }
  for (const a of p.daily.absences) {
    if (!teacherIds.has(a.teacherId)) push('ERROR','ABSENCE_TEACHER_BROKEN','Una ausencia apunta a una persona inexistente.',a.id);
    if (!dayIds.has(a.dayId)) push('ERROR','ABSENCE_DAY_BROKEN','Una ausencia utiliza un día inexistente.',a.id);
    if (!isDate(a.date)) push('ERROR','ABSENCE_DATE_INVALID','Una ausencia no tiene fecha válida.',a.id);
    if (!['DRAFT','CONFIRMED','CANCELLED','FINISHED'].includes(a.status)) push('ERROR','ABSENCE_STATUS_INVALID','Una ausencia tiene un estado no válido.',a.id);
    for (const slotId of a.slotIds || []) if (!slotIds.has(slotId)) push('ERROR','ABSENCE_SLOT_BROKEN','Una ausencia utiliza un tramo inexistente.',a.id);
    for (const assignmentId of a.affectedAssignmentIds || []) if (!assignmentIds.has(assignmentId)) push('ERROR','ABSENCE_ASSIGNMENT_BROKEN','Una ausencia conserva una sesión afectada inexistente.',a.id);
  }
  for (const c of p.daily.coverages) {
    if (!absenceIds.has(c.absenceId)) push('ERROR','COVERAGE_ABSENCE_BROKEN','Una cobertura apunta a una ausencia inexistente.',c.id);
    if (c.reconciliationState!=='OBSOLETE' && c.assignmentId && !assignmentIds.has(c.assignmentId)) push('ERROR','COVERAGE_ASSIGNMENT_BROKEN','Una cobertura apunta a una sesión inexistente.',c.id);
    if (c.activityId && !activityIds.has(c.activityId)) push('ERROR','COVERAGE_ACTIVITY_BROKEN','Una cobertura apunta a una actividad inexistente.',c.id);
    if (!dayIds.has(c.dayId) || !slotIds.has(c.slotId)) push('ERROR','COVERAGE_TIME_BROKEN','Una cobertura usa un día o tramo inexistente.',c.id);
    if (!['PENDING','PROPOSED','ASSIGNED','COMMUNICATED','COMPLETED','CANCELLED','UNCOVERED'].includes(c.status)) push('ERROR','COVERAGE_STATUS_INVALID','Una cobertura tiene un estado no válido.',c.id);
    if (['PROPOSED','ASSIGNED','COMMUNICATED','COMPLETED'].includes(c.status) && !teacherIds.has(c.coverTeacherId)) push('ERROR','COVERAGE_TEACHER_BROKEN','Una cobertura asignada apunta a una persona inexistente.',c.id);
    if (c.releasedAssignmentId && !assignmentIds.has(c.releasedAssignmentId)) push('ERROR','COVERAGE_RELEASED_ASSIGNMENT_BROKEN','Una cobertura libera una sesión inexistente.',c.id);
  }
  for (const r of p.daily.recoveries) {
    if (!['NOT_APPLICABLE','PENDING','SCHEDULED','COMPLETED','CANCELLED_WITH_REASON'].includes(r.status)) push('ERROR','RECOVERY_STATUS_INVALID','Hay una recuperación con estado no válido.',r.id);
    if (r.coverageId && !coverageIds.has(r.coverageId)) push('ERROR','RECOVERY_COVERAGE_BROKEN','Una recuperación apunta a una cobertura inexistente.',r.id);
    if (r.incidentId && !incidentIds.has(r.incidentId)) push('ERROR','RECOVERY_INCIDENT_BROKEN','Una recuperación apunta a una incidencia inexistente.',r.id);
    if (r.activityId && !activityIds.has(r.activityId)) push('ERROR','RECOVERY_ACTIVITY_BROKEN','Una recuperación apunta a una actividad inexistente.',r.id);
    if (r.plannedDate && !isDate(r.plannedDate)) push('ERROR','RECOVERY_DATE_INVALID','Una recuperación contiene una fecha no válida.',r.id);
  }
  for (const s of p.daily.temporarySubstitutions || []) {
    if (!teacherIds.has(s.absentTeacherId)) push('ERROR','TEMP_SUB_ABSENT_TEACHER_BROKEN','Una sustitución temporal apunta a una persona sustituida inexistente.',s.id);
    if (!teacherIds.has(s.substituteTeacherId)) push('ERROR','TEMP_SUB_TEACHER_BROKEN','Una sustitución temporal apunta a una persona sustituta inexistente.',s.id);
    if (s.absentTeacherId===s.substituteTeacherId) push('ERROR','TEMP_SUB_SAME_TEACHER','La persona sustituida y la sustituta no pueden ser la misma.',s.id);
    if (!['PLANNED','ACTIVE','FINISHED','CANCELLED'].includes(s.status)) push('ERROR','TEMP_SUB_STATUS_INVALID','Hay una sustitución temporal con estado no válido.',s.id);
    if (!isDate(s.startDate)) push('ERROR','TEMP_SUB_START_INVALID','Una sustitución temporal no tiene fecha inicial válida.',s.id);
    if (s.endDate && (!isDate(s.endDate) || s.endDate < s.startDate)) push('ERROR','TEMP_SUB_DATE_RANGE_INVALID','Una sustitución temporal termina antes de empezar.',s.id);
    for(const activityId of s.scopeActivityIds||[]) if(!activityIds.has(activityId)) push('ERROR','TEMP_SUB_ACTIVITY_BROKEN','Una sustitución temporal incluye una actividad inexistente.',s.id);
  }
  for (const row of p.daily.guards || []) {
    if (!teacherIds.has(row.teacherId)) push('ERROR','PERFORMED_SERVICE_TEACHER_BROKEN','Un servicio realizado apunta a una persona inexistente.',row.id);
    if (row.coverageId && !coverageIds.has(row.coverageId)) push('ERROR','PERFORMED_SERVICE_COVERAGE_BROKEN','Un servicio realizado apunta a una cobertura inexistente.',row.id);
    if (!isDate(row.date)) push('ERROR','PERFORMED_SERVICE_DATE_INVALID','Un servicio realizado no tiene fecha válida.',row.id);
    if (!dayIds.has(row.dayId) || !slotIds.has(row.slotId)) push('ERROR','PERFORMED_SERVICE_TIME_BROKEN','Un servicio realizado usa un día o tramo inexistente.',row.id);
    if (!['COMPLETED','CANCELLED'].includes(row.status)) push('ERROR','PERFORMED_SERVICE_STATUS_INVALID','Un servicio realizado tiene estado no válido.',row.id);
  }
  for (const row of p.daily.incidents || []) {
    if (!assignmentIds.has(row.assignmentId)) push('ERROR','DAILY_INCIDENT_ASSIGNMENT_BROKEN','Una incidencia diaria apunta a una sesión inexistente.',row.id);
    if (row.coverageId && !coverageIds.has(row.coverageId)) push('ERROR','DAILY_INCIDENT_COVERAGE_BROKEN','Una incidencia diaria apunta a una cobertura inexistente.',row.id);
    if (!['UNCHANGED','DISPLACED','SUSPENDED','CANCELLED','RECOVERY_REQUIRED'].includes(row.type)) push('ERROR','DAILY_INCIDENT_TYPE_INVALID','Una incidencia diaria tiene un tipo no válido.',row.id);
    if (!['OPEN','RESOLVED','CANCELLED'].includes(row.status)) push('ERROR','DAILY_INCIDENT_STATUS_INVALID','Una incidencia diaria tiene un estado no válido.',row.id);
    if (row.date && !isDate(row.date)) push('ERROR','DAILY_INCIDENT_DATE_INVALID','Una incidencia diaria no tiene fecha válida.',row.id);
  }
}
function friendlySlot(p, key) {
  const [dayId, slotId] = key.split(':');
  return `${nameOf(p.calendar.days,dayId)} · ${nameOf(p.calendar.slots,slotId)}`;
}

export function analyzeDataState(p) {
  const counts = { CONFIRMED: 0, PROVISIONAL: 0, SIMULATED: 0, PENDING: 0, UNCLASSIFIED: 0 };
  const rows = [
    p.meta,
    ...(p.subjects || []),
    ...(p.teachers || []),
    ...(p.groups || []),
    ...(p.spaces || []),
    ...(p.activities || []),
    ...(p.teachers || []).flatMap(t=>[...(t.positions || []), ...(t.reductions || [])]),
    ...(p.organization?.breakZones || []),
    ...(p.organization?.minimumPresence || []),
    ...(p.organization?.services || []),
    ...(p.organization?.rules || []),
    ...(p.organization?.preferences || []),
    p.organization?.profile,
    ...(p.domain?.sites || []), ...(p.domain?.resources || []),
  ];
  for (const row of rows) {
    const state = row?.dataState;
    if (Object.hasOwn(counts, state)) counts[state] += 1;
    else counts.UNCLASSIFIED += 1;
  }
  return counts;
}

export function analyzeDataQuality(p) {
  const today = localDateIso();
  const rows = [
    ...(p.subjects || []), ...(p.teachers || []), ...(p.groups || []), ...(p.spaces || []), ...(p.activities || []),
    ...(p.teachers || []).flatMap(t=>[...(t.positions || []), ...(t.reductions || [])]),
    ...(p.organization?.breakZones || []), ...(p.organization?.minimumPresence || []), ...(p.organization?.services || []),
    ...(p.organization?.rules || []), ...(p.organization?.preferences || []), p.organization?.profile,
    ...(p.domain?.sites || []), ...(p.domain?.resources || []),
  ].filter(Boolean);
  const origins = Object.fromEntries(DATA_ORIGINS.map(origin=>[origin,0]));
  let expired=0, future=0, withoutSource=0, verified=0, withExternalId=0;
  for (const row of rows) {
    const provenance=normalizeDataProvenance(row.provenance || {}, 'MIGRATED');
    origins[provenance.origin]=(origins[provenance.origin]||0)+1;
    if(provenance.validTo&&provenance.validTo<today)expired+=1;
    if(provenance.validFrom&&provenance.validFrom>today)future+=1;
    if(provenance.origin==='IMPORT'&&!provenance.sourceRef&&!provenance.sourceFile)withoutSource+=1;
    if(provenance.verifiedAt||provenance.verifiedBy)verified+=1;
    if(String(row.externalId||'').trim())withExternalId+=1;
  }
  return {total:rows.length,origins,expired,future,withoutSource,verified,withExternalId};
}

export function analyzeReadiness(p, issues = validateProjectShallow(p)) {
  const list = Array.isArray(issues) ? issues : issues.issues || [];
  const sections = [
    readinessSection('project','Centro y curso',Boolean(p.meta.center && p.meta.academicYear),1),
    readinessSection('calendar','Calendario y tramos',p.calendar.days.length > 0 && p.calendar.slots.some(s=>s.kind==='CLASS'),2),
    readinessSection('teachers','Profesorado',p.teachers.length > 0,3),
    readinessSection('groups','Grupos',p.groups.length > 0,4),
    readinessSection('subjects','Materias',p.subjects.length > 0,5),
    readinessSection('spaces','Espacios',p.spaces.length > 0,6),
    readinessSection('activities','Carga y actividades',p.activities.some(a=>['TEACHING','SUPPORT'].includes(a.kind)),7),
    readinessSection('availability','Disponibilidades y reglas',p.teachers.every(t=>Array.isArray(t.unavailable) && Array.isArray(t.presence)),8),
    readinessSection('review','Revisión',!list.some(x=>x.blocksGeneration),9),
  ];
  const completed = sections.filter(x=>x.ready).length;
  const blocking = list.filter(x=>x.blocksGeneration).length;
  const finalBlocking = list.filter(x=>x.blocksFinalization).length;
  const next = sections.find(x=>!x.ready) || (blocking ? { id:'review', label:'Corregir bloqueos', step:9 } : { id:'generate', label:'Generar propuesta', step:10 });
  return {
    sections,
    completed,
    total: sections.length,
    progressPct: Math.round(completed / sections.length * 100),
    blocking,
    finalBlocking,
    next,
  };
}

function validateProjectShallow(p) {
  const list = [];
  if (!p.meta?.name) list.push({ blocksGeneration: true, blocksFinalization: true });
  return list;
}

function readinessSection(id, label, ready, step) {
  return { id, label, ready: Boolean(ready), step };
}

export function computeMetrics(p, assignments = p.assignments) {
  const required = (p.activities || []).reduce((sum,a)=>sum + requiredOccurrencesForActivity(a,p.domain),0);
  const placed = assignments.length;
  const gapsByTeacher = [];
  for (const teacherRow of p.teachers || []) {
    let gaps = 0;
    for (const day of p.calendar.days || []) {
      const order = (p.calendar.slots || []).filter(s=>s.kind==='CLASS').map(s=>s.id);
      const indexes = assignments.filter(asg=> {
        if (asg.dayId !== day.id) return false;
        const a = p.activities.find(x=>x.id===asg.activityId);
        return a?.teacherIds?.includes(teacherRow.id);
      }).map(asg=>order.indexOf(asg.slotId)).filter(i=>i>=0).sort((a,b)=>a-b);
      if (indexes.length > 1) gaps += Math.max(0, indexes[indexes.length-1]-indexes[0]+1-indexes.length);
    }
    gapsByTeacher.push({ teacherId: teacherRow.id, gaps });
  }
  const gaps = gapsByTeacher.reduce((s,x)=>s+x.gaps,0);
  const teacherLoads = p.teachers.map(t=>({
    teacherId:t.id,
    placed: assignments.filter(asg=>p.activities.find(a=>a.id===asg.activityId)?.teacherIds?.includes(t.id)).length,
    target:Number(t.weeklyTarget||0),
  }));
  const pending = Math.max(0, required - placed);
  return {
    required,
    placed,
    pending,
    completionPct: required ? Math.round(placed/required*100) : 0,
    gaps,
    gapsByTeacher,
    teacherLoads,
    scopeNote:'Indicadores descriptivos de cobertura y distribución. No constituyen una valoración total de la calidad del horario.',
  };
}

export function appendAudit(p, action, note, actor = p.meta.responsible || 'Usuario', details = null) {
  p.audit.push({ id: uid('audit'), at: nowIso(), actor, action, note, details });
  p.meta.updatedAt = nowIso();
}


export const EDIT_COMMAND_HISTORY_LIMIT = 20;

export function compactEditCommands(project, { limit = EDIT_COMMAND_HISTORY_LIMIT, invalidateRedo = false, clear = false } = {}) {
  if (!project || typeof project !== 'object') return project;
  if (clear) {
    project.editCommands = [];
    return project;
  }
  const safeLimit = Math.max(0, Number.isFinite(Number(limit)) ? Math.trunc(Number(limit)) : EDIT_COMMAND_HISTORY_LIMIT);
  project.editCommands = Array.isArray(project.editCommands) ? project.editCommands.filter(row => row && typeof row === 'object') : [];
  if (invalidateRedo) {
    for (const command of project.editCommands) {
      if (command.status === 'UNDONE') {
        command.status = 'SUPERSEDED';
        command.supersededAt = nowIso();
      }
    }
  }
  if (safeLimit === 0) {
    project.editCommands = [];
    return project;
  }
  if (project.editCommands.length > safeLimit) project.editCommands = project.editCommands.slice(-safeLimit);
  return project;
}

const HISTORY_STATE_KEYS = [
  'setup','calendar','settings','organization','domain','subjects','teachers','groups','spaces',
  'activities','assignments','proposals','constraints','locks','daily',
];

const SCENARIO_STATE_KEYS = [
  'setup','calendar','settings','organization','domain','subjects','teachers','groups','spaces',
  'activities','assignments','constraints','locks',
];

const RESTORABLE_META_KEYS = [
  'name','center','academicYear','responsible','dataState','privacyClass','lastAcceptedAt',
];

function pickMetaState(meta = {}) {
  return Object.fromEntries(RESTORABLE_META_KEYS.map(key => [key, deepClone(meta[key] ?? null)]));
}

function captureStateByKeys(input, keys) {
  const p = input || {};
  const state = {
    contractVersion: HISTORY_CONTRACT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    projectInfo: pickMetaState(p.meta),
  };
  for (const key of keys) state[key] = deepClone(p[key]);
  return state;
}

export function captureRestorableState(input) {
  return captureStateByKeys(input, HISTORY_STATE_KEYS);
}

export function captureScenarioState(input) {
  return captureStateByKeys(input, SCENARIO_STATE_KEYS);
}

export function applyScenarioState(project, state) {
  return applyStateByKeys(project, state, SCENARIO_STATE_KEYS);
}

function applyStateByKeys(project, state, keys) {
  if (!state || state.contractVersion !== HISTORY_CONTRACT_VERSION) throw new Error('El estado seleccionado no usa el contrato histórico vigente.');
  const next = deepClone(state);
  for (const key of RESTORABLE_META_KEYS) {
    if (Object.prototype.hasOwnProperty.call(next.projectInfo || {}, key)) project.meta[key] = deepClone(next.projectInfo[key]);
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(next, key)) throw new Error(`El estado histórico no contiene el bloque obligatorio ${key}.`);
    project[key] = deepClone(next[key]);
  }
  return project;
}

export function stateSha256(state) {
  return sha256HexSync(stableStringify(state));
}

export function verifyHistoricalEntry(entry, kind = 'snapshot') {
  if (!entry || entry.restorable !== true) return { ok:false, code:'NOT_RESTORABLE', message:`La ${kind === 'scenario' ? 'alternativa' : 'versión'} no contiene un estado completo restaurable.` };
  if (entry.contractVersion !== HISTORY_CONTRACT_VERSION) return { ok:false, code:'CONTRACT_MISMATCH', message:'El contrato histórico no es compatible.' };
  if (!entry.state || typeof entry.state !== 'object') return { ok:false, code:'STATE_MISSING', message:'Falta el estado histórico.' };
  if (!/^[0-9a-f]{64}$/.test(String(entry.stateSha256 || ''))) return { ok:false, code:'HASH_MISSING', message:'Falta la huella SHA-256 del estado histórico.' };
  const actual = stateSha256(entry.state);
  if (actual !== entry.stateSha256) return { ok:false, code:'HASH_MISMATCH', message:'La versión histórica fue alterada o está dañada.' };
  return { ok:true, code:'VERIFIED', actual };
}

export function createRevision(p, reason, options = {}) {
  const state = captureRestorableState(p);
  const snapshot = {
    id: uid('snapshot'),
    contractVersion: HISTORY_CONTRACT_VERSION,
    stateSchemaVersion: SCHEMA_VERSION,
    kind: 'STRUCTURAL',
    restorable: true,
    integrity: 'SHA256_VERIFIED_ON_USE',
    createdAt: nowIso(),
    reason,
    actor: options.actor || p.meta.responsible || 'Usuario',
    projectId: p.meta.projectId,
    revisionId: p.meta.revisionId,
    revisionNumber: Number(p.meta.revisionNumber || 1),
    sourceStatus: p.meta.status,
    fingerprint: structuralFingerprint(p),
    stateSha256: stateSha256(state),
    state,
  };
  p.history.push(snapshot);
  p.meta.revisionId = uid('rev');
  p.meta.revisionNumber = Number(p.meta.revisionNumber || 1) + 1;
  p.meta.status = 'DRAFT';
  p.meta.updatedAt = nowIso();
  p.meta.structuralFingerprint = structuralFingerprint(p);
  appendAudit(p,'REVISION_CREATED',reason,options.actor, { snapshotId:snapshot.id, stateSha256:snapshot.stateSha256 });
  return snapshot;
}

export function restoreSnapshot(input, snapshotId) {
  const p = normalizeProject(input);
  const snapshot = p.history.find(x=>x.id===snapshotId);
  if (!snapshot) throw new Error('No se encontró la versión seleccionada.');
  if (snapshot.projectId && snapshot.projectId !== p.meta.projectId) throw new Error('La versión pertenece a otro proyecto.');
  const verification = verifyHistoricalEntry(snapshot, 'snapshot');
  if (!verification.ok) throw new Error(verification.message);
  const previousRevisionNumber = Number(p.meta.revisionNumber || 1);
  createRevision(p,'Antes de restaurar una versión', { actor:p.meta.responsible || 'Usuario' });
  applyStateByKeys(p, snapshot.state, HISTORY_STATE_KEYS);
  compactEditCommands(p, { clear: true });
  p.meta.status = 'DRAFT';
  p.meta.lastRestoredSnapshotId = snapshot.id;
  p.meta.lastRestoredAt = nowIso();
  p.meta.updatedAt = nowIso();
  if (p.meta.revisionNumber !== previousRevisionNumber + 1) throw new Error('La restauración no pudo mantener una numeración de revisión coherente.');
  appendAudit(p,'SNAPSHOT_RESTORED',`Versión restaurada: ${snapshot.reason}.`,p.meta.responsible,{ sourceSnapshotId:snapshotId, sourceRevisionNumber:snapshot.revisionNumber, stateSha256:snapshot.stateSha256 });
  p.meta.structuralFingerprint = structuralFingerprint(p);
  return p;
}

function markLegacyHistoryEntry(value = {}) {
  if (value?.contractVersion === HISTORY_CONTRACT_VERSION && value?.state && value?.stateSha256) return value;
  return {
    ...value,
    contractVersion: value.contractVersion || 'legacy-history-partial',
    kind: value.kind || 'LEGACY_PARTIAL',
    restorable: false,
    integrity: 'UNVERIFIABLE_LEGACY',
    migrationNote: value.migrationNote || 'Conservada como referencia; la versión antigua no contenía el estado estructural completo ni SHA-256.',
  };
}

function markLegacyScenarioEntry(value = {}) {
  if (value?.contractVersion === HISTORY_CONTRACT_VERSION && value?.state && value?.stateSha256) return value;
  return {
    ...value,
    contractVersion: value.contractVersion || 'legacy-scenario-schedule-only',
    kind: value.kind || 'LEGACY_SCHEDULE_ONLY',
    restorable: false,
    integrity: 'UNVERIFIABLE_LEGACY',
    migrationNote: value.migrationNote || 'Conservada como referencia; la alternativa antigua solo almacenaba asignaciones.',
  };
}

function normalizeHistoryEntry(value = {}) {
  const row = markLegacyHistoryEntry(deepClone(value));
  if (row.restorable === true) {
    row.kind = 'STRUCTURAL';
    row.integrity = row.integrity || 'SHA256_VERIFIED_ON_USE';
  }
  return row;
}

function normalizeScenarioEntry(value = {}) {
  const row = markLegacyScenarioEntry(deepClone(value));
  if (row.restorable === true) {
    row.kind = 'PLANNING_BRANCH';
    row.integrity = row.integrity || 'SHA256_VERIFIED_ON_USE';
  }
  return row;
}

export function sha256HexSync(message) {
  const bytes = new TextEncoder().encode(String(message));
  const bitLength = BigInt(bytes.length) * 8n;
  const totalLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const buffer = new Uint8Array(totalLength);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;
  const view = new DataView(buffer.buffer);
  view.setUint32(totalLength - 8, Number((bitLength >> 32n) & 0xffffffffn), false);
  view.setUint32(totalLength - 4, Number(bitLength & 0xffffffffn), false);
  const h = new Uint32Array([
    0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
    0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19,
  ]);
  const k = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ]);
  const w = new Uint32Array(64);
  const rotr = (x,n) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >>> 3);
      const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + s1 + ch + k[i] + w[i]) >>> 0;
      const s0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      hh=g;g=f;f=e;e=(d+temp1)>>>0;d=c;c=b;b=a;a=(temp1+temp2)>>>0;
    }
    h[0]=(h[0]+a)>>>0;h[1]=(h[1]+b)>>>0;h[2]=(h[2]+c)>>>0;h[3]=(h[3]+d)>>>0;
    h[4]=(h[4]+e)>>>0;h[5]=(h[5]+f)>>>0;h[6]=(h[6]+g)>>>0;h[7]=(h[7]+hh)>>>0;
  }
  return [...h].map(value => value.toString(16).padStart(8,'0')).join('');
}

export function structuralFingerprint(input) {
  const p = input || {};
  const payload = {
    calendar: p.calendar || {},
    settings: p.settings || {},
    organization: p.organization || {},
    domain: p.domain || {},
    subjects: p.subjects || [],
    teachers: p.teachers || [],
    groups: p.groups || [],
    spaces: p.spaces || [],
    activities: p.activities || [],
    assignments: p.assignments || [],
    constraints: p.constraints || [],
    locks: p.locks || [],
  };
  return `fnv1a-${fnv1a(stableStringify(payload))}`;
}

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8,'0');
}

export function buildOrganizationalActivitySpecs(input) {
  const p = normalizeProject(input);
  return organizationalActivitySpecs(p).map(deepClone);
}

function organizationalActivitySpecs(p) {
  if (!p.organization.enabled) return [];
  const cfg = p.organization.ldDc;
  const out = [];
  for (const t of p.teachers) {
    const ldQuota = Number(t.ldQuota ?? cfg.ordinaryLd ?? 0);
    const dcQuota = Number(t.dcQuota ?? cfg.ordinaryDc ?? 0);
    if (ldQuota > 0) out.push(organizationalActivity(t,'LD',ldQuota,cfg.ldAllowedSlots,[],`LD:${t.id}`,`LD · ${t.name}`,t.dataState));
    if (dcQuota > 0) out.push(organizationalActivity(t,'DC',dcQuota,cfg.dcAllowedSlots,[],`DC:${t.id}`,`DC · ${t.name}`,t.dataState));
    for (const position of t.positions || []) {
      if (position.active === false || Number(position.weeklySessions || 0) <= 0) continue;
      out.push(organizationalActivity(
        t,'COORDINATION',position.weeklySessions,position.allowedSlots,position.allowedDays,
        `POSITION:${t.id}:${position.id}`,`${position.label} · ${t.name}`,position.dataState,
        { organizationalDefinitionId:position.id, organizationalDefinitionType:'POSITION' },
      ));
    }
    for (const reduction of t.reductions || []) {
      if (reduction.active === false || Number(reduction.weeklySessions || 0) <= 0) continue;
      out.push(organizationalActivity(
        t,'REDUCTION',reduction.weeklySessions,reduction.allowedSlots,reduction.allowedDays,
        `REDUCTION:${t.id}:${reduction.id}`,`${reduction.label} · ${t.name}`,reduction.dataState,
        { organizationalDefinitionId:reduction.id, organizationalDefinitionType:'REDUCTION' },
      ));
    }
  }
  for (const service of p.organization.services || []) {
    if (service.active === false || Number(service.weeklySessions || 0) <= 0) continue;
    const zone = service.zoneId ? p.organization.breakZones.find(z=>z.id===service.zoneId) : null;
    const allowedSlots = service.allowedSlots?.length ? service.allowedSlots : (service.kind === 'BREAK_DUTY' ? (zone?.slotIds || []) : []);
    const requiredSpaceTags = [...new Set(service.requiredSpaceTags || [])];
    out.push(normalizeActivity({
      id:`org_service_${service.id}`,
      externalId:'',
      organizationKey:`SERVICE:${service.id}`,
      organizationalDefinitionId:service.id,
      organizationalDefinitionType:'SERVICE',
      name:service.name,
      kind:service.kind,
      groupIds:service.groupIds || [],
      groupId:service.groupIds?.[0] || '',
      teacherIds:service.teacherIds || [],
      weeklySessions:Number(service.weeklySessions),
      durationSlots:Number(service.durationSlots || 1),
      requiredSpaceTags,
      allowedSlotKinds:serviceAllowedSlotKinds(service),
      serviceType:service.serviceType,
      presenceRequirement:service.presenceRequirement,
      balanceWeight:Number(service.balanceWeight ?? 1),
      serviceSiteId:service.siteId || '',
      zoneId:service.zoneId || '',
      allowedSiteIds:service.allowedSiteIds?.length ? service.allowedSiteIds : (service.siteId ? [service.siteId] : []),
      preferredSiteIds:service.preferredSiteIds || [],
      allowedSpaceIds:service.allowedSpaceIds || [],
      preferredSpaceIds:service.preferredSpaceIds || [],
      alternativeSpaceIds:service.alternativeSpaceIds || [],
      requiredResourceIds:service.requiredResourceIds || [],
      preferredResourceIds:service.preferredResourceIds || [],
      weekPattern:service.weekPattern || {mode:'ALL',weekIds:[]},
      allowedDays:service.allowedDays || [],
      allowedSlots,
      priority:Number(service.priority ?? 50),
      mandatory:service.mandatory !== false,
      maxPerDay:Number(service.maxPerDay || 1),
      source:'ORG_SYNC',
      dataState:service.dataState,
      provenance:normalizeDataProvenance({ origin:'SYSTEM', sourceRef:`Servicio organizativo ${service.id}` }, 'SYSTEM'),
    }));
  }
  return out.sort((a,b)=>String(a.organizationKey).localeCompare(String(b.organizationKey)));
}

function organizationalDefinitionFingerprintNormalized(p) {
  const payload = {
    enabled:p.organization.enabled,
    profile:p.organization.profile,
    ldDc:p.organization.ldDc,
    workloadPolicy:p.organization.workloadPolicy,
    coveragePolicy:p.organization.coveragePolicy,
    minimumPresence:p.organization.minimumPresence,
    breakZones:p.organization.breakZones,
    services:p.organization.services,
    anchoredSegments:p.organization.anchoredSegments,
    presencePolicy:p.organization.presencePolicy,
    rules:p.organization.rules,
    preferences:p.organization.preferences,
    teachers:p.teachers.map(t=>({
      id:t.id,ldQuota:t.ldQuota,dcQuota:t.dcQuota,quotaJustification:t.quotaJustification,
      coverageEligible:t.coverageEligible,essentialProfiles:t.essentialProfiles,itinerary:t.itinerary,presencePlan:t.presencePlan,
      homeSiteId:t.homeSiteId,allowedSiteIds:t.allowedSiteIds,
      positions:t.positions,reductions:t.reductions,dataState:t.dataState,
    })),
  };
  return `fnv1a-${fnv1a(stableStringify(payload))}`;
}

export function organizationalDefinitionFingerprint(input) {
  return organizationalDefinitionFingerprintNormalized(normalizeProject(input));
}

export function syncOrganizationalActivities(input) {
  const p = input;
  p.activities = p.activities.filter(a=>a.source!=='ORG_SYNC');
  const normalized = normalizeProject(p);
  const specs = organizationalActivitySpecs(normalized);
  p.activities.push(...specs.map(deepClone));
  const derivedRelations = anchoredSegmentRelations(p.organization.anchoredSegments || []);
  p.domain = normalizeEducationalDomain4({
    ...(p.domain || {}),
    activityRelations:[...(p.domain?.activityRelations || []).filter(row=>!String(row.id||'').startsWith('org_anchor_')),...derivedRelations],
  });
  p.organization.sync = {
    ...(p.organization.sync || {}),
    lastAt:nowIso(),
    lastFingerprint:organizationalDefinitionFingerprint(p),
    contractVersion:ORGANIZATIONAL_CONTRACT_VERSION,
    generatedActivities:specs.length,
    generatedRelations:derivedRelations.length,
  };
  appendAudit(p,'ORGANIZATION_SYNCED',`Contrato organizativo sincronizado: ${specs.length} actividad(es) derivada(s).`);
  return p;
}

function organizationalActivity(t, kind, quota, allowedSlots, allowedDays, organizationKey, name, dataState, extra = {}) {
  return normalizeActivity({
    id: `org_${organizationKey.toLowerCase().replace(/[^a-z0-9]+/g,'_')}`,
    externalId:'',
    organizationKey,
    name,
    kind,
    teacherIds: [t.id],
    weeklySessions: Number(quota),
    durationSlots: 1,
    allowedDays: allowedDays || [],
    allowedSlots: allowedSlots || [],
    priority: kind === 'LD' ? 70 : kind === 'DC' ? 60 : 65,
    mandatory: true,
    maxPerDay: 1,
    source: 'ORG_SYNC',
    dataState: DATA_STATES.includes(dataState) ? dataState : t.dataState,
    provenance:normalizeDataProvenance({ origin:'SYSTEM', sourceRef:`Contrato organizativo ${ORGANIZATIONAL_CONTRACT_VERSION}` }, 'SYSTEM'),
    ...extra,
  });
}

function organizationalLoadSummaryNormalized(p) {
  const counted = new Set(p.organization.workloadPolicy.countedKinds || []);
  return p.teachers.map(t=>{
    const byKind = {};
    for (const a of p.activities) {
      if (!a.teacherIds?.includes(t.id) || !counted.has(a.kind)) continue;
      byKind[a.kind] = (byKind[a.kind] || 0) + Number(a.weeklySessions || 0);
    }
    const planned = Object.values(byKind).reduce((sum,n)=>sum+Number(n||0),0);
    return {
      teacherId:t.id,
      teacherName:t.name,
      target:Number(t.weeklyTarget || 0),
      planned,
      difference:planned-Number(t.weeklyTarget || 0),
      byKind,
      positionSessions:(t.positions||[]).filter(x=>x.active!==false).reduce((sum,x)=>sum+Number(x.weeklySessions||0),0),
      reductionSessions:(t.reductions||[]).filter(x=>x.active!==false).reduce((sum,x)=>sum+Number(x.weeklySessions||0),0),
    };
  });
}

export function organizationalLoadSummary(input) {
  return organizationalLoadSummaryNormalized(normalizeProject(input));
}

export function createNextCourse(input, { academicYear, name } = {}) {
  const source = normalizeProject(input);
  const next = createEmptyProject({
    name: name || `${source.meta.name} · ${academicYear || 'Nuevo curso'}`,
    center: source.meta.center,
    academicYear: academicYear || '',
    responsible: source.meta.responsible,
    privacyClass: source.meta.privacyClass,
  });
  next.calendar = deepClone(source.calendar);
  next.settings = deepClone(source.settings);
  next.organization = deepClone(source.organization);
  next.organization.profile = { ...next.organization.profile, dataState:'PENDING' };
  next.organization.minimumPresence = next.organization.minimumPresence.map(x=>({ ...x, id:uid('presence_rule'), dataState:'PENDING' }));
  next.organization.breakZones = next.organization.breakZones.map(x=>({ ...x, id:uid('break_zone'), dataState:'PENDING' }));
  const zoneMap = new Map(source.organization.breakZones.map((x,i)=>[x.id,next.organization.breakZones[i].id]));
  next.organization.rules = next.organization.rules.map(x=>({ ...x, id:uid('org_rule'), dataState:'PENDING' }));
  next.organization.preferences = next.organization.preferences.map(x=>({ ...x, id:uid('org_pref'), dataState:'PENDING' }));
  next.subjects = source.subjects.map(x=>({ ...deepClone(x), id:uid('subject'), dataState:'PENDING' }));
  const teacherMap = new Map();
  next.teachers = source.teachers.map(x=>{
    const id=uid('teacher'); teacherMap.set(x.id,id);
    return {
      ...deepClone(x), id, unavailable:[], presence:[], dataState:'PENDING',
      positions:(x.positions||[]).map(row=>({ ...deepClone(row), id:uid('position'), dataState:'PENDING' })),
      reductions:(x.reductions||[]).map(row=>({ ...deepClone(row), id:uid('reduction'), dataState:'PENDING' })),
    };
  });
  next.groups = source.groups.map(x=>({
    ...deepClone(x),
    id:uid('group'),
    tutorTeacherId: teacherMap.get(x.tutorTeacherId) || '',
    dataState:'PENDING',
  }));
  next.spaces = source.spaces.map(x=>({ ...deepClone(x), id:uid('space'), dataState:'PENDING' }));
  const groupMap = new Map(source.groups.map((x,i)=>[x.id,next.groups[i].id]));
  next.organization.breakZones = next.organization.breakZones.map((x,i)=>({
    ...x,
    excludedTeacherIds:(source.organization.breakZones[i].excludedTeacherIds||[]).map(id=>teacherMap.get(id)).filter(Boolean),
  }));
  next.organization.services = source.organization.services.map(x=>({
    ...deepClone(x), id:uid('org_service'), dataState:'PENDING',
    teacherIds:(x.teacherIds||[]).map(id=>teacherMap.get(id)).filter(Boolean),
    groupIds:(x.groupIds||[]).map(id=>groupMap.get(id)).filter(Boolean),
    zoneId:zoneMap.get(x.zoneId)||'',
  }));
  next.organization.rules = next.organization.rules.map((x,i)=>({
    ...x,
    teacherId:teacherMap.get(source.organization.rules[i].teacherId)||'',
    groupId:groupMap.get(source.organization.rules[i].groupId)||'',
    activityId:'',
  }));
  next.organization.preferences = next.organization.preferences.map((x,i)=>({
    ...x,
    teacherId:teacherMap.get(source.organization.preferences[i].teacherId)||'',
    groupId:groupMap.get(source.organization.preferences[i].groupId)||'',
    activityId:'',
  }));
  next.organization.sync = { lastAt:null, lastFingerprint:null, contractVersion:ORGANIZATIONAL_CONTRACT_VERSION, generatedActivities:0 };
  next.activities = [];
  next.assignments = [];
  next.proposals = [];
  next.scenarios = [];
  next.locks = [];
  next.daily = deepClone(createEmptyProject().daily);
  next.archives.push({
    id:uid('archive'),
    projectId:source.meta.projectId,
    name:source.meta.name,
    academicYear:source.meta.academicYear,
    status:'READ_ONLY_REFERENCE',
    fingerprint:structuralFingerprint(source),
    createdAt:nowIso(),
  });
  appendAudit(next,'NEXT_COURSE_CREATED',`Estructura copiada desde ${source.meta.academicYear}; no se copiaron sesiones ni incidencias.`);
  return next;
}

export function buildDocumentModel(input) {
  const p = normalizeProject(input);
  const validation = validateProject(p);
  const metrics = computeMetrics(p);
  const dayMap = Object.fromEntries(p.calendar.days.map(x=>[x.id,x]));
  const slotMap = Object.fromEntries(p.calendar.slots.map(x=>[x.id,x]));
  const activityMap = Object.fromEntries(p.activities.map(x=>[x.id,x]));
  const teacherMap = Object.fromEntries(p.teachers.map(x=>[x.id,x]));
  const groupMap = Object.fromEntries(p.groups.map(x=>[x.id,x]));
  const spaceMap = Object.fromEntries(p.spaces.map(x=>[x.id,x]));
  const assignments = p.assignments.map(asg=>{
    const a=activityMap[asg.activityId];
    return {
      id:asg.id,
      dayId:asg.dayId,
      day:dayMap[asg.dayId]?.label || '—',
      slotId:asg.slotId,
      slot:slotMap[asg.slotId]?.label || '—',
      slotKind:slotMap[asg.slotId]?.kind || '',
      activityId:asg.activityId,
      activity:a?.name || 'Actividad no encontrada',
      activityKind:a?.kind || '',
      activityKindLabel:activityKindLabel(a?.kind),
      teacherIds:deepClone(a?.teacherIds || []),
      teachers:(a?.teacherIds || []).map(id=>teacherMap[id]?.name || 'Docente no encontrado'),
      groupIds:deepClone(a?.groupIds || []),
      groups:(a?.groupIds || []).map(id=>groupMap[id]?.name || 'Grupo no encontrado'),
      spaceId:asg.spaceId || '',
      space:spaceMap[asg.spaceId]?.name || '',
      zoneId:a?.zoneId || '',
      zone:a?.zoneId ? nameOf(p.organization.breakZones,a.zoneId) : '',
      source:asg.source || '',
    };
  });
  const daily = buildDailyDocumentData(p, assignments);
  return {
    modelVersion:'3.0',
    contractVersion:DOCUMENT_MODEL_CONTRACT_VERSION,
    generatedAt:nowIso(),
    project:{
      name:p.meta.name,
      center:p.meta.center,
      academicYear:p.meta.academicYear,
      responsible:p.meta.responsible,
      status:p.meta.status,
      dataState:p.meta.dataState,
      privacyClass:p.meta.privacyClass,
      privacyLabel:privacyLabel(p.meta.privacyClass),
      revisionNumber:p.meta.revisionNumber,
      fingerprint:structuralFingerprint(p),
      warning:p.meta.status==='FINAL'?'Horario definitivo':'BORRADOR · REVISAR ANTES DE UTILIZAR',
    },
    calendar:deepClone(p.calendar),
    subjects:p.subjects.map(x=>({id:x.id,name:x.name,stage:x.stage})),
    teachers:p.teachers.map(t=>({
      id:t.id,name:t.name,role:t.role,specialty:t.specialty,weeklyTarget:t.weeklyTarget,
      coverageEligible:t.coverageEligible,ldQuota:t.ldQuota,dcQuota:t.dcQuota,
      positions:(t.positions||[]).map(x=>({id:x.id,label:x.label,type:x.type,weeklySessions:x.weeklySessions,active:x.active!==false,dataState:x.dataState})),
      reductions:(t.reductions||[]).map(x=>({id:x.id,label:x.label,type:x.type,weeklySessions:x.weeklySessions,active:x.active!==false,dataState:x.dataState})),
      itinerary:deepClone(t.itinerary),essentialProfiles:deepClone(t.essentialProfiles||[]),
    })),
    groups:p.groups.map(g=>({id:g.id,name:g.name,stage:g.stage,tutor:nameOf(p.teachers,g.tutorTeacherId)})),
    spaces:p.spaces.map(s=>({id:s.id,name:s.name,tags:deepClone(s.tags||[]),capacity:s.capacity,dataState:s.dataState})),
    activities:p.activities.map(a=>({
      id:a.id,name:a.name,kind:a.kind,kindLabel:activityKindLabel(a.kind),weeklySessions:a.weeklySessions,
      groupIds:deepClone(a.groupIds||[]),teacherIds:deepClone(a.teacherIds||[]),spaceId:a.spaceId||'',zoneId:a.zoneId||'',
      groups:a.groupIds.map(id=>nameOf(p.groups,id)),teachers:a.teacherIds.map(id=>nameOf(p.teachers,id)),
      allowedDays:deepClone(a.allowedDays||[]),allowedSlots:deepClone(a.allowedSlots||[]),dataState:a.dataState,
    })),
    assignments,
    validation:{
      verdict:validation.canGenerate?(validation.warnings.length?'Listo con advertencias':'Listo para generar'):'Bloqueado',
      errors:validation.errors.map(publicIssue),
      warnings:validation.warnings.map(publicIssue),
    },
    metrics,
    organization:{
      contractVersion:ORGANIZATIONAL_CONTRACT_VERSION,
      enabled:p.organization.enabled,
      profileName:p.organization.profile.name,
      profileVersion:p.organization.profile.version,
      profileState:p.organization.profile.dataState,
      ldDc:deepClone(p.organization.ldDc),
      workloadPolicy:deepClone(p.organization.workloadPolicy),
      coveragePolicy:deepClone(p.organization.coveragePolicy),
      loadSummary:organizationalLoadSummary(p),
      minimumPresence:p.organization.minimumPresence.map(r=>({
        id:r.id,name:r.name,minimum:r.minimum,profileTag:r.profileTag,
        days:r.dayIds.map(id=>nameOf(p.calendar.days,id)),slots:r.slotIds.map(id=>nameOf(p.calendar.slots,id)),dataState:r.dataState,
      })),
      breakZones:p.organization.breakZones.map(z=>({
        id:z.id,name:z.name,minimumStaff:z.minimumStaff,slots:z.slotIds.map(id=>nameOf(p.calendar.slots,id)),
        essentialProfileTags:deepClone(z.essentialProfileTags||[]),excludedTeachers:(z.excludedTeacherIds||[]).map(id=>nameOf(p.teachers,id)),dataState:z.dataState,
      })),
      services:p.organization.services.map(row=>({
        id:row.id,name:row.name,kind:row.kind,kindLabel:activityKindLabel(row.kind),weeklySessions:row.weeklySessions,
        teachers:(row.teacherIds||[]).map(id=>nameOf(p.teachers,id)),groups:(row.groupIds||[]).map(id=>nameOf(p.groups,id)),
        zone:row.zoneId?nameOf(p.organization.breakZones,row.zoneId):'',active:row.active!==false,dataState:row.dataState,
      })),
      rules:[...(p.organization.rules||[]),...(p.organization.preferences||[])].map(row=>deepClone(row)),
      sync:deepClone(p.organization.sync),
    },
    daily,
    quality:buildDocumentQuality(p,metrics),
    traceability:buildDocumentTraceability(p),
    history:p.history.map(h=>({
      id:h.id,createdAt:h.createdAt,reason:h.reason,actor:h.actor,revisionNumber:h.revisionNumber,
    })),
    audit:p.audit.map(a=>({at:a.at,actor:a.actor,action:a.action})),
  };
}

function buildDocumentQuality(p, metrics) {
  const accepted=[...(p.proposals||[])].filter(x=>['ACCEPTED','PARTIALLY_ACCEPTED'].includes(x.status)).sort((a,b)=>String(a.acceptedAt||'').localeCompare(String(b.acceptedAt||'')));
  const proposal=accepted.at(-1)||null;
  const receipt=[...(p.acceptanceReceipts||[])].filter(x=>x.decision==='ACCEPTANCE'||x.decision==='PARTIAL_ACCEPTANCE').sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))).at(-1)||null;
  const currentFingerprint=structuralFingerprint(p);
  const acceptedMetrics=proposal?.acceptedQuality||proposal?.quality||null;
  const isCurrent=Boolean(receipt?.resultingFingerprint&&receipt.resultingFingerprint===currentFingerprint);
  const profile=analyzeMultidimensionalQuality(p,p.assignments,{mode:'OFFICIAL',source:'DOCUMENT_MODEL',baselineAssignments:proposal?.assignments||[]});
  return {
    ...profile,
    currentFingerprint,
    acceptedAt:proposal?.acceptedAt||receipt?.createdAt||'',
    acceptedMetrics:acceptedMetrics?deepClone(acceptedMetrics):null,
    acceptedMetricsState:acceptedMetrics?(isCurrent?'CURRENT':'STALE'):'UNAVAILABLE',
    currentMetrics:{
      required:metrics.required,placed:metrics.placed,pending:metrics.pending,completionPct:metrics.completionPct,
      gaps:metrics.gaps,teacherLoads:deepClone(metrics.teacherLoads),gapsByTeacher:deepClone(metrics.gapsByTeacher),
      ...(profile.legacy||{}),
    },
    explanatoryNote:profile.overall.note,
  };
}

function buildDocumentTraceability(p) {
  const safeRun=(run)=>({
    createdAt:run.createdAt||run.response?.finishedAt||run.request?.createdAt||'',
    engine:run.response?.engine?.id||run.request?.engine||'',
    status:run.response?.status||'',
    mode:run.request?.mode||'',
    durationMs:Number(run.response?.durationMs||0),
    placed:Number(run.response?.summary?.placed||run.response?.proposal?.summary?.placed||0),
    unplaced:Number(run.response?.summary?.unplaced||run.response?.proposal?.summary?.unplaced||0),
  });
  const safeImport=(row)=>({
    createdAt:row.createdAt||row.appliedAt||'',
    entityType:row.entityType||row.type||'',
    sourceName:row.sourceName||row.sourceFile||'',
    created:Number(row.summary?.created||row.created||0),
    updated:Number(row.summary?.updated||row.updated||0),
    skipped:Number(row.summary?.skipped||row.skipped||0),
  });
  return {
    projectFingerprint:structuralFingerprint(p),
    revisionNumber:Number(p.meta.revisionNumber||1),
    lastAcceptedAt:p.meta.lastAcceptedAt||'',
    historyCount:(p.history||[]).length,
    auditCount:(p.audit||[]).length,
    acceptanceReceipts:(p.acceptanceReceipts||[]).map(x=>({createdAt:x.createdAt||'',decision:x.decision||'',responsible:x.responsible||'',revalidation:deepClone(x.revalidation||null)})),
    generationRuns:(p.generationRuns||[]).map(safeRun),
    imports:(p.imports||[]).map(safeImport),
    recentAudit:[...(p.audit||[])].slice(-30).map(x=>({at:x.at||'',actor:x.actor||'',action:x.action||''})),
  };
}


function buildDailyDocumentData(p, assignments) {
  const absences = p.daily.absences.map(a=>({
    id:a.id,date:a.date || '',dayId:a.dayId,day:nameOf(p.calendar.days,a.dayId),teacherId:a.teacherId,
    teacher:nameOf(p.teachers,a.teacherId),slotIds:deepClone(a.slotIds||[]),slot:(a.slotIds||[]).map(id=>nameOf(p.calendar.slots,id)).join(', ') || 'Jornada o intervalo',
    status:a.status,operationalNote:a.operationalNote || '',affectedAssignmentIds:deepClone(a.affectedAssignmentIds||[]),
  }));
  const coverages = p.daily.coverages.map(c=>({
    id:c.id,absenceId:c.absenceId,assignmentId:c.assignmentId,activityId:c.activityId,activity:nameOf(p.activities,c.activityId),
    dayId:c.dayId,day:nameOf(p.calendar.days,c.dayId),slotId:c.slotId,slot:nameOf(p.calendar.slots,c.slotId),
    coverTeacherId:c.coverTeacherId||'',coverTeacher:nameOf(p.teachers,c.coverTeacherId),status:c.status,
    decisionReason:c.decisionReason || '',communication:deepClone(c.communication||null),completedAt:c.completedAt||'',
  }));
  const recoveries = p.daily.recoveries.map(r=>({
    id:r.id,coverageId:r.coverageId||'',incidentId:r.incidentId||'',activityId:r.activityId||'',activity:r.activityId ? nameOf(p.activities,r.activityId) : r.activityName || '',
    status:r.status,plannedDate:r.plannedDate || '',note:r.publicNote || '',completedAt:r.completedAt||'',
  }));
  const temporarySubstitutions=(p.daily.temporarySubstitutions||[]).map(s=>({
    id:s.id,absentTeacherId:s.absentTeacherId,absentTeacher:nameOf(p.teachers,s.absentTeacherId),substituteTeacherId:s.substituteTeacherId,substituteTeacher:nameOf(p.teachers,s.substituteTeacherId),
    startDate:s.startDate||'',endDate:s.endDate||'',status:s.status,operationalNote:s.operationalNote||'',activities:(s.scopeActivityIds||[]).map(id=>nameOf(p.activities,id)),
  }));
  const performedServices=(p.daily.guards||[]).map(x=>({id:x.id,coverageId:x.coverageId||'',teacherId:x.teacherId,teacher:nameOf(p.teachers,x.teacherId),date:x.date||'',dayId:x.dayId,day:nameOf(p.calendar.days,x.dayId),slotId:x.slotId,slot:nameOf(p.calendar.slots,x.slotId),sourceType:x.sourceType||'',status:x.status,durationMinutes:Number(x.durationMinutes||0),weight:Number(x.weight||0),operationalNote:x.operationalNote||''}));
  const incidents=(p.daily.incidents||[]).map(x=>({id:x.id,absenceId:x.absenceId||'',coverageId:x.coverageId||'',assignmentId:x.assignmentId||'',activityId:x.activityId||'',activity:nameOf(p.activities,x.activityId),date:x.date||'',dayId:x.dayId,day:nameOf(p.calendar.days,x.dayId),slotId:x.slotId,slot:nameOf(p.calendar.slots,x.slotId),type:x.type||'',status:x.status||'',destination:deepClone(x.destination||null),operationalNote:x.operationalNote||'',recoveryId:x.recoveryId||''}));
  return {contractVersion:DAILY_OPERATIONS_CONTRACT_VERSION,absences,coverages,recoveries,temporarySubstitutions,performedServices,incidents};
}
function publicIssue(x) {
  return { severity:x.severity, message:x.message, suggestedAction:x.suggestedAction || '' };
}

export function nameOf(rows, id) {
  return rows?.find(x=>x.id===id)?.name || id || '—';
}

export function legacyStructuralFingerprint3(input){
  const strip=(row,keys)=>{const out=deepClone(row||{});for(const key of keys)delete out[key];return out;};
  const p=input||{};
  const teachers=(p.teachers||[]).map(row=>{const out=strip(row,['homeSiteId','allowedSiteIds']);if(out.itinerary){out.itinerary=strip(out.itinerary,['routeSiteIds','travelPolicy']);}return out;});
  const groups=(p.groups||[]).map(row=>strip(row,['homeSiteId','size']));
  const spaces=(p.spaces||[]).map(row=>strip(row,['siteId','seatCapacity','resourceIds','equivalentSpaceIds']));
  const activities=(p.activities||[]).map(row=>strip(row,['weekPattern','allowedSiteIds','preferredSiteIds','allowedSpaceIds','preferredSpaceIds','alternativeSpaceIds','requiredResourceIds','preferredResourceIds','relationIds','splitSetId','concurrencyKey']));
  const assignments=(p.assignments||[]).map(row=>strip(row,['weekId','resourceIds']));
  const payload={calendar:p.calendar||{},settings:p.settings||{},organization:p.organization||{},subjects:p.subjects||[],teachers,groups,spaces,activities,assignments,constraints:p.constraints||[],locks:p.locks||[]};
  return `fnv1a-${fnv1a(stableStringify(payload))}`;
}

export function teacherPresenceAt(inputTeacher,dayId,slotId,options={}){return teacherPresenceDecision(inputTeacher,dayId,slotId,options);}
