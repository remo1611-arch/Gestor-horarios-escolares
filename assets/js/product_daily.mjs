import { normalizeProject, nameOf, deepClone } from './core.mjs';
import {
  registerAbsence, confirmAbsence, recommendCoverage, assignCoverage, communicateCoverage,
  updateCoverageStatus, reopenCoverage, markCoverageUncovered, cancelAbsence, finishAbsence,
  createRecovery, updateRecovery, createTemporarySubstitution, updateTemporarySubstitution,
  createActivityImpact, updateActivityImpact, dailySummary, dailyOperationalReport, dailyPeriodReport,
  coverageBalanceReport,
} from './daily.mjs';
import { semanticizeDailyReason, semanticizeDailyEvent } from './semantic_engine.mjs';

export const PRODUCT_DAILY_CONTRACT_VERSION='product-daily-operations-1.0';
export const PRODUCT_DAILY_POLICY_VERSION='product-daily-policy-1.0';
export const PRODUCT_DAILY_TABS=Object.freeze([
  {id:'today',label:'Hoy'},
  {id:'absences',label:'Ausencias'},
  {id:'coverages',label:'Coberturas'},
  {id:'followup',label:'Seguimiento'},
  {id:'reports',label:'Informes'},
]);

const OPEN_COVERAGE_STATES=new Set(['PENDING','PROPOSED','ASSIGNED','COMMUNICATED']);
const DECISION_COVERAGE_STATES=new Set(['ASSIGNED','COMMUNICATED','COMPLETED']);
const ACTIVE_ABSENCE_STATES=new Set(['DRAFT','CONFIRMED']);
const clone=value=>value==null?value:deepClone(value);

export function dailyStatusLabel(value=''){
  return ({
    DRAFT:'Borrador',CONFIRMED:'Confirmada',CANCELLED:'Cancelada',FINISHED:'Finalizada',
    PLANNED:'Planificada',ACTIVE:'Activa',PENDING:'Pendiente',PROPOSED:'Propuesta',ASSIGNED:'Asignada',
    COMMUNICATED:'Comunicada',COMPLETED:'Realizada',UNCOVERED:'Sin cubrir',NOT_APPLICABLE:'No procede',
    SCHEDULED:'Programada',CANCELLED_WITH_REASON:'Cancelada con motivo',OPEN:'Abierta',RESOLVED:'Resuelta',
    CURRENT:'Vigente',OBSOLETE:'Obsoleta',STALE:'Obsoleta',CANCELLED_BY_RECONCILIATION:'Obsoleta',
  })[value]||String(value||'');
}

function entityLabel(project,type,id){
  if(type==='teacher')return nameOf(project.teachers,id);
  if(type==='activity')return nameOf(project.activities,id);
  if(type==='day')return nameOf(project.calendar.days,id);
  if(type==='slot')return nameOf(project.calendar.slots,id);
  return id||'';
}

function coverageForAssignment(project,absenceId,assignmentId){
  return project.daily.coverages.find(row=>row.absenceId===absenceId&&row.assignmentId===assignmentId&&row.reconciliationState!=='OBSOLETE')
    ||project.daily.coverages.find(row=>row.absenceId===absenceId&&row.assignmentId===assignmentId)
    ||null;
}

export function affectedServicesForAbsence(input,absenceId){
  const project=normalizeProject(input),absence=project.daily.absences.find(row=>row.id===absenceId);
  if(!absence)return[];
  return (absence.affectedAssignmentIds||[]).map(assignmentId=>{
    const assignment=project.assignments.find(row=>row.id===assignmentId);
    const coverage=coverageForAssignment(project,absence.id,assignmentId);
    return {
      assignmentId,
      activityId:assignment?.activityId||coverage?.activityId||'',
      activityName:entityLabel(project,'activity',assignment?.activityId||coverage?.activityId)||'Actividad no disponible',
      dayId:assignment?.dayId||coverage?.dayId||absence.dayId,
      dayLabel:entityLabel(project,'day',assignment?.dayId||coverage?.dayId||absence.dayId),
      slotId:assignment?.slotId||coverage?.slotId||'',
      slotLabel:entityLabel(project,'slot',assignment?.slotId||coverage?.slotId||''),
      coverageId:coverage?.id||'',coverageStatus:coverage?.status||'',reconciliationState:coverage?.reconciliationState||'CURRENT',
    };
  });
}

export function coverageCandidateGuide(input,coverageId){
  const project=normalizeProject(input),raw=recommendCoverage(project,coverageId);
  const mapCandidate=(candidate,index,eligible)=>({
    teacherId:candidate.teacherId,
    teacherName:nameOf(project.teachers,candidate.teacherId),
    eligible,
    priority:eligible?(candidate.tiedForBest?'RECOMMENDED':index<3?'SUITABLE':'ALTERNATIVE'):'EXCLUDED',
    priorityLabel:eligible?(candidate.tiedForBest?'Recomendada':index<3?'Adecuada':'Alternativa'):'No compatible',
    requiresJustification:eligible&&!candidate.tiedForBest,
    reasons:(candidate.reasons||[]).map(message=>semanticizeDailyReason(message,{eligible,teacherId:candidate.teacherId})),
    balance:clone(candidate.balance||{}),usesDc:Boolean(candidate.usesDc),releasedAssignmentId:candidate.releasedAssignmentId||'',
    designatedTemporarySubstitution:Boolean(candidate.designatedTemporarySubstitution),technicalScore:candidate.score,
  });
  return {
    contractVersion:PRODUCT_DAILY_CONTRACT_VERSION,
    coverage:clone(raw.coverage),absence:clone(raw.absence),balance:clone(raw.balance),
    eligible:raw.eligible.map((row,index)=>mapCandidate(row,index,true)),
    excluded:raw.excluded.map((row,index)=>mapCandidate(row,index,false)),
    decisionRule:semanticizeDailyEvent({ruleId:'daily.coverage_decision',message:'La jefatura decide entre las candidaturas compatibles y justifica cualquier excepción respecto de las opciones recomendadas.',entityType:'coverage',entityId:coverageId}),
  };
}

export function reconciliationSummary(input){
  const project=normalizeProject(input),coverages=project.daily.coverages||[],recoveries=project.daily.recoveries||[];
  const obsolete=coverages.filter(row=>row.reconciliationState==='OBSOLETE'||row.obsoleteAt);
  const current=coverages.filter(row=>!obsolete.includes(row));
  const decisionsPreserved=obsolete.filter(row=>row.coverTeacherId||row.decision||row.communication||['ASSIGNED','COMMUNICATED','COMPLETED','UNCOVERED'].includes(row.status));
  return {
    contractVersion:PRODUCT_DAILY_CONTRACT_VERSION,
    current:current.length,obsolete:obsolete.length,decisionsPreserved:decisionsPreserved.length,
    obsoleteCoverages:obsolete.slice().sort((a,b)=>String(b.obsoleteAt||b.updatedAt||'').localeCompare(String(a.obsoleteAt||a.updatedAt||''))).map(row=>({
      ...clone(row),activityName:nameOf(project.activities,row.activityId),teacherName:nameOf(project.teachers,row.coverTeacherId),
      statusLabel:dailyStatusLabel(row.status),reason:row.obsoleteReason||'El horario cambió y esta necesidad ya no corresponde al estado vigente.',
    })),
    obsoleteRecoveries:recoveries.filter(row=>row.reconciliationState==='OBSOLETE'||row.obsoleteAt).map(clone),
    semantic:semanticizeDailyEvent({ruleId:'daily.reconciliation',message:obsolete.length?`${obsolete.length} necesidad(es) anteriores se conservan como obsoletas después de cambios del horario.`:'Las necesidades de cobertura coinciden con el horario vigente.',severity:obsolete.length?'WARNING':'INFO'}),
  };
}

export function dailyProductWorkspace(input,{date='',dayId=''}={}){
  const project=normalizeProject(input),summary=dailySummary(project,dayId,date),reconciliation=reconciliationSummary(project);
  const activeAbsences=project.daily.absences.filter(row=>ACTIVE_ABSENCE_STATES.has(row.status)&&(!date||row.date===date)&&(!dayId||row.dayId===dayId));
  const currentCoverages=project.daily.coverages.filter(row=>row.reconciliationState!=='OBSOLETE'&&!row.obsoleteAt);
  const open=currentCoverages.filter(row=>OPEN_COVERAGE_STATES.has(row.status));
  const pending=currentCoverages.filter(row=>['PENDING','PROPOSED'].includes(row.status));
  const assigned=currentCoverages.filter(row=>['ASSIGNED','COMMUNICATED'].includes(row.status));
  const completed=currentCoverages.filter(row=>row.status==='COMPLETED');
  const uncovered=currentCoverages.filter(row=>row.status==='UNCOVERED');
  const actionQueue=[
    ...pending.map(row=>({kind:'COVERAGE_DECISION',priority:'HIGH',coverageId:row.id,label:`Decidir la cobertura de ${nameOf(project.activities,row.activityId)}`,detail:`${entityLabel(project,'day',row.dayId)} · ${entityLabel(project,'slot',row.slotId)}`})),
    ...assigned.filter(row=>row.status==='ASSIGNED').map(row=>({kind:'COMMUNICATION',priority:'MEDIUM',coverageId:row.id,label:`Comunicar la cobertura de ${nameOf(project.activities,row.activityId)}`,detail:nameOf(project.teachers,row.coverTeacherId)})),
    ...(project.daily.recoveries||[]).filter(row=>['PENDING','SCHEDULED'].includes(row.status)&&row.reconciliationState!=='OBSOLETE').map(row=>({kind:'RECOVERY',priority:'MEDIUM',recoveryId:row.id,label:`Resolver la recuperación de ${nameOf(project.activities,row.activityId)}`,detail:row.plannedDate||'Sin fecha prevista'})),
  ];
  return {
    contractVersion:PRODUCT_DAILY_CONTRACT_VERSION,policyVersion:PRODUCT_DAILY_POLICY_VERSION,date,dayId,
    summary:{...summary,activeAbsences:activeAbsences.length,pendingCoverages:pending.length,assignedOpen:assigned.length,completed:completed.length,uncovered:uncovered.length},
    activeAbsences:activeAbsences.map(row=>({...clone(row),teacherName:nameOf(project.teachers,row.teacherId),services:affectedServicesForAbsence(project,row.id)})),
    coverages:{open,pending,assigned,completed,uncovered,current:currentCoverages},
    actionQueue,reconciliation,
    workflow:[
      {id:'REGISTER_ABSENCE',label:'Registrar la ausencia',state:activeAbsences.length?'DONE':'AVAILABLE'},
      {id:'REVIEW_SERVICES',label:'Revisar los servicios afectados',state:activeAbsences.some(row=>row.affectedAssignmentIds?.length)?'DONE':activeAbsences.length?'ATTENTION':'WAITING'},
      {id:'ASSIGN_COVERAGES',label:'Asignar coberturas',state:pending.length?'ATTENTION':activeAbsences.length?'DONE':'WAITING'},
      {id:'COMMUNICATE',label:'Registrar la comunicación',state:assigned.some(row=>row.status==='ASSIGNED')?'ATTENTION':assigned.length?'DONE':'WAITING'},
      {id:'COMPLETE',label:'Marcar el servicio realizado',state:assigned.length?'ATTENTION':completed.length?'DONE':'WAITING'},
    ],
  };
}

export function registerProductAbsence(input,data={}){return registerAbsence(input,data);}
export function confirmProductAbsence(input,id){return confirmAbsence(input,id);}
export function cancelProductAbsence(input,id,reason){return cancelAbsence(input,id,reason);}
export function finishProductAbsence(input,id){return finishAbsence(input,id);}
export function assignProductCoverage(input,coverageId,teacherId,options={}){return assignCoverage(input,coverageId,teacherId,options);}
export function communicateProductCoverage(input,coverageId,options={}){return communicateCoverage(input,coverageId,options);}
export function completeProductCoverage(input,coverageId,note='Servicio realizado'){return updateCoverageStatus(input,coverageId,'COMPLETED',note);}
export function reopenProductCoverage(input,coverageId,reason){return reopenCoverage(input,coverageId,reason);}
export function markProductCoverageUncovered(input,coverageId,reason){return markCoverageUncovered(input,coverageId,reason);}
export function recordProductImpact(input,data={}){return createActivityImpact(input,data);}
export function resolveProductImpact(input,id,changes={status:'RESOLVED'}){return updateActivityImpact(input,id,changes);}
export function createProductRecovery(input,data={}){return createRecovery(input,data);}
export function updateProductRecovery(input,id,changes={}){return updateRecovery(input,id,changes);}
export function createProductTemporarySubstitution(input,data={}){return createTemporarySubstitution(input,data);}
export function updateProductTemporarySubstitution(input,id,changes={}){return updateTemporarySubstitution(input,id,changes);}
export function productOperationalReport(input,options={}){return dailyOperationalReport(input,options);}
export function productPeriodReport(input,options={}){return dailyPeriodReport(input,options);}
export function productCoverageBalance(input,options={}){return coverageBalanceReport(input,options);}
