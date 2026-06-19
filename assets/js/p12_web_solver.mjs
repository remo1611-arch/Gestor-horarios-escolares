import { normalizeProject, nowIso, uid, structuralFingerprint } from './core.mjs';
import { generateProposalCooperative, heuristicCompatibility } from './generator.mjs';

export const P12_WEB_SOLVER_CONTRACT_VERSION = 'web-solver-runtime-1.2';
export const P12_WEB_SOLVER_ENGINE_ID = 'p12-web-worker-solver';
export const P12_WEB_SOLVER_PHASE = 'P12_5_WEB_SOLVER_CENTRO_MEDIO';

const UNSUPPORTED_DOMAIN_REASON = 'P12-5 acredita el motor web para semana única, sesiones de un tramo, disponibilidad, espacios, no solapes, presencia mínima simple, LD/DC básico, servicios organizativos simples de apoyo/guardia/recreo, reglas duras/blandas soportadas y relaciones inmediatas simples. Multitramos, multisedes, viajes, recursos, desdobles complejos, servicios con recursos/sedes y segmentos anclados complejos siguen requiriendo CP-SAT como oráculo.';

const SUPPORTED_HARD_RULE_TYPES = new Set(['FORBID_DAY','FORBID_SLOT','REQUIRE_DAY','REQUIRE_SLOT','REQUIRE_SPACE_TAG']);
const SUPPORTED_SOFT_RULE_TYPES = new Set(['PREFER_DAY','PREFER_SLOT','AVOID_LAST_SLOT','AVOID_FIRST_SLOT','AVOID_EDGE_SLOTS']);
const SUPPORTED_RELATION_TYPES = new Set(['IMMEDIATELY_BEFORE','IMMEDIATELY_AFTER']);
function activeRows(rows){ return Array.isArray(rows) ? rows.filter(row => row && row.active !== false) : []; }
function unsupportedRules(rows, allowedTypes){ return activeRows(rows).filter(row => !allowedTypes.has(String(row.type || ''))); }
function unsupportedRelations(rows){ return activeRows(rows).filter(row => !SUPPORTED_RELATION_TYPES.has(String(row.type || '')) || row.hard === false); }
const SUPPORTED_SERVICE_KINDS = new Set(['SUPPORT','GUARD','BREAK_DUTY','MEETING']);
function unsupportedSimpleServices(rows){
  return activeRows(rows).filter(service => {
    if (!SUPPORTED_SERVICE_KINDS.has(String(service.kind || ''))) return true;
    if (Number(service.durationSlots || 1) > 1) return true;
    if ((service.requiredResourceIds || []).length || (service.preferredResourceIds || []).length) return true;
    if ((service.allowedSiteIds || []).length || (service.preferredSiteIds || []).length || service.siteId || service.serviceSiteId) return true;
    if (service.splitSetId || service.concurrencyKey) return true;
    if (service.weekPattern && service.weekPattern.mode && !['ALL','WEEKLY'].includes(String(service.weekPattern.mode))) return true;
    if (service.kind === 'BREAK_DUTY' && !(service.allowedSlots || []).length && !service.zoneId) return true;
    if (service.kind === 'SUPPORT' && !(service.groupIds || []).length) return true;
    return false;
  });
}
function unsupportedBreakZones(rows){
  return activeRows(rows).filter(zone => {
    if (Number(zone.minimumStaff || 0) < 0) return true;
    if ((zone.essentialProfileTags || []).length) return true;
    return false;
  });
}

export function analyzeP12WebSolverSupport(input, options = {}) {
  if (input?.format === 'web-solver-mini-case-1.0') return analyzeMiniCaseSupport(input);
  const project = normalizeProject(input);
  const reasons = [];
  const warnings = [];
  const activities = project.activities || [];
  const domain = project.domain || {};
  const org = project.organization || {};

  const cycle = domain.cycle || null;
  if (cycle && cycle.mode && !['WEEKLY', 'ALL'].includes(String(cycle.mode))) reasons.push('UNSUPPORTED_CYCLE_MODE');
  if (Array.isArray(cycle?.weeks) && cycle.weeks.filter(w => w?.active !== false).length > 1) reasons.push('MULTI_WEEK_CYCLE');
  if ((domain.sites || []).length > 1) reasons.push('MULTI_SITE');
  if ((domain.travelRules || []).some(r => r?.active !== false)) reasons.push('TRAVEL_RULES');
  if (activeRows(domain.resources).length) reasons.push('DOMAIN_RESOURCES');
  const unsupportedDomainRelations = unsupportedRelations(domain.activityRelations);
  if (unsupportedDomainRelations.length) reasons.push('ACTIVITY_RELATIONS_UNSUPPORTED');
  if (activeRows(domain.splitSets).length) reasons.push('SPLIT_SETS');
  const unsupportedServices = unsupportedSimpleServices(org.services);
  if (unsupportedServices.length) reasons.push('ORGANIZATIONAL_SERVICES_UNSUPPORTED');
  if (activeRows(org.anchoredSegments).length) reasons.push('ANCHORED_SEGMENTS');
  const unsupportedZones = unsupportedBreakZones(org.breakZones);
  if (unsupportedZones.length) reasons.push('BREAK_ZONE_DUTIES_UNSUPPORTED');
  if (org.workloadPolicy?.requireExactTarget) reasons.push('WORKLOAD_EXACT_TARGET_REQUIRED');
  const unsupportedHardRules = unsupportedRules([...(org.rules || []), ...(project.constraints || [])], SUPPORTED_HARD_RULE_TYPES);
  if (unsupportedHardRules.length) reasons.push('UNSUPPORTED_HARD_RULES');
  const unsupportedSoftRules = unsupportedRules(org.preferences || [], SUPPORTED_SOFT_RULE_TYPES);
  if (unsupportedSoftRules.length) reasons.push('UNSUPPORTED_SOFT_RULES');

  const multislot = activities.filter(a => Number(a.durationSlots || 1) > 1);
  if (multislot.length) reasons.push('MULTISLOT');
  const nonAllWeeks = activities.filter(a => a.weekPattern && a.weekPattern.mode && !['ALL', 'WEEKLY'].includes(String(a.weekPattern.mode)));
  if (nonAllWeeks.length) reasons.push('ACTIVITY_WEEK_PATTERN');
  const concurrency = activities.filter(a => a.splitSetId || a.concurrencyKey);
  if (concurrency.length) reasons.push('ACTIVITY_CONCURRENCY');
  const missingBasics = activities.filter(a => !(a.teacherIds || []).length || ((['TEACHING','SUPPORT'].includes(String(a.kind || 'TEACHING'))) && !(a.groupIds || []).length) || Number(a.weeklySessions || 0) < 0);
  if (missingBasics.length) reasons.push('ACTIVITY_BASIC_DATA_INCOMPLETE');

  const compatibility = heuristicCompatibility(project, options.targetActivityIds || null);
  if (!compatibility.ok) reasons.push(`GENERATOR_${compatibility.code || 'INCOMPATIBLE'}`);
  const supported = reasons.length === 0;
  if (activities.length > 300) warnings.push('LARGE_FOR_P12_5_REVIEW_REQUIRED');

  return {
    contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION,
    phase: P12_WEB_SOLVER_PHASE,
    supported,
    supportLevel: supported ? 'P12_5_SUPPORTED_MEDIUM_WEB' : 'UNSUPPORTED_REQUIRES_CP_SAT_ORACLE',
    reasons: [...new Set(reasons)],
    warnings,
    message: supported
      ? 'El proyecto entra en el alcance P12-5: motor web de centro medio, sin Python ni OR-Tools.'
      : UNSUPPORTED_DOMAIN_REASON,
    metrics: {
      activities: activities.length,
      occurrences: activities.reduce((sum, a) => sum + Number(a.weeklySessions || 0), 0),
      activeMinimumPresenceRules: activeRows(org.minimumPresence).length,
      activeSimpleServices: activeRows(org.services).length,
      activeBreakZones: activeRows(org.breakZones).length,
      activeHardRules: activeRows([...(org.rules || []), ...(project.constraints || [])]).length,
      activeSoftRules: activeRows(org.preferences || []).length,
      immediateRelations: activeRows(domain.activityRelations).filter(row => SUPPORTED_RELATION_TYPES.has(String(row.type || ''))).length,
      teachers: project.teachers.length,
      groups: project.groups.length,
      spaces: project.spaces.length,
      fixedOccurrences: activities.reduce((sum, a) => sum + (a.fixedOccurrences?.length || 0), 0),
    },
  };
}

export async function runP12WebSolver(input, options = {}, control = {}) {
  if (input?.format === 'web-solver-mini-case-1.0') return solveMiniCase(input, options, control);
  const project = normalizeProject(input);
  const support = analyzeP12WebSolverSupport(project, { targetActivityIds: options.targetActivityIds || null });
  const requestId = String(options.requestId || globalThis.crypto?.randomUUID?.() || uid('p12_web_solver'));
  const startedAt = nowIso();
  const startedMs = control.clock?.() ?? (globalThis.performance?.now?.() ?? Date.now());
  if (!support.supported) {
    const finishedAt = nowIso();
    return {
      contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION,
      request: buildRequest(project, { ...options, requestId }, support, startedAt),
      response: {
        contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION,
        requestId,
        status: 'UNSUPPORTED',
        startedAt,
        finishedAt,
        durationMs: 0,
        hasUsableProposal: false,
        proposalId: '',
        progress: null,
        message: support.message,
        p12WebSolver: support,
      },
      proposal: null,
    };
  }
  const result = await generateProposalCooperative(project, {
    ...options,
    requestId,
    engine: { id: P12_WEB_SOLVER_ENGINE_ID, kind: 'WEB_SOLVER', contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION },
  }, control);
  if (result.proposal) {
    result.proposal.engine = {
      id: P12_WEB_SOLVER_ENGINE_ID,
      kind: 'WEB_SOLVER',
      contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION,
      phase: P12_WEB_SOLVER_PHASE,
      seed: Number(options.seed || 0),
    };
    result.proposal.p12WebSolver = {
      contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION,
      support,
      noPythonRequired: true,
      noOrToolsRequired: true,
      browserWorker: true,
    };
  }
  result.contractVersion = P12_WEB_SOLVER_CONTRACT_VERSION;
  result.request = buildRequest(project, { ...options, requestId }, support, startedAt);
  result.response = {
    ...result.response,
    contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION,
    p12WebSolver: support,
    message: result.response.status === 'COMPLETED'
      ? 'Motor web P12-5: propuesta completa generada localmente en navegador para centro medio compatible, sin Python ni OR-Tools.'
      : result.response.message,
  };
  return result;
}

function buildRequest(project, options, support, createdAt) {
  return {
    contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION,
    requestId: String(options.requestId || ''),
    createdAt,
    mode: String(options.mode || 'COMPLETE'),
    targetActivityIds: [...new Set((options.targetActivityIds || []).map(String))],
    seed: Number(options.seed || 0),
    maxDurationMs: Number(options.maxDurationMs || 30000),
    engine: { id: P12_WEB_SOLVER_ENGINE_ID, kind: 'WEB_SOLVER', phase: P12_WEB_SOLVER_PHASE },
    sourceProjectId: project.meta?.projectId || '',
    sourceRevisionId: project.meta?.revisionId || '',
    sourceRevisionNumber: project.meta?.revisionNumber || 0,
    sourceFingerprint: structuralFingerprint(project),
    p12WebSolver: support,
  };
}

function analyzeMiniCaseSupport(input) {
  const reasons = [];
  if (!Array.isArray(input.periods) || !input.periods.length) reasons.push('NO_PERIODS');
  if (!Array.isArray(input.activities) || !input.activities.length) reasons.push('NO_ACTIVITIES');
  for (const activity of input.activities || []) {
    if (!activity.teacher || !activity.group || Number(activity.occurrences || 0) < 0) reasons.push('ACTIVITY_BASIC_DATA_INCOMPLETE');
    if (!Array.isArray(activity.spaceOptions) || !activity.spaceOptions.length) reasons.push('ACTIVITY_NO_SPACE_OPTIONS');
  }
  return {
    contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION,
    phase: P12_WEB_SOLVER_PHASE,
    supported: reasons.length === 0,
    supportLevel: reasons.length ? 'UNSUPPORTED_MINI_CASE' : 'P12_1_MINI_CASE_SUPPORTED',
    reasons: [...new Set(reasons)],
    warnings: [],
    message: reasons.length ? 'El caso mínimo no tiene datos suficientes.' : 'Caso mínimo P12-1 compatible.',
    metrics: {
      periods: input.periods?.length || 0,
      activities: input.activities?.length || 0,
      occurrences: (input.activities || []).reduce((sum, a) => sum + Number(a.occurrences || 0), 0),
    },
  };
}

export function solveMiniCase(input, options = {}, control = {}) {
  const support = analyzeMiniCaseSupport(input);
  const startedAt = nowIso();
  const requestId = String(options.requestId || input.id || uid('p12_mini'));
  if (!support.supported) return miniResult(input, requestId, startedAt, 'UNSUPPORTED', [], [], support.message, support);
  const order = [];
  for (const activity of [...input.activities].sort((a, b) => Number(b.occurrences || 0) - Number(a.occurrences || 0) || String(a.id).localeCompare(String(b.id)))) {
    for (let i = 0; i < Number(activity.occurrences || 0); i += 1) order.push({ activity, occurrence: i + 1 });
  }
  const placements = [];
  const teacherUse = new Set(), groupUse = new Set(), spaceUse = new Set();
  const unplaced = [];
  for (let i = 0; i < order.length; i += 1) {
    const { activity, occurrence } = order[i];
    const allowed = input.availability?.[activity.teacher] || input.periods;
    let placed = null;
    for (const period of input.periods) {
      if (!allowed.includes(period)) continue;
      if (teacherUse.has(`${activity.teacher}|${period}`)) continue;
      if (groupUse.has(`${activity.group}|${period}`)) continue;
      for (const space of activity.spaceOptions || []) {
        if (spaceUse.has(`${space}|${period}`)) continue;
        placed = { id: uid('mini_asg'), activityId: activity.id, occurrence, period, teacher: activity.teacher, group: activity.group, space };
        break;
      }
      if (placed) break;
    }
    if (placed) {
      placements.push(placed);
      teacherUse.add(`${placed.teacher}|${placed.period}`);
      groupUse.add(`${placed.group}|${placed.period}`);
      spaceUse.add(`${placed.space}|${placed.period}`);
    } else {
      unplaced.push({ activityId: activity.id, occurrence, reasons: ['No hay periodo libre compatible con profesorado, grupo y espacio.'] });
    }
    control.onProgress?.({ requestId, status: 'RUNNING', processed: i + 1, total: order.length, percent: Math.round((i + 1) * 100 / Math.max(1, order.length)), placed: placements.length, unplaced: unplaced.length });
  }
  const complete = unplaced.length === 0;
  return miniResult(input, requestId, startedAt, complete ? 'COMPLETED' : (placements.length ? 'PARTIAL' : 'INFEASIBLE'), placements, unplaced, complete ? 'Caso mínimo P12-1 completo.' : 'Caso mínimo P12-1 parcial o inviable con explicación.', support);
}

function miniResult(input, requestId, startedAt, status, placements, unplaced, message, support) {
  const required = (input.activities || []).reduce((sum, a) => sum + Number(a.occurrences || 0), 0);
  return {
    contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION,
    request: { contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION, requestId, createdAt: startedAt, engine: { id: P12_WEB_SOLVER_ENGINE_ID, kind: 'WEB_SOLVER' }, p12WebSolver: support },
    response: { contractVersion: P12_WEB_SOLVER_CONTRACT_VERSION, requestId, status, startedAt, finishedAt: nowIso(), durationMs: 0, hasUsableProposal: placements.length > 0, proposalId: placements.length ? `${requestId}_proposal` : '', progress: { processed: required, total: required, percent: 100, placed: placements.length, unplaced: unplaced.length }, message, p12WebSolver: support },
    proposal: placements.length ? { id: `${requestId}_proposal`, miniCaseId: input.id, engine: { id: P12_WEB_SOLVER_ENGINE_ID, kind: 'WEB_SOLVER' }, placements, unplaced, summary: { required, placed: placements.length, unplaced: unplaced.length, complete: unplaced.length === 0 } } : null,
  };
}
