import {
  CYCLE_MODES, RELATION_TYPES, SPLIT_MODES, RESOURCE_KINDS,
  normalizeEducationalDomain4, normalizeActivityDomain4,
  activeWeekIds, validateEducationalDomain4, domain4EngineRequirements,
} from './educational_domain_4.mjs';

export const P10M5_ASSISTANT_CONTRACT_VERSION='product-semantic-assistants-1.0';
export const P10M5_ASSISTANT_PHASE='P10M-5';
export const P10M5_ASSISTANT_IDS=Object.freeze([
  'SCHOOL_CYCLE','SITES_AND_TRAVEL','RESOURCES_AND_SPACES','ACTIVITY_CONFIGURATION',
  'ACTIVITY_RELATIONS','SPLITS_AND_CONCURRENCY','ORGANIZATIONAL_RULES','GENERATION_READINESS',
]);

const clone=value=>JSON.parse(JSON.stringify(value));
const arr=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const uniq=value=>[...new Set(arr(value).map(text).filter(Boolean))];
const idSafe=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const int=(value,fallback=0)=>Number.isInteger(Number(value))?Number(value):fallback;

export const P10M5_ASSISTANTS=Object.freeze([
  Object.freeze({id:'SCHOOL_CYCLE',title:'Semanas y ciclos',purpose:'Indicar si el horario se repite cada semana o alterna semanas A/B.',ordinaryRoute:'Organización → Configuración educativa',steps:['Elegir el tipo de ciclo','Nombrar las semanas','Revisar las actividades afectadas']}),
  Object.freeze({id:'SITES_AND_TRAVEL',title:'Sedes y desplazamientos',purpose:'Definir edificios o sedes y el tiempo necesario para desplazarse entre ellos.',ordinaryRoute:'Organización → Configuración educativa',steps:['Añadir sedes','Indicar los trayectos','Asignar sedes a espacios y actividades']}),
  Object.freeze({id:'RESOURCES_AND_SPACES',title:'Recursos y espacios',purpose:'Registrar recursos limitados y alternativas de espacio sin editar estructuras técnicas.',ordinaryRoute:'Organización → Configuración educativa',steps:['Añadir recursos','Indicar capacidad y sede','Vincularlos a actividades o espacios']}),
  Object.freeze({id:'ACTIVITY_CONFIGURATION',title:'Necesidades de las actividades',purpose:'Configurar semanas, duración, sedes, espacios y recursos de cada actividad.',ordinaryRoute:'Organización → Configuración educativa',steps:['Elegir una actividad','Indicar sus necesidades','Comprobar que existen alternativas']}),
  Object.freeze({id:'ACTIVITY_RELATIONS',title:'Relaciones entre actividades',purpose:'Expresar que dos actividades deben coincidir, separarse, ir consecutivas o mantener un orden.',ordinaryRoute:'Organización → Configuración educativa',steps:['Elegir dos actividades','Seleccionar la relación','Decidir si es imprescindible o preferente']}),
  Object.freeze({id:'SPLITS_AND_CONCURRENCY',title:'Desdobles y simultaneidades',purpose:'Agrupar actividades que deben celebrarse al mismo tiempo o de forma alternativa.',ordinaryRoute:'Organización → Configuración educativa',steps:['Nombrar el desdoble','Seleccionar actividades y grupos','Elegir simultáneo o alternativo']}),
  Object.freeze({id:'ORGANIZATIONAL_RULES',title:'Reglas del centro',purpose:'Revisar cargas, presencia mínima, recreos, guardias, cargos y reducciones.',ordinaryRoute:'Organización',steps:['Activar el perfil','Configurar reglas','Sincronizar las actividades organizativas']}),
  Object.freeze({id:'GENERATION_READINESS',title:'Comprobación antes de generar',purpose:'Explicar qué está preparado, qué falta y qué tipo de generación necesita el proyecto.',ordinaryRoute:'Horario → Generar y estado',steps:['Comprobar datos','Corregir bloqueos','Generar una propuesta']}),
]);

export const RELATION_LABELS=Object.freeze({
  SAME_START:'Comenzar a la vez',SAME_DAY:'Celebrarse el mismo día',DIFFERENT_DAY:'Celebrarse en días distintos',
  BEFORE:'La primera debe ir antes',AFTER:'La primera debe ir después',CONSECUTIVE:'Periodos consecutivos',
  IMMEDIATELY_BEFORE:'La primera va inmediatamente antes',IMMEDIATELY_AFTER:'La primera va inmediatamente después',
  NOT_CONSECUTIVE:'No consecutivas',MIN_GAP_SLOTS:'Separación mínima',MAX_GAP_SLOTS:'Separación máxima',
});
export const RESOURCE_KIND_LABELS=Object.freeze({EQUIPMENT:'Equipo',SPECIALIST:'Especialista',MATERIAL:'Material',SERVICE:'Servicio',OTHER:'Otro recurso'});
export const SPLIT_MODE_LABELS=Object.freeze({SIMULTANEOUS:'Simultáneo',ALTERNATIVE:'Alternativo'});

function nextId(prefix,rows,label=''){
  const preferred=idSafe(label);const base=preferred?`${prefix}_${preferred}`:prefix;
  const used=new Set(arr(rows).map(row=>text(row.id)));
  if(!used.has(base))return base;
  let n=2;while(used.has(`${base}_${n}`))n+=1;return `${base}_${n}`;
}
function findById(rows,id){return arr(rows).find(row=>text(row.id)===text(id));}
function result(errors=[],warnings=[],preview={}){return {ok:errors.length===0,errors,warnings,preview};}
function requireRef(rows,id,label,errors){if(text(id)&&!findById(rows,id))errors.push(`${label}: no se encontró la referencia seleccionada.`);}

export function semanticAssistantCatalog(){return P10M5_ASSISTANTS.map(row=>clone(row));}

export function semanticAssistantOverview(project){
  const domain=normalizeEducationalDomain4(project?.domain||{});
  const validation=validateEducationalDomain4({...project,domain});
  const engine=domain4EngineRequirements({...project,domain});
  const configuredActivities=arr(project?.activities).filter(row=>Number(row.durationSlots||1)>1||row.weekPattern?.mode==='INCLUDE'||arr(row.allowedSiteIds).length||arr(row.preferredSiteIds).length||arr(row.allowedSpaceIds).length||arr(row.alternativeSpaceIds).length||arr(row.requiredResourceIds).length||arr(row.preferredResourceIds).length).length;
  const sections=[
    {id:'SCHOOL_CYCLE',configured:activeWeekIds(domain).length,status:activeWeekIds(domain).length?'READY':'PENDING',summary:`${activeWeekIds(domain).length} semana(s) activa(s)`},
    {id:'SITES_AND_TRAVEL',configured:domain.sites.length+domain.travelRules.length,status:domain.sites.length?'READY':'OPTIONAL',summary:`${domain.sites.length} sede(s) y ${domain.travelRules.length} trayecto(s)`},
    {id:'RESOURCES_AND_SPACES',configured:domain.resources.length,status:domain.resources.length?'READY':'OPTIONAL',summary:`${domain.resources.length} recurso(s) compartido(s)`},
    {id:'ACTIVITY_CONFIGURATION',configured:configuredActivities,status:configuredActivities?'READY':'OPTIONAL',summary:`${configuredActivities}/${arr(project?.activities).length} actividades con necesidades avanzadas`},
    {id:'ACTIVITY_RELATIONS',configured:domain.activityRelations.length,status:domain.activityRelations.length?'READY':'OPTIONAL',summary:`${domain.activityRelations.length} relación(es)`},
    {id:'SPLITS_AND_CONCURRENCY',configured:domain.splitSets.length,status:domain.splitSets.length?'READY':'OPTIONAL',summary:`${domain.splitSets.length} desdoble(s)`},
    {id:'ORGANIZATIONAL_RULES',configured:project?.organization?.enabled?1:0,status:project?.organization?.enabled?'READY':'OPTIONAL',summary:project?.organization?.enabled?'Perfil organizativo activo':'Perfil organizativo no activado'},
    {id:'GENERATION_READINESS',configured:validation.errors.length?0:1,status:validation.errors.length?'BLOCKED':'READY',summary:validation.errors.length?`${validation.errors.length} bloqueo(s) de configuración`:(engine.required?'Necesita optimización avanzada':'Compatible con generación rápida')},
  ];
  return {contractVersion:P10M5_ASSISTANT_CONTRACT_VERSION,domain,validation,engine,sections,ordinaryJsonEditingRequired:false,allOrdinaryCapabilitiesGuided:true};
}

export function validateSemanticAssistantCommand(project,command={}){
  const domain=normalizeEducationalDomain4(project?.domain||{}),errors=[],warnings=[];
  const type=text(command.type),p=command.payload||{};
  if(!type)return result(['Falta la operación del asistente.']);
  if(type==='SET_CYCLE'){
    if(!CYCLE_MODES.includes(p.mode))errors.push('Selecciona un tipo de ciclo válido.');
    if(p.mode==='CUSTOM'&&uniq(p.labels).length<2)errors.push('Un ciclo personalizado necesita al menos dos semanas.');
    return result(errors,warnings,{mode:p.mode,labels:uniq(p.labels)});
  }
  if(type==='UPSERT_SITE'){
    if(!text(p.name))errors.push('Indica el nombre de la sede.');
    const duplicate=domain.sites.find(row=>row.id!==p.id&&row.name.toLowerCase()===text(p.name).toLowerCase());if(duplicate)errors.push('Ya existe una sede con ese nombre.');
    return result(errors,warnings,{id:text(p.id)||nextId('SITE',domain.sites,p.name),name:text(p.name),building:text(p.building),addressLabel:text(p.addressLabel)});
  }
  if(type==='DELETE_SITE'){
    const id=text(p.id);requireRef(domain.sites,id,'Sede',errors);
    const used=domain.travelRules.some(row=>row.fromSiteId===id||row.toSiteId===id)||domain.resources.some(row=>row.siteId===id)||arr(project.teachers).some(row=>row.homeSiteId===id||arr(row.allowedSiteIds).includes(id)||arr(row.itinerary?.routeSiteIds).includes(id))||arr(project.groups).some(row=>row.homeSiteId===id)||arr(project.spaces).some(row=>row.siteId===id)||arr(project.activities).some(row=>arr(row.allowedSiteIds).includes(id)||arr(row.preferredSiteIds).includes(id));
    if(used)errors.push('La sede está utilizada. Retira primero sus trayectos, recursos y asignaciones.');
    return result(errors,warnings,{id});
  }
  if(type==='UPSERT_TRAVEL'){
    requireRef(domain.sites,p.fromSiteId,'Sede de origen',errors);requireRef(domain.sites,p.toSiteId,'Sede de destino',errors);
    if(text(p.fromSiteId)===text(p.toSiteId))errors.push('El origen y el destino deben ser diferentes.');
    if(int(p.minutes,-1)<0)errors.push('El tiempo de desplazamiento no puede ser negativo.');
    return result(errors,warnings,{id:text(p.id)||nextId('TRAVEL',domain.travelRules,`${p.fromSiteId}_${p.toSiteId}`),fromSiteId:text(p.fromSiteId),toSiteId:text(p.toSiteId),minutes:int(p.minutes,0),bidirectional:p.bidirectional!==false});
  }
  if(type==='DELETE_TRAVEL'){requireRef(domain.travelRules,p.id,'Trayecto',errors);return result(errors,warnings,{id:text(p.id)});}
  if(type==='UPSERT_RESOURCE'){
    if(!text(p.name))errors.push('Indica el nombre del recurso.');
    if(!RESOURCE_KINDS.includes(p.kind))errors.push('Selecciona un tipo de recurso válido.');
    if(int(p.capacity,0)<1)errors.push('La capacidad debe ser al menos 1.');
    requireRef(domain.sites,p.siteId,'Sede del recurso',errors);
    return result(errors,warnings,{id:text(p.id)||nextId('RESOURCE',domain.resources,p.name),name:text(p.name),kind:p.kind,capacity:int(p.capacity,1),siteId:text(p.siteId),tags:uniq(p.tags)});
  }
  if(type==='DELETE_RESOURCE'){
    const id=text(p.id);requireRef(domain.resources,id,'Recurso',errors);
    const used=arr(project.spaces).some(row=>arr(row.resourceIds).includes(id))||arr(project.activities).some(row=>arr(row.requiredResourceIds).includes(id)||arr(row.preferredResourceIds).includes(id))||arr(project.assignments).some(row=>arr(row.resourceIds).includes(id));
    if(used)errors.push('El recurso está utilizado por espacios, actividades o sesiones.');
    return result(errors,warnings,{id});
  }
  if(type==='CONFIGURE_ACTIVITY'){
    const activity=findById(project.activities,p.activityId);if(!activity)errors.push('Selecciona una actividad válida.');
    if(int(p.durationSlots,0)<1)errors.push('La duración debe ser al menos un periodo.');
    const weeks=activeWeekIds(domain),selected=uniq(p.weekIds);for(const id of selected)if(!weeks.includes(id))errors.push('Se ha seleccionado una semana que no existe.');
    for(const id of uniq(p.allowedSiteIds))requireRef(domain.sites,id,'Sede permitida',errors);
    for(const id of uniq(p.preferredSiteIds))requireRef(domain.sites,id,'Sede preferente',errors);
    for(const id of [...uniq(p.allowedSpaceIds),...uniq(p.preferredSpaceIds),...uniq(p.alternativeSpaceIds)])requireRef(project.spaces,id,'Espacio',errors);
    for(const id of [...uniq(p.requiredResourceIds),...uniq(p.preferredResourceIds)])requireRef(domain.resources,id,'Recurso',errors);
    return result(errors,warnings,{...p,activityId:text(p.activityId),durationSlots:int(p.durationSlots,1),weekMode:p.weekMode==='INCLUDE'?'INCLUDE':'ALL',weekIds:selected,allowedSiteIds:uniq(p.allowedSiteIds),preferredSiteIds:uniq(p.preferredSiteIds),allowedSpaceIds:uniq(p.allowedSpaceIds),preferredSpaceIds:uniq(p.preferredSpaceIds),alternativeSpaceIds:uniq(p.alternativeSpaceIds),requiredResourceIds:uniq(p.requiredResourceIds),preferredResourceIds:uniq(p.preferredResourceIds)});
  }
  if(type==='UPSERT_RELATION'){
    if(!RELATION_TYPES.includes(p.relationType))errors.push('Selecciona una relación válida.');
    requireRef(project.activities,p.leftActivityId,'Primera actividad',errors);requireRef(project.activities,p.rightActivityId,'Segunda actividad',errors);
    if(text(p.leftActivityId)===text(p.rightActivityId))errors.push('Selecciona dos actividades diferentes.');
    if(['MIN_GAP_SLOTS','MAX_GAP_SLOTS'].includes(p.relationType)&&int(p.value,0)<1)errors.push('Indica una separación de al menos un periodo.');
    return result(errors,warnings,{id:text(p.id)||nextId('RELATION',domain.activityRelations),type:p.relationType,leftActivityId:text(p.leftActivityId),rightActivityId:text(p.rightActivityId),value:int(p.value,0),hard:p.hard!==false,weight:p.hard===false?Math.max(1,Number(p.weight||40)):0,sameWeek:p.sameWeek!==false,note:text(p.note)});
  }
  if(type==='DELETE_RELATION'){requireRef(domain.activityRelations,p.id,'Relación',errors);return result(errors,warnings,{id:text(p.id)});}
  if(type==='UPSERT_SPLIT'){
    if(!text(p.name))errors.push('Indica un nombre para el desdoble.');
    if(!SPLIT_MODES.includes(p.mode))errors.push('Selecciona un tipo de desdoble válido.');
    const activities=uniq(p.activityIds),groups=uniq(p.groupIds);if(activities.length<2)errors.push('Selecciona al menos dos actividades.');
    for(const id of activities)requireRef(project.activities,id,'Actividad del desdoble',errors);for(const id of groups)requireRef(project.groups,id,'Grupo del desdoble',errors);
    return result(errors,warnings,{id:text(p.id)||nextId('SPLIT',domain.splitSets,p.name),name:text(p.name),mode:p.mode,activityIds:activities,groupIds:groups,note:text(p.note)});
  }
  if(type==='DELETE_SPLIT'){requireRef(domain.splitSets,p.id,'Desdoble',errors);return result(errors,warnings,{id:text(p.id)});}
  return result([`Operación del asistente no reconocida: ${type}.`]);
}

export function applySemanticAssistantCommand(project,command={}){
  const check=validateSemanticAssistantCommand(project,command);if(!check.ok){const error=new Error(check.errors[0]);error.details=check;throw error;}
  const next=clone(project),domain=normalizeEducationalDomain4(next.domain||{}),p=check.preview;
  switch(command.type){
    case 'SET_CYCLE':{
      const mode=p.mode;let weeks;
      if(mode==='WEEKLY')weeks=[{id:'W1',label:p.labels[0]||'Semana ordinaria',order:1,active:true}];
      else if(mode==='AB')weeks=[{id:'A',label:'Semana A',order:1,active:true},{id:'B',label:'Semana B',order:2,active:true}];
      else weeks=p.labels.map((label,index)=>({id:nextId('W',[],`${index+1}_${label}`),label,order:index+1,active:true}));
      domain.cycle={mode,weeks};next.domain=normalizeEducationalDomain4(domain);
      for(const activity of arr(next.activities))activity.weekPattern={mode:'ALL',weekIds:[]};
      for(const assignment of arr(next.assignments))assignment.weekId=activeWeekIds(next.domain)[0]||'W1';break;
    }
    case 'UPSERT_SITE':domain.sites=domain.sites.filter(row=>row.id!==p.id).concat({...p,active:true,dataState:'PENDING',provenance:{source:'P10M5_ASSISTANT'}});next.domain=normalizeEducationalDomain4(domain);break;
    case 'DELETE_SITE':domain.sites=domain.sites.filter(row=>row.id!==p.id);next.domain=normalizeEducationalDomain4(domain);break;
    case 'UPSERT_TRAVEL':domain.travelRules=domain.travelRules.filter(row=>row.id!==p.id).concat({...p,active:true,dataState:'PENDING',provenance:{source:'P10M5_ASSISTANT'}});next.domain=normalizeEducationalDomain4(domain);break;
    case 'DELETE_TRAVEL':domain.travelRules=domain.travelRules.filter(row=>row.id!==p.id);next.domain=normalizeEducationalDomain4(domain);break;
    case 'UPSERT_RESOURCE':domain.resources=domain.resources.filter(row=>row.id!==p.id).concat({...p,active:true,dataState:'PENDING',provenance:{source:'P10M5_ASSISTANT'}});next.domain=normalizeEducationalDomain4(domain);break;
    case 'DELETE_RESOURCE':domain.resources=domain.resources.filter(row=>row.id!==p.id);next.domain=normalizeEducationalDomain4(domain);break;
    case 'CONFIGURE_ACTIVITY':{
      const index=next.activities.findIndex(row=>row.id===p.activityId);const current=next.activities[index];
      next.activities[index]=normalizeActivityDomain4({...current,durationSlots:p.durationSlots,weekPattern:{mode:p.weekMode,weekIds:p.weekIds},allowedSiteIds:p.allowedSiteIds,preferredSiteIds:p.preferredSiteIds,allowedSpaceIds:p.allowedSpaceIds,preferredSpaceIds:p.preferredSpaceIds,alternativeSpaceIds:p.alternativeSpaceIds,requiredResourceIds:p.requiredResourceIds,preferredResourceIds:p.preferredResourceIds},domain);break;
    }
    case 'UPSERT_RELATION':{
      domain.activityRelations=domain.activityRelations.filter(row=>row.id!==p.id).concat({...p,active:true});next.domain=normalizeEducationalDomain4(domain);
      for(const activity of next.activities){const ids=arr(activity.relationIds).filter(id=>id!==p.id);if([p.leftActivityId,p.rightActivityId].includes(activity.id))ids.push(p.id);activity.relationIds=uniq(ids);}break;
    }
    case 'DELETE_RELATION':domain.activityRelations=domain.activityRelations.filter(row=>row.id!==p.id);next.domain=normalizeEducationalDomain4(domain);for(const activity of next.activities)activity.relationIds=arr(activity.relationIds).filter(id=>id!==p.id);break;
    case 'UPSERT_SPLIT':domain.splitSets=domain.splitSets.filter(row=>row.id!==p.id).concat({...p,active:true});next.domain=normalizeEducationalDomain4(domain);for(const activity of next.activities){if(p.activityIds.includes(activity.id))activity.splitSetId=p.id;else if(activity.splitSetId===p.id)activity.splitSetId='';}break;
    case 'DELETE_SPLIT':domain.splitSets=domain.splitSets.filter(row=>row.id!==p.id);next.domain=normalizeEducationalDomain4(domain);for(const activity of next.activities)if(activity.splitSetId===p.id)activity.splitSetId='';break;
    default:throw new Error(`Operación no implementada: ${command.type}.`);
  }
  return next;
}

export function semanticAssistantReadiness(project){
  const overview=semanticAssistantOverview(project),blockers=overview.validation.errors.map(row=>({code:row.code,message:row.message,assistantId:assistantForIssue(row.code)}));
  const warnings=overview.validation.warnings.map(row=>({code:row.code,message:row.message,assistantId:assistantForIssue(row.code)}));
  return {contractVersion:P10M5_ASSISTANT_CONTRACT_VERSION,ready:blockers.length===0,blockers,warnings,engine:overview.engine,ordinaryJsonEditingRequired:false,nextAction:blockers[0]?{assistantId:blockers[0].assistantId,label:'Corregir la configuración'}:{assistantId:'GENERATION_READINESS',label:'Ir a generar una propuesta'}};
}

export function assistantForIssue(code=''){
  const value=text(code);
  if(value.includes('WEEK'))return 'SCHOOL_CYCLE';
  if(value.includes('TRAVEL')||value.includes('SITE'))return 'SITES_AND_TRAVEL';
  if(value.includes('RESOURCE')||value.includes('SPACE'))return 'RESOURCES_AND_SPACES';
  if(value.includes('RELATION'))return 'ACTIVITY_RELATIONS';
  if(value.includes('SPLIT')||value.includes('CONCURRENCY'))return 'SPLITS_AND_CONCURRENCY';
  if(value.includes('ACTIVITY'))return 'ACTIVITY_CONFIGURATION';
  return 'GENERATION_READINESS';
}
