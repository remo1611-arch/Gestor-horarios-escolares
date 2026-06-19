export const EDUCATIONAL_DOMAIN_CONTRACT_VERSION='educational-domain-4.0';
export const EDUCATIONAL_DOMAIN_SCHEMA_VERSION='4.0';
export const EDUCATIONAL_DOMAIN_PHASE='P10M-4';
export const CYCLE_MODES=Object.freeze(['WEEKLY','AB','CUSTOM']);
export const RELATION_TYPES=Object.freeze([
  'SAME_START','SAME_DAY','DIFFERENT_DAY','BEFORE','AFTER','CONSECUTIVE','IMMEDIATELY_BEFORE','IMMEDIATELY_AFTER','NOT_CONSECUTIVE','MIN_GAP_SLOTS','MAX_GAP_SLOTS'
]);
export const SPLIT_MODES=Object.freeze(['SIMULTANEOUS','ALTERNATIVE']);
export const RESOURCE_KINDS=Object.freeze(['EQUIPMENT','SPECIALIST','MATERIAL','SERVICE','OTHER']);

const arr=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const int=(value,fallback=0)=>Number.isInteger(Number(value))?Number(value):fallback;
const bool=(value,fallback=false)=>value===true?true:value===false?false:fallback;
const uniq=value=>[...new Set(arr(value).map(text).filter(Boolean))];
const clone=value=>JSON.parse(JSON.stringify(value));

export function defaultEducationalDomain4(){
  return {
    contractVersion:EDUCATIONAL_DOMAIN_CONTRACT_VERSION,
    cycle:{
      mode:'WEEKLY',
      weeks:[{id:'W1',label:'Semana ordinaria',order:1,active:true}],
    },
    sites:[],
    travelRules:[],
    resources:[],
    activityRelations:[],
    splitSets:[],
    policy:{
      weeklySessionsMeaning:'PER_APPLICABLE_WEEK',
      missingWeekIdFallback:'W1',
      travelMinutesSource:'SITE_MATRIX',
      unsupportedHardRequirementsBlockGeneration:true,
    },
  };
}

function normalizeWeeks(value,mode){
  const rows=arr(value).map((row,index)=>({
    id:text(row?.id)||`W${index+1}`,
    label:text(row?.label)||`Semana ${index+1}`,
    order:int(row?.order,index+1)||index+1,
    active:row?.active!==false,
  }));
  const seen=new Set();
  const unique=[];
  for(const row of rows){if(!seen.has(row.id)){seen.add(row.id);unique.push(row);}}
  if(!unique.length)unique.push({id:'W1',label:'Semana ordinaria',order:1,active:true});
  if(mode==='WEEKLY')return [{...unique[0],id:'W1',label:unique[0].label||'Semana ordinaria',order:1,active:true}];
  if(mode==='AB'&&unique.length<2)return [
    {id:'A',label:'Semana A',order:1,active:true},
    {id:'B',label:'Semana B',order:2,active:true},
  ];
  return unique.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
}

export function normalizeEducationalDomain4(value={}){
  const base=defaultEducationalDomain4();
  const mode=CYCLE_MODES.includes(value?.cycle?.mode)?value.cycle.mode:'WEEKLY';
  const domain={
    contractVersion:EDUCATIONAL_DOMAIN_CONTRACT_VERSION,
    cycle:{mode,weeks:normalizeWeeks(value?.cycle?.weeks,mode)},
    sites:arr(value?.sites).map((row,index)=>({
      id:text(row?.id)||`site_${index+1}`,
      name:text(row?.name)||`Sede ${index+1}`,
      building:text(row?.building),
      addressLabel:text(row?.addressLabel),
      active:row?.active!==false,
      dataState:text(row?.dataState)||'PENDING',
      provenance:row?.provenance&&typeof row.provenance==='object'?clone(row.provenance):{},
    })),
    travelRules:arr(value?.travelRules).map((row,index)=>({
      id:text(row?.id)||`travel_${index+1}`,
      fromSiteId:text(row?.fromSiteId),
      toSiteId:text(row?.toSiteId),
      minutes:Math.max(0,int(row?.minutes,0)),
      bidirectional:row?.bidirectional!==false,
      active:row?.active!==false,
      dataState:text(row?.dataState)||'PENDING',
      provenance:row?.provenance&&typeof row.provenance==='object'?clone(row.provenance):{},
    })),
    resources:arr(value?.resources).map((row,index)=>({
      id:text(row?.id)||`resource_${index+1}`,
      name:text(row?.name)||`Recurso ${index+1}`,
      kind:RESOURCE_KINDS.includes(row?.kind)?row.kind:'OTHER',
      capacity:Math.max(1,int(row?.capacity,1)),
      siteId:text(row?.siteId),
      tags:uniq(row?.tags).map(x=>x.toUpperCase()),
      active:row?.active!==false,
      dataState:text(row?.dataState)||'PENDING',
      provenance:row?.provenance&&typeof row.provenance==='object'?clone(row.provenance):{},
    })),
    activityRelations:arr(value?.activityRelations).map((row,index)=>({
      id:text(row?.id)||`relation_${index+1}`,
      type:RELATION_TYPES.includes(row?.type)?row.type:'SAME_DAY',
      leftActivityId:text(row?.leftActivityId),
      rightActivityId:text(row?.rightActivityId),
      value:Math.max(0,int(row?.value,0)),
      hard:row?.hard!==false,
      weight:Math.max(0,num(row?.weight,0)),
      sameWeek:row?.sameWeek!==false,
      active:row?.active!==false,
      note:text(row?.note),
    })),
    splitSets:arr(value?.splitSets).map((row,index)=>({
      id:text(row?.id)||`split_${index+1}`,
      name:text(row?.name)||`Desdoble ${index+1}`,
      mode:SPLIT_MODES.includes(row?.mode)?row.mode:'SIMULTANEOUS',
      activityIds:uniq(row?.activityIds),
      groupIds:uniq(row?.groupIds),
      active:row?.active!==false,
      note:text(row?.note),
    })),
    policy:{...base.policy,...(value?.policy||{})},
  };
  return domain;
}

export function normalizeTeacherDomain4(value={}){
  const itinerary={...(value.itinerary||{})};
  return {
    ...value,
    homeSiteId:text(value.homeSiteId),
    allowedSiteIds:uniq(value.allowedSiteIds),
    itinerary:{
      ...itinerary,
      routeSiteIds:uniq(itinerary.routeSiteIds),
      travelPolicy:text(itinerary.travelPolicy)||'SITE_MATRIX',
    },
  };
}

export function normalizeGroupDomain4(value={}){
  return {...value,homeSiteId:text(value.homeSiteId),size:Math.max(0,int(value.size,0))};
}

export function normalizeSpaceDomain4(value={}){
  return {
    ...value,
    siteId:text(value.siteId),
    seatCapacity:Math.max(0,int(value.seatCapacity,0)),
    resourceIds:uniq(value.resourceIds),
    equivalentSpaceIds:uniq(value.equivalentSpaceIds),
  };
}

export function normalizeActivityDomain4(value={},domain=defaultEducationalDomain4()){
  const weekIds=new Set(activeWeekIds(domain));
  const requested=uniq(value?.weekPattern?.weekIds).filter(id=>weekIds.has(id));
  const mode=value?.weekPattern?.mode==='INCLUDE'?'INCLUDE':'ALL';
  return {
    ...value,
    durationSlots:Math.max(1,int(value.durationSlots,1)),
    weekPattern:{mode,weekIds:mode==='INCLUDE'&&requested.length?requested:[]},
    allowedSiteIds:uniq(value.allowedSiteIds),
    preferredSiteIds:uniq(value.preferredSiteIds),
    allowedSpaceIds:uniq(value.allowedSpaceIds),
    preferredSpaceIds:uniq(value.preferredSpaceIds),
    alternativeSpaceIds:uniq(value.alternativeSpaceIds),
    requiredResourceIds:uniq(value.requiredResourceIds),
    preferredResourceIds:uniq(value.preferredResourceIds),
    relationIds:uniq(value.relationIds),
    splitSetId:text(value.splitSetId),
    concurrencyKey:text(value.concurrencyKey),
  };
}

export function normalizeAssignmentDomain4(value={},domain=defaultEducationalDomain4()){
  const weeks=activeWeekIds(domain);
  const candidate=text(value.weekId);
  return {
    ...value,
    weekId:weeks.includes(candidate)?candidate:(weeks[0]||'W1'),
    resourceIds:uniq(value.resourceIds),
  };
}

export function activeWeekIds(domain){
  return arr(domain?.cycle?.weeks).filter(row=>row?.active!==false).map(row=>text(row.id)).filter(Boolean);
}

export function activityWeekIds(activity,domain){
  const active=activeWeekIds(domain);
  if(activity?.weekPattern?.mode==='INCLUDE'){
    const selected=uniq(activity.weekPattern.weekIds).filter(id=>active.includes(id));
    return selected.length?selected:active;
  }
  return active;
}

export function requiredOccurrencesForActivity(activity,domain){
  return Math.max(0,int(activity?.weeklySessions,0))*Math.max(1,activityWeekIds(activity,domain).length);
}

export function assignmentCycleKey(assignment){return `${text(assignment?.weekId)||'W1'}:${text(assignment?.dayId)}:${text(assignment?.slotId)}`;}

export function siteTravelMinutes(domain,fromSiteId,toSiteId){
  const from=text(fromSiteId),to=text(toSiteId);
  if(!from||!to||from===to)return 0;
  for(const rule of arr(domain?.travelRules).filter(row=>row?.active!==false)){
    if(text(rule.fromSiteId)===from&&text(rule.toSiteId)===to)return Math.max(0,int(rule.minutes,0));
    if(rule.bidirectional!==false&&text(rule.fromSiteId)===to&&text(rule.toSiteId)===from)return Math.max(0,int(rule.minutes,0));
  }
  return null;
}

export function validateEducationalDomain4(project){
  const issues=[];
  const push=(severity,code,message,entity=null,blocksGeneration=severity==='ERROR')=>issues.push({severity,code,message,entity,blocksGeneration,blocksFinalization:severity!=='INFO'});
  const domain=normalizeEducationalDomain4(project?.domain||{});
  const weekIds=activeWeekIds(domain),siteIds=new Set(domain.sites.filter(x=>x.active!==false).map(x=>x.id));
  const resourceIds=new Set(domain.resources.filter(x=>x.active!==false).map(x=>x.id));
  const activityIds=new Set(arr(project?.activities).map(x=>text(x.id)));
  const groupIds=new Set(arr(project?.groups).map(x=>text(x.id)));
  const spaceIds=new Set(arr(project?.spaces).map(x=>text(x.id)));
  const relationIds=new Set(),splitIds=new Set();
  if(!weekIds.length)push('ERROR','DOMAIN_WEEK_REQUIRED','El dominio 4.0 necesita al menos una semana activa.','domain.cycle');
  if(domain.cycle.mode==='AB'&&weekIds.length!==2)push('ERROR','DOMAIN_AB_REQUIRES_TWO_WEEKS','El ciclo A/B debe contener exactamente dos semanas activas.','domain.cycle');
  const duplicate=(rows,label)=>{const seen=new Set();for(const row of rows){if(seen.has(row.id))push('ERROR','DOMAIN_ID_DUPLICATED',`Identificador duplicado en ${label}: ${row.id}.`,row.id);seen.add(row.id);}};
  duplicate(domain.sites,'sedes');duplicate(domain.resources,'recursos');duplicate(domain.travelRules,'desplazamientos');duplicate(domain.activityRelations,'relaciones');duplicate(domain.splitSets,'desdobles');
  for(const rule of domain.travelRules.filter(x=>x.active!==false)){
    if(!siteIds.has(rule.fromSiteId)||!siteIds.has(rule.toSiteId))push('ERROR','TRAVEL_SITE_REFERENCE_BROKEN','Una regla de desplazamiento apunta a una sede inexistente.',rule.id);
    if(rule.fromSiteId===rule.toSiteId)push('WARNING','TRAVEL_SAME_SITE_REDUNDANT','Una regla de desplazamiento conecta una sede consigo misma.',rule.id,false);
  }
  for(const resource of domain.resources.filter(x=>x.active!==false))if(resource.siteId&&!siteIds.has(resource.siteId))push('ERROR','RESOURCE_SITE_BROKEN',`${resource.name}: la sede no existe.`,resource.id);
  for(const relation of domain.activityRelations.filter(x=>x.active!==false)){
    if(relationIds.has(relation.id))push('ERROR','RELATION_ID_DUPLICATED',`Relación duplicada: ${relation.id}.`,relation.id);relationIds.add(relation.id);
    if(!activityIds.has(relation.leftActivityId)||!activityIds.has(relation.rightActivityId))push('ERROR','RELATION_ACTIVITY_BROKEN','Una relación apunta a una actividad inexistente.',relation.id);
    if(relation.leftActivityId===relation.rightActivityId)push('ERROR','RELATION_SELF_REFERENCE','Una actividad no puede relacionarse consigo misma.',relation.id);
    if(['MIN_GAP_SLOTS','MAX_GAP_SLOTS'].includes(relation.type)&&relation.value<1)push('ERROR','RELATION_GAP_INVALID','La separación debe ser un entero positivo.',relation.id);
  }
  for(const split of domain.splitSets.filter(x=>x.active!==false)){
    if(splitIds.has(split.id))push('ERROR','SPLIT_ID_DUPLICATED',`Desdoble duplicado: ${split.id}.`,split.id);splitIds.add(split.id);
    if(split.activityIds.length<2)push('ERROR','SPLIT_ACTIVITIES_REQUIRED',`${split.name}: se necesitan al menos dos actividades.`,split.id);
    for(const id of split.activityIds)if(!activityIds.has(id))push('ERROR','SPLIT_ACTIVITY_BROKEN',`${split.name}: una actividad no existe.`,split.id);
    for(const id of split.groupIds)if(!groupIds.has(id))push('ERROR','SPLIT_GROUP_BROKEN',`${split.name}: un grupo no existe.`,split.id);
  }
  for(const teacher of arr(project?.teachers)){
    if(teacher.homeSiteId&&!siteIds.has(teacher.homeSiteId))push('ERROR','TEACHER_HOME_SITE_BROKEN',`${teacher.name}: la sede habitual no existe.`,teacher.id);
    for(const id of uniq(teacher.allowedSiteIds))if(!siteIds.has(id))push('ERROR','TEACHER_ALLOWED_SITE_BROKEN',`${teacher.name}: una sede permitida no existe.`,teacher.id);
    for(const id of uniq(teacher.itinerary?.routeSiteIds))if(!siteIds.has(id))push('ERROR','TEACHER_ROUTE_SITE_BROKEN',`${teacher.name}: una sede de itinerancia no existe.`,teacher.id);
  }
  for(const group of arr(project?.groups))if(group.homeSiteId&&!siteIds.has(group.homeSiteId))push('ERROR','GROUP_HOME_SITE_BROKEN',`${group.name}: la sede habitual no existe.`,group.id);
  for(const space of arr(project?.spaces)){
    if(space.siteId&&!siteIds.has(space.siteId))push('ERROR','SPACE_SITE_BROKEN',`${space.name}: la sede no existe.`,space.id);
    for(const id of uniq(space.resourceIds))if(!resourceIds.has(id))push('ERROR','SPACE_RESOURCE_BROKEN',`${space.name}: un recurso no existe.`,space.id);
    for(const id of uniq(space.equivalentSpaceIds))if(!spaceIds.has(id))push('ERROR','EQUIVALENT_SPACE_BROKEN',`${space.name}: un espacio equivalente no existe.`,space.id);
  }
  for(const activity of arr(project?.activities)){
    const applicable=activityWeekIds(activity,domain);
    if(!applicable.length)push('ERROR','ACTIVITY_WEEK_PATTERN_EMPTY',`${activity.name}: no se aplica a ninguna semana activa.`,activity.id);
    for(const id of uniq(activity.allowedSiteIds))if(!siteIds.has(id))push('ERROR','ACTIVITY_ALLOWED_SITE_BROKEN',`${activity.name}: una sede permitida no existe.`,activity.id);
    for(const id of uniq(activity.preferredSiteIds))if(!siteIds.has(id))push('ERROR','ACTIVITY_PREFERRED_SITE_BROKEN',`${activity.name}: una sede preferente no existe.`,activity.id);
    for(const id of [...uniq(activity.allowedSpaceIds),...uniq(activity.preferredSpaceIds),...uniq(activity.alternativeSpaceIds)])if(!spaceIds.has(id))push('ERROR','ACTIVITY_SPACE_REFERENCE_BROKEN',`${activity.name}: un espacio explícito no existe.`,activity.id);
    for(const id of [...uniq(activity.requiredResourceIds),...uniq(activity.preferredResourceIds)])if(!resourceIds.has(id))push('ERROR','ACTIVITY_RESOURCE_REFERENCE_BROKEN',`${activity.name}: un recurso no existe.`,activity.id);
    if(activity.splitSetId&&!splitIds.has(activity.splitSetId))push('ERROR','ACTIVITY_SPLIT_SET_BROKEN',`${activity.name}: el desdoble no existe.`,activity.id);
    for(const id of uniq(activity.relationIds))if(!relationIds.has(id))push('ERROR','ACTIVITY_RELATION_BROKEN',`${activity.name}: una relación no existe.`,activity.id);
  }
  for(const assignment of arr(project?.assignments)){
    if(!weekIds.includes(text(assignment.weekId)||'W1'))push('ERROR','ASSIGNMENT_WEEK_BROKEN','Una sesión usa una semana inexistente.',assignment.id);
    for(const id of uniq(assignment.resourceIds))if(!resourceIds.has(id))push('ERROR','ASSIGNMENT_RESOURCE_BROKEN','Una sesión usa un recurso inexistente.',assignment.id);
  }
  return {contractVersion:EDUCATIONAL_DOMAIN_CONTRACT_VERSION,issues,errors:issues.filter(x=>x.severity==='ERROR'),warnings:issues.filter(x=>x.severity==='WARNING')};
}

export function domain4EngineRequirements(project){
  const domain=normalizeEducationalDomain4(project?.domain||{});
  const reasons=[];
  if(domain.cycle.mode!=='WEEKLY'||activeWeekIds(domain).length>1)reasons.push('WEEK_CYCLE');
  if(domain.sites.length||domain.travelRules.length||arr(project?.activities).some(row=>(row.allowedSiteIds?.length||0)||(row.preferredSiteIds?.length||0)))reasons.push('SITES_TRAVEL');
  if(domain.resources.length||arr(project?.activities).some(row=>(row.requiredResourceIds?.length||0)||(row.preferredResourceIds?.length||0)))reasons.push('RESOURCES');
  if(domain.activityRelations.some(row=>row.active!==false))reasons.push('ACTIVITY_RELATIONS');
  if(domain.splitSets.some(row=>row.active!==false))reasons.push('SPLITS_CONCURRENCY');
  if(arr(project?.activities).some(row=>Number(row.durationSlots||1)>1))reasons.push('MULTISLOT');
  return {required:reasons.length>0,reasons:[...new Set(reasons)]};
}
