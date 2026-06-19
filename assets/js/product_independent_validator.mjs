import {
  EDUCATIONAL_DOMAIN_CONTRACT_VERSION, normalizeEducationalDomain4, activeWeekIds, activityWeekIds,
  requiredOccurrencesForActivity, siteTravelMinutes,
} from './educational_domain_4.mjs';
import { teacherPresenceDecision } from './organizational_domain_4_1.mjs';
export const P10M_INDEPENDENT_VALIDATOR_CONTRACT_VERSION='p10m-independent-semantic-validator-1.1';
export const P10M_INDEPENDENT_VALIDATOR_PHASE='P10M-4';
export const P10M_VALIDATION_MODES=Object.freeze(['INCREMENTAL','CANDIDATE','OFFICIAL']);
export const P10M_VALIDATION_SOURCES=Object.freeze(['HEURISTIC','CP_SAT','MANUAL_EDIT','IMPORTED_PROJECT','IMPORTED_PROPOSAL','OFFICIAL_CLOSURE','UNKNOWN']);

const HARD_RULE_TYPES=new Set(['FORBID_DAY','FORBID_SLOT','REQUIRE_DAY','REQUIRE_SLOT','REQUIRE_SPACE_TAG']);
const SOFT_RULE_TYPES=new Set(['PREFER_DAY','PREFER_SLOT','AVOID_LAST_SLOT','AVOID_FIRST_SLOT','AVOID_EDGE_SLOTS']);
const PRESENCE_EXCLUDING_DEFAULT=['LD'];
const arr=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const integer=(value,fallback=0)=>Number.isInteger(Number(value))?Number(value):fallback;
const unique=value=>[...new Set(arr(value).map(text).filter(Boolean))];
const indexBy=rows=>new Map(arr(rows).filter(row=>row&&typeof row==='object').map(row=>[text(row.id),row]));
const slotKey=(dayId,slotId,weekId='W1')=>`${weekId}:${dayId}:${slotId}`;
const availabilityKey=(dayId,slotId)=>`${dayId}:${slotId}`;

function stable(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return`[${value.map(stable).join(',')}]`;
  return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
}
function fnv1a(value){
  const data=typeof value==='string'?value:stable(value);let hash=0x811c9dc5;
  for(let i=0;i<data.length;i+=1){hash^=data.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0;}
  return`fnv1a-${hash.toString(16).padStart(8,'0')}`;
}
function allowedKinds(activity){
  const explicit=arr(activity?.allowedSlotKinds).map(text).filter(kind=>['CLASS','BREAK','OTHER'].includes(kind));
  if(explicit.length)return new Set(explicit);
  if(activity?.kind==='BREAK_DUTY')return new Set(['BREAK']);
  if(activity?.kind==='MEETING'&&arr(activity.allowedSlots).length)return new Set(['CLASS','BREAK','OTHER']);
  return new Set(['CLASS']);
}
function applies(rule,activity){
  if(rule?.activityId)return text(rule.activityId)===text(activity?.id);
  if(rule?.teacherId)return arr(activity?.teacherIds).map(text).includes(text(rule.teacherId));
  if(rule?.groupId)return arr(activity?.groupIds).map(text).includes(text(rule.groupId));
  if(rule?.kind)return text(rule.kind)===text(activity?.kind);
  return true;
}
function evaluatorIdForCode(code){
  if(/REFERENCE|_BROKEN|TIME_UNKNOWN|DUPLICATE/.test(code))return'REFERENCES';
  if(/OCCURRENCE|COMPLETENESS|OVERASSIGNED|UNDERASSIGNED/.test(code))return'OCCURRENCES';
  if(/MULTISLOT|BLOCK_|CONTIGUOUS/.test(code))return'MULTISLOT';
  if(/CONFLICT|OVERLAP|CAPACITY/.test(code))return'OCCUPANCY';
  if(/UNAVAILABLE|ITINERARY|PRESENCE/.test(code))return'AVAILABILITY_PRESENCE';
  if(/SPACE|TAG/.test(code))return'SPACES';
  if(/ALLOWED|FORBID|REQUIRE_|HARD_RULE/.test(code))return'HARD_RULES';
  if(/MAX_PER_DAY/.test(code))return'MAX_PER_DAY';
  if(/FIXED/.test(code))return'FIXED_OCCURRENCES';
  if(/LD_/.test(code))return'LD_DC';
  if(/BREAK_/.test(code))return'BREAK_COVERAGE';
  if(/WORKLOAD/.test(code))return'WORKLOAD';
  if(/PREFERENCE|PREFERRED|EDGE_SLOT/.test(code))return'PREFERENCES';
  if(/WEEK_|CYCLE_/.test(code))return'WEEK_CYCLE';
  if(/TRAVEL_|SITE_/.test(code))return'SITES_TRAVEL';
  if(/RESOURCE_/.test(code))return'RESOURCES';
  if(/RELATION_|CONSECUTIVE|GAP_/.test(code))return'ACTIVITY_RELATIONS';
  if(/SPLIT_|CONCURRENT/.test(code))return'SPLITS_CONCURRENCY';
  if(/UNSUPPORTED/.test(code))return'UNSUPPORTED_REQUIREMENTS';
  if(/LOCK/.test(code))return'LOCKS';
  return'GENERAL';
}

function makeCollector(mode){
  const issues=[];
  const push=(severity,code,message,detail={})=>{
    const item={
      id:`iv_${issues.length+1}`,severity,code,message,
      evaluator:detail.evaluator||evaluatorIdForCode(code),
      entity:detail.entity??null,assignmentId:detail.assignmentId||'',activityId:detail.activityId||'',
      dayId:detail.dayId||'',slotId:detail.slotId||'',occupiedSlotIds:arr(detail.occupiedSlotIds),
      ruleId:detail.ruleId||'',blocksOfficialClosure:detail.blocksOfficialClosure??severity==='ERROR',
      suggestedAction:detail.suggestedAction||'',context:detail.context||null,
    };
    issues.push(item);return item;
  };
  const closureIssue=(code,message,detail={})=>push(mode==='OFFICIAL'?'ERROR':'WARNING',code,message,{...detail,blocksOfficialClosure:true});
  return{issues,push,closureIssue};
}

function fixedTargetCounts(activity){
  const counts=new Map();
  for(const target of arr(activity?.fixedOccurrences)){
    const key=slotKey(text(target?.dayId),text(target?.slotId),text(target?.weekId)||'W1');
    counts.set(key,(counts.get(key)||0)+1);
  }
  return counts;
}
function fixedMatch(activity,assignment){return fixedTargetCounts(activity).has(slotKey(text(assignment?.dayId),text(assignment?.slotId),text(assignment?.weekId)||'W1'));}

function occupiedSlots(project,activity,assignment,collector,indexes){
  const start=indexes.slotPosition.get(text(assignment.slotId));
  const duration=Math.max(1,integer(activity?.durationSlots,1));
  if(start===undefined){collector.push('ERROR','ASSIGNMENT_TIME_UNKNOWN','La sesión utiliza un tramo inexistente.',{assignmentId:assignment.id,activityId:activity?.id,dayId:assignment.dayId,slotId:assignment.slotId});return[];}
  const block=indexes.slotRows.slice(start,start+duration);
  if(block.length!==duration){collector.push('ERROR','MULTISLOT_OUT_OF_RANGE',`${activity?.name||'La actividad'} no dispone de ${duration} tramos consecutivos desde ${assignment.slotId}.`,{assignmentId:assignment.id,activityId:activity?.id,dayId:assignment.dayId,slotId:assignment.slotId});return block.map(row=>text(row.id));}
  const explicitSlots=new Set(arr(activity?.allowedSlots).map(text));
  const invalid=explicitSlots.size?block.find(row=>!explicitSlots.has(text(row.id))):block.find(row=>!allowedKinds(activity).has(text(row.kind)));
  if(invalid)collector.push('ERROR','MULTISLOT_KIND_CONFLICT',`${activity?.name||'La actividad'} atraviesa un tramo incompatible (${invalid.label||invalid.id}).`,{assignmentId:assignment.id,activityId:activity?.id,dayId:assignment.dayId,slotId:assignment.slotId,occupiedSlotIds:block.map(row=>text(row.id))});
  return block.map(row=>text(row.id));
}

function ruleOutcome(rule,project,activity,assignment,indexes){
  const type=text(rule?.type);const dayId=text(assignment.dayId),slotId=text(assignment.slotId);const space=indexes.spaces.get(text(assignment.spaceId));
  if(type==='FORBID_DAY')return{allowed:dayId!==text(rule.dayId),message:rule.label||'La regla prohíbe este día.'};
  if(type==='FORBID_SLOT')return{allowed:slotId!==text(rule.slotId),message:rule.label||'La regla prohíbe este tramo.'};
  if(type==='REQUIRE_DAY')return{allowed:dayId===text(rule.dayId),message:rule.label||'La actividad debe situarse en el día exigido.'};
  if(type==='REQUIRE_SLOT')return{allowed:slotId===text(rule.slotId),message:rule.label||'La actividad debe situarse en el tramo exigido.'};
  if(type==='REQUIRE_SPACE_TAG')return{allowed:Boolean(space&&arr(space.tags).map(text).includes(text(rule.value))),message:rule.label||'El espacio no cumple la etiqueta obligatoria.'};
  if(type==='PREFER_DAY')return{preferred:dayId===text(rule.dayId)};
  if(type==='PREFER_SLOT')return{preferred:slotId===text(rule.slotId)};
  if(['AVOID_LAST_SLOT','AVOID_FIRST_SLOT','AVOID_EDGE_SLOTS'].includes(type)){
    const classSlots=indexes.slotRows.filter(row=>text(row.kind)==='CLASS').map(row=>text(row.id));
    const first=classSlots[0]||'',last=classSlots.at(-1)||'';
    const avoided=type==='AVOID_LAST_SLOT'?slotId===last:type==='AVOID_FIRST_SLOT'?slotId===first:slotId===first||slotId===last;
    return{preferred:!avoided};
  }
  return{unknown:true,allowed:false,preferred:false};
}

function lockForbids(project,activity,assignment){
  return arr(project.locks).some(lock=>{
    if(lock?.active===false||text(lock?.effect)!=='FORBID')return false;
    if(lock.dayId&&text(lock.dayId)!==text(assignment.dayId))return false;
    if(lock.slotId&&text(lock.slotId)!==text(assignment.slotId))return false;
    if(lock.teacherId&&!arr(activity.teacherIds).map(text).includes(text(lock.teacherId)))return false;
    if(lock.groupId&&!arr(activity.groupIds).map(text).includes(text(lock.groupId)))return false;
    if(lock.spaceId&&text(lock.spaceId)!==text(assignment.spaceId))return false;
    return true;
  });
}

function validateUnsupportedRequirements(project,collector){
  if(project?.meta?.schemaVersion==='4.0'&&project?.domain?.contractVersion!==EDUCATIONAL_DOMAIN_CONTRACT_VERSION){
    collector.push('ERROR','UNSUPPORTED_DOMAIN_CONTRACT','El proyecto 4.0 no declara el contrato de dominio educativo compatible.',{entity:'domain',evaluator:'UNSUPPORTED_REQUIREMENTS'});
  }
}



function timeToMinutes(value){const m=/^(\d{1,2}):(\d{2})$/.exec(text(value));return m?Number(m[1])*60+Number(m[2]):null;}
function assignmentSite(project,assignment,indexes){
  const space=indexes.spaces.get(text(assignment.spaceId));
  if(space?.siteId)return text(space.siteId);
  const activity=indexes.activities.get(text(assignment.activityId));
  return unique(activity?.allowedSiteIds).length===1?unique(activity.allowedSiteIds)[0]:'';
}
function validateDomain4Semantics(project,collector,indexes,expanded){
  const {push}=collector;const domain=normalizeEducationalDomain4(project.domain||{});const weeks=activeWeekIds(domain);
  const resources=indexBy(domain.resources),relations=arr(domain.activityRelations).filter(x=>x&&x.active!==false),splits=arr(domain.splitSets).filter(x=>x&&x.active!==false);
  const byActivity=new Map();for(const row of expanded){const id=text(row.activity.id),rows=byActivity.get(id)||[];rows.push(row);byActivity.set(id,rows);}
  const resourceOccupancy=new Map();
  for(const row of expanded){
    const {assignment,activity}=row;const weekId=text(assignment.weekId)||weeks[0]||'W1';
    if(!weeks.includes(weekId))push('ERROR','WEEK_REFERENCE_BROKEN','Una sesión usa una semana inexistente.',{assignmentId:assignment.id,activityId:activity.id,evaluator:'WEEK_CYCLE'});
    if(!activityWeekIds(activity,domain).includes(weekId))push('ERROR','WEEK_PATTERN_VIOLATION',`${activity.name||activity.id}: la sesión está colocada en una semana no aplicable.`,{assignmentId:assignment.id,activityId:activity.id,evaluator:'WEEK_CYCLE'});
    const space=indexes.spaces.get(text(assignment.spaceId));const siteId=assignmentSite(project,assignment,indexes);
    if(arr(activity.allowedSiteIds).length&&!arr(activity.allowedSiteIds).map(text).includes(siteId))push('ERROR','SITE_NOT_ALLOWED',`${activity.name||activity.id}: la sede asignada no está permitida.`,{assignmentId:assignment.id,activityId:activity.id,evaluator:'SITES_TRAVEL'});
    if(arr(activity.allowedSpaceIds).length&&![...arr(activity.allowedSpaceIds),...arr(activity.alternativeSpaceIds)].map(text).includes(text(assignment.spaceId)))push('ERROR','SPACE_NOT_ALLOWED',`${activity.name||activity.id}: el espacio explícito no está permitido.`,{assignmentId:assignment.id,activityId:activity.id,evaluator:'SPACES'});
    const availableResources=new Set([...arr(space?.resourceIds).map(text),...arr(assignment.resourceIds).map(text)]);
    for(const resourceId of unique(activity.requiredResourceIds))if(!availableResources.has(resourceId))push('ERROR','REQUIRED_RESOURCE_MISSING',`${activity.name||activity.id}: falta el recurso obligatorio ${resources.get(resourceId)?.name||resourceId}.`,{assignmentId:assignment.id,activityId:activity.id,evaluator:'RESOURCES'});
    for(const resourceId of unique(assignment.resourceIds))for(const occupiedSlotId of row.occupiedSlotIds){const key=`${resourceId}|${slotKey(assignment.dayId,occupiedSlotId,weekId)}`;const rows=resourceOccupancy.get(key)||[];rows.push(assignment.id);resourceOccupancy.set(key,rows);}
    const groupSize=unique(activity.groupIds).reduce((sum,id)=>sum+Math.max(0,integer(indexes.groups.get(id)?.size,0)),0);
    if(space&&number(space.seatCapacity,0)>0&&groupSize>number(space.seatCapacity,0))push('ERROR','SPACE_SEAT_CAPACITY_EXCEEDED',`${space.name||space.id}: el aforo declarado (${space.seatCapacity}) es inferior al alumnado vinculado (${groupSize}).`,{assignmentId:assignment.id,activityId:activity.id,evaluator:'SPACES'});
  }
  for(const [key,rows] of resourceOccupancy){const resourceId=key.split('|')[0],capacity=Math.max(1,integer(resources.get(resourceId)?.capacity,1));if(rows.length>capacity)push('ERROR','RESOURCE_CAPACITY_EXCEEDED',`${resources.get(resourceId)?.name||resourceId} supera su capacidad simultánea (${rows.length}/${capacity}).`,{entity:resourceId,evaluator:'RESOURCES',context:{assignmentIds:rows,capacity}});}
  const firstRow=(activityId,weekId)=>arr(byActivity.get(activityId)).filter(r=>text(r.assignment.weekId||weeks[0])===weekId).sort((a,b)=>text(a.assignment.dayId).localeCompare(text(b.assignment.dayId))||indexes.slotPosition.get(text(a.assignment.slotId))-indexes.slotPosition.get(text(b.assignment.slotId)))[0];
  for(const relation of relations){
    const leftRows=arr(byActivity.get(text(relation.leftActivityId))),rightRows=arr(byActivity.get(text(relation.rightActivityId)));
    const relationWeeks=relation.sameWeek===false?['*']:weeks;
    for(const weekId of relationWeeks){
      const left=weekId==='*'?leftRows[0]:firstRow(relation.leftActivityId,weekId),right=weekId==='*'?rightRows[0]:firstRow(relation.rightActivityId,weekId);
      if(!left||!right)continue;
      const l=left.assignment,r=right.assignment,lp=indexes.slotPosition.get(text(l.slotId)),rp=indexes.slotPosition.get(text(r.slotId));
      const leftDuration=Math.max(1,integer(left.activity.durationSlots,1)),rightDuration=Math.max(1,integer(right.activity.durationSlots,1));
      const leftEnd=lp+leftDuration-1,rightEnd=rp+rightDuration-1;
      const sameDay=text(l.dayId)===text(r.dayId),sameStart=sameDay&&lp===rp&&(weekId==='*'||text(l.weekId)===text(r.weekId));let ok=true;
      if(relation.type==='SAME_START')ok=sameStart;else if(relation.type==='SAME_DAY')ok=sameDay;else if(relation.type==='DIFFERENT_DAY')ok=!sameDay;else if(relation.type==='BEFORE')ok=sameDay&&leftEnd<rp;else if(relation.type==='AFTER')ok=sameDay&&lp>rightEnd;else if(relation.type==='CONSECUTIVE'||relation.type==='IMMEDIATELY_BEFORE')ok=sameDay&&leftEnd+1===rp;else if(relation.type==='IMMEDIATELY_AFTER')ok=sameDay&&rightEnd+1===lp;else if(relation.type==='NOT_CONSECUTIVE')ok=!sameDay||(leftEnd+1!==rp&&rightEnd+1!==lp);else if(relation.type==='MIN_GAP_SLOTS')ok=!sameDay||Math.max(rp-leftEnd,lp-rightEnd)>=integer(relation.value,1);else if(relation.type==='MAX_GAP_SLOTS')ok=sameDay&&Math.max(rp-leftEnd,lp-rightEnd)<=integer(relation.value,1);
      if(!ok){const severity=relation.hard===false?'INFO':'ERROR';push(severity,'ACTIVITY_RELATION_VIOLATION',`No se cumple la relación ${relation.type} entre ${indexes.activities.get(relation.leftActivityId)?.name||relation.leftActivityId} y ${indexes.activities.get(relation.rightActivityId)?.name||relation.rightActivityId}.`,{entity:relation.id,evaluator:'ACTIVITY_RELATIONS',blocksOfficialClosure:relation.hard!==false,context:{weekId,leftAssignmentId:l.id,rightAssignmentId:r.id}});}
    }
  }
  for(const split of splits){if(split.mode!=='SIMULTANEOUS')continue;for(const weekId of weeks){const rows=split.activityIds.map(id=>firstRow(id,weekId)).filter(Boolean);if(rows.length<2)continue;const keys=new Set(rows.map(row=>slotKey(row.assignment.dayId,row.assignment.slotId,weekId)));if(keys.size>1)push('ERROR','SPLIT_NOT_SIMULTANEOUS',`${split.name||split.id}: las actividades del desdoble no comienzan simultáneamente en ${weekId}.`,{entity:split.id,evaluator:'SPLITS_CONCURRENCY'});}}
  const slotRows=indexes.slotRows;
  for(const teacher of arr(project.teachers)){
    const rows=expanded.filter(row=>unique(row.activity.teacherIds).includes(text(teacher.id))).sort((a,b)=>text(a.assignment.weekId).localeCompare(text(b.assignment.weekId))||text(a.assignment.dayId).localeCompare(text(b.assignment.dayId))||indexes.slotPosition.get(text(a.assignment.slotId))-indexes.slotPosition.get(text(b.assignment.slotId)));
    for(let i=1;i<rows.length;i+=1){const previous=rows[i-1],current=rows[i];if(text(previous.assignment.weekId)!==text(current.assignment.weekId)||text(previous.assignment.dayId)!==text(current.assignment.dayId))continue;const fromSite=assignmentSite(project,previous.assignment,indexes),toSite=assignmentSite(project,current.assignment,indexes);if(!fromSite||!toSite||fromSite===toSite)continue;const required=siteTravelMinutes(domain,fromSite,toSite);if(required===null){push('ERROR','TRAVEL_RULE_MISSING',`${teacher.name||teacher.id}: falta definir el desplazamiento entre ${fromSite} y ${toSite}.`,{entity:teacher.id,evaluator:'SITES_TRAVEL'});continue;}const previousEndSlot=slotRows[indexes.slotPosition.get(text(previous.assignment.slotId))+Math.max(1,integer(previous.activity.durationSlots,1))-1];const nextSlot=slotRows[indexes.slotPosition.get(text(current.assignment.slotId))];const end=timeToMinutes(previousEndSlot?.end),start=timeToMinutes(nextSlot?.start);if(end!==null&&start!==null&&start-end<required)push('ERROR','TRAVEL_TIME_INSUFFICIENT',`${teacher.name||teacher.id}: dispone de ${Math.max(0,start-end)} minutos para un desplazamiento de ${required}.`,{entity:teacher.id,evaluator:'SITES_TRAVEL',context:{fromSite,toSite,required,available:Math.max(0,start-end)}});}
  }
}

function checkPreferences(project,collector,indexes){
  const assignmentsByActivity=new Map();
  for(const assignment of arr(project.assignments)){
    const rows=assignmentsByActivity.get(text(assignment.activityId))||[];rows.push(assignment);assignmentsByActivity.set(text(assignment.activityId),rows);
  }
  for(const activity of arr(project.activities)){
    const rows=assignmentsByActivity.get(text(activity.id))||[];
    if(arr(activity.preferredDays).length){const misses=rows.filter(row=>!arr(activity.preferredDays).map(text).includes(text(row.dayId)));if(misses.length)collector.push('INFO','PREFERRED_DAY_NOT_MET',`${activity.name||activity.id}: ${misses.length} sesión(es) no están en un día preferente.`,{activityId:activity.id,evaluator:'PREFERENCES',blocksOfficialClosure:false});}
    if(arr(activity.preferredSlots).length){const misses=rows.filter(row=>!arr(activity.preferredSlots).map(text).includes(text(row.slotId)));if(misses.length)collector.push('INFO','PREFERRED_SLOT_NOT_MET',`${activity.name||activity.id}: ${misses.length} sesión(es) no están en un tramo preferente.`,{activityId:activity.id,evaluator:'PREFERENCES',blocksOfficialClosure:false});}
  }
  const soft=[...arr(project.organization?.preferences),...arr(project.constraints)].filter(rule=>rule&&rule.active!==false&&(text(rule.level)==='SOFT'||text(rule.severity)==='SOFT'||arr(project.organization?.preferences).includes(rule)));
  for(const rule of soft){
    const type=text(rule.type);if(!SOFT_RULE_TYPES.has(type)){collector.push('WARNING','UNKNOWN_SOFT_RULE',`${rule.label||rule.id||'Una preferencia'} usa un tipo no evaluable.`,{ruleId:rule.id,evaluator:'PREFERENCES',blocksOfficialClosure:false});continue;}
    for(const assignment of arr(project.assignments)){
      const activity=indexes.activities.get(text(assignment.activityId));if(!activity||!applies(rule,activity))continue;
      const outcome=ruleOutcome(rule,project,activity,assignment,indexes);
      if(outcome.preferred===false)collector.push('INFO','SOFT_PREFERENCE_NOT_MET',`${rule.label||'Preferencia'}: no se cumple en una sesión de ${activity.name||activity.id}.`,{assignmentId:assignment.id,activityId:activity.id,dayId:assignment.dayId,slotId:assignment.slotId,ruleId:rule.id,evaluator:'PREFERENCES',blocksOfficialClosure:false});
    }
  }
}

function groupOverlapAllowed(project,assignmentIds,indexes){
  const activities=assignmentIds.map(id=>indexes.assignments.get(text(id))).map(row=>indexes.activities.get(text(row?.activityId))).filter(Boolean);
  if(activities.length<2)return false;
  return arr(project.domain?.splitSets).some(split=>split&&split.active!==false&&text(split.mode)==='SIMULTANEOUS'&&activities.every(activity=>arr(split.activityIds).map(text).includes(text(activity.id))));
}

export function validateScheduleIndependently(input,options={}){
  const project=input&&typeof input==='object'?input:{};
  const mode=P10M_VALIDATION_MODES.includes(options.mode)?options.mode:'INCREMENTAL';
  const source=P10M_VALIDATION_SOURCES.includes(options.source)?options.source:'UNKNOWN';
  const generatedAt=text(options.generatedAt)||new Date().toISOString();
  const collector=makeCollector(mode);const {issues,push,closureIssue}=collector;
  const slots=arr(project.calendar?.slots),days=arr(project.calendar?.days);
  const indexes={
    activities:indexBy(project.activities),teachers:indexBy(project.teachers),groups:indexBy(project.groups),spaces:indexBy(project.spaces),
    days:indexBy(days),slotsById:indexBy(slots),slotRows:slots,slotPosition:new Map(slots.map((row,i)=>[text(row.id),i])),
    sites:indexBy(project.domain?.sites),resources:indexBy(project.domain?.resources),assignments:indexBy(project.assignments),
  };
  indexes.daysList=days;
  const assignments=arr(project.assignments);
  const assignmentIds=new Set();
  const activityCounts=new Map();const activityDayCounts=new Map();
  const occupancy={teacher:new Map(),group:new Map(),space:new Map(),teacherKind:new Map()};
  const expanded=[];

  validateUnsupportedRequirements(project,collector);

  for(const assignment of assignments){
    const assignmentId=text(assignment?.id),activityId=text(assignment?.activityId),dayId=text(assignment?.dayId),slotId=text(assignment?.slotId),spaceId=text(assignment?.spaceId),weekId=text(assignment?.weekId)||activeWeekIds(normalizeEducationalDomain4(project.domain||{}))[0]||'W1';
    if(!assignmentId)push('ERROR','ASSIGNMENT_ID_REQUIRED','Existe una sesión sin identificador.',{activityId,dayId,slotId,evaluator:'REFERENCES'});
    else if(assignmentIds.has(assignmentId))push('ERROR','ASSIGNMENT_ID_DUPLICATE',`El identificador de sesión ${assignmentId} está duplicado.`,{assignmentId,activityId,evaluator:'REFERENCES'});
    assignmentIds.add(assignmentId);
    const activity=indexes.activities.get(activityId);
    if(!activity){push('ERROR','ASSIGNMENT_ACTIVITY_BROKEN','Una sesión apunta a una actividad inexistente.',{assignmentId,activityId,dayId,slotId,evaluator:'REFERENCES'});continue;}
    if(!indexes.days.has(dayId)){push('ERROR','ASSIGNMENT_DAY_BROKEN','Una sesión utiliza un día inexistente.',{assignmentId,activityId,dayId,slotId,evaluator:'REFERENCES'});continue;}
    if(!indexes.slotsById.has(slotId)){push('ERROR','ASSIGNMENT_SLOT_BROKEN','Una sesión utiliza un tramo inexistente.',{assignmentId,activityId,dayId,slotId,evaluator:'REFERENCES'});continue;}
    if(spaceId&&!indexes.spaces.has(spaceId))push('ERROR','ASSIGNMENT_SPACE_BROKEN','Una sesión apunta a un espacio inexistente.',{assignmentId,activityId,dayId,slotId,evaluator:'REFERENCES'});
    const occupiedSlotIds=occupiedSlots(project,activity,assignment,collector,indexes);
    expanded.push({assignment,activity,occupiedSlotIds});
    activityCounts.set(activityId,(activityCounts.get(activityId)||0)+1);
    const dayCountKey=`${activityId}|${weekId}|${dayId}`;activityDayCounts.set(dayCountKey,(activityDayCounts.get(dayCountKey)||0)+1);

    if(arr(activity.allowedDays).length&&!arr(activity.allowedDays).map(text).includes(dayId))push('ERROR','ALLOWED_DAY_VIOLATION',`${activity.name||activityId}: la sesión está en un día no permitido.`,{assignmentId,activityId,dayId,slotId,evaluator:'HARD_RULES'});
    if(arr(activity.allowedSlots).length&&!arr(activity.allowedSlots).map(text).includes(slotId))push('ERROR','ALLOWED_SLOT_VIOLATION',`${activity.name||activityId}: la sesión está en un tramo no permitido.`,{assignmentId,activityId,dayId,slotId,evaluator:'HARD_RULES'});

    const requiredTags=unique(activity.requiredSpaceTags);
    if(requiredTags.length&&!spaceId)push('ERROR','REQUIRED_SPACE_MISSING',`${activity.name||activityId}: necesita un espacio con ${requiredTags.join(', ')}.`,{assignmentId,activityId,dayId,slotId,evaluator:'SPACES'});
    if(spaceId){const space=indexes.spaces.get(spaceId);const tags=new Set(arr(space?.tags).map(text));const missing=requiredTags.filter(tag=>!tags.has(tag));if(missing.length)push('ERROR','REQUIRED_SPACE_TAG_MISSING',`${activity.name||activityId}: ${space?.name||spaceId} no cumple ${missing.join(', ')}.`,{assignmentId,activityId,dayId,slotId,evaluator:'SPACES'});}

    for(const occupiedSlotId of occupiedSlotIds){
      const key=slotKey(dayId,occupiedSlotId,weekId);
      for(const teacherId of unique(activity.teacherIds)){
        const teacher=indexes.teachers.get(teacherId);
        if(!teacher){push('ERROR','ASSIGNMENT_TEACHER_BROKEN',`${activity.name||activityId}: el docente ${teacherId} no existe.`,{assignmentId,activityId,dayId,slotId:occupiedSlotId,evaluator:'REFERENCES'});continue;}
        const explicitPresence=arr(teacher.presencePlan).length>0||Boolean(project.organization?.presencePolicy?.explicitPlanEnabled);
        if(activity.presenceRequirement!=='NONE'&&explicitPresence){
          const assignedSiteId=indexes.spaces.get(spaceId)?.siteId||activity.serviceSiteId||'';
          const decision=teacherPresenceDecision(teacher,dayId,occupiedSlotId,{siteId:assignedSiteId,purpose:'SCHEDULE',policy:project.organization?.presencePolicy});
          if(!decision.allowed)push('ERROR','TEACHER_PRESENCE_CONFLICT',`${teacher.name||teacherId}: ${decision.reason||'presencia no compatible'}`,{assignmentId,activityId,dayId,slotId:occupiedSlotId,occupiedSlotIds,evaluator:'AVAILABILITY_PRESENCE'});
        }else if(activity.presenceRequirement!=='NONE'){
          if(arr(teacher.unavailable).map(text).includes(availabilityKey(dayId,occupiedSlotId))||(arr(teacher.presence).length&&!arr(teacher.presence).map(text).includes(availabilityKey(dayId,occupiedSlotId))))push('ERROR','TEACHER_UNAVAILABLE',`${teacher.name||teacherId} no está disponible en ${key}.`,{assignmentId,activityId,dayId,slotId:occupiedSlotId,occupiedSlotIds,evaluator:'AVAILABILITY_PRESENCE'});
          if(teacher.itinerary?.enabled&&arr(teacher.itinerary.presenceDays).length&&!arr(teacher.itinerary.presenceDays).map(text).includes(dayId))push('ERROR','ITINERARY_DAY_CONFLICT',`${teacher.name||teacherId} no está presente en el centro ese día.`,{assignmentId,activityId,dayId,slotId:occupiedSlotId,evaluator:'AVAILABILITY_PRESENCE'});
        }
        const occKey=`${teacherId}|${key}`;const rows=occupancy.teacher.get(occKey)||[];rows.push(assignmentId);occupancy.teacher.set(occKey,rows);
        const kindKey=`${teacherId}|${key}`;const kinds=occupancy.teacherKind.get(kindKey)||[];kinds.push(text(activity.kind));occupancy.teacherKind.set(kindKey,kinds);
      }
      for(const groupId of unique(activity.groupIds)){
        if(!indexes.groups.has(groupId))push('ERROR','ASSIGNMENT_GROUP_BROKEN',`${activity.name||activityId}: el grupo ${groupId} no existe.`,{assignmentId,activityId,dayId,slotId:occupiedSlotId,evaluator:'REFERENCES'});
        const occKey=`${groupId}|${key}`;const rows=occupancy.group.get(occKey)||[];rows.push(assignmentId);occupancy.group.set(occKey,rows);
      }
      if(spaceId){const occKey=`${spaceId}|${key}`;const rows=occupancy.space.get(occKey)||[];rows.push(assignmentId);occupancy.space.set(occKey,rows);}
    }

    const hardRules=[...arr(project.constraints),...arr(project.organization?.rules)].filter(rule=>rule&&rule.active!==false&&(text(rule.level)==='HARD'||text(rule.severity)==='HARD'||arr(project.organization?.rules).includes(rule)));
    for(const rule of hardRules){if(!applies(rule,activity))continue;const type=text(rule.type);if(!HARD_RULE_TYPES.has(type)){push('ERROR','UNKNOWN_HARD_RULE',`${rule.label||rule.id||'Una regla obligatoria'} no puede ser evaluada por esta versión.`,{assignmentId,activityId,dayId,slotId,ruleId:rule.id,evaluator:'UNSUPPORTED_REQUIREMENTS'});continue;}const result=ruleOutcome(rule,project,activity,assignment,indexes);if(!result.allowed)push('ERROR','HARD_RULE_VIOLATION',result.message,{assignmentId,activityId,dayId,slotId,ruleId:rule.id,evaluator:'HARD_RULES'});}
    if(lockForbids(project,activity,assignment))push('ERROR','LOCK_FORBIDDEN_DESTINATION',`${activity.name||activityId}: el destino está prohibido por un bloqueo vigente.`,{assignmentId,activityId,dayId,slotId,evaluator:'LOCKS'});
  }

  validateDomain4Semantics(project,collector,indexes,expanded);

  for(const [key,rows] of occupancy.teacher)if(rows.length>1){const [teacherId,time]=key.split('|');push('ERROR','TEACHER_OVERLAP',`${indexes.teachers.get(teacherId)?.name||teacherId} tiene ${rows.length} sesiones simultáneas en ${time}.`,{entity:teacherId,evaluator:'OCCUPANCY',context:{assignmentIds:rows}});}
  for(const [key,rows] of occupancy.group)if(rows.length>1&&!groupOverlapAllowed(project,rows,indexes)){const [groupId,time]=key.split('|');push('ERROR','GROUP_OVERLAP',`${indexes.groups.get(groupId)?.name||groupId} tiene ${rows.length} sesiones simultáneas en ${time}.`,{entity:groupId,evaluator:'OCCUPANCY',context:{assignmentIds:rows}});}
  for(const [key,rows] of occupancy.space){const [spaceId,time]=key.split('|');const capacity=Math.max(1,integer(indexes.spaces.get(spaceId)?.capacity,1));if(rows.length>capacity)push('ERROR','SPACE_CAPACITY_EXCEEDED',`${indexes.spaces.get(spaceId)?.name||spaceId} supera su capacidad simultánea (${rows.length}/${capacity}) en ${time}.`,{entity:spaceId,evaluator:'OCCUPANCY',context:{assignmentIds:rows,capacity}});}

  for(const activity of arr(project.activities)){
    const id=text(activity.id),actual=activityCounts.get(id)||0,required=requiredOccurrencesForActivity(activity,normalizeEducationalDomain4(project.domain||{}));
    if(actual>required)push('ERROR','ACTIVITY_OVERASSIGNED',`${activity.name||id}: hay ${actual} sesiones colocadas para ${required} declaradas.`,{activityId:id,entity:id,evaluator:'OCCURRENCES'});
    if(actual<required){const missing=required-actual;if(activity.mandatory===false)push('INFO','OPTIONAL_ACTIVITY_UNDERASSIGNED',`${activity.name||id}: quedan ${missing} ocurrencia(s) opcionales sin colocar.`,{activityId:id,entity:id,evaluator:'OCCURRENCES',blocksOfficialClosure:false});else closureIssue('MANDATORY_ACTIVITY_UNDERASSIGNED',`${activity.name||id}: faltan ${missing} sesión(es) obligatorias.`,{activityId:id,entity:id,evaluator:'OCCURRENCES'});}
    const maxPerDay=Math.max(0,integer(activity.maxPerDay,0));if(maxPerDay)for(const weekId of activityWeekIds(activity,normalizeEducationalDomain4(project.domain||{})))for(const day of days){const count=activityDayCounts.get(`${id}|${weekId}|${text(day.id)}`)||0;if(count>maxPerDay)push('ERROR','MAX_PER_DAY_EXCEEDED',`${activity.name||id}: hay ${count} sesiones el ${day.label||day.id} (${weekId}) y el máximo es ${maxPerDay}.`,{activityId:id,dayId:day.id,evaluator:'MAX_PER_DAY',context:{weekId}});}
    const fixed=fixedTargetCounts(activity);for(const [target,count] of fixed){const actualFixed=assignments.filter(row=>text(row.activityId)===id&&slotKey(text(row.dayId),text(row.slotId),text(row.weekId)||'W1')===target).length;if(actualFixed<count)closureIssue('FIXED_OCCURRENCE_MISSING',`${activity.name||id}: falta una colocación fija en ${target}.`,{activityId:id,evaluator:'FIXED_OCCURRENCES',context:{target,required:count,actual:actualFixed}});}
  }

  if(project.organization?.enabled){
    const maxLd=Math.max(0,integer(project.organization?.ldDc?.maxSimultaneousLd,0));
    if(maxLd){const counts=new Map();for(const row of expanded)if(text(row.activity.kind)==='LD')for(const occupiedSlotId of row.occupiedSlotIds){const key=slotKey(text(row.assignment.dayId),occupiedSlotId,text(row.assignment.weekId)||'W1');counts.set(key,(counts.get(key)||0)+1);}for(const [key,count] of counts)if(count>maxLd)push('ERROR','MAX_SIMULTANEOUS_LD_EXCEEDED',`Hay ${count} LD simultáneas en ${key} y el máximo es ${maxLd}.`,{evaluator:'LD_DC',context:{count,maxLd,key}});}

    const excludingKinds=new Set(arr(project.organization?.coveragePolicy?.presenceExcludingKinds).length?arr(project.organization.coveragePolicy.presenceExcludingKinds).map(text):PRESENCE_EXCLUDING_DEFAULT);
    const domainWeeks=activeWeekIds(normalizeEducationalDomain4(project.domain||{}));
    for(const rule of arr(project.organization?.minimumPresence).filter(row=>row&&row.active!==false)){
      for(const weekId of domainWeeks)for(const dayId of arr(rule.dayIds).map(text))for(const slotId of arr(rule.slotIds).map(text)){
        const availability=availabilityKey(dayId,slotId);let present=0;
        for(const teacher of arr(project.teachers)){
          if(rule.profileTag&&!arr(teacher.essentialProfiles).map(text).includes(text(rule.profileTag)))continue;
          if(teacher.itinerary?.enabled&&arr(teacher.itinerary.presenceDays).length&&!arr(teacher.itinerary.presenceDays).map(text).includes(dayId))continue;
          if(arr(teacher.presence).length&&!arr(teacher.presence).map(text).includes(availability))continue;
          if(arr(teacher.unavailable).map(text).includes(availability))continue;
          const kinds=occupancy.teacherKind.get(`${text(teacher.id)}|${slotKey(dayId,slotId,weekId)}`)||[];
          if(kinds.some(kind=>excludingKinds.has(kind)))continue;
          present+=1;
        }
        if(present<number(rule.minimum,0))closureIssue('MINIMUM_PRESENCE_NOT_MET',`La presencia mínima en ${availability} (${weekId}) es ${rule.minimum} y solo quedan ${present} docentes computables.`,{entity:rule.id,dayId,slotId,evaluator:'AVAILABILITY_PRESENCE',context:{weekId,required:number(rule.minimum,0),present}});
      }
    }

    for(const zone of arr(project.organization?.breakZones).filter(row=>row&&row.active!==false)){
      for(const weekId of domainWeeks)for(const day of days)for(const slotId of arr(zone.slotIds).map(text)){
        const staff=new Set();
        for(const row of expanded){if((text(row.assignment.weekId)||'W1')!==weekId||text(row.assignment.dayId)!==text(day.id)||!row.occupiedSlotIds.includes(slotId)||text(row.activity.kind)!=='BREAK_DUTY')continue;if(!(text(row.activity.zoneId)===text(zone.id)||arr(row.activity.requiredSpaceTags).map(text).includes(`ZONE:${text(zone.id)}`)))continue;for(const teacherId of unique(row.activity.teacherIds)){if(arr(zone.excludedTeacherIds).map(text).includes(teacherId))continue;const teacher=indexes.teachers.get(teacherId);if(arr(zone.essentialProfileTags).length&&!arr(zone.essentialProfileTags).some(tag=>arr(teacher?.essentialProfiles).map(text).includes(text(tag))))continue;staff.add(teacherId);}}
        const minimum=Math.max(0,integer(zone.minimumStaff,0));if(staff.size<minimum)closureIssue('BREAK_COVERAGE_PENDING',`${zone.name||zone.id}: faltan ${minimum-staff.size} docente(s) de vigilancia el ${day.label||day.id} (${weekId}).`,{entity:zone.id,dayId:day.id,slotId,evaluator:'BREAK_COVERAGE',context:{weekId,minimum,actual:staff.size}});
      }
    }

    if(project.organization?.workloadPolicy?.requireExactTarget){const counted=new Set(arr(project.organization.workloadPolicy.countedKinds).map(text));const tolerance=Math.max(0,integer(project.organization.workloadPolicy.toleranceSessions,0));for(const teacher of arr(project.teachers)){let planned=0;for(const activity of arr(project.activities))if(arr(activity.teacherIds).map(text).includes(text(teacher.id))&&counted.has(text(activity.kind)))planned+=Math.max(0,integer(activity.weeklySessions,0));const target=number(teacher.weeklyTarget,0);if(Math.abs(planned-target)>tolerance)closureIssue('WORKLOAD_TARGET_MISMATCH',`${teacher.name||teacher.id}: la carga declarada es ${planned} y el objetivo ${target}.`,{entity:teacher.id,evaluator:'WORKLOAD',context:{planned,target,tolerance}});}}
  }

  checkPreferences(project,collector,indexes);

  const blockers=issues.filter(row=>row.severity==='ERROR');
  const officialBlockers=issues.filter(row=>row.blocksOfficialClosure);
  const warnings=issues.filter(row=>row.severity==='WARNING');
  const information=issues.filter(row=>row.severity==='INFO');
  const evaluatorIds=['REFERENCES','OCCURRENCES','MULTISLOT','OCCUPANCY','AVAILABILITY_PRESENCE','SPACES','HARD_RULES','MAX_PER_DAY','FIXED_OCCURRENCES','LOCKS','LD_DC','BREAK_COVERAGE','WORKLOAD','PREFERENCES','WEEK_CYCLE','SITES_TRAVEL','RESOURCES','ACTIVITY_RELATIONS','SPLITS_CONCURRENCY','UNSUPPORTED_REQUIREMENTS'];
  const checks=evaluatorIds.map(id=>{const rows=issues.filter(row=>row.evaluator===id);return{id,status:rows.some(row=>row.severity==='ERROR')?'FAIL':rows.some(row=>row.blocksOfficialClosure||row.severity==='WARNING')?'WARN':'PASS',issues:rows.length,blocking:rows.filter(row=>row.severity==='ERROR').length,officialBlocking:rows.filter(row=>row.blocksOfficialClosure).length};});
  const mandatoryRequired=arr(project.activities).filter(row=>row?.mandatory!==false).reduce((sum,row)=>sum+requiredOccurrencesForActivity(row,normalizeEducationalDomain4(project.domain||{})),0);
  const mandatoryPlaced=assignments.filter(row=>indexes.activities.get(text(row.activityId))?.mandatory!==false).length;
  const complete=mandatoryPlaced>=mandatoryRequired&&!issues.some(row=>['MANDATORY_ACTIVITY_UNDERASSIGNED','FIXED_OCCURRENCE_MISSING'].includes(row.code));
  const status=blockers.length?'FAIL':officialBlockers.length?'PASS_WITH_OFFICIAL_BLOCKERS':warnings.length||information.length?'PASS_WITH_DIAGNOSTICS':'PASS';
  return{
    contractVersion:P10M_INDEPENDENT_VALIDATOR_CONTRACT_VERSION,phase:P10M_INDEPENDENT_VALIDATOR_PHASE,
    generatedAt,source,mode,status,valid:blockers.length===0,canOfficialClose:officialBlockers.length===0,complete,
    project:{projectId:text(project.meta?.projectId),revisionId:text(project.meta?.revisionId),revisionNumber:integer(project.meta?.revisionNumber,0),fingerprint:fnv1a({activities:project.activities,assignments:project.assignments,calendar:project.calendar,organization:project.organization,domain:project.domain,constraints:project.constraints,locks:project.locks})},
    summary:{assignments:assignments.length,activities:arr(project.activities).length,mandatoryRequired,mandatoryPlaced,blockers:blockers.length,officialBlockers:officialBlockers.length,warnings:warnings.length,information:information.length,checks:checks.length,checksPassed:checks.filter(row=>row.status==='PASS').length},
    coverage:{currentExecutableDomain:true,educationalDomainContractVersion:EDUCATIONAL_DOMAIN_CONTRACT_VERSION,independentFrom:['validateProject','revalidateProposal','generator.mjs','cp_sat_adapter.py'],validatedSources:[...P10M_VALIDATION_SOURCES],evaluators:evaluatorIds,unsupportedRequirementsExplicit:true,preferencesDiagnosticOnly:true},
    checks,issues,blockers,officialBlockers,warnings,information,
  };
}

export function assertIndependentSchedule(input,options={}){
  const report=validateScheduleIndependently(input,options);
  if(!report.valid){const first=report.blockers[0];const error=new Error(first?.message||'El horario no supera la validación semántica independiente.');error.code=first?.code||'INDEPENDENT_VALIDATION_FAILED';error.report=report;throw error;}
  if(options.requireOfficialClosure&& !report.canOfficialClose){const first=report.officialBlockers[0];const error=new Error(first?.message||'El horario no está preparado para cierre oficial.');error.code=first?.code||'INDEPENDENT_OFFICIAL_GATE_FAILED';error.report=report;throw error;}
  return report;
}

export function independentValidatorPublicSummary(report){
  return{contractVersion:report.contractVersion,phase:report.phase,status:report.status,valid:report.valid,canOfficialClose:report.canOfficialClose,complete:report.complete,summary:report.summary,checks:report.checks.map(row=>({id:row.id,status:row.status,issues:row.issues}))};
}
