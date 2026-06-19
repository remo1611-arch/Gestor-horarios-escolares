import {
  normalizeProject, deepClone, computeMetrics, validateProject, createRevision,
  appendAudit, structuralFingerprint, uid, nowIso, verifyHistoricalEntry, nameOf, compactEditCommands,
} from './core.mjs';
import { reconcileConfirmedAbsenceCoveragesInPlace } from './daily.mjs';
import { checkMove, listMoveDestinations, compareScenarios } from './generator.mjs';
import { previewSelectionToCell } from './manual_editor.mjs';
import { semanticizeMoveReason, semanticizePreference, semanticizeClosureCheck, semanticizeIssues } from './semantic_engine.mjs';
import { validateScheduleIndependently } from './product_independent_validator.mjs';
import { analyzeMultidimensionalQuality, compareMultidimensionalQuality, publicQualitySummary } from './product_multidimensional_quality.mjs';

export const PRODUCT_REVIEW_CONTRACT_VERSION = 'product-review-contract-1.0';

function unique(values){return [...new Set((values||[]).map(String).filter(Boolean))];}
function classifyReason(message='',code=''){return semanticizeMoveReason({code,message});}
function metricImpact(before,after){
  return{
    placed:after.placed-before.placed,
    pending:after.pending-before.pending,
    gaps:after.gaps-before.gaps,
    completionPct:after.completionPct-before.completionPct,
  };
}
function impactText(impact){
  const rows=[];
  if(impact.pending<0)rows.push(`reduce ${Math.abs(impact.pending)} sesión(es) pendiente(s)`);
  if(impact.pending>0)rows.push(`añade ${impact.pending} sesión(es) pendiente(s)`);
  if(impact.gaps<0)rows.push(`reduce ${Math.abs(impact.gaps)} hueco(s) docente(s)`);
  if(impact.gaps>0)rows.push(`añade ${impact.gaps} hueco(s) docente(s)`);
  if(!rows.length)rows.push('mantiene los indicadores descriptivos de cobertura y huecos');
  return rows.join(' y ');
}
function movedAssignments(project,moves){
  const map=new Map(moves.map(row=>[row.assignmentId,row.to]));
  return project.assignments.map(row=>map.has(row.id)?{...row,...map.get(row.id),source:'MANUAL'}:row);
}
function contextFor(project,assignment){
  const activity=project.activities.find(row=>row.id===assignment?.activityId);
  return{
    assignmentId:assignment?.id||'',
    activityId:activity?.id||'',
    activityName:activity?.name||'Actividad',
    teachers:(activity?.teacherIds||[]).map(id=>nameOf(project.teachers,id)).filter(Boolean),
    groups:(activity?.groupIds||[]).map(id=>nameOf(project.groups,id)).filter(Boolean),
  };
}

export function explainSingleDestination(input,assignmentId,dayId,slotId,spaceId=''){
  const project=normalizeProject(input);
  const assignment=project.assignments.find(row=>row.id===assignmentId);
  if(!assignment)return{ok:false,contractVersion:PRODUCT_REVIEW_CONTRACT_VERSION,summary:'No se encontró la sesión.',blocks:[{...classifyReason('No se encontró la sesión.'),message:'No se encontró la sesión.'}],preferences:[],impact:null};
  const context=contextFor(project,assignment);
  if(assignment.dayId===dayId&&assignment.slotId===slotId&&String(assignment.spaceId||'')===String(spaceId||'')){
    const message='La sesión ya está en ese destino.';
    return{ok:false,contractVersion:PRODUCT_REVIEW_CONTRACT_VERSION,context,destination:{dayId,slotId,spaceId},summary:`No puede colocarse aquí: ${message}`,blocks:[{...classifyReason(message),message}],preferences:[],impact:null};
  }
  const check=checkMove(project,assignmentId,dayId,slotId,spaceId);
  if(!check.ok){
    const blocks=unique(check.reasons).map(message=>({...classifyReason(message),message}));
    return{ok:false,contractVersion:PRODUCT_REVIEW_CONTRACT_VERSION,context,destination:{dayId,slotId,spaceId},summary:`No puede colocarse aquí: ${blocks.map(x=>x.message).join(' ')}`,blocks,preferences:[],impact:null};
  }
  const guide=listMoveDestinations(project,assignmentId);
  const candidate=guide.allowed.find(row=>row.dayId===dayId&&row.slotId===slotId&&String(row.spaceId||'')===String(spaceId||''));
  const before=computeMetrics(project);
  const after=computeMetrics(project,movedAssignments(project,[{assignmentId,to:{dayId,slotId,spaceId}}]));
  const impact=metricImpact(before,after);
  const preferences=unique(candidate?.reasons||[]);
  const semanticPreferences=preferences.map(message=>semanticizePreference(message,{entityId:assignmentId}));
  return{ok:true,contractVersion:PRODUCT_REVIEW_CONTRACT_VERSION,context,destination:{dayId,slotId,spaceId},score:Number(candidate?.score||0),summary:`Puede colocarse aquí; ${impactText(impact)}.`,blocks:[],preferences,semanticPreferences,impact};
}

export function explainSelectionDestination(input,assignmentIds,anchorAssignmentId,targetDayId,targetSlotId){
  const project=normalizeProject(input);
  const ids=unique(assignmentIds);
  const preview=previewSelectionToCell(project,ids,anchorAssignmentId,targetDayId,targetSlotId);
  if(!preview.ok){
    const blocks=unique(preview.reasons).map(message=>({...classifyReason(message),message}));
    return{ok:false,contractVersion:PRODUCT_REVIEW_CONTRACT_VERSION,count:ids.length,summary:`No puede aplicarse el movimiento conjunto: ${blocks.map(x=>x.message).join(' ')}`,blocks,preferences:[],impact:null,preview};
  }
  const before=computeMetrics(project);
  const after=computeMetrics(project,movedAssignments(project,preview.moves));
  const impact=metricImpact(before,after);
  return{ok:true,contractVersion:PRODUCT_REVIEW_CONTRACT_VERSION,count:ids.length,summary:`El movimiento conjunto es válido y ${impactText(impact)}.`,blocks:[],preferences:[],impact,preview};
}

export function professionalDestinationGuide(input,assignmentId,{limit=30}={}){
  const project=normalizeProject(input);
  const assignment=project.assignments.find(row=>row.id===assignmentId);
  if(!assignment)throw new Error('No se encontró la sesión.');
  const result=listMoveDestinations(project,assignmentId);
  const allowed=result.allowed.slice(0,Math.max(1,Number(limit||30))).map(row=>{
    const explanation=explainSingleDestination(project,assignmentId,row.dayId,row.slotId,row.spaceId||'');
    return{...row,explanation};
  });
  const rejected=result.rejected.map(row=>({
    ...row,
    blocks:unique(row.reasons).map(message=>({...classifyReason(message),message})),
  }));
  const categoryMap=new Map();
  for(const row of rejected)for(const block of row.blocks){const current=categoryMap.get(block.code)||{code:block.code,label:block.label,count:0,examples:[]};current.count+=1;if(current.examples.length<3&&!current.examples.includes(block.message))current.examples.push(block.message);categoryMap.set(block.code,current);}
  return{contractVersion:PRODUCT_REVIEW_CONTRACT_VERSION,assignment:contextFor(project,assignment),allowed,availableTotal:result.allowed.length,rejected,total:result.total,rejectedSummary:[...categoryMap.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label))};
}

function scenarioProject(project,scenario){
  const state=scenario?.state&&typeof scenario.state==='object'?deepClone(scenario.state):{};
  return normalizeProject({...deepClone(project),...state,assignments:deepClone(state.assignments||scenario?.assignments||[])});
}
export function compareAlternativesForUser(input,aId,bId){
  const project=normalizeProject(input);
  const raw=compareScenarios(project,aId,bId);
  const a=project.scenarios.find(row=>row.id===aId),b=project.scenarios.find(row=>row.id===bId);
  const pa=scenarioProject(project,a),pb=scenarioProject(project,b);
  const qa=analyzeMultidimensionalQuality(pa,pa.assignments,{mode:'CANDIDATE',source:'SCENARIO_A',baselineAssignments:project.assignments});
  const qb=analyzeMultidimensionalQuality(pb,pb.assignments,{mode:'CANDIDATE',source:'SCENARIO_B',baselineAssignments:project.assignments});
  const comparison=compareMultidimensionalQuality(qa,qb);
  const recommendation=raw.contextChanged?'CONTEXT_CHANGED':comparison.dominance;
  const summary=raw.contextChanged
    ? 'Las alternativas no comparten exactamente el mismo contexto estructural; deben compararse con cautela.'
    : comparison.summary;
  const tradeoffs=comparison.results.filter(row=>row.better!=='EQUAL_OR_NOT_COMPARABLE');
  return{contractVersion:PRODUCT_REVIEW_CONTRACT_VERSION,...raw,a:{id:a?.id,name:a?.name,quality:publicQualitySummary(qa)},b:{id:b?.id,name:b?.name,quality:publicQualitySummary(qb)},recommendation,summary,tradeoffs,qualityComparison:comparison,note:'No se utiliza una puntuación agregada ni pesos ocultos.'};
}

export function professionalHistoryCatalog(input){
  const project=normalizeProject(input);
  const history=(project.history||[]).slice().reverse().map(row=>{const verification=verifyHistoricalEntry(row,'snapshot');return{id:row.id,kind:'REVISION',label:row.reason||`Revisión ${row.revisionNumber}`,createdAt:row.createdAt,revisionNumber:row.revisionNumber,sourceStatus:row.sourceStatus,restorable:verification.ok,integrity:verification.code,stateSha256:row.stateSha256||''};});
  const scenarios=(project.scenarios||[]).slice().reverse().map(row=>{const verification=verifyHistoricalEntry(row,'scenario');return{id:row.id,kind:'ALTERNATIVE',label:row.name||'Alternativa',createdAt:row.createdAt,revisionNumber:row.revisionNumber,sourceStatus:'DRAFT',restorable:verification.ok,integrity:verification.code,stateSha256:row.stateSha256||''};});
  return{contractVersion:PRODUCT_REVIEW_CONTRACT_VERSION,current:{revisionNumber:project.meta.revisionNumber,status:project.meta.status,fingerprint:structuralFingerprint(project)},history,scenarios,restorableCount:[...history,...scenarios].filter(row=>row.restorable).length};
}

export function reviewOfficialClosure(input){
  const project=normalizeProject(input);
  const validation=validateProject(project);
  const independentValidation=validateScheduleIndependently(project,{mode:'OFFICIAL',source:'OFFICIAL_CLOSURE'});
  const metrics=computeMetrics(project);
  const finalizationIssues=(validation.issues||[]).filter(row=>row.blocksFinalization);
  const checks=[
    {id:'INDEPENDENT_SEMANTIC_VALIDATION',label:'Validación semántica independiente',ok:independentValidation.canOfficialClose,detail:independentValidation.officialBlockers[0]?.message||'El horario supera el validador independiente P10M-2.'},
    {id:'VALIDATION_ERRORS',label:'Sin conflictos graves',ok:validation.errors.length===0,detail:validation.errors[0]?.message||'No se detectaron conflictos graves.'},
    {id:'FINALIZATION_RULES',label:'Datos y reglas preparados para cierre',ok:finalizationIssues.length===0,detail:finalizationIssues[0]?.message||'No hay datos provisionales ni reglas que bloqueen el cierre.'},
    {id:'NO_PENDING',label:'Todas las sesiones obligatorias colocadas',ok:metrics.pending===0,detail:metrics.pending?`${metrics.pending} sesión(es) pendientes.`:'Cobertura completa de las sesiones declaradas.'},
    {id:'NO_PENDING_PROPOSAL',label:'Sin propuestas pendientes',ok:!(project.proposals||[]).some(row=>row.status==='PENDING'),detail:(project.proposals||[]).some(row=>row.status==='PENDING')?'Existe una propuesta pendiente de aceptar o descartar.':'No hay propuestas pendientes.'},
    {id:'ASSIGNMENTS_PRESENT',label:'Horario con contenido',ok:metrics.placed>0,detail:metrics.placed?`${metrics.placed} sesiones colocadas.`:'El horario está vacío.'},
  ];
  const blockers=checks.filter(row=>!row.ok);
  const semanticChecks=checks.map(semanticizeClosureCheck);
  const semanticBlockers=semanticChecks.filter(row=>!row.ok);
  return{contractVersion:PRODUCT_REVIEW_CONTRACT_VERSION,canClose:validation.canFinalize&&independentValidation.canOfficialClose&&semanticBlockers.length===0,checks:semanticChecks,blockers:semanticBlockers,warnings:validation.warnings.map(row=>row.message),semanticWarnings:semanticizeIssues(validation.warnings),independentValidation,metrics,revisionNumber:project.meta.revisionNumber,status:project.meta.status};
}

export function finalizeOfficialVersion(input,{note='',responsible=''}={}){
  const project=normalizeProject(input);
  const review=reviewOfficialClosure(project);
  if(!review.canClose)throw new Error(`Cierre pendiente: ${review.blockers[0]?.detail||'la revisión todavía tiene bloqueos.'}`);
  const actor=String(responsible||project.meta.responsible||'Usuario').trim()||'Usuario';
  const cleanNote=String(note||'').trim();
  createRevision(project,'Antes del cierre como horario oficial',{actor});
  project.meta.status='FINAL';
  project.meta.productReviewContractVersion=PRODUCT_REVIEW_CONTRACT_VERSION;
  project.meta.officialClosure={
    id:uid('official_closure'),contractVersion:PRODUCT_REVIEW_CONTRACT_VERSION,closedAt:nowIso(),responsible:actor,
    note:cleanNote,revisionNumber:project.meta.revisionNumber,fingerprint:structuralFingerprint(project),
    metrics:{placed:review.metrics.placed,pending:review.metrics.pending,gaps:review.metrics.gaps,completionPct:review.metrics.completionPct},
  };
  appendAudit(project,'OFFICIAL_SCHEDULE_CLOSED',cleanNote||'Horario cerrado como versión oficial.',actor,{closureId:project.meta.officialClosure.id,revisionNumber:project.meta.revisionNumber});
  project.meta.structuralFingerprint=structuralFingerprint(project);
  return project;
}


function commandState(command, side, project) {
  const explicit = command?.[`${side}State`];
  if (explicit?.assignments && explicit?.locks) return deepClone(explicit);
  const legacyAssignments = command?.[side];
  if (Array.isArray(legacyAssignments)) return { assignments:deepClone(legacyAssignments), locks:deepClone(project.locks||[]) };
  throw new Error('La edición no contiene un estado recuperable.');
}
function reviewEditorState(project){return{assignments:deepClone(project.assignments||[]),locks:deepClone(project.locks||[])};}
function supersedeReviewRedo(project){for(const command of project.editCommands||[])if(command.status==='UNDONE'){command.status='SUPERSEDED';command.supersededAt=nowIso();}}
export function previewRemovedCommandRecovery(input, commandId) {
  const project=normalizeProject(input);
  const command=(project.editCommands||[]).find(row=>row.id===commandId&&row.type==='UNPLACE_ASSIGNMENTS');
  if(!command)return{ok:false,reasons:['No se encontró la retirada seleccionada.'],assignments:[],issues:[]};
  const beforeState=commandState(command,'before',project),afterState=commandState(command,'after',project);
  const afterIds=new Set((afterState.assignments||[]).map(row=>row.id)),currentIds=new Set((project.assignments||[]).map(row=>row.id));
  const removed=(beforeState.assignments||[]).filter(row=>!afterIds.has(row.id)&&!currentIds.has(row.id));
  if(!removed.length)return{ok:false,reasons:['Las sesiones retiradas ya están recuperadas o no están disponibles.'],assignments:[],issues:[]};
  const working=normalizeProject(project),accepted=[],issues=[];
  for(const assignment of removed){working.assignments.push(deepClone(assignment));const check=checkMove(working,assignment.id,assignment.dayId,assignment.slotId,assignment.spaceId||'');if(!check.ok){working.assignments=working.assignments.filter(row=>row.id!==assignment.id);issues.push({assignmentId:assignment.id,reasons:check.reasons||['La posición original ya no es compatible.']});}else accepted.push(deepClone(assignment));}
  return{ok:issues.length===0&&accepted.length>0,reasons:unique(issues.flatMap(row=>row.reasons)),assignments:accepted,issues,commandId,label:command.label||'Retirada de sesiones'};
}
export function recoverRemovedCommand(input, commandId) {
  const project=normalizeProject(input),preview=previewRemovedCommandRecovery(project,commandId);
  if(!preview.ok)throw new Error((preview.reasons||['No se pueden recuperar las sesiones.']).join(' '));
  const beforeState=reviewEditorState(project);createRevision(project,`Antes de recuperar ${preview.assignments.length} sesión(es) retiradas`);supersedeReviewRedo(project);
  project.assignments.push(...deepClone(preview.assignments).map(row=>({...row,source:'MANUAL_RECOVERY'})));
  const afterState=reviewEditorState(project);project.editCommands=Array.isArray(project.editCommands)?project.editCommands:[];
  project.editCommands.push({id:uid('editor_command'),contractVersion:'manual-editor-contract-1.0',type:'RECOVER_ASSIGNMENTS',label:`Recuperar ${preview.assignments.length} sesión(es)`,createdAt:nowIso(),status:'APPLIED',beforeState,afterState,details:{sourceCommandId:commandId,assignmentIds:preview.assignments.map(row=>row.id)}});
  compactEditCommands(project);
  reconcileConfirmedAbsenceCoveragesInPlace(project,{reason:'EDITOR_ASSIGNMENTS_RECOVERED'});appendAudit(project,'EDITOR_ASSIGNMENTS_RECOVERED',`${preview.assignments.length} sesión(es) recuperadas desde una retirada anterior.`,project.meta.responsible||'Usuario');project.meta.structuralFingerprint=structuralFingerprint(project);return project;
}
