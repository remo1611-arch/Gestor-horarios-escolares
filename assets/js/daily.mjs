import { deepClone, uid, nowIso, normalizeProject, appendAudit, slotKey, nameOf, DAILY_OPERATIONS_CONTRACT_VERSION, teacherPresenceAt } from './core.mjs';

export { DAILY_OPERATIONS_CONTRACT_VERSION };
export const ABSENCE_STATES=['DRAFT','CONFIRMED','CANCELLED','FINISHED'];
export const COVERAGE_STATES=['PENDING','PROPOSED','ASSIGNED','COMMUNICATED','COMPLETED','CANCELLED','UNCOVERED'];
export const RECOVERY_STATES=['NOT_APPLICABLE','PENDING','SCHEDULED','COMPLETED','CANCELLED_WITH_REASON'];
export const TEMP_SUBSTITUTION_STATES=['PLANNED','ACTIVE','FINISHED','CANCELLED'];
export const IMPACT_TYPES=['UNCHANGED','DISPLACED','SUSPENDED','CANCELLED','RECOVERY_REQUIRED'];
export const IMPACT_STATES=['OPEN','RESOLVED','CANCELLED'];
export const PERFORMED_SERVICE_STATES=['COMPLETED','CANCELLED'];
export const REPORT_SCOPES=['DAY','WEEK','MONTH','TERM','COURSE','GLOBAL','CUSTOM'];
export const REPORTING_PERIODS_CONTRACT_VERSION='reporting-periods-contract-1.0';

const ACTIVE_ABSENCE_STATES=new Set(['DRAFT','CONFIRMED']);
const ACTIVE_COVERAGE_STATES=new Set(['PENDING','PROPOSED','ASSIGNED','COMMUNICATED']);
const ACTIVE_SUBSTITUTION_STATES=new Set(['PLANNED','ACTIVE']);
const RESOLVED_COVERAGE_STATES=new Set(['COMPLETED','CANCELLED','UNCOVERED']);
const COVERAGE_TRANSITIONS={
  PENDING:new Set(['PROPOSED','ASSIGNED','CANCELLED','UNCOVERED']),
  PROPOSED:new Set(['PENDING','ASSIGNED','CANCELLED','UNCOVERED']),
  ASSIGNED:new Set(['PENDING','COMMUNICATED','COMPLETED','CANCELLED','UNCOVERED']),
  COMMUNICATED:new Set(['ASSIGNED','COMPLETED','CANCELLED','UNCOVERED']),
  COMPLETED:new Set(),CANCELLED:new Set(),UNCOVERED:new Set(),
};
const RECOVERY_TRANSITIONS={
  NOT_APPLICABLE:new Set(['PENDING']),PENDING:new Set(['SCHEDULED','COMPLETED','CANCELLED_WITH_REASON','NOT_APPLICABLE']),
  SCHEDULED:new Set(['PENDING','COMPLETED','CANCELLED_WITH_REASON']),COMPLETED:new Set(),CANCELLED_WITH_REASON:new Set(['PENDING']),
};

const localDateString = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const isoDate=value=>String(value||'').trim();
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(isoDate(value))&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const unique=value=>[...new Set((value||[]).filter(Boolean).map(String))];
const clampNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

export function registerAbsence(input,data={}){
  const p=normalizeProject(input);
  if(!p.teachers.some(t=>t.id===data.teacherId))throw new Error('Selecciona un docente válido.');
  if(!p.calendar.days.some(d=>d.id===data.dayId))throw new Error('Selecciona un día válido del horario.');
  const date=isoDate(data.date);
  if(!validDate(date))throw new Error('Indica una fecha válida para la ausencia.');
  const slotIds=unique(Array.isArray(data.slotIds)?data.slotIds:data.slotId?[data.slotId]:[]);
  for(const id of slotIds)if(!p.calendar.slots.some(s=>s.id===id))throw new Error('La ausencia contiene un tramo inexistente.');
  const status=ABSENCE_STATES.includes(data.status)?data.status:'CONFIRMED';
  if(['CANCELLED','FINISHED'].includes(status))throw new Error('Una ausencia nueva debe registrarse como borrador o confirmada.');
  const duplicate=p.daily.absences.find(row=>row.teacherId===data.teacherId&&row.date===date&&row.dayId===data.dayId&&ACTIVE_ABSENCE_STATES.has(row.status)&&slotRangesOverlap(row.slotIds,slotIds));
  if(duplicate)throw new Error('Ya existe una ausencia activa para esa persona y franja.');
  const affected=findAffectedAssignments(p,{teacherId:data.teacherId,dayId:data.dayId,slotIds});
  const absence={
    id:uid('absence'),createdAt:nowIso(),updatedAt:nowIso(),date,dayId:data.dayId,slotIds,
    teacherId:data.teacherId,status,operationalNote:String(data.operationalNote||'').trim(),
    privateReason:String(data.privateReason||'').trim(),createdBy:String(data.createdBy||p.meta.responsible||'Usuario'),
    affectedAssignmentIds:affected.map(x=>x.id),confirmedAt:status==='CONFIRMED'?nowIso():'',
  };
  p.daily.absences.push(absence);
  if(status==='CONFIRMED')syncAbsenceCoverages(p,absence);
  appendAudit(p,'ABSENCE_REGISTERED',`Ausencia ${status==='DRAFT'?'guardada como borrador':'confirmada'} para ${nameOf(p.teachers,data.teacherId)}; ${absence.affectedAssignmentIds.length} servicio(s) afectado(s).`,p.meta.responsible,{absenceId:absence.id,status});
  return p;
}

export function confirmAbsence(input,absenceId){
  const p=normalizeProject(input),absence=p.daily.absences.find(x=>x.id===absenceId);
  if(!absence)throw new Error('No se encontró la ausencia.');
  if(absence.status!=='DRAFT')throw new Error('Solo puede confirmarse una ausencia en borrador.');
  absence.status='CONFIRMED';absence.confirmedAt=nowIso();absence.updatedAt=nowIso();
  absence.affectedAssignmentIds=findAffectedAssignments(p,absence).map(x=>x.id);
  syncAbsenceCoverages(p,absence);
  appendAudit(p,'ABSENCE_CONFIRMED',`Ausencia confirmada para ${nameOf(p.teachers,absence.teacherId)}.`,p.meta.responsible,{absenceId});
  return p;
}

function createPendingCoverage(p,absence,assignment){
  const activity=p.activities.find(x=>x.id===assignment.activityId);
  return {
    id:uid('coverage'),absenceId:absence.id,assignmentId:assignment.id,activityId:activity?.id||'',dayId:assignment.dayId||absence.dayId,
    slotId:assignment.slotId||'',status:'PENDING',coverTeacherId:'',createdAt:nowIso(),updatedAt:nowIso(),decisionReason:'',
    responsible:p.meta.responsible||'Usuario',recommendation:null,decision:null,releasedAssignmentId:'',communication:null,completedAt:'',
    reconciliationState:'CURRENT',obsoleteAt:'',obsoleteReason:'',
  };
}

function affectedAssignmentsInProject(p,{teacherId,dayId,slotIds=[]}){
  const slots=new Set(slotIds||[]);
  return p.assignments.filter(asg=>{
    if(asg.dayId!==dayId)return false;
    if(slots.size&&!assignmentTouchesSlots(p,asg,slots))return false;
    const activity=p.activities.find(a=>a.id===asg.activityId);
    return activity?.teacherIds?.includes(teacherId);
  });
}

function syncAbsenceCoverages(p,absence){
  const current=affectedAssignmentsInProject(p,absence),currentIds=new Set(current.map(row=>row.id));
  absence.affectedAssignmentIds=[...currentIds];absence.updatedAt=nowIso();
  let created=0,obsolete=0;
  for(const assignment of current){
    const active=p.daily.coverages.some(row=>row.absenceId===absence.id&&row.assignmentId===assignment.id&&row.reconciliationState!=='OBSOLETE');
    if(active)continue;
    p.daily.coverages.push(createPendingCoverage(p,absence,assignment));created+=1;
  }
  for(const coverage of p.daily.coverages.filter(row=>row.absenceId===absence.id&&row.reconciliationState!=='OBSOLETE')){
    if(currentIds.has(coverage.assignmentId))continue;
    coverage.reconciliationState='OBSOLETE';coverage.obsoleteAt=nowIso();coverage.obsoleteReason='ASSIGNMENT_NO_LONGER_AFFECTED';coverage.updatedAt=nowIso();
    if(ACTIVE_COVERAGE_STATES.has(coverage.status)){coverage.status='CANCELLED';coverage.cancelledAt=coverage.obsoleteAt;coverage.decisionReason=coverage.decisionReason||'Obsoleta tras modificar el horario.';}
    obsolete+=1;
  }
  return{created,obsolete,current:current.length};
}

export function reconcileConfirmedAbsenceCoveragesInPlace(p,{reason='SCHEDULE_CHANGED'}={}){
  const reports=[];
  for(const absence of (p.daily?.absences||[]).filter(row=>row.status==='CONFIRMED')){
    const result=syncAbsenceCoverages(p,absence);
    if(result.created||result.obsolete)reports.push({absenceId:absence.id,...result});
  }
  if(reports.length)appendAudit(p,'ABSENCE_COVERAGES_RECONCILED',`Coberturas reconciliadas tras ${reason}: ${reports.reduce((sum,row)=>sum+row.created,0)} nuevas y ${reports.reduce((sum,row)=>sum+row.obsolete,0)} obsoletas.`,p.meta.responsible||'Usuario',{reason,reports});
  return{project:p,reports,changed:reports.length>0};
}

export function reconcileConfirmedAbsenceCoverages(input,options={}){
  const p=normalizeProject(input);return reconcileConfirmedAbsenceCoveragesInPlace(p,options);
}

export function findAffectedAssignments(pInput,criteria){
  return affectedAssignmentsInProject(normalizeProject(pInput),criteria);
}

function assignmentTouchesSlots(p,assignment,slots){
  const activity=p.activities.find(a=>a.id===assignment.activityId);const order=p.calendar.slots.map(s=>s.id);
  const start=order.indexOf(assignment.slotId),duration=Math.max(1,Number(activity?.durationSlots||1));
  if(start<0)return slots.has(assignment.slotId);
  for(let i=0;i<duration;i+=1)if(slots.has(order[start+i]))return true;
  return false;
}

function slotRangesOverlap(a=[],b=[]){if(!a.length||!b.length)return true;const set=new Set(a);return b.some(x=>set.has(x));}

export function recommendCoverage(input,coverageId,{asOfDate=''}={}){
  const p=normalizeProject(input),coverage=p.daily.coverages.find(x=>x.id===coverageId);
  if(!coverage)throw new Error('No se encontró la necesidad de cobertura.');
  const absence=p.daily.absences.find(x=>x.id===coverage.absenceId);
  if(!absence||absence.status!=='CONFIRMED')throw new Error('La ausencia no está confirmada y activa.');
  if(RESOLVED_COVERAGE_STATES.has(coverage.status))throw new Error('La necesidad de cobertura ya está cerrada.');
  const originalActivity=p.activities.find(a=>a.id===coverage.activityId),key=slotKey(coverage.dayId,coverage.slotId);
  const originalAssignment=p.assignments.find(a=>a.id===coverage.assignmentId);
  const coverageSiteId=p.spaces.find(space=>space.id===originalAssignment?.spaceId)?.siteId||originalActivity?.serviceSiteId||'';
  const balance=coverageBalanceReport(p,{scope:p.daily.settings?.recommendationBalanceScope||'COURSE',referenceDate:asOfDate||absence.date});
  const balanceByTeacher=new Map(balance.byTeacher.map(row=>[row.teacherId,row]));
  const candidates=[];
  for(const teacher of p.teachers){
    const excluded=[],positive=[];
    if(teacher.id===absence.teacherId)excluded.push('Es la persona ausente.');
    if(!teacher.coverageEligible)excluded.push('No está habilitado/a para coberturas.');
    const presenceDecision=teacherPresenceAt(teacher,coverage.dayId,coverage.slotId,{siteId:coverageSiteId,purpose:'COVERAGE',policy:p.organization?.presencePolicy});
    if(!presenceDecision.allowed)excluded.push(presenceDecision.reason||'No consta una presencia compatible y confirmada.');
    if(isTeacherAbsent(p,teacher.id,coverage.dayId,coverage.slotId,absence.date))excluded.push('Tiene otra ausencia activa.');
    const designated=temporarySubstitutionForCoverage(p,absence,coverage,teacher.id);
    const otherTemporary=activeTemporarySubstitutionForTeacher(p,teacher.id,absence.date||'',absence.teacherId,coverage.activityId);
    if(otherTemporary&&!designated)excluded.push('Tiene una sustitución temporal activa para otra persona o actividad.');
    const occupied=teacherAssignmentAt(p,teacher.id,coverage.dayId,coverage.slotId);
    const releasableKinds=new Set(p.organization?.coveragePolicy?.releasableKinds||['DC']);
    const releasableAssignment=Boolean(occupied&&releasableKinds.has(occupied.activity?.kind));
    if(occupied&&!releasableAssignment)excluded.push(`Ya tiene ${occupied.activity.name}.`);
    if(releasableAssignment&&occupied.activity?.kind==='DC'&&!p.organization?.ldDc?.dcCoverageAllowed)excluded.push('La configuración no permite usar DC para coberturas.');
    const maxDaily=Number(p.organization?.coveragePolicy?.maxDailyCoverages||0);
    if(maxDaily&&coverageCountOnDate(p,teacher.id,absence.date)>=maxDaily)excluded.push(`Ya alcanzó el máximo de ${maxDaily} cobertura(s) diaria(s).`);
    const essentialConflict=breaksEssentialPresence(p,teacher,coverage.dayId,coverage.slotId,absence.date);
    if(essentialConflict)excluded.push(essentialConflict);
    if(excluded.length){candidates.push({teacherId:teacher.id,eligible:false,score:null,reasons:excluded,balance:balanceByTeacher.get(teacher.id)||emptyBalance(teacher.id)});continue;}
    let score=100;
    if(designated){score+=60;positive.push('Está designado/a para esta sustitución temporal.');}
    if(releasableAssignment){score+=25;positive.push(`Dispone de una actividad ${occupied.activity.kind} liberable según la política.`);}else{score+=12;positive.push('Está libre en el horario aceptado.');}
    const history=balanceByTeacher.get(teacher.id)||emptyBalance(teacher.id),historyPenalty=Number(p.daily.settings?.historyPenaltyPerWeight||6);
    score-=history.weightedCompleted*historyPenalty;
    positive.push(`Equilibrio histórico: ${history.completed} actuación(es), peso ${history.weightedCompleted.toFixed(2)} en el ámbito ${balance.scopeLabel}.`);
    const assignedOpen=coverageStats(p,teacher.id).assigned;score-=assignedOpen*3;if(assignedOpen)positive.push(`Tiene ${assignedOpen} cobertura(s) todavía asignada(s).`);
    const dailyLoad=teacherDailyLoad(p,teacher.id,coverage.dayId);score-=dailyLoad;positive.push(`Carga prevista ese día: ${dailyLoad} sesión(es).`);
    if(originalActivity?.kind==='BREAK_DUTY'&&teacher.essentialProfiles?.includes('RECREO')){score+=8;positive.push('Perfil adecuado para vigilancia de recreo.');}
    candidates.push({teacherId:teacher.id,eligible:true,score,reasons:positive,balance:history,usesDc:releasableAssignment&&occupied?.activity?.kind==='DC',releasedAssignmentId:releasableAssignment?occupied.assignment.id:'',releasesActivityKind:releasableAssignment?occupied.activity.kind:'',designatedTemporarySubstitution:Boolean(designated)});
  }
  const eligible=candidates.filter(x=>x.eligible).sort((a,b)=>b.score-a.score||a.balance.weightedCompleted-b.balance.weightedCompleted||nameOf(p.teachers,a.teacherId).localeCompare(nameOf(p.teachers,b.teacherId),'es'));
  if(eligible.length){const best=eligible[0].score;for(const row of eligible)row.tiedForBest=row.score===best;}
  return{coverage,absence,candidates,eligible,excluded:candidates.filter(x=>!x.eligible),balance};
}

function emptyBalance(teacherId){return{teacherId,completed:0,weightedCompleted:0,minutes:0,byType:{}};}
function isTeacherAbsent(p,teacherId,dayId,slotId,date=''){return p.daily.absences.some(a=>a.teacherId===teacherId&&a.dayId===dayId&&(!date||a.date===date)&&a.status==='CONFIRMED'&&(!a.slotIds?.length||a.slotIds.includes(slotId)));}
function dateInRange(date,start,end){if(!date)return false;return(!start||date>=start)&&(!end||date<=end);}
function rangesOverlap(aStart,aEnd,bStart,bEnd){const left=aStart||'0000-01-01',right=aEnd||'9999-12-31',otherLeft=bStart||'0000-01-01',otherRight=bEnd||'9999-12-31';return left<=otherRight&&otherLeft<=right;}
function temporarySubstitutionForCoverage(p,absence,coverage,teacherId){return p.daily.temporarySubstitutions.find(s=>ACTIVE_SUBSTITUTION_STATES.has(s.status)&&s.absentTeacherId===absence.teacherId&&s.substituteTeacherId===teacherId&&dateInRange(absence.date||'',s.startDate,s.endDate)&&(!s.scopeActivityIds?.length||s.scopeActivityIds.includes(coverage.activityId)));}
function activeTemporarySubstitutionForTeacher(p,teacherId,date,exceptAbsentTeacherId='',activityId=''){return p.daily.temporarySubstitutions.find(s=>ACTIVE_SUBSTITUTION_STATES.has(s.status)&&s.substituteTeacherId===teacherId&&dateInRange(date,s.startDate,s.endDate)&&!(s.absentTeacherId===exceptAbsentTeacherId&&(!s.scopeActivityIds?.length||s.scopeActivityIds.includes(activityId))));}
function teacherAssignmentAt(p,teacherId,dayId,slotId){const assignment=p.assignments.find(asg=>asg.dayId===dayId&&assignmentTouchesSlots(p,asg,new Set([slotId]))&&p.activities.find(a=>a.id===asg.activityId)?.teacherIds?.includes(teacherId));return assignment?{assignment,activity:p.activities.find(a=>a.id===assignment.activityId)}:null;}
function breaksEssentialPresence(p,teacher,dayId,slotId,date=''){
  if(p.organization?.coveragePolicy?.preserveEssentialPresence===false)return'';
  for(const rule of (p.organization?.minimumPresence||[]).filter(x=>x.active!==false)){
    if(rule.dayIds?.length&&!rule.dayIds.includes(dayId))continue;if(rule.slotIds?.length&&!rule.slotIds.includes(slotId))continue;
    if(!rule.profileTag||!teacher.essentialProfiles?.includes(rule.profileTag))continue;
    const eligible=p.teachers.filter(t=>t.essentialProfiles?.includes(rule.profileTag)&&!isTeacherAbsent(p,t.id,dayId,slotId,date)).length;
    if(eligible<=Number(rule.minimum||0))return`Su salida dejaría por debajo del mínimo el perfil ${rule.profileTag}.`;
  }
  return'';
}
function coverageCountOnDate(p,teacherId,date){const absenceById=new Map(p.daily.absences.map(a=>[a.id,a]));return p.daily.coverages.filter(c=>c.coverTeacherId===teacherId&&absenceById.get(c.absenceId)?.date===date&&['ASSIGNED','COMMUNICATED','COMPLETED'].includes(c.status)).length;}
function coverageStats(p,teacherId){const rows=p.daily.coverages.filter(c=>c.coverTeacherId===teacherId);return{completed:rows.filter(c=>c.status==='COMPLETED').length,assigned:rows.filter(c=>['ASSIGNED','COMMUNICATED'].includes(c.status)).length};}
function teacherDailyLoad(p,teacherId,dayId){return p.assignments.filter(asg=>asg.dayId===dayId&&p.activities.find(a=>a.id===asg.activityId)?.teacherIds?.includes(teacherId)).length;}

export function proposeCoverage(input,coverageId,teacherId,{decisionReason=''}={}){return assignCoverage(input,coverageId,teacherId,{decisionReason,status:'PROPOSED'});}

export function assignCoverage(input,coverageId,teacherId,{decisionReason='',status='ASSIGNED'}={}){
  const p=normalizeProject(input);if(!['PROPOSED','ASSIGNED'].includes(status))throw new Error('La asignación debe quedar propuesta o asignada.');
  const recommendation=recommendCoverage(p,coverageId),candidate=recommendation.candidates.find(x=>x.teacherId===teacherId);
  if(!candidate)throw new Error('No se encontró el docente seleccionado.');if(!candidate.eligible)throw new Error(candidate.reasons.join(' '));
  const bestIds=recommendation.eligible.filter(x=>x.tiedForBest).map(x=>x.teacherId),deviates=!bestIds.includes(teacherId),reason=String(decisionReason||'').trim();
  if(deviates&&!reason)throw new Error('Indica por qué se selecciona una candidatura distinta de las mejor valoradas.');
  const coverage=p.daily.coverages.find(x=>x.id===coverageId),at=nowIso();
  coverage.coverTeacherId=teacherId;coverage.status=status;coverage.assignedAt=status==='ASSIGNED'?at:'';coverage.proposedAt=status==='PROPOSED'?at:'';coverage.updatedAt=at;
  coverage.decisionReason=reason;coverage.releasedAssignmentId=candidate.releasedAssignmentId||'';
  coverage.recommendation={score:candidate.score,tiedForBest:candidate.tiedForBest,reasons:deepClone(candidate.reasons),usesDc:candidate.usesDc,balance:deepClone(candidate.balance)};
  coverage.decision={at,actor:p.meta.responsible||'Usuario',selectedTeacherId:teacherId,recommendedTeacherIds:bestIds,deviatesFromBest:deviates,reason};
  appendAudit(p,status==='PROPOSED'?'COVERAGE_PROPOSED':'COVERAGE_ASSIGNED',`${nameOf(p.teachers,teacherId)} ${status==='PROPOSED'?'queda propuesto/a para':'cubrirá'} ${nameOf(p.activities,coverage.activityId)}.`,p.meta.responsible,{coverageId,decisionReason:reason,deviatesFromBest:deviates});
  return p;
}

export function communicateCoverage(input,coverageId,{channel='',note=''}={}){
  const p=normalizeProject(input),coverage=p.daily.coverages.find(x=>x.id===coverageId);if(!coverage)throw new Error('No se encontró la cobertura.');
  if(coverage.status!=='ASSIGNED')throw new Error('Solo puede comunicarse una cobertura asignada.');
  coverage.status='COMMUNICATED';coverage.updatedAt=nowIso();coverage.communication={at:nowIso(),actor:p.meta.responsible||'Usuario',channel:String(channel||'').trim(),note:String(note||'').trim()};
  appendAudit(p,'COVERAGE_COMMUNICATED',`Cobertura comunicada a ${nameOf(p.teachers,coverage.coverTeacherId)}.`,p.meta.responsible,{coverageId,channel});return p;
}

export function updateCoverageStatus(input,coverageId,status,note=''){
  const p=normalizeProject(input);if(!COVERAGE_STATES.includes(status))throw new Error('Estado de cobertura no válido.');
  const coverage=p.daily.coverages.find(x=>x.id===coverageId);if(!coverage)throw new Error('No se encontró la cobertura.');
  if(coverage.status===status)return p;
  if(!COVERAGE_TRANSITIONS[coverage.status]?.has(status))throw new Error(`No se puede pasar una cobertura de ${coverage.status} a ${status}.`);
  const reason=String(note||'').trim();
  if(['ASSIGNED','COMMUNICATED','COMPLETED'].includes(status)&&!coverage.coverTeacherId)throw new Error('La cobertura necesita una persona asignada.');
  if(['CANCELLED','UNCOVERED'].includes(status)&&!reason)throw new Error('Indica el motivo del cierre de la cobertura.');
  coverage.status=status;coverage.updatedAt=nowIso();if(reason)coverage.completionNote=reason;
  if(status==='COMPLETED'){
    coverage.completedAt=nowIso();
    ensurePerformedService(p,coverage,{note:reason});
  }
  if(status==='CANCELLED')coverage.cancelledAt=nowIso();
  if(status==='UNCOVERED'){coverage.uncoveredAt=nowIso();coverage.decisionReason=reason;}
  appendAudit(p,'COVERAGE_STATUS_CHANGED',`Cobertura actualizada a ${status}${reason?`: ${reason}`:''}.`,p.meta.responsible,{coverageId,status});return p;
}

export function reopenCoverage(input,coverageId,reason){
  const p=normalizeProject(input),coverage=p.daily.coverages.find(x=>x.id===coverageId),why=String(reason||'').trim();
  if(!coverage)throw new Error('No se encontró la cobertura.');if(!why)throw new Error('Indica el motivo de reapertura.');
  if(coverage.status==='COMPLETED')throw new Error('Una cobertura completada no puede reabrirse; registra una corrección trazable.');
  coverage.status='PENDING';coverage.coverTeacherId='';coverage.updatedAt=nowIso();coverage.decisionReason=`Reabierta: ${why}`;coverage.recommendation=null;coverage.decision=null;
  appendAudit(p,'COVERAGE_REOPENED',`Cobertura reabierta: ${why}`,p.meta.responsible,{coverageId});return p;
}

export function markCoverageUncovered(input,coverageId,reason){return updateCoverageStatus(input,coverageId,'UNCOVERED',reason);}

export function cancelAbsence(input,absenceId,reason){
  const p=normalizeProject(input),why=String(reason||'').trim();if(!why)throw new Error('Indica el motivo de cancelación.');
  const absence=p.daily.absences.find(x=>x.id===absenceId);if(!absence)throw new Error('No se encontró la ausencia.');
  if(['CANCELLED','FINISHED'].includes(absence.status))throw new Error('La ausencia ya está cerrada.');
  absence.status='CANCELLED';absence.cancelledAt=nowIso();absence.updatedAt=nowIso();absence.cancellationReason=why;
  for(const c of p.daily.coverages.filter(x=>x.absenceId===absenceId&&ACTIVE_COVERAGE_STATES.has(x.status))){c.status='CANCELLED';c.updatedAt=nowIso();c.decisionReason=`Ausencia cancelada: ${why}`;}
  for(const row of p.daily.incidents.filter(x=>x.absenceId===absenceId&&x.status==='OPEN')){row.status='CANCELLED';row.updatedAt=nowIso();row.resolutionNote=`Ausencia cancelada: ${why}`;}
  appendAudit(p,'ABSENCE_CANCELLED',`Ausencia cancelada: ${why}`,p.meta.responsible,{absenceId});return p;
}

export function finishAbsence(input,absenceId){
  const p=normalizeProject(input),absence=p.daily.absences.find(x=>x.id===absenceId);if(!absence)throw new Error('No se encontró la ausencia.');
  if(absence.status!=='CONFIRMED')throw new Error('Solo puede finalizarse una ausencia confirmada.');
  const open=p.daily.coverages.filter(x=>x.absenceId===absenceId&&ACTIVE_COVERAGE_STATES.has(x.status));if(open.length)throw new Error(`Quedan ${open.length} cobertura(s) sin cerrar.`);
  absence.status='FINISHED';absence.finishedAt=nowIso();absence.updatedAt=nowIso();appendAudit(p,'ABSENCE_FINISHED',`Ausencia cerrada de ${nameOf(p.teachers,absence.teacherId)}.`,p.meta.responsible,{absenceId});return p;
}

export function createRecovery(input,{coverageId='',incidentId='',activityId='',status='PENDING',plannedDate='',publicNote='',privateNote=''}={}){
  const p=normalizeProject(input);if(!RECOVERY_STATES.includes(status))throw new Error('Estado de recuperación no válido.');
  const coverage=coverageId?p.daily.coverages.find(x=>x.id===coverageId):null,incident=incidentId?p.daily.incidents.find(x=>x.id===incidentId):null;
  const resolvedActivityId=activityId||coverage?.activityId||incident?.activityId||'';if(resolvedActivityId&&!p.activities.some(a=>a.id===resolvedActivityId))throw new Error('La actividad de recuperación no existe.');
  if(status==='SCHEDULED'&&!validDate(plannedDate))throw new Error('Una recuperación programada necesita fecha válida.');
  if(coverageId&&!coverage)throw new Error('La cobertura vinculada no existe.');if(incidentId&&!incident)throw new Error('La incidencia vinculada no existe.');
  if(p.daily.recoveries.some(x=>(coverageId&&x.coverageId===coverageId)||(incidentId&&x.incidentId===incidentId)))throw new Error('Ya existe una recuperación vinculada a esta incidencia o cobertura.');
  const recovery={id:uid('recovery'),coverageId,incidentId,activityId:resolvedActivityId,status,plannedDate:isoDate(plannedDate),publicNote:String(publicNote||'').trim(),privateNote:String(privateNote||'').trim(),createdAt:nowIso(),updatedAt:nowIso(),responsible:p.meta.responsible||'Usuario'};
  p.daily.recoveries.push(recovery);if(incident)incident.recoveryId=recovery.id;
  appendAudit(p,'RECOVERY_CREATED',`Recuperación registrada para ${nameOf(p.activities,resolvedActivityId)}.`,p.meta.responsible,{recoveryId:recovery.id});return p;
}

export function updateRecovery(input,recoveryId,changes={}){
  const p=normalizeProject(input),recovery=p.daily.recoveries.find(x=>x.id===recoveryId);if(!recovery)throw new Error('No se encontró la recuperación.');
  const nextStatus=changes.status||recovery.status;if(!RECOVERY_STATES.includes(nextStatus))throw new Error('Estado de recuperación no válido.');
  if(nextStatus!==recovery.status&&!RECOVERY_TRANSITIONS[recovery.status]?.has(nextStatus))throw new Error(`No se puede pasar una recuperación de ${recovery.status} a ${nextStatus}.`);
  const plannedDate=changes.plannedDate===undefined?recovery.plannedDate:isoDate(changes.plannedDate);
  if(nextStatus==='SCHEDULED'&&!validDate(plannedDate))throw new Error('Una recuperación programada necesita fecha válida.');
  if(nextStatus==='CANCELLED_WITH_REASON'&&!String(changes.cancellationReason||changes.publicNote||'').trim())throw new Error('Indica el motivo de cancelación de la recuperación.');
  Object.assign(recovery,changes,{status:nextStatus,plannedDate,updatedAt:nowIso()});if(nextStatus==='COMPLETED')recovery.completedAt=changes.completedAt||nowIso();
  appendAudit(p,'RECOVERY_UPDATED',`Recuperación actualizada a ${recovery.status}.`,p.meta.responsible,{recoveryId});return p;
}

export function createTemporarySubstitution(input,{absentTeacherId,substituteTeacherId,startDate,endDate='',scopeActivityIds=[],operationalNote='',privateNote='',status='ACTIVE'}={}){
  const p=normalizeProject(input);validateTemporarySubstitution(p,{absentTeacherId,substituteTeacherId,startDate,endDate,scopeActivityIds,status});
  const overlap=p.daily.temporarySubstitutions.find(s=>ACTIVE_SUBSTITUTION_STATES.has(s.status)&&s.substituteTeacherId===substituteTeacherId&&rangesOverlap(startDate,endDate,s.startDate,s.endDate));
  if(overlap)throw new Error('La persona sustituta ya tiene otra sustitución activa en ese intervalo.');
  const row={id:uid('temporary_substitution'),absentTeacherId,substituteTeacherId,startDate,endDate,scopeActivityIds:unique(scopeActivityIds),operationalNote:String(operationalNote||'').trim(),privateNote:String(privateNote||'').trim(),status,createdAt:nowIso(),updatedAt:nowIso(),responsible:p.meta.responsible||'Usuario'};
  p.daily.temporarySubstitutions.push(row);appendAudit(p,'TEMPORARY_SUBSTITUTION_CREATED',`${nameOf(p.teachers,substituteTeacherId)} sustituye temporalmente a ${nameOf(p.teachers,absentTeacherId)}.`,p.meta.responsible,{temporarySubstitutionId:row.id});return p;
}

export function updateTemporarySubstitution(input,id,changes={}){
  const p=normalizeProject(input),row=p.daily.temporarySubstitutions.find(x=>x.id===id);if(!row)throw new Error('No se encontró la sustitución temporal.');
  const candidate={...row,...changes};validateTemporarySubstitution(p,candidate);
  const overlap=p.daily.temporarySubstitutions.find(s=>s.id!==id&&ACTIVE_SUBSTITUTION_STATES.has(s.status)&&ACTIVE_SUBSTITUTION_STATES.has(candidate.status)&&s.substituteTeacherId===candidate.substituteTeacherId&&rangesOverlap(candidate.startDate,candidate.endDate,s.startDate,s.endDate));
  if(overlap)throw new Error('La persona sustituta ya tiene otra sustitución activa en ese intervalo.');
  Object.assign(row,changes,{updatedAt:nowIso()});appendAudit(p,'TEMPORARY_SUBSTITUTION_UPDATED',`Sustitución temporal actualizada a ${row.status}.`,p.meta.responsible,{temporarySubstitutionId:id});return p;
}
function validateTemporarySubstitution(p,row){
  if(!p.teachers.some(t=>t.id===row.absentTeacherId))throw new Error('Selecciona la persona sustituida.');if(!p.teachers.some(t=>t.id===row.substituteTeacherId))throw new Error('Selecciona la persona sustituta.');
  if(row.absentTeacherId===row.substituteTeacherId)throw new Error('La persona sustituida y la sustituta deben ser distintas.');if(!validDate(row.startDate))throw new Error('Indica una fecha de inicio válida.');
  if(row.endDate&&(!validDate(row.endDate)||row.endDate<row.startDate))throw new Error('La fecha final no puede ser anterior a la inicial.');if(!TEMP_SUBSTITUTION_STATES.includes(row.status))throw new Error('El estado de sustitución no es válido.');
  if((row.scopeActivityIds||[]).some(id=>!p.activities.some(a=>a.id===id)))throw new Error('La sustitución incluye actividades que no existen.');
}

export function createActivityImpact(input,{absenceId='',coverageId='',assignmentId='',type='SUSPENDED',destination=null,operationalNote='',privateNote='',status='OPEN'}={}){
  const p=normalizeProject(input);if(!IMPACT_TYPES.includes(type)||type==='UNCHANGED')throw new Error('Selecciona una consecuencia operativa válida.');if(!IMPACT_STATES.includes(status))throw new Error('Estado de incidencia no válido.');
  const coverage=coverageId?p.daily.coverages.find(x=>x.id===coverageId):null,absence=absenceId?p.daily.absences.find(x=>x.id===absenceId):coverage?p.daily.absences.find(x=>x.id===coverage.absenceId):null;
  const assignment=p.assignments.find(x=>x.id===(assignmentId||coverage?.assignmentId));if(!assignment)throw new Error('La incidencia necesita una sesión oficial válida.');
  if(p.daily.incidents.some(x=>x.assignmentId===assignment.id&&x.date===(absence?.date||'')&&x.status==='OPEN'))throw new Error('Ya existe una consecuencia operativa abierta para esa sesión y fecha.');
  const normalizedDestination=validateImpactDestination(p,type,destination);
  const row={id:uid('incident'),absenceId:absence?.id||'',coverageId:coverage?.id||'',assignmentId:assignment.id,activityId:assignment.activityId,date:absence?.date||'',dayId:assignment.dayId,slotId:assignment.slotId,type,status,destination:normalizedDestination,operationalNote:String(operationalNote||'').trim(),privateNote:String(privateNote||'').trim(),createdAt:nowIso(),updatedAt:nowIso(),responsible:p.meta.responsible||'Usuario',recoveryId:''};
  p.daily.incidents.push(row);
  if(type==='RECOVERY_REQUIRED'){const next=createRecovery(p,{coverageId:coverage?.id||'',incidentId:row.id,activityId:assignment.activityId,status:'PENDING',publicNote:row.operationalNote});return next;}
  appendAudit(p,'ACTIVITY_IMPACT_CREATED',`${nameOf(p.activities,assignment.activityId)} queda ${impactLabel(type).toLowerCase()}.`,p.meta.responsible,{incidentId:row.id,type});return p;
}

export function updateActivityImpact(input,id,changes={}){
  const p=normalizeProject(input),row=p.daily.incidents.find(x=>x.id===id);if(!row)throw new Error('No se encontró la incidencia operativa.');
  const type=changes.type||row.type,status=changes.status||row.status;if(!IMPACT_TYPES.includes(type))throw new Error('Consecuencia operativa no válida.');if(!IMPACT_STATES.includes(status))throw new Error('Estado de incidencia no válido.');
  const destination=validateImpactDestination(p,type,changes.destination===undefined?row.destination:changes.destination);Object.assign(row,changes,{type,status,destination,updatedAt:nowIso()});
  if(status==='RESOLVED')row.resolvedAt=changes.resolvedAt||nowIso();appendAudit(p,'ACTIVITY_IMPACT_UPDATED',`Incidencia operativa actualizada a ${status}.`,p.meta.responsible,{incidentId:id,type});return p;
}
function validateImpactDestination(p,type,destination){
  if(type!=='DISPLACED')return null;const row=destination||{};if(!validDate(row.date))throw new Error('Una actividad desplazada necesita fecha de destino.');
  if(!p.calendar.days.some(d=>d.id===row.dayId))throw new Error('El día de destino no existe.');if(!p.calendar.slots.some(s=>s.id===row.slotId))throw new Error('El tramo de destino no existe.');
  if(row.spaceId&&!p.spaces.some(s=>s.id===row.spaceId))throw new Error('El espacio de destino no existe.');return{date:row.date,dayId:row.dayId,slotId:row.slotId,spaceId:row.spaceId||''};
}
export function impactLabel(type){return({UNCHANGED:'Sin cambio',DISPLACED:'Desplazada',SUSPENDED:'Suspendida',CANCELLED:'Cancelada',RECOVERY_REQUIRED:'Pendiente de recuperación'}[type]||type);}

export function recordPerformedService(input,data={}){
  const p=normalizeProject(input);
  appendPerformedService(p,data);
  return p;
}
function appendPerformedService(p,data={}){
  const coverage=data.coverageId?p.daily.coverages.find(x=>x.id===data.coverageId):null;
  if(data.coverageId&&!coverage)throw new Error('La cobertura vinculada no existe.');
  const teacherId=data.teacherId||coverage?.coverTeacherId||'';if(!p.teachers.some(t=>t.id===teacherId))throw new Error('Selecciona la persona que realizó el servicio.');
  const absence=coverage?p.daily.absences.find(x=>x.id===coverage.absenceId):null,date=data.date||absence?.date||'';if(!validDate(date))throw new Error('Indica la fecha real del servicio.');
  if(coverage&&p.daily.guards.some(x=>x.coverageId===coverage.id&&x.status==='COMPLETED'))return null;
  const dayId=data.dayId||coverage?.dayId||'',slotId=data.slotId||coverage?.slotId||'';
  if(!p.calendar.days.some(d=>d.id===dayId)||!p.calendar.slots.some(s=>s.id===slotId))throw new Error('El servicio necesita un día y tramo válidos.');
  const sourceType=data.sourceType||performedSourceType(p,coverage,teacherId),minutes=clampNumber(data.durationMinutes,slotDurationMinutes(p,slotId)),weight=clampNumber(data.weight,serviceWeight(p,{coverage,sourceType,minutes}));
  const row={id:uid('performed_service'),coverageId:coverage?.id||'',absenceId:absence?.id||'',teacherId,date,dayId,slotId,activityId:data.activityId||coverage?.activityId||'',assignmentId:data.assignmentId||coverage?.assignmentId||'',sourceType,durationMinutes:minutes,weight,status:'COMPLETED',completedAt:data.completedAt||nowIso(),operationalNote:String(data.operationalNote||data.note||'').trim(),privateNote:String(data.privateNote||'').trim(),responsible:p.meta.responsible||'Usuario'};
  p.daily.guards.push(row);appendAudit(p,'PERFORMED_SERVICE_RECORDED',`${nameOf(p.teachers,teacherId)} realizó un servicio de cobertura.`,p.meta.responsible,{performedServiceId:row.id,coverageId:row.coverageId,weight});return row;
}
function ensurePerformedService(p,coverage,{note=''}){return appendPerformedService(p,{coverageId:coverage.id,operationalNote:note});}
function performedSourceType(p,coverage,teacherId){
  if(!coverage)return'MANUAL_GUARD';const absence=p.daily.absences.find(x=>x.id===coverage.absenceId);
  if(temporarySubstitutionForCoverage(p,absence||{},coverage,teacherId))return'TEMP_SUBSTITUTION';
  if(coverage.releasedAssignmentId){const kind=p.activities.find(a=>a.id===p.assignments.find(x=>x.id===coverage.releasedAssignmentId)?.activityId)?.kind;return kind==='DC'?'DC_RELEASE':'RELEASED_ACTIVITY';}
  const occupied=teacherAssignmentAt(p,teacherId,coverage.dayId,coverage.slotId);return occupied?.activity?.kind==='GUARD'?'SCHEDULED_GUARD':'FREE_COVERAGE';
}
function slotDurationMinutes(p,slotId){const slot=p.calendar.slots.find(s=>s.id===slotId);if(!slot?.start||!slot?.end)return 50;const [sh,sm]=slot.start.split(':').map(Number),[eh,em]=slot.end.split(':').map(Number);const value=(eh*60+em)-(sh*60+sm);return value>0?value:50;}
function serviceWeight(p,{coverage,sourceType,minutes}){const activity=p.activities.find(a=>a.id===coverage?.activityId),weights=p.daily.settings?.balanceWeights||{};const key=activity?.kind==='BREAK_DUTY'?'BREAK_DUTY':sourceType;const base=clampNumber(weights[key],clampNumber(weights.DEFAULT,1)),unit=Math.max(1,clampNumber(p.daily.settings?.weightUnitMinutes,50));return Number((base*Math.max(1,minutes)/unit).toFixed(4));}

export function cancelPerformedService(input,id,reason){const p=normalizeProject(input),row=p.daily.guards.find(x=>x.id===id),why=String(reason||'').trim();if(!row)throw new Error('No se encontró el servicio realizado.');if(!why)throw new Error('Indica el motivo de anulación.');if(row.status==='CANCELLED')return p;row.status='CANCELLED';row.cancelledAt=nowIso();row.cancellationReason=why;appendAudit(p,'PERFORMED_SERVICE_CANCELLED',`Servicio realizado anulado: ${why}`,p.meta.responsible,{performedServiceId:id});return p;}

export function coverageBalanceReport(input,{scope='COURSE',referenceDate='',fromDate='',toDate=''}={}){
  const p=normalizeProject(input),bounds=resolvePeriodBounds(p,{scope,referenceDate,fromDate,toDate}),rows=p.daily.guards.filter(row=>row.status==='COMPLETED'&&inBounds(row.date,bounds));
  const openAbsences=new Map(p.daily.absences.map(a=>[a.id,a]));
  const byTeacher=p.teachers.map(teacher=>{
    const performed=rows.filter(x=>x.teacherId===teacher.id),open=p.daily.coverages.filter(c=>c.coverTeacherId===teacher.id&&['ASSIGNED','COMMUNICATED'].includes(c.status)&&inBounds(openAbsences.get(c.absenceId)?.date||'',bounds));
    const byType={};for(const row of performed)byType[row.sourceType]=(byType[row.sourceType]||0)+1;
    return{teacherId:teacher.id,completed:performed.length,weightedCompleted:Number(performed.reduce((sum,x)=>sum+clampNumber(x.weight,1),0).toFixed(4)),minutes:performed.reduce((sum,x)=>sum+clampNumber(x.durationMinutes,0),0),assignedOpen:open.length,byType};
  });
  const values=byTeacher.filter(x=>p.teachers.find(t=>t.id===x.teacherId)?.coverageEligible!==false).map(x=>x.weightedCompleted),mean=values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
  for(const row of byTeacher)row.deviationFromMean=Number((row.weightedCompleted-mean).toFixed(4));
  byTeacher.sort((a,b)=>a.weightedCompleted-b.weightedCompleted||a.completed-b.completed||nameOf(p.teachers,a.teacherId).localeCompare(nameOf(p.teachers,b.teacherId),'es'));
  return{contractVersion:DAILY_OPERATIONS_CONTRACT_VERSION,scope:bounds.scope,scopeLabel:bounds.label,fromDate:bounds.fromDate,toDate:bounds.toDate,totalCompleted:rows.length,totalWeight:Number(rows.reduce((s,x)=>s+clampNumber(x.weight,1),0).toFixed(4)),meanWeight:Number(mean.toFixed(4)),byTeacher};
}

export function buildOperationalDay(input,{date,dayId=''}={}){
  const p=normalizeProject(input);if(!validDate(date))throw new Error('Indica una fecha válida para construir el horario diario.');
  const resolvedDayId=dayId||inferDayId(p,date);if(!resolvedDayId)throw new Error('La fecha no corresponde a un día configurado del horario.');
  const absences=p.daily.absences.filter(a=>a.date===date&&a.dayId===resolvedDayId&&a.status==='CONFIRMED'),absenceByTeacher=new Map(absences.map(a=>[a.teacherId,a]));
  const coverageByAssignment=new Map(p.daily.coverages.filter(c=>absences.some(a=>a.id===c.absenceId)).map(c=>[c.assignmentId,c]));
  const impactByAssignment=new Map(p.daily.incidents.filter(x=>x.date===date&&x.status==='OPEN').map(x=>[x.assignmentId,x]));
  const entries=p.assignments.filter(asg=>asg.dayId===resolvedDayId).map(asg=>{
    const activity=p.activities.find(a=>a.id===asg.activityId),absentTeachers=(activity?.teacherIds||[]).filter(id=>absenceByTeacher.has(id)),coverage=coverageByAssignment.get(asg.id)||null,impact=impactByAssignment.get(asg.id)||null;
    const effectiveTeachers=(activity?.teacherIds||[]).filter(id=>!absentTeachers.includes(id));if(coverage?.coverTeacherId&&['ASSIGNED','COMMUNICATED','COMPLETED'].includes(coverage.status))effectiveTeachers.push(coverage.coverTeacherId);
    return{assignmentId:asg.id,activityId:asg.activityId,activityName:activity?.name||asg.activityId,dayId:asg.dayId,slotId:asg.slotId,spaceId:asg.spaceId||'',officialTeacherIds:deepClone(activity?.teacherIds||[]),absentTeacherIds:absentTeachers,coverageId:coverage?.id||'',coverageStatus:coverage?.status||'',coverTeacherId:coverage?.coverTeacherId||'',effectiveTeacherIds:unique(effectiveTeachers),impactId:impact?.id||'',impactType:impact?.type||'UNCHANGED',destination:deepClone(impact?.destination||null),operationalStatus:impact?impact.type:absentTeachers.length?(coverage?.coverTeacherId?'COVERED':'AFFECTED'):'OFFICIAL'};
  });
  return{contractVersion:DAILY_OPERATIONS_CONTRACT_VERSION,date,dayId:resolvedDayId,officialAssignmentsUnchanged:true,entries,summary:{assignments:entries.length,affected:entries.filter(x=>x.absentTeacherIds.length).length,covered:entries.filter(x=>x.coverTeacherId).length,uncovered:entries.filter(x=>x.absentTeacherIds.length&&!x.coverTeacherId).length,displaced:entries.filter(x=>x.impactType==='DISPLACED').length,suspended:entries.filter(x=>x.impactType==='SUSPENDED').length,cancelled:entries.filter(x=>x.impactType==='CANCELLED').length}};
}

export function dailyOperationalReport(input,{date,dayId=''}={}){
  const p=normalizeProject(input),schedule=buildOperationalDay(p,{date,dayId}),absenceIds=new Set(p.daily.absences.filter(a=>a.date===date).map(a=>a.id));
  const coverages=p.daily.coverages.filter(c=>absenceIds.has(c.absenceId)),guards=p.daily.guards.filter(g=>g.date===date),incidents=p.daily.incidents.filter(i=>i.date===date),recoveries=p.daily.recoveries.filter(r=>r.plannedDate===date),substitutions=p.daily.temporarySubstitutions.filter(s=>ACTIVE_SUBSTITUTION_STATES.has(s.status)&&dateInRange(date,s.startDate,s.endDate));
  return{contractVersion:DAILY_OPERATIONS_CONTRACT_VERSION,date,dayId:schedule.dayId,schedule,absences:p.daily.absences.filter(a=>a.date===date).map(publicAbsence),coverages:coverages.map(publicCoverage),performedServices:guards.map(publicGuard),incidents:incidents.map(publicIncident),recoveries:recoveries.map(publicRecovery),temporarySubstitutions:substitutions.map(publicSubstitution),summary:{...schedule.summary,absences:absenceIds.size,pendingCoverages:coverages.filter(c=>c.status==='PENDING').length,completedCoverages:coverages.filter(c=>c.status==='COMPLETED').length,uncoveredCoverages:coverages.filter(c=>c.status==='UNCOVERED').length,performedServices:guards.filter(g=>g.status==='COMPLETED').length,pendingRecoveries:recoveries.filter(r=>['PENDING','SCHEDULED'].includes(r.status)).length}};
}

export function dailyPeriodReport(input,{scope='CUSTOM',referenceDate='',fromDate='',toDate=''}={}){
  const p=normalizeProject(input),bounds=resolvePeriodBounds(p,{scope,referenceDate,fromDate,toDate});
  const absences=p.daily.absences.filter(a=>inBounds(a.date,bounds)),absenceIds=new Set(absences.map(a=>a.id));
  const coverages=p.daily.coverages.filter(c=>absenceIds.has(c.absenceId)),substitutions=p.daily.temporarySubstitutions.filter(s=>periodsOverlap(bounds.fromDate,bounds.toDate,s.startDate,s.endDate));
  const recoveries=p.daily.recoveries.filter(r=>inBounds(r.plannedDate||recoverySourceDate(p,r),bounds)),guards=p.daily.guards.filter(g=>inBounds(g.date,bounds)),incidents=p.daily.incidents.filter(i=>inBounds(i.date,bounds));
  const balance=coverageBalanceReport(p,{scope:bounds.scope,referenceDate,fromDate:bounds.fromDate,toDate:bounds.toDate});
  return{contractVersion:DAILY_OPERATIONS_CONTRACT_VERSION,scope:bounds.scope,scopeLabel:bounds.label,fromDate:bounds.fromDate,toDate:bounds.toDate,totals:{absences:absences.length,coverages:coverages.length,assigned:coverages.filter(c=>['ASSIGNED','COMMUNICATED'].includes(c.status)).length,completed:coverages.filter(c=>c.status==='COMPLETED').length,uncovered:coverages.filter(c=>c.status==='UNCOVERED').length,pending:coverages.filter(c=>['PENDING','PROPOSED'].includes(c.status)).length,cancelled:coverages.filter(c=>c.status==='CANCELLED').length,recoveriesPending:recoveries.filter(r=>['PENDING','SCHEDULED'].includes(r.status)).length,temporarySubstitutions:substitutions.filter(s=>ACTIVE_SUBSTITUTION_STATES.has(s.status)).length,performedServices:guards.filter(g=>g.status==='COMPLETED').length,incidentsOpen:incidents.filter(i=>i.status==='OPEN').length},byTeacher:balance.byTeacher,balance,absences:absences.map(publicAbsence),coverages:coverages.map(publicCoverage),recoveries:recoveries.map(publicRecovery),substitutions:substitutions.map(publicSubstitution),performedServices:guards.map(publicGuard),incidents:incidents.map(publicIncident)};
}

export function reportForWeek(input,referenceDate){return dailyPeriodReport(input,{scope:'WEEK',referenceDate});}
export function reportForMonth(input,referenceDate){return dailyPeriodReport(input,{scope:'MONTH',referenceDate});}

export function dailySummary(input,dayId='',date=''){
  const p=normalizeProject(input),abs=p.daily.absences.filter(a=>(!dayId||a.dayId===dayId)&&(!date||a.date===date)),ids=new Set(abs.map(a=>a.id)),cov=p.daily.coverages.filter(c=>ids.has(c.absenceId));
  return{absences:abs.length,activeAbsences:abs.filter(a=>a.status==='CONFIRMED').length,pendingCoverages:cov.filter(c=>['PENDING','PROPOSED'].includes(c.status)).length,assignedCoverages:cov.filter(c=>['ASSIGNED','COMMUNICATED','COMPLETED'].includes(c.status)).length,uncovered:cov.filter(c=>c.status==='UNCOVERED').length,pendingRecoveries:p.daily.recoveries.filter(r=>['PENDING','SCHEDULED'].includes(r.status)).length,openIncidents:p.daily.incidents.filter(i=>i.status==='OPEN').length,performedServices:p.daily.guards.filter(g=>g.status==='COMPLETED'&&(!date||g.date===date)).length};
}

export function resolvePeriodBounds(pInput,{scope='CUSTOM',referenceDate='',fromDate='',toDate=''}={}){
  const p=pInput||{},mode=REPORT_SCOPES.includes(scope)?scope:'CUSTOM',ref=validDate(referenceDate)?referenceDate:(validDate(fromDate)?fromDate:localDateString());let start=isoDate(fromDate),end=isoDate(toDate),label='Periodo personalizado';
  const d=new Date(`${ref}T00:00:00Z`),iso=value=>value.toISOString().slice(0,10);
  if(mode==='DAY'){start=end=ref;label='día';}
  if(mode==='WEEK'){const day=(d.getUTCDay()+6)%7,first=new Date(d);first.setUTCDate(d.getUTCDate()-day);const last=new Date(first);last.setUTCDate(first.getUTCDate()+6);start=iso(first);end=iso(last);label='semana';}
  if(mode==='MONTH'){start=`${ref.slice(0,7)}-01`;const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0));end=iso(last);label='mes';}
  if(mode==='TERM'){
    const periods=(p.daily?.settings?.reportingPeriods||[]).filter(row=>row.active!==false&&row.kind==='EVALUATION'&&validDate(row.fromDate)&&validDate(row.toDate));
    const selected=periods.find(row=>ref>=row.fromDate&&ref<=row.toDate);
    if(!selected)throw new Error('No hay una evaluación configurada que contenga la fecha de referencia. Configura fechas explícitas antes de usar este informe.');
    start=selected.fromDate;end=selected.toDate;label=selected.label;
  }
  if(mode==='COURSE'){
    const periods=(p.daily?.settings?.reportingPeriods||[]).filter(row=>row.active!==false&&validDate(row.fromDate)&&validDate(row.toDate));
    const explicit=periods.find(row=>row.kind==='COURSE');
    if(explicit){start=explicit.fromDate;end=explicit.toDate;label=explicit.label;}
    else if(periods.length){start=[...periods].sort((a,b)=>a.fromDate.localeCompare(b.fromDate))[0].fromDate;end=[...periods].sort((a,b)=>b.toDate.localeCompare(a.toDate))[0].toDate;label='curso según periodos configurados';}
    else{const match=String(p.meta?.academicYear||'').match(/(\d{4})\D+(\d{4})/),year=match?Number(match[1]):(d.getUTCMonth()>=8?d.getUTCFullYear():d.getUTCFullYear()-1);start=`${year}-09-01`;end=`${year+1}-08-31`;label='curso académico estimado; periodos pendientes de configurar';}
  }
  if(mode==='GLOBAL'){start='';end='';label='histórico global';}
  if(mode==='CUSTOM'){if(start&&!validDate(start))throw new Error('La fecha inicial no es válida.');if(end&&!validDate(end))throw new Error('La fecha final no es válida.');label='periodo personalizado';}
  if(start&&end&&end<start)throw new Error('La fecha final no puede ser anterior a la inicial.');return{scope:mode,fromDate:start,toDate:end,label};
}
function inBounds(date,bounds){if(!date)return false;return(!bounds.fromDate||date>=bounds.fromDate)&&(!bounds.toDate||date<=bounds.toDate);}
function periodsOverlap(fromDate,toDate,start,end){return rangesOverlap(fromDate||'0000-01-01',toDate||'9999-12-31',start,end);}
function recoverySourceDate(p,row){const coverage=p.daily.coverages.find(c=>c.id===row.coverageId),absence=p.daily.absences.find(a=>a.id===coverage?.absenceId),incident=p.daily.incidents.find(i=>i.id===row.incidentId);return incident?.date||absence?.date||'';}
function inferDayId(p,date){const jsDay=new Date(`${date}T12:00:00Z`).getUTCDay(),map={1:'MON',2:'TUE',3:'WED',4:'THU',5:'FRI',6:'SAT',0:'SUN'};const preferred=map[jsDay];return p.calendar.days.some(d=>d.id===preferred)?preferred:'';}
function publicAbsence(row){return{id:row.id,date:row.date,dayId:row.dayId,slotIds:deepClone(row.slotIds||[]),teacherId:row.teacherId,status:row.status,operationalNote:row.operationalNote||'',affectedAssignmentIds:deepClone(row.affectedAssignmentIds||[])};}
function publicCoverage(row){return{id:row.id,absenceId:row.absenceId,assignmentId:row.assignmentId,activityId:row.activityId,dayId:row.dayId,slotId:row.slotId,status:row.status,coverTeacherId:row.coverTeacherId||'',decisionReason:row.decisionReason||'',communication:deepClone(row.communication||null),completedAt:row.completedAt||'',reconciliationState:row.reconciliationState||'CURRENT',obsoleteAt:row.obsoleteAt||'',obsoleteReason:row.obsoleteReason||''};}
function publicGuard(row){return{id:row.id,coverageId:row.coverageId||'',teacherId:row.teacherId,date:row.date,dayId:row.dayId,slotId:row.slotId,activityId:row.activityId||'',sourceType:row.sourceType,status:row.status,durationMinutes:row.durationMinutes,weight:row.weight,operationalNote:row.operationalNote||''};}
function publicIncident(row){return{id:row.id,absenceId:row.absenceId||'',coverageId:row.coverageId||'',assignmentId:row.assignmentId,activityId:row.activityId,date:row.date,dayId:row.dayId,slotId:row.slotId,type:row.type,status:row.status,destination:deepClone(row.destination||null),operationalNote:row.operationalNote||'',recoveryId:row.recoveryId||''};}
function publicRecovery(row){return{id:row.id,coverageId:row.coverageId||'',incidentId:row.incidentId||'',activityId:row.activityId||'',status:row.status,plannedDate:row.plannedDate||'',publicNote:row.publicNote||'',completedAt:row.completedAt||'',reconciliationState:row.reconciliationState||'CURRENT',obsoleteAt:row.obsoleteAt||'',obsoleteReason:row.obsoleteReason||''};}
function publicSubstitution(row){return{id:row.id,absentTeacherId:row.absentTeacherId,substituteTeacherId:row.substituteTeacherId,startDate:row.startDate,endDate:row.endDate||'',scopeActivityIds:deepClone(row.scopeActivityIds||[]),operationalNote:row.operationalNote||'',status:row.status};}
