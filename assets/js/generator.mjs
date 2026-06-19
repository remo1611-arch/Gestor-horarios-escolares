import {
  deepClone, uid, nowIso, slotKey, appendAudit, createRevision, structuralFingerprint,
  validateProject, normalizeProject, nameOf, computeMetrics, captureScenarioState,
  applyScenarioState, stateSha256, verifyHistoricalEntry, HISTORY_CONTRACT_VERSION, teacherPresenceAt, compactEditCommands,
} from './core.mjs';
import { reconcileConfirmedAbsenceCoveragesInPlace } from './daily.mjs';
import { analyzeMultidimensionalQuality } from './product_multidimensional_quality.mjs';

export const GENERATION_EXECUTION_STATUSES = Object.freeze([
  'COMPLETED','PARTIAL','CANCELLED','TIME_LIMIT_WITH_SOLUTION','TIME_LIMIT_WITHOUT_SOLUTION','ERROR',
]);

export function heuristicCompatibility(input, activityIds = null) {
  const p = normalizeProject(input);
  const selected = activityIds ? new Set(activityIds.map(String)) : null;
  const unsupported = p.activities.filter(activity => (!selected || selected.has(activity.id)) && Number(activity.durationSlots || 1) > 1);
  return {
    ok: unsupported.length === 0,
    code: unsupported.length ? 'HEURISTIC_MULTISLOT_UNSUPPORTED' : 'OK',
    unsupportedActivityIds: unsupported.map(activity => activity.id),
    message: unsupported.length
      ? `La heurística web no admite actividades multitramos (${unsupported.map(activity=>activity.name || activity.id).join(', ')}). Divide la actividad en tramos unitarios para la generación web.`
      : 'El alcance es compatible con la heurística web.',
  };
}

function assertHeuristicCompatibility(p, request) {
  const selected = request.mode === 'COMPLETE' || !(request.targetActivityIds || []).length ? null : request.targetActivityIds;
  const compatibility = heuristicCompatibility(p, selected);
  if (!compatibility.ok) {
    const error = new Error(compatibility.message);
    error.code = compatibility.code;
    error.details = compatibility;
    throw error;
  }
  return compatibility;
}

export function createGenerationRequest(input, {
  mode = 'COMPLETE',
  targetActivityIds = [],
  preserveAssignmentIds = [],
  seed = 0,
  maxDurationMs = 15000,
  requestId = uid('request'),
} = {}) {
  const p = normalizeProject(input);
  if (!['COMPLETE','PARTIAL','REPAIR'].includes(mode)) throw new Error('El modo de generación no es válido.');
  const duration = Math.max(50, Math.min(600000, Number(maxDurationMs || 15000)));
  return {
    contractVersion: 'generation-execution-contract-1.0',
    requestId,
    createdAt: nowIso(),
    mode,
    targetActivityIds: [...new Set(targetActivityIds.map(String))],
    preserveAssignmentIds: [...new Set(preserveAssignmentIds.map(String))],
    seed: Number(seed || 0),
    maxDurationMs: duration,
    sourceProjectId: p.meta.projectId,
    sourceRevisionId: p.meta.revisionId,
    sourceRevisionNumber: p.meta.revisionNumber,
    sourceFingerprint: structuralFingerprint(p),
    engine: { id:'deterministic-web-worker', version:'3.0', kind:'HEURISTIC' },
  };
}

function createGenerationSession(input, request) {
  const p = normalizeProject(input);
  assertHeuristicCompatibility(p, request);
  const validation = validateProject(p);
  if (!validation.canGenerate) throw new Error('El proyecto tiene bloqueos que impiden generar.');
  const pendingProposal = p.proposals.find(x=>x.status==='PENDING');
  if (pendingProposal) throw new Error('Ya existe una propuesta pendiente. Revísala antes de generar otra.');

  const selectedIds = new Set(request.targetActivityIds || []);
  const preserved = selectPreservedAssignments(p, request.mode, new Set(request.preserveAssignmentIds || []), selectedIds);
  const assignments = deepClone(preserved);
  const occupancy = buildOccupancy(p, assignments);
  const unplaced = [];
  const trace = [];
  const activities = p.activities
    .filter(a => request.mode === 'COMPLETE' || !selectedIds.size || selectedIds.has(a.id))
    .sort((a,b)=>relationAwareActivityOrder(p,a,b));
  const queue = [];
  for (const activity of activities) {
    const already = assignments.filter(x=>x.activityId===activity.id).length;
    const required = Number(activity.weeklySessions || 0);
    for (let occurrence = already; occurrence < required; occurrence += 1) queue.push({ activity, occurrence });
  }
  let index = 0;
  let generatedThisRun = 0;

  function step() {
    if (index >= queue.length) return false;
    const { activity, occurrence } = queue[index++];
    const candidates = buildCandidates(p, activity, occupancy, assignments, occurrence, request.seed);
    if (!candidates.length) {
      const reasons = explainNoCandidate(p, activity, occupancy, assignments, occurrence);
      unplaced.push({ id: uid('unplaced'), activityId: activity.id, occurrence: occurrence + 1, reasons, mandatory: activity.mandatory !== false });
      trace.push({ activityId:activity.id, occurrence:occurrence+1, result:'UNPLACED', reasons });
    } else {
      candidates.sort(candidateOrder);
      const best = candidates[0];
      const assignment = {
        id: uid('asg'), activityId: activity.id, occurrence: occurrence + 1, weekId:'W1', dayId: best.dayId, slotId: best.slotId,
        spaceId: best.spaceId || '', source: 'GENERATOR_WEB_WORKER', score: best.score,
        reasons: best.reasons, status: 'PROPOSED',
      };
      assignments.push(assignment);
      occupy(p, occupancy, assignment);
      generatedThisRun += 1;
      trace.push({ activityId:activity.id, occurrence:occurrence+1, result:'PLACED', candidate:best });
    }
    return true;
  }

  function progress() {
    return {
      processed: index,
      total: queue.length,
      percent: queue.length ? Math.round(index * 100 / queue.length) : 100,
      placed: generatedThisRun,
      unplaced: unplaced.length,
    };
  }

  function buildProposal(executionStatus = 'COMPLETED', execution = {}) {
    const interrupted = index < queue.length;
    const remaining = interrupted ? queue.slice(index).map(({activity,occurrence})=>({
      id: uid('unplaced'), activityId:activity.id, occurrence:occurrence+1,
      reasons:[executionStatus === 'TIME_LIMIT_WITH_SOLUTION' ? 'No se procesó antes de alcanzar el límite temporal.' : 'No se procesó porque la ejecución terminó antes de completar el alcance.'],
      mandatory:activity.mandatory !== false, interrupted:true,
    })) : [];
    const effectiveUnplaced = [...unplaced, ...remaining];
    const required = activities.reduce((sum,a)=>sum+Number(a.weeklySessions||0),0);
    const generatedForSelected = assignments.filter(a=>activities.some(x=>x.id===a.activityId)).length;
    const legacyStatus = effectiveUnplaced.length ? (generatedForSelected ? 'PARTIAL' : 'NO_SOLUTION_FOUND') : 'FEASIBLE';
    return {
      id: uid('proposal'), requestId: request.requestId, createdAt: nowIso(), mode: request.mode,
      engine: { ...request.engine, seed:request.seed }, status: 'PENDING', resultStatus: legacyStatus,
      executionStatus,
      execution: { contractVersion:request.contractVersion, maxDurationMs:request.maxDurationMs, ...execution },
      baseRevisionId: p.meta.revisionId, baseRevisionNumber: p.meta.revisionNumber,
      sourceFingerprint: request.sourceFingerprint,
      assignments, preservedAssignmentIds: preserved.map(x=>x.id), unplaced: effectiveUnplaced,
      summary: {
        required, placed: generatedForSelected, generatedThisRun, unplaced: effectiveUnplaced.length,
        preserved: preserved.length, processed:index, totalToProcess:queue.length,
        complete: effectiveUnplaced.length === 0 && index === queue.length,
      },
      trace,
      quality: proposalQuality(p, assignments, effectiveUnplaced),
    };
  }

  return { p, request, step, progress, buildProposal, get done(){return index>=queue.length;}, get generatedThisRun(){return generatedThisRun;} };
}

export function generateProposal(input, options = {}) {
  const request = createGenerationRequest(input, { ...options, maxDurationMs:600000 });
  const session = createGenerationSession(input, request);
  while (!session.done) session.step();
  return session.buildProposal(session.progress().unplaced ? 'PARTIAL' : 'COMPLETED', { durationMs:0, completedSynchronously:true });
}

export async function generateProposalCooperative(input, options = {}, control = {}) {
  const clock = control.clock || (()=>globalThis.performance?.now?.() ?? Date.now());
  const yieldControl = control.yieldControl || (()=>new Promise(resolve=>setTimeout(resolve,0)));
  const shouldCancel = control.shouldCancel || (()=>false);
  const onProgress = control.onProgress || (()=>{});
  const yieldEvery = Math.max(1, Number(control.yieldEvery || 8));
  const startedAt = nowIso();
  const startedMs = clock();
  let request;
  try {
    request = createGenerationRequest(input, options);
    const session = createGenerationSession(input, request);
    onProgress({ requestId:request.requestId, status:'RUNNING', ...session.progress() });
    let stop = '';
    while (!session.done) {
      if (shouldCancel()) { stop = 'CANCELLED'; break; }
      if (clock() - startedMs >= request.maxDurationMs) { stop = 'TIME_LIMIT'; break; }
      session.step();
      const current = session.progress();
      onProgress({ requestId:request.requestId, status:'RUNNING', ...current });
      if (current.processed % yieldEvery === 0) await yieldControl();
    }
    const durationMs = Math.max(0, Math.round(clock() - startedMs));
    let status;
    if (stop === 'CANCELLED') status = 'CANCELLED';
    else if (stop === 'TIME_LIMIT') status = session.generatedThisRun > 0 ? 'TIME_LIMIT_WITH_SOLUTION' : 'TIME_LIMIT_WITHOUT_SOLUTION';
    else status = session.progress().unplaced ? 'PARTIAL' : 'COMPLETED';
    const proposal = ['COMPLETED','PARTIAL','TIME_LIMIT_WITH_SOLUTION'].includes(status)
      ? session.buildProposal(status,{startedAt,finishedAt:nowIso(),durationMs}) : null;
    const response = {
      contractVersion:request.contractVersion, requestId:request.requestId, status,
      startedAt, finishedAt:nowIso(), durationMs, progress:session.progress(),
      hasUsableProposal:Boolean(proposal), proposalId:proposal?.id || '',
      message: status==='CANCELLED' ? 'Ejecución cancelada por la persona usuaria.'
        : status==='TIME_LIMIT_WITH_SOLUTION' ? 'Se alcanzó el límite temporal y se conserva una propuesta parcial utilizable.'
        : status==='TIME_LIMIT_WITHOUT_SOLUTION' ? 'Se alcanzó el límite temporal sin generar una propuesta utilizable.'
        : status==='PARTIAL' ? 'La heurística completó el recorrido con sesiones sin colocar; no demuestra inviabilidad.'
        : 'La heurística completó el alcance solicitado.',
    };
    return { contractVersion:request.contractVersion, request, response, proposal };
  } catch (error) {
    const finishedAt = nowIso();
    const response = {
      contractVersion:'generation-execution-contract-1.0', requestId:request?.requestId || '', status:'ERROR',
      startedAt, finishedAt, durationMs:Math.max(0,Math.round(clock()-startedMs)), progress:null,
      hasUsableProposal:false, proposalId:'', error:{name:error?.name||'Error',message:error?.message||String(error)},
      message:'La ejecución terminó con un error controlado.',
    };
    return { contractVersion:'generation-execution-contract-1.0', request:request || null, response, proposal:null };
  }
}

function selectPreservedAssignments(p, mode, explicitIds, selectedActivityIds) {
  const lockedIds = new Set(p.locks.filter(x=>x.active!==false && x.assignmentId).map(x=>x.assignmentId));
  if (mode === 'COMPLETE') return p.assignments.filter(x=>lockedIds.has(x.id));
  if (explicitIds.size) return p.assignments.filter(x=>explicitIds.has(x.id) || lockedIds.has(x.id));
  if (selectedActivityIds.size) return p.assignments.filter(x=>!selectedActivityIds.has(x.activityId) || lockedIds.has(x.id));
  return deepClone(p.assignments);
}

function activityOrder(a,b) {
  const fixedA = a.fixedOccurrences?.length || 0;
  const fixedB = b.fixedOccurrences?.length || 0;
  if (fixedA !== fixedB) return fixedB - fixedA;
  const resourceA = (a.teacherIds?.length || 0) + (a.requiredSpaceTags?.length || 0) + (a.groupIds?.length || 0);
  const resourceB = (b.teacherIds?.length || 0) + (b.requiredSpaceTags?.length || 0) + (b.groupIds?.length || 0);
  if (resourceA !== resourceB) return resourceB - resourceA;
  return Number(b.priority||0) - Number(a.priority||0) || String(a.id).localeCompare(String(b.id));
}

function relationAwareActivityOrder(p,a,b){
  const rank=new Map();
  for(const relation of p.domain?.activityRelations||[]){
    if(relation.active===false||!['IMMEDIATELY_BEFORE','IMMEDIATELY_AFTER'].includes(relation.type))continue;
    rank.set(relation.rightActivityId,(rank.get(relation.rightActivityId)||0)-10);
    rank.set(relation.leftActivityId,(rank.get(relation.leftActivityId)||0)+10);
  }
  const delta=(rank.get(a.id)||0)-(rank.get(b.id)||0);
  return delta||activityOrder(a,b);
}

function candidateOrder(a,b) {
  return b.score - a.score || a.key.localeCompare(b.key);
}

function buildOccupancy(p, assignments) {
  const occupancy = { teacher:new Set(), group:new Set(), space:new Map(), ld:new Map() };
  for (const assignment of assignments) occupy(p, occupancy, assignment);
  return occupancy;
}

function occupy(p, occupancy, assignment) {
  const activity = p.activities.find(x=>x.id===assignment.activityId);
  if (!activity) return;
  const key = slotKey(assignment.dayId, assignment.slotId);
  for (const teacherId of activity.teacherIds || []) occupancy.teacher.add(`${teacherId}|${key}`);
  for (const groupId of activity.groupIds || []) occupancy.group.add(`${groupId}|${key}`);
  if (assignment.spaceId) {
    const spaceKey = `${assignment.spaceId}|${key}`;
    occupancy.space.set(spaceKey,(occupancy.space.get(spaceKey)||0)+1);
  }
  if (activity.kind === 'LD') occupancy.ld.set(key,(occupancy.ld.get(key)||0)+1);
}

function buildCandidates(p, activity, occupancy, assignments, occurrenceIndex, seed) {
  const out = [];
  const fixedTarget = activity.fixedOccurrences?.[occurrenceIndex] || null;
  const slotKinds = allowedSlotKinds(activity);

  for (const day of p.calendar.days) {
    if (fixedTarget && day.id !== fixedTarget.dayId) continue;
    if (activity.allowedDays.length && !activity.allowedDays.includes(day.id)) continue;
    if (!activityTeachersPresentOnDay(p,activity,day.id)) continue;

    for (const slot of p.calendar.slots) {
      if (fixedTarget && slot.id !== fixedTarget.slotId) continue;
      if (activity.allowedSlots.length && !activity.allowedSlots.includes(slot.id)) continue;
      if (!fixedTarget && !slotKinds.includes(slot.kind)) continue;
      const key = slotKey(day.id,slot.id);
      const hardReasons = hardCandidateConflicts(p,activity,day.id,slot.id,activity.serviceSiteId||'',occupancy,assignments,occurrenceIndex);
      if (hardReasons.length) continue;

      let spaces = compatibleSpaces(p,activity,key,occupancy);
      if (fixedTarget?.spaceId) spaces = spaces.filter(space=>space.id===fixedTarget.spaceId);
      if ((activity.requiredSpaceTags.length || activity.allowedSpaceIds?.length || fixedTarget?.spaceId) && !spaces.length) continue;
      const choices = spaces.length ? spaces : [null];
      for (const space of choices) {
        const spaceHard = hardCandidateConflicts(p,activity,day.id,slot.id,space?.id||'',occupancy,assignments,occurrenceIndex);
        if (spaceHard.length) continue;
        const scored = scoreCandidate(p,activity,day,slot,space,assignments,seed);
        out.push({
          dayId:day.id, slotId:slot.id, spaceId:space?.id||'', score:scored.score,
          reasons:scored.reasons, key:`${day.id}:${slot.id}:${space?.id||''}`,
        });
      }
    }
  }
  return out;
}

function allowedSlotKinds(activity) {
  if (activity.allowedSlotKinds?.length) return activity.allowedSlotKinds;
  if (activity.kind === 'BREAK_DUTY') return ['BREAK'];
  if (activity.kind === 'MEETING' && activity.allowedSlots?.length) return ['CLASS','BREAK','OTHER'];
  return ['CLASS'];
}

function activityTeachersPresentOnDay(p,activity,dayId) {
  return (activity.teacherIds || []).every(teacherId=>{
    const teacher = p.teachers.find(x=>x.id===teacherId);
    if (!teacher?.itinerary?.enabled || !teacher.itinerary.presenceDays?.length) return true;
    return teacher.itinerary.presenceDays.includes(dayId);
  });
}

function hardCandidateConflicts(p,activity,dayId,slotId,spaceId,occupancy,assignments,occurrenceIndex=0) {
  const reasons = [];
  const key = slotKey(dayId,slotId);
  for (const teacherId of activity.teacherIds || []) {
    if (occupancy.teacher.has(`${teacherId}|${key}`)) reasons.push(`${nameOf(p.teachers,teacherId)} ya está ocupado/a.`);
    const candidateSiteId=p.spaces.find(space=>space.id===spaceId)?.siteId||activity.serviceSiteId||'';
    if (activity.presenceRequirement!=='NONE' && teacherUnavailable(p,teacherId,dayId,slotId,candidateSiteId)) reasons.push(`${nameOf(p.teachers,teacherId)} no está disponible o consta en otra sede.`);
  }
  for (const groupId of activity.groupIds || []) {
    if (occupancy.group.has(`${groupId}|${key}`)) reasons.push(`${nameOf(p.groups,groupId)} ya tiene otra actividad.`);
  }
  if (spaceId) {
    const space = p.spaces.find(s=>s.id===spaceId);
    const used = occupancy.space.get(`${spaceId}|${key}`) || 0;
    if (used >= Number(space?.capacity || 1)) reasons.push(`${space?.name || 'El espacio'} no tiene capacidad libre.`);
    if (activity.requiredSpaceTags.some(tag=>!space?.tags?.includes(tag))) reasons.push('El espacio no cumple las necesidades de la actividad.');
  }
  if (activity.maxPerDay && sameDayCount(assignments,activity.id,dayId) >= Number(activity.maxPerDay)) reasons.push('Se supera el máximo diario configurado.');
  if (activity.kind === 'LD') {
    const max = Number(p.organization?.ldDc?.maxSimultaneousLd || 0);
    if (max && (occupancy.ld.get(key)||0) >= max) reasons.push(`Se alcanzó el máximo de ${max} LD simultáneas.`);
  }
  if ((p.organization?.coveragePolicy?.presenceExcludingKinds || ['LD']).includes(activity.kind)
      && wouldBreakMinimumPresence(p,activity,dayId,slotId,assignments)) {
    reasons.push(`${activity.name} dejaría el centro por debajo de la presencia mínima configurada.`);
  }
  const relationReason=immediateRelationConflict(p,activity,dayId,slotId,assignments,occurrenceIndex);
  if(relationReason)reasons.push(relationReason);
  for (const rule of activeHardRules(p)) {
    const result = evaluateRule(rule,p,activity,dayId,slotId,spaceId,assignments);
    if (result.applies && !result.allowed) reasons.push(result.message);
  }
  if (isLockedDestinationConflict(p,activity,dayId,slotId,spaceId)) reasons.push('El destino entra en conflicto con un bloqueo vigente.');
  return [...new Set(reasons)];
}

function teacherUnavailable(p,teacherId,dayId,slotId,siteId='') {
  const teacher = p.teachers.find(x=>x.id===teacherId);
  if (!teacher) return false;
  return !teacherPresenceAt(teacher,dayId,slotId,{siteId,purpose:'SCHEDULE',policy:p.organization?.presencePolicy}).allowed;
}

function immediateRelationConflict(p,activity,dayId,slotId,assignments,occurrenceIndex){
  const slotIndex=p.calendar.slots.findIndex(row=>row.id===slotId);
  if(slotIndex<0)return 'El tramo no existe en el calendario.';
  const occurrence=occurrenceIndex+1;
  for(const relation of p.domain?.activityRelations||[]){
    if(relation.active===false||relation.hard===false||!['IMMEDIATELY_BEFORE','IMMEDIATELY_AFTER'].includes(relation.type))continue;
    const isLeft=relation.leftActivityId===activity.id,isRight=relation.rightActivityId===activity.id;
    if(!isLeft&&!isRight)continue;
    const otherId=isLeft?relation.rightActivityId:relation.leftActivityId;
    const other=assignments.find(row=>row.activityId===otherId&&Number(row.occurrence||1)===occurrence);
    if(!other)continue;
    const otherActivity=p.activities.find(row=>row.id===otherId);
    const otherIndex=p.calendar.slots.findIndex(row=>row.id===other.slotId);
    if(otherIndex<0||other.dayId!==dayId)return 'El segmento anclado debe quedar en el mismo día que su sesión de referencia.';
    const duration=Math.max(1,Number(activity.durationSlots||1)),otherDuration=Math.max(1,Number(otherActivity?.durationSlots||1));
    let valid=false;
    if(relation.type==='IMMEDIATELY_AFTER') valid=isLeft ? otherIndex+otherDuration===slotIndex : slotIndex+duration===otherIndex;
    else valid=isLeft ? slotIndex+duration===otherIndex : otherIndex+otherDuration===slotIndex;
    if(!valid)return 'El segmento anclado debe quedar inmediatamente antes o después de su sesión de referencia.';
  }
  return '';
}

function compatibleSpaces(p,activity,key,occupancy) {
  const explicitSpaceIds=new Set([...(activity.allowedSpaceIds||[]),...(activity.alternativeSpaceIds||[])]);
  const allowedSiteIds=new Set(activity.allowedSiteIds||[]);
  return p.spaces.filter(space=>{
    if (explicitSpaceIds.size && !explicitSpaceIds.has(space.id)) return false;
    if (allowedSiteIds.size && !allowedSiteIds.has(space.siteId)) return false;
    if (activity.requiredSpaceTags.some(tag=>!space.tags?.includes(tag))) return false;
    const used = occupancy.space.get(`${space.id}|${key}`) || 0;
    return used < Number(space.capacity || 1);
  });
}

function sameDayCount(assignments,activityId,dayId) {
  return assignments.filter(x=>x.activityId===activityId && x.dayId===dayId).length;
}

function scoreCandidate(p,activity,day,slot,space,assignments,seed) {
  let score = 100 + Number(activity.priority || 0) / 10;
  const reasons = [];
  if (activity.preferredDays.includes(day.id)) { score += 15; reasons.push('Día preferente.'); }
  if (activity.preferredSlots.includes(slot.id)) { score += 10; reasons.push('Tramo preferente.'); }
  const repeated = sameDayCount(assignments,activity.id,day.id);
  if (repeated) { score -= repeated * 12; reasons.push('Penaliza repetir la actividad el mismo día.'); }
  const groupLoad = dayGroupLoad(p,assignments,activity.groupIds,day.id);
  score -= groupLoad * 0.25;
  const teacherLoad = dayTeacherLoad(p,assignments,activity.teacherIds,day.id);
  score -= teacherLoad * 0.35;
  if (space && activity.requiredSpaceTags.length) { score += 2; reasons.push('Espacio compatible.'); }
  for (const pref of activeSoftRules(p)) {
    const result = evaluateRule(pref,p,activity,day.id,slot.id,space?.id||'',assignments);
    if (result.applies) {
      const delta = Number(pref.weight || result.weight || 0);
      score += result.preferred ? delta : -Math.abs(delta);
      if (result.message) reasons.push(result.message);
    }
  }
  score += deterministicJitter(`${activity.id}|${day.id}|${slot.id}|${space?.id||''}|${seed}`);
  return { score, reasons };
}

function deterministicJitter(text) {
  let hash = 0;
  for (let i=0;i<text.length;i+=1) hash = (Math.imul(hash,31)+text.charCodeAt(i))|0;
  return ((hash>>>0)%1000)/100000;
}

function dayGroupLoad(p,assignments,groupIds,dayId) {
  return assignments.filter(asg=>{
    if (asg.dayId!==dayId) return false;
    const activity=p.activities.find(a=>a.id===asg.activityId);
    return activity?.groupIds?.some(id=>groupIds.includes(id));
  }).length;
}

function dayTeacherLoad(p,assignments,teacherIds,dayId) {
  return assignments.filter(asg=>{
    if (asg.dayId!==dayId) return false;
    const activity=p.activities.find(a=>a.id===asg.activityId);
    return activity?.teacherIds?.some(id=>teacherIds.includes(id));
  }).length;
}

function wouldBreakMinimumPresence(p,activity,dayId,slotId,assignments) {
  if (!p.organization?.enabled || !(p.organization?.coveragePolicy?.presenceExcludingKinds || ['LD']).includes(activity.kind)) return false;
  const key=slotKey(dayId,slotId);
  for (const rule of (p.organization.minimumPresence || []).filter(x=>x.active!==false)) {
    if (rule.dayIds?.length && !rule.dayIds.includes(dayId)) continue;
    if (rule.slotIds?.length && !rule.slotIds.includes(slotId)) continue;
    const present=p.teachers.filter(t=>{
      if (rule.profileTag && !t.essentialProfiles?.includes(rule.profileTag)) return false;
      if (!teacherPresenceAt(t,dayId,slotId,{purpose:'SCHEDULE',policy:p.organization?.presencePolicy}).allowed) return false;
      const excludingKinds=new Set(p.organization?.coveragePolicy?.presenceExcludingKinds || ['LD']);
      const alreadyOutsidePresence=assignments.some(asg=>{
        if(asg.dayId!==dayId||asg.slotId!==slotId)return false;
        const a=p.activities.find(x=>x.id===asg.activityId);
        return excludingKinds.has(a?.kind)&&a.teacherIds.includes(t.id);
      });
      const candidateOutsidePresence=activity.teacherIds.includes(t.id);
      return !alreadyOutsidePresence&&!candidateOutsidePresence;
    }).length;
    if (present<Number(rule.minimum||0)) return true;
  }
  return false;
}

function activeHardRules(p) {
  return [...(p.constraints||[]),...(p.organization?.rules||[])].filter(r=>r.active!==false && (r.level==='HARD'||r.severity==='HARD'));
}
function activeSoftRules(p) {
  return [...(p.organization?.preferences||[]),...(p.constraints||[])].filter(r=>r.active!==false && (r.level==='SOFT'||r.severity==='SOFT'));
}

function evaluateRule(rule,p,activity,dayId,slotId,spaceId,assignments) {
  const applies = rule.activityId ? rule.activityId===activity.id
    : rule.teacherId ? activity.teacherIds.includes(rule.teacherId)
    : rule.groupId ? activity.groupIds.includes(rule.groupId)
    : rule.kind ? activity.kind===rule.kind
    : true;
  if (!applies) return { applies:false, allowed:true, preferred:false };
  const type=rule.type||'';
  if(type==='FORBID_DAY') return {applies:true,allowed:dayId!==rule.dayId,message:rule.label||'Día excluido por una regla obligatoria.'};
  if(type==='FORBID_SLOT') return {applies:true,allowed:slotId!==rule.slotId,message:rule.label||'Tramo excluido por una regla obligatoria.'};
  if(type==='REQUIRE_DAY') return {applies:true,allowed:dayId===rule.dayId,message:rule.label||'La actividad debe situarse en otro día.'};
  if(type==='REQUIRE_SLOT') return {applies:true,allowed:slotId===rule.slotId,message:rule.label||'La actividad debe situarse en otro tramo.'};
  if(type==='REQUIRE_SPACE_TAG') {
    const space=p.spaces.find(s=>s.id===spaceId);
    return {applies:true,allowed:Boolean(space?.tags?.includes(rule.value)),message:rule.label||'El espacio no cumple una regla obligatoria.'};
  }
  if(type==='PREFER_DAY') return {applies:true,allowed:true,preferred:dayId===rule.dayId,weight:rule.weight,message:dayId===rule.dayId?(rule.label||'Preferencia de día satisfecha.') : ''};
  if(type==='PREFER_SLOT') return {applies:true,allowed:true,preferred:slotId===rule.slotId,weight:rule.weight,message:slotId===rule.slotId?(rule.label||'Preferencia de tramo satisfecha.') : ''};
  if(['AVOID_LAST_SLOT','AVOID_FIRST_SLOT','AVOID_EDGE_SLOTS'].includes(type)) {
    const classSlots=p.calendar.slots.filter(s=>s.kind==='CLASS');
    const first=classSlots[0]?.id,last=classSlots.at(-1)?.id;
    const avoided=type==='AVOID_LAST_SLOT' ? slotId===last : type==='AVOID_FIRST_SLOT' ? slotId===first : slotId===first||slotId===last;
    return {applies:true,allowed:true,preferred:!avoided,weight:rule.weight,message:avoided?(rule.label||'Penaliza una sesión extrema.') : ''};
  }
  return {applies:true,allowed:true,preferred:false};
}

function isLockedDestinationConflict(p,activity,dayId,slotId,spaceId) {
  return p.locks.some(lock=>{
    if(lock.active===false)return false;
    if(lock.dayId&&lock.dayId!==dayId)return false;
    if(lock.slotId&&lock.slotId!==slotId)return false;
    if(lock.teacherId&&!activity.teacherIds.includes(lock.teacherId))return false;
    if(lock.groupId&&!activity.groupIds.includes(lock.groupId))return false;
    if(lock.spaceId&&lock.spaceId!==spaceId)return false;
    return lock.effect==='FORBID';
  });
}

function explainNoCandidate(p,activity,occupancy,assignments,occurrence) {
  const reasons=[];
  const kinds=allowedSlotKinds(activity);
  if(!p.calendar.slots.some(s=>kinds.includes(s.kind))) reasons.push('No hay tramos del tipo necesario.');
  if(!activity.teacherIds.length) reasons.push('La actividad no tiene profesorado.');
  if(activity.requiredSpaceTags.length&&!p.spaces.some(s=>activity.requiredSpaceTags.every(tag=>s.tags?.includes(tag)))) reasons.push(`No existe un espacio compatible con: ${activity.requiredSpaceTags.join(', ')}.`);
  if(activity.fixedOccurrences?.[occurrence]) reasons.push('La colocación fija no es compatible con la ocupación o disponibilidad actual.');
  if(!reasons.length) reasons.push('Las ocupaciones, disponibilidades, presencia o reglas obligatorias dejan sin destino esta sesión.');
  return reasons;
}

function proposalQuality(p,assignments,unplaced) {
  const profile=analyzeMultidimensionalQuality({...p,assignments},assignments,{mode:'CANDIDATE',source:'HEURISTIC',baselineAssignments:p.assignments});
  return {
    ...profile.legacy,
    edgeSlotAssignments:profile.legacy.edgeSlotAssignments,
    firstLast:profile.legacy.firstLast,
    contractVersion:profile.contractVersion,
    scope:profile.scope,
    overall:profile.overall,
    dimensions:profile.dimensions,
    independentSummary:profile.independentSummary,
    edgeSlotNote:'Indicador condicionado: no penaliza por defecto; solo se interpreta como preferencia cuando el centro activa una regla sobre primeras o últimas sesiones.',
    explanatoryNote:profile.overall.note,
  };
}

export function revalidateProposal(input, proposalId, selectedAssignmentIds = null) {
  const p=normalizeProject(input);
  const proposal=p.proposals.find(x=>x.id===proposalId);
  if(!proposal)throw new Error('No se encontró la propuesta.');
  const currentFingerprint=structuralFingerprint(p);
  const legacyFingerprint=String(p.meta?.legacyStructuralFingerprint3||'');
  const sourceMatches=proposal.sourceFingerprint===currentFingerprint||(legacyFingerprint&&proposal.sourceFingerprint===legacyFingerprint)||(legacyFingerprint&&proposal.legacySourceFingerprint===legacyFingerprint);
  const stale=proposal.baseRevisionId!==p.meta.revisionId || !sourceMatches;
  const selected=selectedAssignmentIds?new Set(selectedAssignmentIds):null;
  const assignments=proposal.assignments.filter(a=>!selected||selected.has(a.id)).map(a=>({...a,status:'ACCEPTED'}));
  const draft=deepClone(p);
  draft.assignments=proposal.mode==='COMPLETE'?assignments:mergeAssignments(draft.assignments,assignments,proposal.preservedAssignmentIds);
  const validation=validateProject(draft);
  if (['HEURISTIC','WEB_SOLVER'].includes(proposal.engine?.kind || 'HEURISTIC')) {
    const compatibility=heuristicCompatibility(draft,[...new Set(assignments.map(row=>row.activityId))]);
    if(!compatibility.ok){
      const issue={id:uid('issue'),severity:'ERROR',code:compatibility.code,message:compatibility.message,entity:null,blocksGeneration:true,blocksFinalization:true,suggestedAction: proposal.engine?.kind === 'WEB_SOLVER' ? 'Regenerar con motor web P12 o revisar el alcance si no es compatible.' : 'Regenerar con motor web tras adaptar el dato.'};
      validation.issues.unshift(issue);validation.errors.unshift(issue);validation.canGenerate=false;validation.canFinalize=false;
    }
  }
  return { stale, currentFingerprint, validation, assignments, draft };
}

function mergeAssignments(current,accepted,preservedIds=[]) {
  const keep=new Set(preservedIds);
  const base=current.filter(x=>keep.has(x.id));
  const byId=new Map(base.map(x=>[x.id,x]));
  for(const x of accepted)byId.set(x.id,x);
  return [...byId.values()];
}

export function acceptProposal(input, proposalId, selectedAssignmentIds = null) {
  const p=normalizeProject(input);
  const proposal=p.proposals.find(x=>x.id===proposalId);
  if(!proposal)throw new Error('No se encontró la propuesta.');
  if(proposal.status!=='PENDING')throw new Error('La propuesta ya está cerrada.');
  const check=revalidateProposal(p,proposalId,selectedAssignmentIds);
  if(check.stale)throw new Error('La propuesta está basada en una versión anterior. Debe regenerarse.');
  if(!check.validation.canGenerate)throw new Error(`La propuesta no supera la revalidación: ${check.validation.errors[0]?.message||'conflicto desconocido'}`);

  const sourceRevisionId=p.meta.revisionId;
  const sourceFingerprint=structuralFingerprint(p);
  createRevision(p,'Antes de aceptar una propuesta');
  p.assignments=deepClone(check.draft.assignments);
  compactEditCommands(p,{clear:true});
  reconcileConfirmedAbsenceCoveragesInPlace(p,{reason:'PROPOSAL_ACCEPTED'});
  const partial=Boolean(selectedAssignmentIds && check.assignments.length<proposal.assignments.length);
  proposal.status=partial?'PARTIALLY_ACCEPTED':'ACCEPTED';
  proposal.acceptedAt=nowIso();
  proposal.acceptedAssignmentIds=check.assignments.map(x=>x.id);
  proposal.acceptedQuality=partial?null:proposal.quality;
  p.meta.status='DRAFT';
  p.meta.lastAcceptedAt=proposal.acceptedAt;
  const receipt={
    id:uid('receipt'),
    createdAt:proposal.acceptedAt,
    decision:partial?'PARTIAL_ACCEPTANCE':'ACCEPTANCE',
    proposalId,
    requestId:proposal.requestId,
    sourceRevisionId,
    sourceFingerprint,
    resultingRevisionId:p.meta.revisionId,
    resultingFingerprint:structuralFingerprint(p),
    acceptedAssignmentIds:proposal.acceptedAssignmentIds,
    rejectedAssignmentIds:proposal.assignments.filter(x=>!proposal.acceptedAssignmentIds.includes(x.id)).map(x=>x.id),
    revalidation:{errors:0,warnings:check.validation.warnings.length},
    responsible:p.meta.responsible||'Usuario',
  };
  p.acceptanceReceipts.push(receipt);
  appendAudit(p,'PROPOSAL_ACCEPTED',`Aceptadas ${check.assignments.length} sesiones.`,p.meta.responsible,{receiptId:receipt.id,partial});
  p.meta.structuralFingerprint=structuralFingerprint(p);
  return p;
}

export function rejectProposal(input,proposalId,reason='') {
  const p=normalizeProject(input);
  const proposal=p.proposals.find(x=>x.id===proposalId);
  if(!proposal)throw new Error('No se encontró la propuesta.');
  if(proposal.status!=='PENDING')throw new Error('La propuesta ya está cerrada.');
  proposal.status='REJECTED';
  proposal.closedAt=nowIso();
  p.acceptanceReceipts.push({
    id:uid('receipt'),createdAt:proposal.closedAt,decision:'REJECTION',proposalId,requestId:proposal.requestId,
    sourceRevisionId:proposal.baseRevisionId,sourceFingerprint:proposal.sourceFingerprint,
    responsible:p.meta.responsible||'Usuario',reason,
  });
  appendAudit(p,'PROPOSAL_REJECTED','Propuesta descartada sin modificar el horario.',p.meta.responsible,{reason});
  return p;
}

export function checkMove(input,assignmentId,dayId,slotId,spaceId) {
  const p=normalizeProject(input);
  const assignment=p.assignments.find(x=>x.id===assignmentId);
  if(!assignment)return{ok:false,reasons:['No se encontró la sesión.']};
  if(p.locks.some(l=>l.active!==false&&l.assignmentId===assignmentId))return{ok:false,reasons:['La sesión está bloqueada. Debe desbloquearse con motivo y responsable antes de moverla.']};
  const activity=p.activities.find(x=>x.id===assignment.activityId);
  if(!activity)return{ok:false,reasons:['La actividad de la sesión no existe.']};
  if(Number(activity.durationSlots||1)>1)return{ok:false,reasons:['El editor manual no mueve actividades multitramos. Usa Motor externo de mantenimiento o divide la actividad en tramos unitarios.'],code:'MANUAL_MULTISLOT_UNSUPPORTED'};
  const remaining=p.assignments.filter(x=>x.id!==assignmentId);
  const occupancy=buildOccupancy(p,remaining);
  const reasons=hardCandidateConflicts(p,activity,dayId,slotId,spaceId,occupancy,remaining);
  return{ok:!reasons.length,reasons:[...new Set(reasons)]};
}

export function listMoveDestinations(input,assignmentId) {
  const p=normalizeProject(input);
  const assignment=p.assignments.find(x=>x.id===assignmentId);
  if(!assignment)throw new Error('No se encontró la sesión.');
  const activity=p.activities.find(x=>x.id===assignment.activityId);
  const remaining=p.assignments.filter(x=>x.id!==assignmentId);
  const occupancy=buildOccupancy(p,remaining);
  const allowed=[];const rejected=[];
  const slotKinds=allowedSlotKinds(activity);
  for(const day of p.calendar.days){
    for(const slot of p.calendar.slots.filter(s=>slotKinds.includes(s.kind))){
      const spaces=activity.requiredSpaceTags.length?p.spaces:[null,...p.spaces];
      const candidates=spaces.length?spaces:[null];
      let anyAllowed=false;
      for(const space of candidates){
        const spaceId=space?.id||'';
        const reasons=hardCandidateConflicts(p,activity,day.id,slot.id,spaceId,occupancy,remaining);
        const current=day.id===assignment.dayId&&slot.id===assignment.slotId&&spaceId===(assignment.spaceId||'');
        if(!reasons.length&&!current){
          const scored=scoreCandidate(p,activity,day,slot,space,remaining,0);
          allowed.push({dayId:day.id,slotId:slot.id,spaceId,score:scored.score,reasons:scored.reasons});
          anyAllowed=true;
        }else if(reasons.length){
          rejected.push({dayId:day.id,slotId:slot.id,spaceId,reasons});
        }
      }
      if(!anyAllowed && !candidates.length) rejected.push({dayId:day.id,slotId:slot.id,spaceId:'',reasons:['No hay un espacio compatible.']});
    }
  }
  allowed.sort(candidateOrder);
  return{allowed,rejected,total:allowed.length+rejected.length};
}

export function moveAssignment(input,assignmentId,dayId,slotId,spaceId) {
  const p=normalizeProject(input);
  const check=checkMove(p,assignmentId,dayId,slotId,spaceId);
  if(!check.ok)throw new Error(check.reasons.join(' '));
  const before=deepClone(p.assignments);
  createRevision(p,'Antes de mover una sesión');
  const assignment=p.assignments.find(x=>x.id===assignmentId);
  Object.assign(assignment,{dayId,slotId,spaceId,source:'MANUAL'});
  reconcileConfirmedAbsenceCoveragesInPlace(p,{reason:'ASSIGNMENT_MOVED'});
  const after=deepClone(p.assignments);
  compactEditCommands(p,{invalidateRedo:true});
  p.editCommands.push({id:uid('command'),type:'MOVE_ASSIGNMENT',createdAt:nowIso(),status:'APPLIED',before,after,label:'Mover sesión'});
  compactEditCommands(p);
  appendAudit(p,'ASSIGNMENT_MOVED',`Sesión movida a ${dayId}:${slotId}.`);
  p.meta.structuralFingerprint=structuralFingerprint(p);
  return p;
}

export function undoLastEdit(input) {
  const p=normalizeProject(input);p.editCommands=p.editCommands||[];
  const command=[...p.editCommands].reverse().find(x=>x.status==='APPLIED');
  if(!command)throw new Error('No hay una edición que deshacer.');
  createRevision(p,`Antes de deshacer: ${command.label}`);
  p.assignments=deepClone(command.before);
  reconcileConfirmedAbsenceCoveragesInPlace(p,{reason:'EDIT_UNDONE'});
  command.status='UNDONE';command.undoneAt=nowIso();
  appendAudit(p,'EDIT_UNDONE',command.label);
  p.meta.structuralFingerprint=structuralFingerprint(p);
  return p;
}

export function redoLastEdit(input) {
  const p=normalizeProject(input);p.editCommands=p.editCommands||[];
  const activeCommands=p.editCommands.filter(x=>x.status!=='SUPERSEDED');
  const lastAppliedIndex=[...activeCommands].map((row,index)=>({row,index})).reverse().find(x=>x.row.status==='APPLIED')?.index ?? -1;
  const command=activeCommands.find((row,index)=>index>lastAppliedIndex&&row.status==='UNDONE');
  if(!command)throw new Error('No hay una edición que rehacer.');
  createRevision(p,`Antes de rehacer: ${command.label}`);
  p.assignments=deepClone(command.after);
  reconcileConfirmedAbsenceCoveragesInPlace(p,{reason:'EDIT_REDONE'});
  command.status='APPLIED';command.redoneAt=nowIso();
  appendAudit(p,'EDIT_REDONE',command.label);
  p.meta.structuralFingerprint=structuralFingerprint(p);
  return p;
}

export function saveScenario(input,name,comment='') {
  const p=normalizeProject(input);
  const state=captureScenarioState(p);
  const scenario={
    id:uid('scenario'),
    contractVersion:HISTORY_CONTRACT_VERSION,
    stateSchemaVersion:p.meta.schemaVersion,
    kind:'PLANNING_BRANCH',
    restorable:true,
    integrity:'SHA256_VERIFIED_ON_USE',
    name:name||`Alternativa ${p.scenarios.length+1}`,
    comment,
    createdAt:nowIso(),
    sourceProjectId:p.meta.projectId,
    revisionId:p.meta.revisionId,
    revisionNumber:p.meta.revisionNumber,
    fingerprint:structuralFingerprint(p),
    stateSha256:stateSha256(state),
    state,
    assignments:deepClone(p.assignments),
    quality:proposalQuality(p,p.assignments,[]),
  };
  p.scenarios.push(scenario);
  appendAudit(p,'SCENARIO_SAVED',`Alternativa guardada: ${scenario.name}`,p.meta.responsible,{scenarioId:scenario.id,stateSha256:scenario.stateSha256});
  return p;
}

export function applyScenario(input,scenarioId) {
  const p=normalizeProject(input);
  const scenario=p.scenarios.find(x=>x.id===scenarioId);
  if(!scenario)throw new Error('No se encontró la alternativa.');
  if(scenario.sourceProjectId&&scenario.sourceProjectId!==p.meta.projectId)throw new Error('La alternativa pertenece a otro proyecto.');
  const verification=verifyHistoricalEntry(scenario,'scenario');
  if(!verification.ok)throw new Error(verification.message);
  const draft=normalizeProject(p);
  applyScenarioState(draft,scenario.state);
  const validation=validateProject(draft);
  if(!validation.canGenerate)throw new Error(`La alternativa ya no es válida: ${validation.errors[0]?.message||'conflicto desconocido'}`);
  const beforeRevision=Number(p.meta.revisionNumber||1);
  createRevision(p,`Antes de aplicar alternativa: ${scenario.name}`);
  applyScenarioState(p,scenario.state);
  reconcileConfirmedAbsenceCoveragesInPlace(p,{reason:'SCENARIO_APPLIED'});
  p.meta.status='DRAFT';
  p.meta.lastAppliedScenarioId=scenario.id;
  p.meta.lastAppliedScenarioAt=nowIso();
  if(p.meta.revisionNumber!==beforeRevision+1)throw new Error('La alternativa no pudo aplicarse con una revisión coherente.');
  appendAudit(p,'SCENARIO_APPLIED',`Alternativa aplicada: ${scenario.name}.`,p.meta.responsible,{scenarioId:scenario.id,stateSha256:scenario.stateSha256});
  p.meta.structuralFingerprint=structuralFingerprint(p);
  return p;
}

export function compareScenarios(pInput,aId,bId) {
  const p=normalizeProject(pInput);
  const a=p.scenarios.find(x=>x.id===aId),b=p.scenarios.find(x=>x.id===bId);
  if(!a||!b)throw new Error('Selecciona dos alternativas.');
  const rowsA=scenarioAssignments(a),rowsB=scenarioAssignments(b);
  const index=(rows)=>new Map(rows.map(x=>[occurrenceKey(x,p),x]));
  const A=index(rowsA),B=index(rowsB);
  let unchanged=0,moved=0,added=0,removed=0;
  const unmatchedA=[],unmatchedB=[];
  for(const [key,row] of A){if(B.has(key))unchanged+=1;else unmatchedA.push(row);}
  for(const [key,row] of B)if(!A.has(key))unmatchedB.push(row);
  const countByActivity=rows=>{const out=new Map();for(const row of rows)out.set(row.activityId,(out.get(row.activityId)||0)+1);return out;};
  const countA=countByActivity(unmatchedA),countB=countByActivity(unmatchedB);
  const activityIds=new Set([...countA.keys(),...countB.keys()]);
  for(const activityId of activityIds){const aCount=countA.get(activityId)||0,bCount=countB.get(activityId)||0,paired=Math.min(aCount,bCount);moved+=paired;removed+=aCount-paired;added+=bCount-paired;}
  const collections=['calendar','settings','organization','subjects','teachers','groups','spaces','activities','constraints','locks'];
  const changedCollections=collections.filter(key=>JSON.stringify(a.state?.[key]??null)!==JSON.stringify(b.state?.[key]??null));
  return{
    unchanged,moved,added,removed,totalA:A.size,totalB:B.size,
    qualityA:a.quality,qualityB:b.quality,
    integrityA:verifyHistoricalEntry(a,'scenario').code,
    integrityB:verifyHistoricalEntry(b,'scenario').code,
    changedCollections,
    contextChanged:changedCollections.length>0,
  };
}

function scenarioAssignments(value){
  if(Array.isArray(value?.state?.assignments))return value.state.assignments;
  return Array.isArray(value?.assignments)?value.assignments:[];
}

function occurrenceKey(x,p){return`${x.activityId}|${x.dayId}|${x.slotId}|${x.spaceId||''}`;}
