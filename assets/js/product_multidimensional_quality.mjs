import { activeWeekIds, siteTravelMinutes, requiredOccurrencesForActivity } from './educational_domain_4.mjs';
import { validateScheduleIndependently } from './product_independent_validator.mjs';

export const PRODUCT_MULTIDIMENSIONAL_QUALITY_CONTRACT_VERSION='product-multidimensional-quality-1.0';
export const QUALITY_DIMENSION_IDS=Object.freeze([
  'COMPLETENESS','HARD_CONSISTENCY','PREFERENCE_FIT','TEACHER_GAPS','DAILY_BALANCE',
  'WORKLOAD_FIT','EQUITY','STABILITY','SPACE_FIT','TRAVEL','EDGE_SLOTS',
]);
export const QUALITY_STATUSES=Object.freeze(['GOOD','ATTENTION','CRITICAL','NOT_APPLICABLE']);

const arr=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const round=(v,d=2)=>{const p=10**d;return Math.round((num(v))*p)/p;};
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const max=values=>values.length?Math.max(...values):0;
const min=values=>values.length?Math.min(...values):0;
const unique=values=>[...new Set(values)];
const mapBy=rows=>new Map(arr(rows).map(row=>[text(row?.id),row]));

function classSlots(project){return arr(project?.calendar?.slots).filter(row=>row?.kind==='CLASS');}
function assignmentPosition(row){return `${text(row?.weekId)||'W1'}|${text(row?.activityId)}|${text(row?.dayId)}|${text(row?.slotId)}|${text(row?.spaceId)}`;}
function dimension(id,label,status,primary,metrics,explanation,actions=[],evidence=[]){return{id,label,status,primary,metrics,explanation,actions,evidence};}
function statusFrom(value,{good=0,attention=1,critical=Infinity,inverse=false}={}){
  if(inverse){if(value>=good)return'GOOD';if(value>=attention)return'ATTENTION';return'CRITICAL';}
  if(value<=good)return'GOOD';if(value<critical)return'ATTENTION';return'CRITICAL';
}
function activeSoftPreferences(project){return [...arr(project?.organization?.preferences),...arr(project?.constraints)].filter(row=>row&&row.active!==false&&(row.level==='SOFT'||row.severity==='SOFT'));}
function latestAcceptedBaseline(project){
  const accepted=arr(project?.proposals).filter(row=>['ACCEPTED','PARTIALLY_ACCEPTED'].includes(row?.status)).sort((a,b)=>text(a?.acceptedAt).localeCompare(text(b?.acceptedAt)));
  return arr(accepted.at(-1)?.assignments);
}
function occupiedSlots(project,activity,assignment){
  const slots=arr(project?.calendar?.slots);const start=slots.findIndex(row=>text(row.id)===text(assignment.slotId));
  if(start<0)return[];return slots.slice(start,start+Math.max(1,Math.trunc(num(activity?.durationSlots,1)))).map(row=>row.id);
}
function teacherAssignmentRows(project,assignments){
  const activities=mapBy(project.activities);const rows=[];
  for(const assignment of arr(assignments)){const activity=activities.get(text(assignment.activityId));if(!activity)continue;for(const teacherId of arr(activity.teacherIds))rows.push({teacherId:text(teacherId),assignment,activity});}
  return rows;
}
function preferredSpaceState(activity,assignment){
  const selected=text(assignment.spaceId);const preferred=arr(activity?.preferredSpaceIds).map(text);const alternatives=arr(activity?.alternativeSpaceIds).map(text);
  if(preferred.length)return preferred.includes(selected)?'PREFERRED':alternatives.includes(selected)?'ALTERNATIVE':'OTHER';
  if(text(activity?.spaceId))return text(activity.spaceId)===selected?'PREFERRED':'OTHER';
  return selected?'NEUTRAL':'NONE';
}
function declaredEdgePreference(project){
  return activeSoftPreferences(project).some(row=>['AVOID_LAST_SLOT','AVOID_FIRST_SLOT','AVOID_EDGE_SLOTS'].includes(text(row.type)));
}
function compareNumbers(a,b,direction='MINIMIZE',epsilon=1e-9){if(Math.abs(a-b)<=epsilon)return 0;return direction==='MAXIMIZE'?(a>b?1:-1):(a<b?1:-1);}

export function analyzeMultidimensionalQuality(project,assignments=project?.assignments||[],options={}){
  const rows=arr(assignments);const activities=mapBy(project?.activities);const teachers=arr(project?.teachers);const spaces=mapBy(project?.spaces);const weeks=activeWeekIds(project?.domain||{});const effectiveWeeks=weeks.length?weeks:['W1'];
  const independentProject={...project,assignments:rows};
  const independent=options.independentReport||validateScheduleIndependently(independentProject,{mode:options.mode||'CANDIDATE',source:options.source||'UNKNOWN',generatedAt:options.generatedAt});
  const required=arr(project?.activities).reduce((sum,a)=>sum+requiredOccurrencesForActivity(a,project?.domain||{}),0);const placed=rows.length;const pending=Math.max(0,required-placed);const completionPct=required?round(placed/required*100,2):100;
  const dimensions=[];
  dimensions.push(dimension('COMPLETENESS','Completitud',pending===0?'GOOD':completionPct>=95?'ATTENTION':'CRITICAL',{value:completionPct,unit:'%'},{required,placed,pending,completionPct},pending?`${pending} sesión(es) siguen pendientes.`:'Todas las sesiones declaradas están colocadas.',pending?['Revisar las actividades pendientes y sus restricciones.']:[],['No equivale a calidad pedagógica.']));

  const hardErrors=independent.blockers?.length||0,officialBlockers=independent.officialBlockers?.length||0;
  dimensions.push(dimension('HARD_CONSISTENCY','Consistencia obligatoria',hardErrors?'CRITICAL':officialBlockers?'ATTENTION':'GOOD',{value:hardErrors,unit:'conflictos graves'},{hardErrors,officialBlockers,checksFailed:arr(independent.checks).filter(x=>x.status==='FAIL').length},hardErrors?'El horario contiene incumplimientos obligatorios.':officialBlockers?'No hay conflicto grave, pero quedan requisitos para cierre oficial.':'No se detectaron incumplimientos obligatorios.',hardErrors||officialBlockers?['Resolver primero los bloqueos del validador independiente.']:[],arr(independent.issues).slice(0,8).map(x=>x.message)));

  const preferences=activeSoftPreferences(project);const preferenceIssues=arr(independent.issues).filter(row=>row.evaluator==='PREFERENCES');const preferenceViolations=preferenceIssues.length;
  const preferenceStatus=!preferences.length?'NOT_APPLICABLE':preferenceViolations===0?'GOOD':preferenceViolations<=Math.max(2,Math.ceil(preferences.length*.25))?'ATTENTION':'CRITICAL';
  dimensions.push(dimension('PREFERENCE_FIT','Preferencias organizativas',preferenceStatus,{value:preferenceViolations,unit:'incumplimientos'},{declared:preferences.length,violations:preferenceViolations},!preferences.length?'No hay preferencias blandas activas.':preferenceViolations?`${preferenceViolations} preferencia(s) no se cumplen.`:'Las preferencias activas evaluadas se cumplen.',preferenceViolations?['Comparar destinos alternativos sin comprometer reglas obligatorias.']:[],preferenceIssues.slice(0,8).map(x=>x.message)));

  const teacherRows=teacherAssignmentRows(project,rows);const slotOrder=new Map(classSlots(project).map((slot,index)=>[slot.id,index]));const gapRows=[];const dailyLoads=[];const edgeByTeacher=[];
  for(const teacher of teachers){let totalGaps=0,edges=0;const perDay=[];
    for(const weekId of effectiveWeeks)for(const day of arr(project?.calendar?.days)){
      const relevant=teacherRows.filter(x=>x.teacherId===text(teacher.id)&&(text(x.assignment.weekId)||effectiveWeeks[0])===weekId&&text(x.assignment.dayId)===text(day.id));
      const indexes=unique(relevant.flatMap(x=>occupiedSlots(project,x.activity,x.assignment)).map(id=>slotOrder.get(id)).filter(Number.isInteger)).sort((a,b)=>a-b);
      const gaps=indexes.length>1?Math.max(0,indexes.at(-1)-indexes[0]+1-indexes.length):0;totalGaps+=gaps;perDay.push(indexes.length);edges+=indexes.filter(i=>i===0||i===classSlots(project).length-1).length;
    }
    gapRows.push({teacherId:teacher.id,gaps:totalGaps});dailyLoads.push({teacherId:teacher.id,loads:perDay,total:perDay.reduce((a,b)=>a+b,0),spread:perDay.length?max(perDay)-min(perDay):0});edgeByTeacher.push({teacherId:teacher.id,edgeAssignments:edges});
  }
  const totalGaps=gapRows.reduce((s,x)=>s+x.gaps,0),teachersWithGaps=gapRows.filter(x=>x.gaps>0).length,maxTeacherGaps=max(gapRows.map(x=>x.gaps));
  dimensions.push(dimension('TEACHER_GAPS','Huecos del profesorado',statusFrom(totalGaps,{good:0,critical:Math.max(4,Math.ceil(teachers.length*.5))}),{value:totalGaps,unit:'huecos'},{totalGaps,teachersWithGaps,maxTeacherGaps,byTeacher:gapRows},totalGaps?`${teachersWithGaps} docente(s) acumulan ${totalGaps} hueco(s).`:'No se detectan huecos internos en las jornadas docentes.',totalGaps?['Revisar los docentes con mayor número de huecos.']:[]));

  const maxDailySpread=max(dailyLoads.map(x=>x.spread)),meanDailySpread=round(mean(dailyLoads.map(x=>x.spread)),2),teachersImbalanced=dailyLoads.filter(x=>x.spread>=3).length;
  dimensions.push(dimension('DAILY_BALANCE','Equilibrio diario',maxDailySpread<=2?'GOOD':maxDailySpread<=4?'ATTENTION':'CRITICAL',{value:maxDailySpread,unit:'sesiones de diferencia'},{maxDailySpread,meanDailySpread,teachersImbalanced,byTeacher:dailyLoads},maxDailySpread?`La mayor diferencia diaria de un docente es de ${maxDailySpread} sesiones.`:'No hay carga diaria que comparar.',teachersImbalanced?['Revisar concentraciones de carga de tres o más sesiones entre jornadas.']:[]));

  const loadRows=[];for(const teacher of teachers){for(const weekId of effectiveWeeks){const actual=teacherRows.filter(x=>x.teacherId===text(teacher.id)&&(text(x.assignment.weekId)||effectiveWeeks[0])===weekId).length;const target=num(teacher.weeklyTarget,0);loadRows.push({teacherId:teacher.id,weekId,actual,target,difference:actual-target,absoluteDeviation:target?Math.abs(actual-target):0});}}
  const targetRows=loadRows.filter(x=>x.target>0),totalAbsDeviation=targetRows.reduce((s,x)=>s+x.absoluteDeviation,0),maxAbsDeviation=max(targetRows.map(x=>x.absoluteDeviation)),mismatched=targetRows.filter(x=>x.absoluteDeviation>0).length;
  dimensions.push(dimension('WORKLOAD_FIT','Ajuste de carga lectiva',!targetRows.length?'NOT_APPLICABLE':maxAbsDeviation<=1?'GOOD':maxAbsDeviation<=3?'ATTENTION':'CRITICAL',{value:totalAbsDeviation,unit:'sesiones de desviación'},{totalAbsDeviation,maxAbsDeviation,mismatched,byTeacherWeek:loadRows},!targetRows.length?'No se han declarado objetivos semanales comparables.':mismatched?`${mismatched} carga(s) semanal(es) se apartan del objetivo declarado.`:'Las cargas colocadas coinciden con los objetivos declarados.',mismatched?['Comprobar objetivos, reducciones y actividades contabilizadas.']:[]));

  const gapValues=gapRows.map(x=>x.gaps),loadDeviationValues=targetRows.map(x=>x.absoluteDeviation),edgeValues=edgeByTeacher.map(x=>x.edgeAssignments);const gapRange=max(gapValues)-min(gapValues),loadDeviationRange=max(loadDeviationValues)-min(loadDeviationValues),edgeRange=max(edgeValues)-min(edgeValues);
  const equitySeverity=Math.max(gapRange,loadDeviationRange,declaredEdgePreference(project)?edgeRange:0);
  dimensions.push(dimension('EQUITY','Equidad distributiva',equitySeverity<=1?'GOOD':equitySeverity<=3?'ATTENTION':'CRITICAL',{value:equitySeverity,unit:'rango máximo'},{gapRange,loadDeviationRange,edgeRange,edgePreferenceActive:declaredEdgePreference(project)},`Diferencia máxima observada: huecos ${gapRange}, desviación de carga ${loadDeviationRange}${declaredEdgePreference(project)?`, extremos ${edgeRange}`:''}.`,equitySeverity>1?['Examinar si la desigualdad responde a restricciones reales o puede reducirse.']:[]));

  const baseline=arr(options.baselineAssignments?.length?options.baselineAssignments:latestAcceptedBaseline(project));const currentPositions=new Set(rows.map(assignmentPosition)),baselinePositions=new Set(baseline.map(assignmentPosition));const preserved=[...currentPositions].filter(x=>baselinePositions.has(x)).length,movedOrAdded=currentPositions.size-preserved,removed=baselinePositions.size-preserved,preservedPct=baselinePositions.size?round(preserved/baselinePositions.size*100,2):null;
  dimensions.push(dimension('STABILITY','Estabilidad respecto de la referencia',!baseline.length?'NOT_APPLICABLE':preservedPct>=90?'GOOD':preservedPct>=70?'ATTENTION':'CRITICAL',{value:preservedPct??0,unit:'% preservado'},{baselineAssignments:baseline.length,currentAssignments:rows.length,preserved,movedOrAdded,removed,preservedPct},!baseline.length?'No existe una referencia aceptada comparable.':`${preservedPct}% de las posiciones de referencia se conservan.`,baseline.length&&preservedPct<90?['Revisar si los cambios son necesarios y documentar su motivo.']:[]));

  let preferred=0,alternative=0,other=0,neutral=0;const spacesByActivity=new Map();for(const row of rows){const activity=activities.get(text(row.activityId));if(!activity)continue;const state=preferredSpaceState(activity,row);if(state==='PREFERRED')preferred++;else if(state==='ALTERNATIVE')alternative++;else if(state==='OTHER')other++;else neutral++;const set=spacesByActivity.get(activity.id)||new Set();if(row.spaceId)set.add(row.spaceId);spacesByActivity.set(activity.id,set);}
  const spaceChanges=[...spacesByActivity.values()].reduce((sum,set)=>sum+Math.max(0,set.size-1),0),spacePreferenceTotal=preferred+alternative+other,preferredPct=spacePreferenceTotal?round(preferred/spacePreferenceTotal*100,2):null;
  dimensions.push(dimension('SPACE_FIT','Adecuación y estabilidad de espacios',other>0?'CRITICAL':alternative>0||spaceChanges>Math.max(2,Math.ceil(rows.length*.05))?'ATTENTION':spacePreferenceTotal||spaceChanges?'GOOD':'NOT_APPLICABLE',{value:preferredPct??0,unit:'% preferente'},{preferred,alternative,other,neutral,preferredPct,spaceChanges},other?`${other} sesión(es) usan un espacio fuera de las opciones preferentes o alternativas.`:alternative||spaceChanges?`${alternative} sesión(es) usan alternativas y se detectan ${spaceChanges} cambio(s) de espacio por actividad.`:'Los espacios usados son estables y compatibles con las preferencias declaradas.',other||alternative||spaceChanges?['Revisar actividades con cambios frecuentes o espacios no preferentes.']:[]));

  const slotRows=arr(project?.calendar?.slots),slotPos=new Map(slotRows.map((x,i)=>[x.id,i]));let transitions=0,totalMinutes=0,unknownTransitions=0;const travelRows=[];
  for(const teacher of teachers)for(const weekId of effectiveWeeks)for(const day of arr(project?.calendar?.days)){
    const rel=teacherRows.filter(x=>x.teacherId===text(teacher.id)&&(text(x.assignment.weekId)||effectiveWeeks[0])===weekId&&text(x.assignment.dayId)===text(day.id)).sort((a,b)=>(slotPos.get(a.assignment.slotId)??999)-(slotPos.get(b.assignment.slotId)??999));
    for(let i=1;i<rel.length;i++){const prev=rel[i-1],next=rel[i];const prevSpace=spaces.get(text(prev.assignment.spaceId)),nextSpace=spaces.get(text(next.assignment.spaceId));const from=text(prevSpace?.siteId),to=text(nextSpace?.siteId);if(!from||!to||from===to)continue;transitions++;const minutes=siteTravelMinutes(project?.domain||{},from,to);if(minutes===null)unknownTransitions++;else totalMinutes+=minutes;travelRows.push({teacherId:teacher.id,weekId,dayId:day.id,fromSiteId:from,toSiteId:to,minutes});}
  }
  dimensions.push(dimension('TRAVEL','Desplazamientos entre sedes',unknownTransitions?'CRITICAL':transitions>Math.max(2,teachers.length)?'ATTENTION':'GOOD',{value:transitions,unit:'transiciones'},{transitions,totalMinutes,unknownTransitions,rows:travelRows},unknownTransitions?`${unknownTransitions} desplazamiento(s) no tienen tiempo definido.`:transitions?`${transitions} transición(es) entre sedes, ${totalMinutes} minutos declarados.`:'No se detectan cambios de sede consecutivos.',transitions?['Revisar cambios consecutivos de sede y sus tiempos de traslado.']:[]));

  const first=classSlots(project)[0]?.id,last=classSlots(project).at(-1)?.id;const edgeAssignments=rows.filter(row=>row.slotId===first||row.slotId===last).length,edgePreferenceActive=declaredEdgePreference(project);
  dimensions.push(dimension('EDGE_SLOTS','Primeras y últimas sesiones',!edgePreferenceActive?'NOT_APPLICABLE':edgeAssignments===0?'GOOD':edgeAssignments<=Math.max(2,Math.ceil(rows.length*.1))?'ATTENTION':'CRITICAL',{value:edgeAssignments,unit:'sesiones extremas'},{edgeAssignments,preferenceActive:edgePreferenceActive,byTeacher:edgeByTeacher},!edgePreferenceActive?'Indicador descriptivo: el centro no ha activado una preferencia sobre los extremos; no penaliza por defecto.':edgeAssignments?`${edgeAssignments} sesión(es) ocupan extremos sujetos a preferencia.`:'No hay sesiones en extremos sujetos a preferencia.',edgePreferenceActive&&edgeAssignments?['Comparar alternativas sin convertir esta preferencia en una regla obligatoria.']:[]));

  const critical=dimensions.filter(x=>x.status==='CRITICAL').map(x=>x.id),attention=dimensions.filter(x=>x.status==='ATTENTION').map(x=>x.id);let state='NO_CRITICAL_FINDINGS';if(hardErrors||pending)state='BLOCKED';else if(critical.length)state='REVIEW_REQUIRED';else if(attention.length)state='ACCEPTABLE_WITH_TRADEOFFS';
  const label={BLOCKED:'No preparado',REVIEW_REQUIRED:'Requiere revisión',ACCEPTABLE_WITH_TRADEOFFS:'Aceptable con compromisos',NO_CRITICAL_FINDINGS:'Sin hallazgos críticos'}[state];
  const legacy={completionPct,pending,unplaced:pending,gaps:totalGaps,edgeSlotAssignments:edgeAssignments,firstLast:edgeAssignments,dailyLoadSpread:maxDailySpread};
  return{contractVersion:PRODUCT_MULTIDIMENSIONAL_QUALITY_CONTRACT_VERSION,scope:'MULTIDIMENSIONAL_DESCRIPTIVE',source:options.source||'UNKNOWN',overall:{state,label,criticalDimensionIds:critical,attentionDimensionIds:attention,summary:state==='BLOCKED'?'La propuesta no puede valorarse como utilizable hasta resolver bloqueos o sesiones pendientes.':critical.length?`Hay ${critical.length} dimensión(es) que requieren revisión prioritaria.`:attention.length?`No hay bloqueos; existen ${attention.length} compromiso(s) organizativo(s) visibles.`:'No se detectan incidencias críticas en las dimensiones evaluadas.',note:'No equivalen a una valoración total. No constituyen una valoración total ni pedagógica automática; cada dimensión se interpreta por separado y la decisión corresponde a jefatura.'},dimensions,independentSummary:{status:independent.status,valid:independent.valid,canOfficialClose:independent.canOfficialClose,blockers:hardErrors,officialBlockers},legacy};
}

export function qualityDimensionMap(profile){return new Map(arr(profile?.dimensions).map(row=>[row.id,row]));}

const comparators={
  COMPLETENESS:d=>[d.metrics.pending,d.metrics.completionPct],HARD_CONSISTENCY:d=>[d.metrics.hardErrors,d.metrics.officialBlockers],PREFERENCE_FIT:d=>[d.metrics.violations],TEACHER_GAPS:d=>[d.metrics.totalGaps,d.metrics.maxTeacherGaps],DAILY_BALANCE:d=>[d.metrics.maxDailySpread,d.metrics.meanDailySpread],WORKLOAD_FIT:d=>[d.metrics.totalAbsDeviation,d.metrics.maxAbsDeviation],EQUITY:d=>[d.primary.value],STABILITY:d=>[d.metrics.preservedPct??-1],SPACE_FIT:d=>[d.metrics.other,d.metrics.alternative,d.metrics.spaceChanges],TRAVEL:d=>[d.metrics.unknownTransitions,d.metrics.transitions,d.metrics.totalMinutes],EDGE_SLOTS:d=>[d.metrics.edgeAssignments],
};
const directions={COMPLETENESS:['MINIMIZE','MAXIMIZE'],STABILITY:['MAXIMIZE']};
function compareDimension(a,b,id){if(!a||!b||a.status==='NOT_APPLICABLE'||b.status==='NOT_APPLICABLE')return 0;const av=comparators[id]?.(a)||[],bv=comparators[id]?.(b)||[];for(let i=0;i<Math.max(av.length,bv.length);i++){const c=compareNumbers(num(av[i]),num(bv[i]),directions[id]?.[i]||'MINIMIZE');if(c)return c;}return 0;}
export function compareMultidimensionalQuality(profileA,profileB){
  const a=qualityDimensionMap(profileA),b=qualityDimensionMap(profileB),results=[];let betterA=0,betterB=0;
  for(const id of QUALITY_DIMENSION_IDS){const cmp=compareDimension(a.get(id),b.get(id),id);if(cmp>0)betterA++;if(cmp<0)betterB++;results.push({id,label:a.get(id)?.label||b.get(id)?.label||id,a:a.get(id)?.primary??null,b:b.get(id)?.primary??null,better:cmp>0?'A':cmp<0?'B':'EQUAL_OR_NOT_COMPARABLE'});}
  const dominance=betterA&&!betterB?'A_DOMINATES':betterB&&!betterA?'B_DOMINATES':!betterA&&!betterB?'EQUIVALENT':'TRADE_OFF';
  return{contractVersion:PRODUCT_MULTIDIMENSIONAL_QUALITY_CONTRACT_VERSION,dominance,betterDimensions:{A:betterA,B:betterB},results,summary:dominance==='A_DOMINATES'?'La alternativa A no empeora ninguna dimensión comparable y mejora al menos una.':dominance==='B_DOMINATES'?'La alternativa B no empeora ninguna dimensión comparable y mejora al menos una.':dominance==='EQUIVALENT'?'No se observan diferencias comparables relevantes.':'Cada alternativa mejora dimensiones distintas; la decisión requiere priorización humana.',note:'La comparación no usa una puntuación total ni pesos ocultos.'};
}

export function publicQualitySummary(profile){return{contractVersion:profile?.contractVersion,scope:profile?.scope,overall:profile?.overall,dimensions:arr(profile?.dimensions).map(row=>({id:row.id,label:row.label,status:row.status,primary:row.primary,explanation:row.explanation})),legacy:profile?.legacy};}
