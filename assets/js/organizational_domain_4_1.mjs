export const ORGANIZATIONAL_DOMAIN_CONTRACT_VERSION='organizational-domain-4.1';
export const PRESENCE_STATUSES=Object.freeze([
  'PRESENT_REQUIRED','AUTHORIZED_AWAY','OTHER_SITE','OUTSIDE_WORKDAY','PENDING',
]);
export const SERVICE_TYPES=Object.freeze(['ENTRY','ORDINARY_GUARD','BREAK','EXIT','CUSTOM']);
export const PRESENCE_REQUIREMENTS=Object.freeze(['PRESENT_AT_SITE','PRESENT_ANY_SITE','NONE']);
export const ANCHOR_POSITIONS=Object.freeze(['BEFORE','AFTER']);

const arr=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const uniq=value=>[...new Set(arr(value).map(text).filter(Boolean))];
const integer=(value,fallback=0)=>Number.isInteger(Number(value))?Number(value):fallback;
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

export function normalizePresenceStatus(value){
  const status=text(value).toUpperCase();
  if(status==='UNKNOWN'||status==='UNCONFIRMED')return 'PENDING';
  return PRESENCE_STATUSES.includes(status)?status:'PENDING';
}

export function normalizePresencePlan(value=[]){
  const seen=new Set();
  const rows=[];
  for(const [index,row] of arr(value).entries()){
    const dayId=text(row?.dayId),slotId=text(row?.slotId);
    if(!dayId||!slotId)continue;
    const key=`${dayId}:${slotId}`;
    if(seen.has(key))continue;
    seen.add(key);
    rows.push({
      id:text(row?.id)||`presence_${index+1}`,
      dayId,slotId,
      status:normalizePresenceStatus(row?.status),
      siteId:text(row?.siteId),
      note:text(row?.note),
      dataState:['CONFIRMED','PROVISIONAL','SIMULATED','PENDING'].includes(row?.dataState)?row.dataState:'PENDING',
      provenance:row?.provenance&&typeof row.provenance==='object'?{...row.provenance}:{},
    });
  }
  return rows;
}

export function normalizePresencePolicy(value={}){
  return {
    explicitPlanEnabled:value?.explicitPlanEnabled===true,
    unknownBlocksCoverage:value?.unknownBlocksCoverage!==false,
    pendingBlocksCoverage:value?.pendingBlocksCoverage!==false,
    legacyFallback:value?.legacyFallback!==false,
  };
}

export function normalizeOrganizationalService41(value={}){
  return {
    serviceType:SERVICE_TYPES.includes(value?.serviceType)?value.serviceType:'CUSTOM',
    durationSlots:Math.max(1,integer(value?.durationSlots,1)),
    compatibleSlotKinds:uniq(value?.compatibleSlotKinds).filter(x=>['CLASS','BREAK','OTHER'].includes(x)),
    presenceRequirement:PRESENCE_REQUIREMENTS.includes(value?.presenceRequirement)?value.presenceRequirement:'PRESENT_AT_SITE',
    balanceWeight:Math.max(0,number(value?.balanceWeight,1)),
    siteId:text(value?.siteId),
  };
}

export function normalizeAnchoredSegment(value={},index=0){
  return {
    id:text(value?.id)||`anchored_segment_${index+1}`,
    name:text(value?.name)||`Segmento anclado ${index+1}`,
    anchorActivityId:text(value?.anchorActivityId),
    segmentActivityId:text(value?.segmentActivityId),
    position:ANCHOR_POSITIONS.includes(value?.position)?value.position:'AFTER',
    active:value?.active!==false,
    dataState:['CONFIRMED','PROVISIONAL','SIMULATED','PENDING'].includes(value?.dataState)?value.dataState:'PENDING',
    provenance:value?.provenance&&typeof value.provenance==='object'?{...value.provenance}:{},
  };
}

export function normalizeAnchoredSegments(value=[]){return arr(value).map(normalizeAnchoredSegment);}

export function presenceRecordAt(teacher,dayId,slotId){
  return normalizePresencePlan(teacher?.presencePlan).find(row=>row.dayId===dayId&&row.slotId===slotId)||null;
}

export function teacherPresenceDecision(teacher,dayId,slotId,{siteId='',purpose='SCHEDULE',policy={}}={}){
  const normalizedPolicy=normalizePresencePolicy(policy);
  const plan=normalizePresencePlan(teacher?.presencePlan);
  if(plan.length||normalizedPolicy.explicitPlanEnabled){
    const row=plan.find(item=>item.dayId===dayId&&item.slotId===slotId)||null;
    if(!row)return {allowed:false,status:'PENDING',reason:'No consta una situación de presencia confirmada para esta franja.'};
    if(row.status==='AUTHORIZED_AWAY')return {allowed:false,status:row.status,reason:'Consta una ausencia autorizada del centro.'};
    if(row.status==='OUTSIDE_WORKDAY')return {allowed:false,status:row.status,reason:'La franja queda fuera de la jornada del docente.'};
    if(row.status==='PENDING')return {allowed:false,status:row.status,reason:'La presencia está pendiente de confirmar.'};
    if(row.status==='OTHER_SITE'){
      if(!row.siteId)return {allowed:false,status:row.status,reason:'La otra sede no está identificada.'};
      if(siteId&&row.siteId!==siteId)return {allowed:false,status:row.status,reason:'El docente consta en otra sede.'};
      return {allowed:true,status:row.status,siteId:row.siteId,reason:'Presencia confirmada en otra sede.'};
    }
    if(row.status==='PRESENT_REQUIRED'){
      if(row.siteId&&siteId&&row.siteId!==siteId)return {allowed:false,status:row.status,reason:'La presencia obligatoria está vinculada a otra sede.'};
      return {allowed:true,status:row.status,siteId:row.siteId,reason:'Presencia obligatoria confirmada.'};
    }
  }
  if(normalizedPolicy.legacyFallback){
    const key=`${dayId}:${slotId}`;
    if(arr(teacher?.unavailable).includes(key))return {allowed:false,status:'AUTHORIZED_AWAY',reason:'La franja está marcada como no disponible.'};
    if(arr(teacher?.presence).length&&!arr(teacher?.presence).includes(key))return {allowed:false,status:'PENDING',reason:'No consta presencia en la lista heredada.'};
    if(teacher?.itinerary?.enabled&&arr(teacher.itinerary.presenceDays).length&&!arr(teacher.itinerary.presenceDays).includes(dayId))return {allowed:false,status:'AUTHORIZED_AWAY',reason:'El docente itinerante no está presente ese día.'};
    return {allowed:true,status:'LEGACY_AVAILABLE',siteId:'',reason:'Disponibilidad heredada.'};
  }
  return {allowed:purpose!=='COVERAGE',status:'PENDING',reason:'La situación de presencia no está confirmada.'};
}

export function serviceAllowedSlotKinds(service){
  const configured=normalizeOrganizationalService41(service).compatibleSlotKinds;
  if(configured.length)return configured;
  if(service?.serviceType==='BREAK'||service?.kind==='BREAK_DUTY')return ['BREAK'];
  if(['ENTRY','EXIT'].includes(service?.serviceType))return ['OTHER','CLASS'];
  return ['CLASS'];
}

export function anchoredSegmentRelations(segments=[]){
  return normalizeAnchoredSegments(segments).filter(x=>x.active!==false&&x.anchorActivityId&&x.segmentActivityId).map(row=>({
    id:`org_anchor_${row.id}`,
    type:row.position==='BEFORE'?'IMMEDIATELY_BEFORE':'IMMEDIATELY_AFTER',
    leftActivityId:row.segmentActivityId,
    rightActivityId:row.anchorActivityId,
    value:0,hard:true,weight:0,sameWeek:true,active:true,
    note:row.name,
    organizationKey:`ANCHORED_SEGMENT:${row.id}`,
  }));
}

export function validateOrganizationalDomain41(project){
  const issues=[];const push=(severity,code,message,entity='')=>issues.push({severity,code,message,entity});
  const days=new Set(arr(project?.calendar?.days).map(x=>text(x?.id))),slots=new Set(arr(project?.calendar?.slots).map(x=>text(x?.id))),sites=new Set(arr(project?.domain?.sites).map(x=>text(x?.id))),activities=new Set(arr(project?.activities).map(x=>text(x?.id)));
  for(const teacher of arr(project?.teachers)){
    const seen=new Set();
    for(const row of normalizePresencePlan(teacher?.presencePlan)){
      const key=`${row.dayId}:${row.slotId}`;
      if(seen.has(key))push('ERROR','PRESENCE_PLAN_DUPLICATED',`${teacher.name||teacher.id}: la franja ${key} está repetida.`,teacher.id);seen.add(key);
      if(!days.has(row.dayId)||!slots.has(row.slotId))push('ERROR','PRESENCE_PLAN_TIME_BROKEN',`${teacher.name||teacher.id}: la planificación de presencia usa una franja inexistente.`,teacher.id);
      if(row.siteId&&!sites.has(row.siteId))push('ERROR','PRESENCE_PLAN_SITE_BROKEN',`${teacher.name||teacher.id}: la planificación de presencia usa una sede inexistente.`,teacher.id);
      if(row.status==='OTHER_SITE'&&!row.siteId)push('ERROR','PRESENCE_OTHER_SITE_REQUIRED',`${teacher.name||teacher.id}: falta identificar la otra sede.`,teacher.id);
    }
  }
  for(const service of arr(project?.organization?.services)){
    const extra=normalizeOrganizationalService41(service);
    if(extra.siteId&&!sites.has(extra.siteId))push('ERROR','ORG_SERVICE_SITE_BROKEN',`${service.name||service.id}: la sede no existe.`,service.id);
    if(!extra.compatibleSlotKinds.length)push('WARNING','ORG_SERVICE_SLOT_KIND_DEFAULTED',`${service.name||service.id}: se aplicará la compatibilidad de tramos predeterminada.`,service.id);
  }
  for(const segment of normalizeAnchoredSegments(project?.organization?.anchoredSegments)){
    if(!activities.has(segment.anchorActivityId)||!activities.has(segment.segmentActivityId))push('ERROR','ANCHORED_SEGMENT_ACTIVITY_BROKEN',`${segment.name}: una de las actividades no existe.`,segment.id);
    if(segment.anchorActivityId===segment.segmentActivityId)push('ERROR','ANCHORED_SEGMENT_SELF_REFERENCE',`${segment.name}: una actividad no puede anclarse a sí misma.`,segment.id);
  }
  return {contractVersion:ORGANIZATIONAL_DOMAIN_CONTRACT_VERSION,issues,errors:issues.filter(x=>x.severity==='ERROR'),warnings:issues.filter(x=>x.severity==='WARNING')};
}
