import { buildDocumentModel, nameOf, DOCUMENT_MODEL_CONTRACT_VERSION } from './core.mjs';
import { dailyPeriodReport } from './daily.mjs';
import {
  publicDayLabel, publicSlotLabel, publicTeacherName, publicSpaceName, publicActivityName, publicActivityKindLabel,
  publicNamesList, publicDocumentStateLabel, replaceDayCodes, stripDayAndSlot,
} from './public_labels.mjs';

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=(v='')=>String(v??'').trim();

export const STRUCTURAL_DOCUMENT_TYPES = [
  {id:'general',label:'Horario general del centro',audience:'Dirección y archivo',category:'structural',orientation:'landscape',pagePolicy:'ONE_GROUP_PER_PAGE'},
  {id:'groups',label:'Horarios por grupo',audience:'Grupos y familias',category:'structural',orientation:'landscape',pagePolicy:'ONE_ENTITY_PER_PAGE'},
  {id:'teachers',label:'Horarios por docente',audience:'Profesorado',category:'structural',orientation:'landscape',pagePolicy:'ONE_ENTITY_PER_PAGE'},
  {id:'spaces',label:'Horarios por espacio',audience:'Jefatura y responsables de espacios',category:'structural',orientation:'landscape',pagePolicy:'ONE_ENTITY_PER_PAGE'},
  {id:'breaks',label:'Cuadrante de recreos',audience:'Profesorado y jefatura',category:'structural',orientation:'landscape',pagePolicy:'SECTION'},
  {id:'meetings',label:'Cuadrante de reuniones',audience:'Profesorado y coordinación',category:'structural',orientation:'landscape',pagePolicy:'SECTION'},
  {id:'supports',label:'Apoyos y docencia compartida',audience:'Jefatura y equipos docentes',category:'structural',orientation:'landscape',pagePolicy:'SECTION'},
  {id:'leadership',label:'Cargos, coordinaciones y reducciones',audience:'Dirección y jefatura',category:'structural',orientation:'landscape',pagePolicy:'SUMMARY_AND_ENTITY_PAGES'},
  {id:'validation',label:'Informe de validación',audience:'Jefatura de estudios',category:'structural',orientation:'portrait',pagePolicy:'REPORT'},
  {id:'quality',label:'Informe descriptivo de calidad',audience:'Jefatura de estudios',category:'structural',orientation:'portrait',pagePolicy:'REPORT'},
  {id:'traceability',label:'Informe de trazabilidad',audience:'Dirección y archivo',category:'structural',orientation:'portrait',pagePolicy:'REPORT'},
];

export const OPERATIONAL_DOCUMENT_TYPES = [
  {id:'guards',label:'Guardias programadas y realizadas',audience:'Jefatura y profesorado de guardia',category:'operational',orientation:'landscape',pagePolicy:'SECTION',omitIfEmpty:true},
  {id:'daily',label:'Parte de gestión diaria',audience:'Uso diario de jefatura',category:'operational',orientation:'portrait',pagePolicy:'REPORT',omitIfEmpty:true},
  {id:'coverages',label:'Informe de coberturas',audience:'Jefatura de estudios',category:'operational',orientation:'portrait',pagePolicy:'REPORT',omitIfEmpty:true},
  {id:'incidents',label:'Incidencias y recuperaciones',audience:'Jefatura de estudios',category:'operational',orientation:'portrait',pagePolicy:'REPORT',omitIfEmpty:true},
  {id:'period',label:'Informe de gestión por periodo',audience:'Jefatura y dirección',category:'operational',orientation:'portrait',pagePolicy:'REPORT'},
];

export const DOSSIER_DOCUMENT_TYPE = {id:'dossier',label:'Dossier técnico completo',audience:'Dirección y archivo',category:'aggregate',orientation:'mixed',pagePolicy:'COVER_INDEX_SECTIONS'};
export const DOCUMENT_TYPES = [...STRUCTURAL_DOCUMENT_TYPES,...OPERATIONAL_DOCUMENT_TYPES,DOSSIER_DOCUMENT_TYPE];
export const A4_PRINT_PROFILE_VERSION='a4-print-profile-1.0';
const TYPE_ALIASES={review:'validation'};

export function documentType(type='general'){
  const normalized=TYPE_ALIASES[type]||type;
  return DOCUMENT_TYPES.find(row=>row.id===normalized)||null;
}

export function renderDocument(project,type='general',options={}){
  const normalized=TYPE_ALIASES[type]||type;
  const definition=documentType(normalized);
  if(!definition)throw new Error('El tipo de documento no es válido.');
  const model=buildDocumentModel(project);
  if(options.generatedAt)model.generatedAt=options.generatedAt;
  if(model.contractVersion!==DOCUMENT_MODEL_CONTRACT_VERSION)throw new Error('El DocumentModel no usa el contrato documental vigente.');
  const sections=normalized==='dossier'?dossierSections(project,model,options):sectionsForType(project,model,normalized,options);
  const effective=sections.length?sections:[emptySection(definition)];
  const warningMessages=projectWarnings(model);
  const title=definition.label;
  const orientation=definition.orientation==='mixed'?'mixed':definition.orientation;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(model.project.center||model.project.name)} · ${esc(title)}</title><style>${css()}</style></head><body class="document-${esc(normalized)} orientation-${esc(orientation)}" data-document-type="${esc(normalized)}" data-document-contract="${esc(DOCUMENT_MODEL_CONTRACT_VERSION)}" data-a4-profile="${esc(A4_PRINT_PROFILE_VERSION)}"><div class="print-toolbar no-print"><div><b>${esc(title)}</b><span>A4 ${orientation==='mixed'?'mixto':orientation==='landscape'?'horizontal':'vertical'} · ${effective.length} unidad(es) documental(es)</span></div><button type="button" onclick="window.print()">Imprimir / Guardar PDF</button></div>${warningMessages.map(x=>`<div class="warning ${esc(x.level)}">${esc(x.text)}</div>`).join('')}<main class="document-root">${effective.map((section,index)=>renderSectionShell(model,section,index+1,effective.length)).join('')}</main><div class="document-footer no-print">Generado ${formatDateTime(model.generatedAt)} · Responsable: ${esc(model.project.responsible||'sin indicar')} · ${esc(DOCUMENT_MODEL_CONTRACT_VERSION)}</div></body></html>`;
}

export function openDocument(project,type,options={}){
  const html=renderDocument(project,type,options);
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const w=window.open(url,'_blank');
  if(!w){URL.revokeObjectURL(url);throw new Error('El navegador bloqueó la apertura del documento.');}
  setTimeout(()=>URL.revokeObjectURL(url),120000);
}

export function downloadDocument(project,type,options={}){
  const definition=documentType(type);
  if(!definition)throw new Error('El tipo de documento no es válido.');
  const html=renderDocument(project,type,options);
  const blob=new Blob(['\uFEFF',html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=documentFileName(project,type);
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function documentFileName(project,type='general'){
  const definition=documentType(type)||DOCUMENT_TYPES[0];
  const center=clean(project?.meta?.center||project?.meta?.name||'centro').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'').toLowerCase()||'centro';
  return `${center}_${definition.id}.html`;
}

export function documentCoverage(project,options={}){
  const model=buildDocumentModel(project);
  const rows=DOCUMENT_TYPES.map(def=>{
    const sections=def.id==='dossier'?dossierSections(project,model,options):sectionsForType(project,model,def.id,options);
    return {id:def.id,label:def.label,category:def.category,sections:sections.length,available:sections.length>0||!def.omitIfEmpty};
  });
  return {contractVersion:DOCUMENT_MODEL_CONTRACT_VERSION,structural:rows.filter(x=>x.category==='structural'),operational:rows.filter(x=>x.category==='operational'),aggregate:rows.filter(x=>x.category==='aggregate')};
}

function sectionsForType(project,m,type,options={}){
  const builders={
    general:()=>generalSections(m,options),groups:()=>groupSections(m,options),teachers:()=>teacherSections(m,options),spaces:()=>spaceSections(m,options),
    breaks:()=>breakSections(m),meetings:()=>activityTableSections(m,'MEETING','Cuadrante de reuniones'),supports:()=>activityTableSections(m,'SUPPORT','Apoyos y docencia compartida'),
    leadership:()=>leadershipSections(m),validation:()=>validationSections(m),quality:()=>qualitySections(m),traceability:()=>traceabilitySections(m),
    guards:()=>guardSections(m),daily:()=>dailySections(m,options.dayId||''),coverages:()=>coverageSections(m,options),incidents:()=>incidentSections(m,options),period:()=>periodSections(project,m,options),
  };
  return builders[type]?builders[type]():[];
}

function dossierSections(project,m,options={}){
  const collected=[];
  const add=(type)=>{const sections=sectionsForType(project,m,type,options);if(sections.length)collected.push({type,label:documentType(type)?.label||type,sections});};
  for(const type of ['groups','teachers','spaces','breaks','meetings','supports','leadership','validation','quality','traceability','guards','daily','coverages','incidents'])add(type);
  const indexRows=collected.map((block,i)=>[`${i+1}. ${block.label}`,documentCountLabel(block.sections)]);
  const cover={id:'dossier-cover',title:'Dossier técnico completo',orientation:'landscape',kind:'cover',body:`<div class="cover-content"><p class="eyebrow">Gestor de Horarios Escolares</p><h1>${esc(m.project.center||'Centro sin indicar')}</h1><h2>${esc(m.project.academicYear)} · ${esc(m.project.name)}</h2><p>${esc(m.project.status==='FINAL'?'Horario definitivo':'Borrador de trabajo')} · revisión ${esc(m.project.revisionNumber)}</p><p class="cover-note">Documento generado exclusivamente desde el DocumentModel común. Los bloques operativos vacíos se omiten.</p></div>`};
  const index={id:'dossier-index',title:'Índice documental',orientation:'landscape',kind:'index',body:`${table(['Contenido','Unidades documentales'],indexRows)}<p class="note">Cada grupo, docente y espacio comienza en una unidad independiente. La paginación física final depende del navegador y debe comprobarse en A4.</p>`};
  return [cover,index,...collected.flatMap(block=>block.sections.map(section=>({...section,dossierGroup:block.label})) )];
}

function generalSections(m,options={}){
  const intro={id:'general-summary',title:'Horario general del centro',orientation:'landscape',body:`${summary(m)}${table(['Ámbito','Total'],[['Grupos',m.groups.length],['Docentes',m.teachers.length],['Espacios',m.spaces.length],['Actividades',m.activities.length],['Sesiones colocadas',m.assignments.length]])}<p class="note">El horario general continúa con una unidad independiente por grupo para evitar cuadrículas ilegibles.</p>`};
  return [intro,...groupSections(m,options)];
}

function groupSections(m,{includeEmpty=false,groupId=''}={}){
  return sorted(m.groups).filter(g=>(!groupId||g.id===groupId)).filter(g=>includeEmpty||m.assignments.some(a=>a.groupIds.includes(g.id))).map(g=>({
    id:`group-${g.id}`,title:`Horario de ${g.name}`,orientation:'landscape',kind:'group',entityLabel:g.name,
    subtitle:[g.stage,g.tutor&&g.tutor!=='—'?`Tutoría: ${publicTeacherName(g.tutor)}`:'Tutoría: pendiente de confirmar'].filter(Boolean).join(' · '),
    body:`${groupTeamBlock(m,g)}${scheduleGrid(m,{groupId:g.id})}`,
  }));
}


function groupTeamBlock(m,g){
  const rows=m.activities.filter(a=>(a.groupIds||[]).includes(g.id));
  const teacherSet=new Set();
  const pending=[];
  const detail=[];
  for(const activity of rows){
    const title=publicActivityName(activity);
    const teachers=(activity.teachers||[]).map(publicTeacherName).filter(Boolean);
    if(!teachers.length)pending.push(title);
    for(const teacher of teachers){
      if(/pendiente de asignar/i.test(teacher))pending.push(title);
      else teacherSet.add(teacher);
      detail.push([title,teacher]);
    }
  }
  const uniquePending=[...new Set(pending)];
  const detailRows=[...new Map(detail.map(row=>[row.join('||'),row])).values()].slice(0,40);
  return `<div class="group-team-print"><div><b>Tutor/a</b><span>${esc(publicTeacherName(g.tutor||''))}</span></div><div><b>Equipo docente</b><span>${teacherSet.size} docente(s) confirmado(s)${uniquePending.length?` · ${uniquePending.length} pendiente(s)`:''}</span></div>${uniquePending.length?`<div><b>Pendientes</b><span>${esc(uniquePending.slice(0,8).join(' · '))}</span></div>`:''}</div>${detailRows.length?`<details class="group-team-print-detail"><summary>Equipo docente del grupo</summary>${table(['Materia o función','Docente'],detailRows)}</details>`:''}`;
}

function teacherSections(m,{includeEmpty=false,teacherId=''}={}){
  return sorted(m.teachers).filter(t=>(!teacherId||t.id===teacherId)).filter(t=>includeEmpty||m.assignments.some(a=>a.teacherIds.includes(t.id))).map(t=>({
    id:`teacher-${t.id}`,title:`Horario de ${t.name}`,orientation:'landscape',kind:'teacher',entityLabel:t.name,
    subtitle:[t.role,t.specialty].filter(Boolean).join(' · '),body:scheduleGrid(m,{teacherId:t.id}),
  }));
}

function spaceSections(m,{includeEmpty=false,spaceId=''}={}){
  return sorted(m.spaces).filter(sp=>(!spaceId||sp.id===spaceId)).filter(sp=>includeEmpty||m.assignments.some(a=>a.spaceId===sp.id)).map(sp=>({
    id:`space-${sp.id}`,title:`Horario del espacio ${sp.name}`,orientation:'landscape',kind:'space',entityLabel:sp.name,
    subtitle:[`Capacidad concurrente: ${sp.capacity||1}`,sp.tags?.length?`Etiquetas: ${sp.tags.join(', ')}`:''].filter(Boolean).join(' · '),
    body:scheduleGrid(m,{spaceId:sp.id}),
  }));
}

function breakSections(m){
  const rows=activityAssignments(m,'BREAK_DUTY').map(a=>[a.day,a.slot,a.zone||'Zona sin indicar',a.activity,a.teachers.join(', '),a.space||'—']);
  if(!rows.length)return [];
  const zoneRows=m.organization.breakZones.map(z=>[z.name,z.slots.join(', ')||'—',z.minimumStaff,z.essentialProfileTags.join(', ')||'—',z.excludedTeachers.join(', ')||'—']);
  return [{id:'breaks',title:'Cuadrante de recreos',orientation:'landscape',body:`${table(['Día','Tramo','Zona de recreo','Servicio','Profesorado','Espacio'],rows)}<h3>Reglas por zona</h3>${table(['Zona','Tramos','Mínimo','Perfiles esenciales','Exclusiones'],zoneRows)}`}];
}

function activityTableSections(m,kind,title){
  const rows=activityAssignments(m,kind).map(a=>[a.day,a.slot,a.activity,a.teachers.join(', ')||'—',a.groups.join(', ')||'—',a.space||'—']);
  if(!rows.length)return [];
  return [{id:kind.toLowerCase(),title,orientation:'landscape',body:table(['Día','Tramo','Actividad','Profesorado','Grupos','Espacio'],rows)}];
}

function leadershipSections(m){
  const teachers=m.teachers.filter(t=>(t.positions||[]).some(x=>x.active)||(t.reductions||[]).some(x=>x.active));
  const activityRows=activityAssignments(m,['COORDINATION','REDUCTION','LD','DC']).map(a=>[a.day,a.slot,a.activity,a.activityKindLabel,a.teachers.join(', '),a.space||'—']);
  if(!teachers.length&&!activityRows.length)return [];
  const summaryRows=teachers.flatMap(t=>[
    ...(t.positions||[]).filter(x=>x.active).map(x=>[t.name,'Cargo o coordinación',x.label,x.type,x.weeklySessions,publicDataState(x.dataState)]),
    ...(t.reductions||[]).filter(x=>x.active).map(x=>[t.name,'Reducción',x.label,x.type,x.weeklySessions,publicDataState(x.dataState)]),
  ]);
  const first={id:'leadership-summary',title:'Cargos, coordinaciones y reducciones',orientation:'landscape',body:`${table(['Docente','Clase','Denominación','Tipo','Sesiones','Estado del dato'],summaryRows)}${activityRows.length?`<h3>Distribución semanal</h3>${table(['Día','Tramo','Actividad','Clase','Docente','Espacio'],activityRows)}`:''}`};
  const individual=teachers.map(t=>({id:`leadership-${t.id}`,title:`Responsabilidades de ${t.name}`,orientation:'landscape',subtitle:[t.role,t.specialty].filter(Boolean).join(' · '),body:`${table(['Clase','Denominación','Tipo','Sesiones'],[
    ...(t.positions||[]).filter(x=>x.active).map(x=>['Cargo o coordinación',x.label,x.type,x.weeklySessions]),
    ...(t.reductions||[]).filter(x=>x.active).map(x=>['Reducción',x.label,x.type,x.weeklySessions]),
  ])}${scheduleGrid(m,{teacherId:t.id,activityKinds:['COORDINATION','REDUCTION','LD','DC']})}`}));
  return [first,...individual];
}

function validationSections(m){
  const errors=m.validation.errors,warnings=m.validation.warnings;
  return [{id:'validation',title:'Informe de validación',orientation:'portrait',body:`<p class="subhead">Informe de revisión técnica y validación estructural</p>${summary(m)}<h3>Dictamen</h3><p class="verdict"><b>${esc(m.validation.verdict)}</b></p>${issueBlock('Conflictos graves',errors,'Sin conflictos graves detectados.')}${issueBlock('Avisos',warnings,'Sin avisos pendientes.')}<h3>Completitud</h3>${table(['Indicador','Resultado'],[['Sesiones requeridas',m.metrics.required],['Sesiones colocadas',m.metrics.placed],['Sesiones pendientes',m.metrics.pending],['Cobertura',`${m.metrics.completionPct}%`]])}`}];
}

function qualitySections(m){
  const current=m.quality.currentMetrics||{},accepted=m.quality.acceptedMetrics;
  const statusLabel=value=>({GOOD:'Correcto',ATTENTION:'Revisar',CRITICAL:'Prioritario',NOT_APPLICABLE:'No aplica'})[value]||value||'—';
  const dimensionRows=(m.quality.dimensions||[]).map(row=>[row.label,statusLabel(row.status),`${row.primary?.value??'—'}${row.primary?.unit?` ${row.primary.unit}`:''}`,row.explanation||'',(row.actions||[]).join(' · ')||'—']);
  const loadRows=(current.teacherLoads||[]).map(x=>{const teacher=m.teachers.find(t=>t.id===x.teacherId);const gaps=(current.gapsByTeacher||[]).find(g=>g.teacherId===x.teacherId)?.gaps||0;return[teacher?.name||'Docente',x.placed,x.target||'—',x.target?x.placed-x.target:'—',gaps];});
  const acceptedRows=accepted?[['Estado de la referencia',m.quality.acceptedMetricsState==='CURRENT'?'Vigente':'Obsoleta respecto del horario actual'],['Aceptada',m.quality.acceptedAt?formatDateTime(m.quality.acceptedAt):'—'],['Cobertura',`${accepted.completionPct??accepted.legacy?.completionPct??'—'}%`],['Sin colocar',accepted.unplaced??accepted.legacy?.unplaced??'—'],['Huecos',accepted.gaps??accepted.legacy?.gaps??'—'],['Dictamen',accepted.overall?.label||'Análisis descriptivo']]:[['Referencia aceptada','No disponible']];
  return [{id:'quality',title:'Informe descriptivo de calidad',orientation:'portrait',body:`<div class="notice-block"><b>${esc(m.quality.overall?.label||'Análisis multidimensional')}</b><br>${esc(m.quality.overall?.summary||'')}<br>${esc(m.quality.explanatoryNote||'')}</div>${summary(m)}<h3>Dimensiones evaluadas</h3>${table(['Dimensión','Estado','Indicador','Interpretación','Actuación sugerida'],dimensionRows)}<h3>Carga docente detallada</h3>${table(['Docente','Sesiones','Objetivo','Diferencia','Huecos'],loadRows)}<h3>Referencia de la última propuesta aceptada</h3>${table(['Indicador','Valor'],acceptedRows)}<p class="note">No se calcula una puntuación total ni se aplican pesos ocultos. La comparación se realiza dimensión por dimensión y la decisión organizativa corresponde a jefatura.</p>`}];
}

function traceabilitySections(m){
  const t=m.traceability;
  const receipts=t.acceptanceReceipts.map(x=>[formatDateTime(x.createdAt),decisionLabel(x.decision),x.responsible||'—',x.revalidation?`${x.revalidation.errors||0} errores · ${x.revalidation.warnings||0} avisos`:'—']);
  const runs=t.generationRuns.map(x=>[formatDateTime(x.createdAt),engineLabel(x.engine),publicStatus(x.status),modeLabel(x.mode),x.placed,x.unplaced,`${x.durationMs} ms`]);
  const imports=t.imports.map(x=>[formatDateTime(x.createdAt),entityLabel(x.entityType),x.sourceName||'—',x.created,x.updated,x.skipped]);
  const audit=t.recentAudit.map(x=>[formatDateTime(x.at),x.actor||'—',auditLabel(x.action)]);
  return [{id:'traceability',title:'Informe de trazabilidad',orientation:'portrait',body:`${table(['Dato','Valor'],[['Revisión actual',t.revisionNumber],['Última aceptación',t.lastAcceptedAt?formatDateTime(t.lastAcceptedAt):'—'],['Versiones históricas',t.historyCount],['Registros de auditoría',t.auditCount],['Huella estructural',t.projectFingerprint]])}${receipts.length?`<h3>Decisiones sobre propuestas</h3>${table(['Fecha','Decisión','Responsable','Revalidación'],receipts)}`:''}${runs.length?`<h3>Ejecuciones de generación</h3>${table(['Fecha','Motor','Estado','Modo','Colocadas','Pendientes','Duración'],runs)}`:''}${imports.length?`<h3>Importaciones aplicadas</h3>${table(['Fecha','Entidad','Origen','Altas','Actualizaciones','Omitidas'],imports)}`:''}${audit.length?`<h3>Actividad reciente</h3>${table(['Fecha','Responsable','Actuación'],audit)}`:''}<p class="note">El informe omite identificadores internos, argumentos técnicos y notas privadas. La huella permite comprobar si el horario cambió.</p>`}];
}

function guardSections(m){
  const planned=activityAssignments(m,'GUARD').map(a=>[a.day,a.slot,a.activity,a.teachers.join(', '),a.space||'—']);
  const performed=m.daily.performedServices.map(x=>[x.date,x.day,x.slot,x.teacher,serviceSourceLabel(x.sourceType),`${x.durationMinutes} min`,Number(x.weight||0).toFixed(2),publicStatus(x.status)]);
  if(!planned.length&&!performed.length)return [];
  return [{id:'guards',title:'Guardias programadas y realizadas',orientation:'landscape',body:`<h3>Guardias programadas</h3>${planned.length?table(['Día','Tramo','Servicio','Profesorado','Espacio'],planned):'<p class="empty">No hay guardias programadas en el horario estructural.</p>'}<h3>Servicios realizados</h3>${performed.length?table(['Fecha','Día','Tramo','Docente','Origen','Duración','Peso','Estado'],performed):'<p class="empty">No hay servicios realizados registrados.</p>'}<p class="note">La planificación semanal y los servicios efectivamente realizados se muestran por separado.</p>`}];
}

function dailySections(m,dayId=''){
  const abs=m.daily.absences.filter(x=>!dayId||x.dayId===dayId),absenceIds=new Set(abs.map(x=>x.id));
  const cov=m.daily.coverages.filter(x=>!dayId||absenceIds.has(x.absenceId));
  const rec=m.daily.recoveries,substitutions=m.daily.temporarySubstitutions||[],incidents=m.daily.incidents||[],services=m.daily.performedServices||[];
  if(!abs.length&&!cov.length&&!rec.length&&!substitutions.length&&!incidents.length&&!services.length)return [];
  return [{id:'daily',title:'Parte de gestión diaria',orientation:'portrait',body:`${abs.length?`<h3>Ausencias</h3>${table(['Fecha','Día','Docente','Franja','Estado','Nota operativa'],abs.map(x=>[x.date,x.day,x.teacher,x.slot,publicStatus(x.status),x.operationalNote]))}`:''}${cov.length?`<h3>Coberturas</h3>${table(['Día','Tramo','Actividad','Docente de cobertura','Estado','Motivo operativo'],cov.map(x=>[x.day,x.slot,x.activity,x.coverTeacher,publicStatus(x.status),x.decisionReason]))}`:''}${services.length?`<h3>Guardias y coberturas realizadas</h3>${table(['Fecha','Día','Tramo','Docente','Origen','Duración','Peso','Estado'],services.map(x=>[x.date,x.day,x.slot,x.teacher,serviceSourceLabel(x.sourceType),`${x.durationMinutes} min`,Number(x.weight||0).toFixed(2),publicStatus(x.status)]))}`:''}${incidents.length?`<h3>Consecuencias sobre actividades</h3>${table(['Fecha','Actividad','Día','Tramo','Consecuencia','Estado','Nota operativa'],incidents.map(x=>[x.date,x.activity,x.day,x.slot,impactStatus(x.type),publicStatus(x.status),x.operationalNote]))}`:''}${substitutions.length?`<h3>Sustituciones temporales</h3>${table(['Persona sustituida','Persona sustituta','Desde','Hasta','Estado','Ámbito','Nota operativa'],substitutions.map(x=>[x.absentTeacher,x.substituteTeacher,x.startDate,x.endDate||'Abierta',publicStatus(x.status),x.activities.join(', ')||'Todas las actividades',x.operationalNote]))}`:''}${rec.length?`<h3>Recuperaciones</h3>${table(['Actividad','Estado','Fecha prevista','Nota'],rec.map(x=>[x.activity,publicStatus(x.status),x.plannedDate,x.note]))}`:''}<p class="note">Los motivos privados de ausencia y las notas restringidas no forman parte de este documento.</p>`}];
}

function coverageSections(m,options={}){
  const rows=m.daily.coverages.filter(c=>!options.dayId||c.dayId===options.dayId);
  if(!rows.length)return [];
  const absenceById=new Map(m.daily.absences.map(x=>[x.id,x]));
  return [{id:'coverages',title:'Informe de coberturas',orientation:'portrait',body:`${table(['Fecha','Día','Tramo','Actividad','Ausencia','Docente de cobertura','Estado','Comunicación','Decisión'],rows.map(c=>{const absence=absenceById.get(c.absenceId);return[absence?.date||'—',c.day,c.slot,c.activity,absence?.teacher||'—',c.coverTeacher||'Sin asignar',publicStatus(c.status),communicationLabel(c.communication),c.decisionReason||'—'];}))}<p class="note">Las candidaturas automáticas no se publican como decisiones. Solo se muestran estados y asignaciones registradas.</p>`}];
}

function incidentSections(m,options={}){
  const incidents=m.daily.incidents.filter(x=>!options.dayId||x.dayId===options.dayId),recoveries=m.daily.recoveries,substitutions=m.daily.temporarySubstitutions||[];
  if(!incidents.length&&!recoveries.length&&!substitutions.length)return [];
  return [{id:'incidents',title:'Incidencias, sustituciones y recuperaciones',orientation:'portrait',body:`${incidents.length?`<h3>Consecuencias sobre actividades</h3>${table(['Fecha','Actividad','Día','Tramo','Consecuencia','Estado','Nota operativa'],incidents.map(x=>[x.date,x.activity,x.day,x.slot,impactStatus(x.type),publicStatus(x.status),x.operationalNote]))}`:''}${recoveries.length?`<h3>Recuperaciones</h3>${table(['Actividad','Estado','Fecha prevista','Nota pública'],recoveries.map(x=>[x.activity,publicStatus(x.status),x.plannedDate||'—',x.note||'—']))}`:''}${substitutions.length?`<h3>Sustituciones temporales</h3>${table(['Persona sustituida','Persona sustituta','Desde','Hasta','Estado','Ámbito','Nota operativa'],substitutions.map(x=>[x.absentTeacher,x.substituteTeacher,x.startDate,x.endDate||'Abierta',publicStatus(x.status),x.activities.join(', ')||'Todas las actividades',x.operationalNote]))}`:''}<p class="note">No se incluyen causas privadas, diagnósticos ni notas restringidas.</p>`}];
}

function periodSections(project,m,options={}){
  const r=dailyPeriodReport(project,{scope:options.scope||'CUSTOM',referenceDate:options.referenceDate||'',fromDate:options.fromDate||'',toDate:options.toDate||''});
  const teacherRows=r.byTeacher.map(x=>[nameOf(project.teachers,x.teacherId),x.completed,Number(x.weightedCompleted||0).toFixed(2),x.minutes,Number(x.deviationFromMean||0).toFixed(2)]);
  return [{id:'period',title:'Informe de gestión por periodo',orientation:'portrait',subtitle:`${r.scopeLabel} · ${r.fromDate||'Inicio de los registros'} – ${r.toDate||'Fin de los registros'}`,body:`<div class="cards"><div><b>${r.totals.absences}</b><span>ausencias</span></div><div><b>${r.totals.completed}</b><span>coberturas completadas</span></div><div><b>${r.totals.performedServices}</b><span>servicios realizados</span></div><div><b>${r.totals.recoveriesPending}</b><span>recuperaciones abiertas</span></div></div><h3>Equilibrio histórico ponderado</h3>${table(['Docente','Actuaciones','Peso','Minutos','Diferencia media'],teacherRows)}<h3>Situación operativa</h3>${table(['Indicador','Total'],[['Coberturas pendientes',r.totals.pending],['Coberturas sin cubrir',r.totals.uncovered],['Sustituciones temporales activas',r.totals.temporarySubstitutions],['Incidencias abiertas',r.totals.incidentsOpen],['Recuperaciones abiertas',r.totals.recoveriesPending]])}<p class="note">Informe descriptivo y auditable. Las recomendaciones no sustituyen la decisión de jefatura de estudios.</p>`}];
}

function renderSectionShell(m,section,index,total){
  const orientation=section.orientation||'portrait';
  if(section.kind==='cover')return `<section class="page page-${orientation} cover" data-section="${esc(section.id)}" data-unit="${index}">${section.body}<div class="unit-number">Unidad ${index} de ${total}</div></section>`;
  return `<section class="page page-${orientation}" data-section="${esc(section.id)}" data-unit-kind="${esc(section.kind||'section')}" data-unit="${index}"><header class="doc-head"><div><p class="eyebrow">${esc(section.dossierGroup||'Gestor de Horarios Escolares')}</p><h1>${esc(m.project.center||'Centro sin indicar')}</h1><p>${esc(m.project.academicYear)} · ${esc(m.project.name)}</p></div><div class="state"><b>${esc(publicDocumentStateLabel(m.project.status))}</b><span>Revisión ${esc(m.project.revisionNumber)}</span><span>${esc(m.project.privacyLabel)}</span></div></header><h2>${esc(section.title)}</h2>${section.subtitle?`<p class="subhead">${esc(section.subtitle)}</p>`:''}${section.body}<div class="unit-number">Unidad ${index} de ${total}</div></section>`;
}

function emptySection(definition){return{id:`empty-${definition.id}`,title:definition.label,orientation:definition.orientation==='landscape'?'landscape':'portrait',body:'<div class="empty">No existen registros publicables para este documento.</div>'};}
function projectWarnings(m){const rows=[];if(m.project.privacyClass==='SYNTHETIC')rows.push({level:'danger',text:'PROYECTO DE EJEMPLO · NO UTILIZAR COMO HORARIO REAL'});if(m.project.status!=='FINAL')rows.push({level:'warning',text:'BORRADOR DE TRABAJO · NO APTO PARA CIERRE OFICIAL'});if(m.validation.errors.length)rows.push({level:'danger',text:'DOCUMENTO CON CONFLICTOS GRAVES DETECTADOS'});else if(m.validation.warnings.length)rows.push({level:'warning',text:'DOCUMENTO CON AVISOS PENDIENTES DE REVISIÓN'});return rows;}
function publicAssignment(m,a){return {...a,day:publicDayLabel(m.calendar,a.dayId)||replaceDayCodes(a.day),slot:publicSlotLabel(m.calendar,a.slotId)||a.slot,activity:publicActivityName(a,a.slotId),activityKindLabel:publicActivityKindLabel(a.activityKind),teachers:(a.teachers||[]).map(publicTeacherName),groups:(a.groups||[]).map(stripDayAndSlot),space:publicSpaceName(a.space),zone:stripDayAndSlot(a.zone||'')};}
function activityAssignments(m,kinds){const set=new Set(Array.isArray(kinds)?kinds:[kinds]);return m.assignments.filter(a=>set.has(a.activityKind)).sort(orderAssignment).map(a=>publicAssignment(m,a));}
function orderAssignment(a,b){const days=new Map((a.__days||[]).map((x,i)=>[x.id,i]));return String(a.day).localeCompare(String(b.day),'es')||String(a.slot).localeCompare(String(b.slot),'es')||String(a.activity).localeCompare(String(b.activity),'es');}
function sorted(rows){return [...rows].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es'));}
function documentCountLabel(sections){return sections.length===1?'1 unidad':`${sections.length} unidades`;}

function summary(m){return `<div class="cards"><div><b>${m.metrics.placed}</b><span>sesiones colocadas</span></div><div><b>${m.metrics.pending}</b><span>sesiones pendientes</span></div><div><b>${m.validation.errors.length}</b><span>conflictos graves</span></div><div><b>${m.metrics.gaps}</b><span>huecos detectados</span></div></div><p class="note">${esc(m.metrics.scopeNote)}</p>`;}
function scheduleGrid(m,filter={}){
  const kinds=filter.activityKinds?new Set(filter.activityKinds):null;
  const cells=(dayId,slotId)=>{
    const rows=m.assignments.filter(a=>a.dayId===dayId&&a.slotId===slotId).filter(a=>{
      if(filter.groupId&&!a.groupIds.includes(filter.groupId))return false;
      if(filter.teacherId&&!a.teacherIds.includes(filter.teacherId))return false;
      if(filter.spaceId&&a.spaceId!==filter.spaceId)return false;
      if(kinds&&!kinds.has(a.activityKind))return false;
      return true;
    });
    return rows.map(a=>{const pa=publicAssignment(m,a);return `<div class="lesson"><b>${esc(pa.activity)}</b>${pa.groups.length?`<span>${esc(pa.groups.join(', '))}</span>`:''}<small>${esc(publicNamesList(pa.teachers,publicTeacherName))}${pa.space?` · ${esc(publicSpaceName(pa.space))}`:''}</small></div>`;}).join('')||'<span class="empty-cell">—</span>';
  };
  return `<table class="schedule"><thead><tr><th>Tramo</th>${m.calendar.days.map(d=>`<th>${esc(d.label)}</th>`).join('')}</tr></thead><tbody>${m.calendar.slots.map(s=>`<tr class="${s.kind!=='CLASS'?'nonclass':''}"><th>${esc(s.label)}${s.start?`<small>${esc(s.start)}–${esc(s.end)}</small>`:''}</th>${m.calendar.days.map(d=>`<td>${cells(d.id,s.id)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function publicCell(value){return publicTeacherName(replaceDayCodes(stripDayAndSlot(value)));}
function table(headers,rows){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${esc(publicCell(c))}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">Sin registros</td></tr>`}</tbody></table></div>`;}
function issueBlock(title,rows,empty){return `<h3>${esc(title)}</h3>${rows.length?`<ul class="issues">${rows.map(x=>`<li>${esc(x.message)}${x.suggestedAction?` <span>${esc(x.suggestedAction)}</span>`:''}</li>`).join('')}</ul>`:`<p class="okline">${esc(empty)}</p>`}`;}
function formatDateTime(value){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.valueOf())?esc(value):d.toLocaleString('es-ES');}
function impactStatus(v){return({UNCHANGED:'Sin cambio',DISPLACED:'Desplazada',SUSPENDED:'Suspendida',CANCELLED:'Cancelada',RECOVERY_REQUIRED:'Pendiente de recuperación'})[v]||String(v||'');}
function publicStatus(v){return({DRAFT:'Borrador',CONFIRMED:'Confirmada',CANCELLED:'Cancelada',FINISHED:'Finalizada',PLANNED:'Planificada',ACTIVE:'Activa',PENDING:'Pendiente',PROPOSED:'Propuesta',ASSIGNED:'Asignada',COMMUNICATED:'Comunicada',COMPLETED:'Completada',UNCOVERED:'Sin cubrir',NOT_APPLICABLE:'No procede',SCHEDULED:'Programada',CANCELLED_WITH_REASON:'Cancelada con motivo',OPEN:'Abierta',RESOLVED:'Resuelta',OPTIMAL:'Óptima para el objetivo modelado',FEASIBLE:'Factible',INFEASIBLE:'Inviable demostrada',UNKNOWN:'Sin conclusión',PARTIAL:'Parcial',ERROR:'Error',TIME_LIMIT_WITH_SOLUTION:'Límite con solución',TIME_LIMIT_WITHOUT_SOLUTION:'Límite sin solución'})[v]||String(v||'');}
function publicDataState(v){return({CONFIRMED:'Confirmado',PROVISIONAL:'Provisional',SIMULATED:'Simulado',PENDING:'Pendiente'})[v]||String(v||'');}
function decisionLabel(v){return({ACCEPTANCE:'Aceptación completa',PARTIAL_ACCEPTANCE:'Aceptación parcial',REJECTION:'Rechazo'})[v]||'Decisión registrada';}
function modeLabel(v){return({COMPLETE:'Completo',PARTIAL:'Parcial',REPAIR:'Reparación'})[v]||String(v||'');}
function engineLabel(v){return({HEURISTIC:'Heurística web',CP_SAT:'OR-Tools CP-SAT','heuristic-web':'Heurística web','ortools-cp-sat':'OR-Tools CP-SAT'})[v]||String(v||'Motor registrado');}
function entityLabel(v){return({teachers:'Docentes',groups:'Grupos',subjects:'Materias',spaces:'Espacios',activities:'Actividades',availability:'Disponibilidad'})[v]||String(v||'Datos');}
function serviceSourceLabel(v){return({COVERAGE:'Cobertura',FREE_COVERAGE:'Cobertura por disponibilidad',GUARD:'Guardia programada',PLANNED_GUARD:'Guardia programada',MANUAL:'Registro manual'})[v]||'Servicio registrado';}
function communicationLabel(value){if(!value)return'No registrada';return[value.channel,value.at?formatDateTime(value.at):''].filter(Boolean).join(' · ')||'Registrada';}
function auditLabel(action){return({PROJECT_CREATED:'Proyecto creado',PROJECT_OPENED:'Proyecto abierto',PROPOSAL_ACCEPTED:'Propuesta aceptada',PROPOSAL_REJECTED:'Propuesta descartada',REVISION_CREATED:'Versión creada',SNAPSHOT_RESTORED:'Versión restaurada',IMPORT_APPLIED:'Importación aplicada',ASSIGNMENT_LOCKED:'Sesión bloqueada',ASSIGNMENT_UNLOCKED:'Sesión desbloqueada',ABSENCE_REGISTERED:'Ausencia registrada',ABSENCE_CONFIRMED:'Ausencia confirmada',COVERAGE_ASSIGNED:'Cobertura asignada',COVERAGE_COMPLETED:'Cobertura completada',NEXT_COURSE_CREATED:'Curso siguiente preparado'})[action]||'Actuación registrada';}

function css(){return `
@page{size:A4 portrait;margin:11mm 10mm 14mm}
@page landscape{size:A4 landscape;margin:10mm 10mm 13mm}
:root{print-color-adjust:exact;-webkit-print-color-adjust:exact}
*{box-sizing:border-box}html{background:#eef2f6;color:#162333;font-family:Arial,sans-serif}body{margin:0;font:9.4pt/1.32 Arial,sans-serif}.print-toolbar{position:sticky;top:0;z-index:30;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:11px 16px;background:#123f5b;color:#fff;box-shadow:0 2px 12px #0003}.print-toolbar div{display:grid;gap:2px}.print-toolbar span{font-size:8.5pt;color:#d7e8f2}.print-toolbar button{border:0;border-radius:8px;padding:9px 13px;background:#fff;color:#123f5b;font-weight:700}.warning{max-width:1200px;margin:10px auto 0;padding:9px 12px;text-align:center;font-weight:700;border:1px solid}.warning.danger{background:#fff0ed;border-color:#b74828;color:#762a18}.warning.warning{background:#fff9e8;border-color:#c38b18;color:#704c00}.document-root{max-width:1200px;margin:12px auto}.page{position:relative;background:#fff;margin:0 auto 14px;padding:10mm;box-shadow:0 3px 16px #1d33451f;break-after:page;page-break-after:always;break-inside:avoid-page;page-break-inside:avoid;min-height:277mm}.page-landscape{page:landscape;width:297mm;min-height:190mm}.page-portrait{width:210mm;min-height:277mm}.page:last-child{break-after:auto;page-break-after:auto}.doc-head{display:flex;justify-content:space-between;gap:8mm;border-bottom:2px solid #235a8f;margin-bottom:5mm;padding-bottom:3mm}.doc-head h1{margin:0;font-size:16pt}.doc-head p{margin:1.2mm 0 0}.eyebrow{margin:0!important;font-size:7.5pt!important;letter-spacing:.08em;text-transform:uppercase;color:#1e638d;font-weight:700}.state{text-align:right;display:grid;gap:1mm}.state span{font-size:8pt}.page h1,.page h2,.page h3{break-after:avoid-page;page-break-after:avoid}.page h2{font-size:15pt;margin:0 0 3mm}.page h3{font-size:11.2pt;margin:5mm 0 2mm}.subhead{margin:-1mm 0 4mm;color:#40566a}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:2.5mm;margin-bottom:3mm}.cards div{border:1px solid #b8c6d4;padding:2.5mm}.cards b{font-size:14pt;display:block}.cards span{font-size:8pt}.note{font-size:8pt;color:#43576a}.notice-block{border-left:4px solid #2d6f97;background:#eef6fb;padding:3mm;margin-bottom:4mm}.verdict{border:1px solid #9eb1c3;background:#f5f8fa;padding:3mm}.okline{border-left:3px solid #38784c;padding:2mm 3mm;background:#f1f8f3}.issues{padding-left:5mm}.issues li{margin:1.5mm 0}.issues span{color:#52677a}.table-wrap{width:100%;overflow:visible;margin:2mm 0 4mm}table{width:100%;border-collapse:collapse;break-inside:auto}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}p,li{orphans:3;widows:3}th,td{border:1px solid #9cabba;padding:1.55mm;vertical-align:top}th{background:#eaf1f7}.schedule{table-layout:fixed;font-size:7.8pt}.schedule th:first-child{width:18mm}.schedule th small{display:block;font-weight:400}.nonclass{background:#f0f3f5}.lesson{margin-bottom:1.1mm;break-inside:avoid}.lesson span,.lesson small{display:block}.lesson small{font-size:7pt;color:#40566a}.group-team-print{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;margin:0 0 3mm}.group-team-print div{border:1px solid #b8c6d4;background:#f7fafc;padding:2mm}.group-team-print b{display:block}.group-team-print span{font-size:8pt;color:#40566a}.group-team-print-detail{margin:0 0 3mm}.group-team-print-detail summary{font-weight:700;color:#123f5b}.empty-cell{color:#8998a6}.empty{border:1px dashed #aeb9c4;padding:12mm;text-align:center;color:#596a79}.unit-number{position:absolute;right:10mm;bottom:5mm;font-size:7pt;color:#667684}.cover{display:flex;align-items:center;justify-content:center;text-align:center}.cover-content{max-width:220mm}.cover-content h1{font-size:28pt;margin:3mm 0}.cover-content h2{font-size:17pt}.cover-note{margin-top:12mm;color:#40566a}.document-footer{max-width:1200px;margin:0 auto 20px;text-align:center;font-size:8pt;color:#586878}
@media(max-width:900px){.document-root{margin:8px}.page-landscape,.page-portrait{width:auto;min-height:0;padding:16px}.doc-head{display:block}.state{text-align:left;margin-top:8px}.cards{grid-template-columns:repeat(2,1fr)}.schedule{min-width:850px}.table-wrap{overflow:auto}.page{overflow:auto}.print-toolbar{position:static}}
@media print{html,body{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}.no-print,.warning{display:none!important}.document-root{max-width:none;margin:0}.page{width:auto!important;min-height:0!important;margin:0!important;padding:0!important;box-shadow:none!important;overflow:visible!important}.page-landscape{page:landscape}.page-portrait{page:auto}.table-wrap{overflow:visible}.schedule{min-width:0}.doc-head{break-after:avoid;page-break-after:avoid}.unit-number{bottom:1mm}.cover{min-height:180mm!important}}
`;}
