import {
  APP_VERSION, SCHEMA_VERSION, CONTRACT_VERSION, createEmptyProject, createDemoProject,
  normalizeProject, validateProject, analyzeDataState, analyzeDataQuality, analyzeReadiness, computeMetrics,
  uid, nowIso, statusLabel, privacyLabel, activityKindLabel, appendAudit, createRevision,
  restoreSnapshot, deepClone, slotKey, syncOrganizationalActivities, createNextCourse,
  structuralFingerprint, nameOf, normalizeStringList, dataOriginLabel, manualDataProvenance,
  ACTIVITY_KINDS, POSITION_TYPES, REDUCTION_TYPES, ORGANIZATIONAL_SERVICE_KINDS, organizationalLoadSummary,
} from './core.mjs';
import {
  acceptProposal, rejectProposal, revalidateProposal, saveScenario, applyScenario, compareScenarios,
} from './generator.mjs';
import {
  MANUAL_EDITOR_CONTRACT_VERSION, editorHistoryState, previewSingleMove, previewSelectionShift,
  previewSelectionToCell, listSingleMoveDestinations, applyMovePreview, unplaceAssignments,
  lockAssignments, unlockAssignments, undoEditorCommand, redoEditorCommand, assignmentSelectionSummary,
} from './manual_editor.mjs';
import {
  registerAbsence, confirmAbsence, recommendCoverage, assignCoverage, communicateCoverage, updateCoverageStatus, reopenCoverage,
  markCoverageUncovered, cancelAbsence, finishAbsence, createRecovery, updateRecovery, dailySummary,
  createTemporarySubstitution, updateTemporarySubstitution, createActivityImpact, updateActivityImpact, impactLabel,
  dailyOperationalReport, dailyPeriodReport, coverageBalanceReport,
} from './daily.mjs';
import {
  loadActive, saveActive, clearActive, createBackup, listBackups, readBackup, replaceActiveWithBackup, storageMode, STORAGE_CONTRACT_VERSION,
  getStorageStatus, getLastRecovery, recordLocalError, listLocalErrors, clearLocalErrors,
} from './storage.mjs';
import {
  PRODUCT_DOCUMENT_CONTRACT_VERSION, createProductDocumentSession, productDocumentSessionMatches,
  productDocumentCatalog, openProductDocument, downloadProductDocument, buildProductXlsx,
  productXlsxFileName, buildProductDocumentPackage, buildSelectedProductDocumentPackage, productPackageFileName,
} from './product_documents.mjs';
import {
  stageEntityImport, applyStagedImport, revalidateStaging, editStagedRow, setStagedRowSelected,
  setAllStagedRowsSelected, exportEntityCsv, exportExcelXml, importTemplate, makeDownloadName,
} from './import_export.mjs';
import { readProjectFile, buildProjectContainer, validatePortableProject } from './project_file.mjs';
import { validateScheduleIndependently } from './product_independent_validator.mjs';
import { assertKnownUiAction } from './ui_actions.mjs';
import { GenerationRunner, generationRunDownload, generationStatusLabel } from './generation_runner.mjs';
import { CpSatClient, createCpSatRequest, validateCpSatResult, compactCpSatRequest, cpSatRequestDownload } from './cp_sat_client.mjs';
import {
  ProductGenerationOrchestrator, productGenerationPhaseLabel, proposalProductDiagnostics,
  PRODUCT_GENERATION_CONTRACT_VERSION,
} from './product_generation.mjs';
import {
  RESILIENCE_CONTRACT_VERSION, ACCESSIBILITY_CONTRACT_VERSION, PERFORMANCE_CONTRACT_VERSION,
  measureAsync, recordPerformance, getSessionPerformance, evaluatePerformance, projectScale, formatBytes,
  registerRobustServiceWorker, activateWaitingWorker, requestServiceWorkerStatus, clearRuntimeCaches, onlineState,
} from './resilience.mjs';
import {
  PRODUCT_VERSION, PRODUCT_PHASE, readTechnicalMode, writeTechnicalMode,
  routeForReadiness,
} from './product_mode.mjs';
import {
  createProjectWizardState, loadProjectWizardState, saveProjectWizardState, clearProjectWizardState,
  addWizardRow, removeWizardRow, setWizardValue, setWizardRowValue,
  validateProjectWizard,
} from './project_wizard.mjs';
import { renderProjectWizard } from './project_wizard_ui.mjs';
import {
  PRODUCT_REVIEW_CONTRACT_VERSION, explainSingleDestination, explainSelectionDestination,
  professionalDestinationGuide, compareAlternativesForUser, professionalHistoryCatalog,
  reviewOfficialClosure, finalizeOfficialVersion, previewRemovedCommandRecovery, recoverRemovedCommand,
} from './product_review.mjs';
import {
  semanticizeIssues, semanticizeMoveReason, semanticizeGenerationOutcome, semanticMessageCard,
  ordinaryLanguageAudit,
} from './semantic_engine.mjs';
import { projectSemanticProfile } from './semantic_context.mjs';
import { SEMANTIC_FOUNDATION_CONTRACT_VERSION } from './semantic_catalog.mjs';
import { loadAccessibilityPreferences, saveAccessibilityPreferences, applyAccessibilityPreferences, defaultAccessibilityPreferences } from './product_accessibility_usability.mjs';
import {
  EDUCATIONAL_DOMAIN_CONTRACT_VERSION, CYCLE_MODES, RELATION_TYPES, SPLIT_MODES, RESOURCE_KINDS,
  normalizeEducationalDomain4, activeWeekIds,
} from './educational_domain_4.mjs';
import {
  P10M5_ASSISTANT_CONTRACT_VERSION, P10M5_ASSISTANTS, RELATION_LABELS, RESOURCE_KIND_LABELS, SPLIT_MODE_LABELS,
  semanticAssistantOverview, semanticAssistantReadiness, applySemanticAssistantCommand,
} from './product_semantic_assistants.mjs';
import { analyzeMultidimensionalQuality, PRODUCT_MULTIDIMENSIONAL_QUALITY_CONTRACT_VERSION } from './product_multidimensional_quality.mjs';
import {
  PRESENCE_STATUSES, SERVICE_TYPES, PRESENCE_REQUIREMENTS, normalizePresenceStatus,
} from './organizational_domain_4_1.mjs';
import {
  PRODUCT_DAILY_CONTRACT_VERSION, PRODUCT_DAILY_POLICY_VERSION, PRODUCT_DAILY_TABS,
  dailyStatusLabel, affectedServicesForAbsence, coverageCandidateGuide, reconciliationSummary,
  dailyProductWorkspace, registerProductAbsence, confirmProductAbsence, cancelProductAbsence,
  finishProductAbsence, assignProductCoverage, communicateProductCoverage, completeProductCoverage,
  reopenProductCoverage, markProductCoverageUncovered, recordProductImpact, resolveProductImpact,
  createProductRecovery, updateProductRecovery, createProductTemporarySubstitution,
  updateProductTemporarySubstitution, productOperationalReport, productPeriodReport, productCoverageBalance,
} from './product_daily.mjs';
import {
  dayPublicLabel as productDayPublicLabel,
  slotPublicLabel as productSlotPublicLabel,
  publicTeacherName as productPublicTeacherName,
  publicSpaceName as productPublicSpaceName,
  publicActivityName as productPublicActivityName,
  assignmentPublicParts as productAssignmentPublicParts,
  resolveScheduleFilter,
  renderScheduleOverview,
  renderScheduleControls,
  renderScheduleGrid as renderProductScheduleGrid,
  matchesScheduleFilter,
  matchesScheduleSearch,
  visibleScheduleAssignmentIds,
} from './product_schedule_view.mjs';
import {
  EXAMPLE_LIBRARY_CONTRACT_VERSION, CANONICAL_REGRESSION_GATE, catalogForMode, exampleDefinition,
  loadExampleProject, exampleMetrics, verifyCanonicalReference,
} from './example_library.mjs';
import { analyzeP12WebSolverSupport } from './p12_web_solver.mjs';

const host=document.querySelector('#pageHost');
const titleEl=document.querySelector('#pageTitle');
const subtitleEl=document.querySelector('#projectSubtitle');
const noticeHost=document.querySelector('#noticeHost');
const saveState=document.querySelector('#saveState');
const fileInput=document.querySelector('#projectFileInput');
const routeAnnouncer=document.querySelector('#routeAnnouncer');
let accessibilityPreferences=loadAccessibilityPreferences();
let project=null;
let page='home';
let dataTab='project';
let scheduleTab='generate';
let dailyTab='today';
let dailyDate='';
let dailyDayId='';
let technicalMode=readTechnicalMode();
let projectWizard=loadProjectWizardState();
let scheduleFilter='ALL';
let dirty=false;
let autosaveTimer=null;
let stagedImport=null;
let selectedCoverageId='';
let periodReport=null;
let operationalReport=null;
let documentSession=null;
let documentSearch='';
let documentAssistantKind='group';
let documentAssistantEntity='';
let moveDestinations=null;
let editorSelection=new Set();
let editorAnchorId='';
let editorSearch='';
let editorDragId='';
let editorLivePreview=null;
let editorSearchTimer=null;
let projectFileContext={source:'WORKSPACE',preservedEntries:new Map(),warnings:[]};
let generationRunner=null;
let cpSatClient=null;
let productGenerationOrchestrator=null;
let serviceWorkerRegistration=null;
let serviceWorkerStatus=null;
let waitingServiceWorker=null;
let storageStatus=null;
let localErrorRows=[];
let lastFocusedBeforeModal=null;
let generationState={status:'IDLE',engine:'',phase:'',progress:null,elapsedMs:0,cancelRequested:false,message:''};
const PUBLIC_DEFAULT_EXAMPLE_ID='P12_WEB_MEDIUM';
const getGenerationRunner=()=>generationRunner||(generationRunner=new GenerationRunner());
const getCpSatClient=()=>cpSatClient||(cpSatClient=new CpSatClient());
const getProductGenerationOrchestrator=()=>productGenerationOrchestrator||(productGenerationOrchestrator=new ProductGenerationOrchestrator({generationRunner:getGenerationRunner(),cpSatClient:getCpSatClient()}));

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=(iso)=>iso?new Date(iso).toLocaleString('es-ES'):'—';
const fmtDuration=(ms)=>{const seconds=Math.max(0,Math.round(Number(ms||0)/1000));return seconds<60?`${seconds} s`:`${Math.floor(seconds/60)} min ${seconds%60} s`;};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const monthStart=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;};
const semanticIssueHtml=(issue)=>{const card=semanticMessageCard(issue);const actions=(card.actions||[]).map(a=>`<button class="link-button" type="button" data-semantic-route="${esc(JSON.stringify(a.route||{}))}">${esc(a.label)}</button>`).join(' ');return `<div class="issue ${esc(issue.severity||'INFO')} semantic-issue"><b>${esc(card.title)}</b><br>${esc(card.message)}${card.source?`<br><small>Origen: ${esc(card.source)}</small>`:''}${actions?`<div class="semantic-actions">${actions}</div>`:''}</div>`;};
const semanticReasonText=(reason)=>semanticizeMoveReason(typeof reason==='string'?{message:reason}:reason).message;


init().catch(fatal);
async function init(){
  const started=globalThis.performance?.now?.()||Date.now();
  document.querySelector('#versionBadge').textContent=PRODUCT_VERSION;
  accessibilityPreferences=applyAccessibilityPreferences(accessibilityPreferences);
  document.documentElement.dataset.technicalMode=technicalMode?'enabled':'disabled';
  bindRuntimeDiagnostics();
  bindGlobalEvents();
  updateConnectivityBadge();
  project=await measureAsync('loadProject',()=>loadActive(),{});
  if(project)project=normalizeProject(project);
  await ensurePublicStartupProject();
  storageStatus=await getStorageStatus();
  document.querySelector('#storageBadge').textContent=storageStatus.mode==='INDEXED_DB'?'IndexedDB verificado':'Almacenamiento de reserva';
  await registerServiceWorker();
  render();
  recordPerformance('startup', (globalThis.performance?.now?.()||Date.now())-started, projectScale(project));
  const recovery=getLastRecovery();
  if(['RECOVERED_PENDING','RECOVERED_LAST_GOOD','LEGACY_LOADED','UNRECOVERABLE'].includes(recovery.action)){
    notice(recovery.message,recovery.action==='UNRECOVERABLE'?'error':'warning');
  }
}

async function ensurePublicStartupProject(){
  if(technicalMode)return;
  let params=new URLSearchParams();
  try{params=new URLSearchParams(location.search||'');}catch{}
  if(params.get('conservarProyecto')==='1')return;
  const openDefault=async(reason='')=>{
    const fallback=await loadExampleProject(PUBLIC_DEFAULT_EXAMPLE_ID);
    project=normalizeProject(fallback);
    try{await saveActive(project);}catch(error){await recordLocalError(error,'public-startup-default');}
    if(reason)notice(reason,'warning');
  };
  if(!project){await openDefault('Se abrió automáticamente el ejemplo web P12-5 para que puedas probar la generación local sin instalaciones.');return;}
  const support=analyzeP12WebSolverSupport(project);
  if(support.supported)return;
  const privacy=String(project.meta?.privacyClass||'');
  const projectId=String(project.meta?.projectId||'');
  const syntheticLegacy=privacy==='SYNTHETIC'||['project_fixture_a6','example_p11_synthetic_realistic'].includes(projectId);
  if(syntheticLegacy){
    try{await createBackup(project,'Copia automática del ejemplo anterior antes de abrir la versión web RC1');}catch(error){await recordLocalError(error,'public-startup-backup');}
    await openDefault('Se sustituyó el ejemplo técnico anterior por un ejemplo web compatible. Las copias locales anteriores se conservan como respaldo.');
  }
}

function bindGlobalEvents(){
  const mainNav=document.querySelector('#mainNav');
  mainNav.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b)return;page=b.dataset.page;setActiveNav();render();});
  mainNav.addEventListener('keydown',handleMainNavKeydown);
  document.querySelector('#saveNowBtn').addEventListener('click',()=>saveNow(true));
  fileInput.addEventListener('change',handleProjectFile);
  host.addEventListener('click',handleClick);
  host.addEventListener('change',handleChange);
  host.addEventListener('submit',handleSubmit);
  host.addEventListener('input',handleInput);
  host.addEventListener('keydown',handleEditorKeydown);
  host.addEventListener('dragstart',handleEditorDragStart);
  host.addEventListener('dragover',handleEditorDragOver);
  host.addEventListener('dragleave',handleEditorDragLeave);
  host.addEventListener('drop',handleEditorDrop);
}
function handleMainNavKeydown(event){
  const buttons=[...document.querySelectorAll('#mainNav [data-page]')];
  const current=buttons.indexOf(document.activeElement);if(current<0)return;
  let next=current;if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(current+1)%buttons.length;
  else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(current-1+buttons.length)%buttons.length;
  else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;
  event.preventDefault();buttons[next].focus();
}
async function registerServiceWorker(){
  try{
    serviceWorkerRegistration=await registerRobustServiceWorker({
      onUpdate:worker=>{waitingServiceWorker=worker;notice('Hay una actualización preparada. Actívala desde Sistema cuando hayas guardado el proyecto.','warning');},
      onStatus:status=>{serviceWorkerStatus=status;},
    });
    serviceWorkerStatus=await requestServiceWorkerStatus(serviceWorkerRegistration)||serviceWorkerStatus;
    if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());}
  }catch(err){
    serviceWorkerStatus={state:'ERROR',message:err.message};
    await recordLocalError(err,'service-worker');
  }
}
function bindRuntimeDiagnostics(){
  addEventListener('online',()=>{updateConnectivityBadge();notice('Conexión recuperada. La aplicación sigue trabajando con los datos locales.','success');});
  addEventListener('offline',()=>{updateConnectivityBadge();notice('Sin conexión. Se mantiene el funcionamiento local precargado.','warning');});
  addEventListener('error',event=>{recordLocalError(event.error||new Error(event.message||'Error de ejecución'),'runtime').catch(()=>{});});
  addEventListener('unhandledrejection',event=>{recordLocalError(event.reason||new Error('Promesa rechazada'),'runtime').catch(()=>{});});
}
function updateConnectivityBadge(){
  const badge=document.querySelector('#connectionBadge');if(!badge)return;
  const state=onlineState();badge.textContent=state==='OFFLINE'?'Sin conexión':'En línea';badge.classList.toggle('offline',state==='OFFLINE');
}
async function fatal(err){
  console.error(err);try{await recordLocalError(err,'startup');}catch{}
  document.body.innerHTML=`<main style="padding:24px;font-family:system-ui"><h1>No se pudo iniciar la aplicación</h1><p>El error quedó registrado localmente sin contenido del proyecto.</p><pre>${esc(err?.message||err)}</pre></main>`;
}
function setActiveNav(){document.querySelectorAll('#mainNav button').forEach(x=>{const active=x.dataset.page===page;x.classList.toggle('active',active);if(active)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');});}

function render(){
  const started=globalThis.performance?.now?.()||Date.now();
  const titles={home:'Inicio',data:'Datos',organization:'Organización',schedule:'Horario',daily:'Gestión diaria',documents:'Documentos',system:'Sistema',wizard:'Crear proyecto',examples:'Centros de ejemplo'};
  if(page==='system'&&!technicalMode)page='home';
  if(!titles[page])page='home';
  titleEl.textContent=titles[page];
  document.title=`${titles[page]} · Gestor de Horarios Escolares`;
  if(routeAnnouncer)routeAnnouncer.textContent=`Sección ${titles[page]}.`;
  subtitleEl.textContent=page==='wizard'?'Borrador local del asistente':project?`${project.meta.center||'Centro sin indicar'} · ${project.meta.academicYear||'Curso sin indicar'} · ${project.meta.status==='FINAL'?'Horario definitivo':'Borrador'} · revisión ${project.meta.revisionNumber}`:'Sin proyecto activo';
  document.querySelector('#saveNowBtn').disabled=!project;
  host.setAttribute('aria-busy','true');
  host.innerHTML=page==='wizard'?renderProjectWizard(projectWizard||createProjectWizardState()):page==='examples'?renderExampleLibrary():page==='home'?renderHome():page==='data'?renderData():page==='organization'?renderOrganization():page==='schedule'?renderSchedule():page==='daily'?renderDaily():page==='documents'?renderDocuments():renderSystem();
  host.setAttribute('aria-busy','false');
  setActiveNav();
  host.focus({preventScroll:true});
  document.documentElement.dataset.technicalMode=technicalMode?'enabled':'disabled';
  const elapsed=(globalThis.performance?.now?.()||Date.now())-started;
  recordPerformance(page==='schedule'&&(project?.assignments?.length||0)>=500?'renderSchedule502':`renderPage:${page}`,elapsed,projectScale(project));
  if(page==='system'&&technicalMode)queueMicrotask(()=>refreshSystemDiagnostics());
}
function noProject(){return `<div class="card empty"><h2>No hay un proyecto activo</h2><p>Abre una copia o utiliza un ejemplo preparado para generar directamente en el navegador.</p><div class="toolbar center"><button class="btn" data-action="new-project">${projectWizard?'Continuar creación':'Crear proyecto'}</button><button class="btn secondary" data-action="open-project">Abrir copia</button><button class="btn ghost" data-example-action="library">Centros de ejemplo</button></div></div>`;}
function metric(value,label,detail=''){return `<div class="card metric-card"><div class="metric">${esc(value)}</div><div class="metric-label">${esc(label)}</div>${detail?`<small>${esc(detail)}</small>`:''}</div>`;}
function stateOptions(selected){return ['CONFIRMED','PROVISIONAL','SIMULATED','PENDING'].map(x=>`<option value="${x}" ${x===selected?'selected':''}>${statusLabel(x)}</option>`).join('');}
function privacyOptions(selected){return ['REAL','ANONYMIZED','SYNTHETIC'].map(x=>`<option value="${x}" ${x===selected?'selected':''}>${privacyLabel(x)}</option>`).join('');}
function kindOptions(selected){return ACTIVITY_KINDS.map(x=>`<option value="${x}" ${x===selected?'selected':''}>${activityKindLabel(x)}</option>`).join('');}
function dataStateRows(s){return ['CONFIRMED','PROVISIONAL','SIMULATED','PENDING','UNCLASSIFIED'].map(k=>`<div class="status-row"><span>${k==='UNCLASSIFIED'?'Sin clasificar':statusLabel(k)}</span><b>${s[k]}</b></div>`).join('');}
function dataEvidenceLabel(row){const p=row?.provenance||{};const origin=dataOriginLabel(p.origin);const validity=p.validTo?` · hasta ${p.validTo}`:p.validFrom?` · desde ${p.validFrom}`:'';return `${origin}${validity}`;}
function dataEvidenceForm(r={}){const p=r.provenance||{};const externalId=String(r.externalId||'');return `<fieldset><legend>Procedencia y vigencia</legend>${technicalMode?`<div class="notice info" style="margin:0 0 12px 0">El identificador técnico se conserva para importaciones, pero no es necesario para el uso ordinario.</div><div class="field-row"><label>Identificador técnico<input name="externalId" value="${esc(externalId)}" placeholder="Se mantiene automáticamente si existe"></label></div>`:`<input type="hidden" name="externalId" value="${esc(externalId)}">`}<div class="field-row"><label>Referencia de procedencia<input name="sourceRef" value="${esc(p.sourceRef||'Edición manual en la aplicación')}"></label><label>Vigente desde<input type="date" name="validFrom" value="${esc(p.validFrom||'')}"></label><label>Vigente hasta<input type="date" name="validTo" value="${esc(p.validTo||'')}"></label></div><div class="field-row"><label>Verificado por<input name="verifiedBy" value="${esc(p.verifiedBy||project?.meta?.responsible||'')}"></label><label>Fecha de verificación<input type="date" name="verifiedAt" value="${esc(p.verifiedAt||'')}"></label><label>Nota de procedencia<input name="provenanceNote" value="${esc(p.note||'')}"></label></div></fieldset>`;}
function readDataEvidence(fd,r){return manualDataProvenance({...r?.provenance,sourceRef:String(fd.get('sourceRef')||'').trim(),validFrom:String(fd.get('validFrom')||''),validTo:String(fd.get('validTo')||''),verifiedBy:String(fd.get('verifiedBy')||'').trim(),verifiedAt:String(fd.get('verifiedAt')||''),note:String(fd.get('provenanceNote')||'').trim()},project?.meta?.responsible||'');}

function renderHome(){
  if(!project)return `<div class="grid cards"><article class="card task-card"><h2>${projectWizard?'Continuar creando el proyecto':'Crear un horario'}</h2><p>${projectWizard?'Hay un borrador del asistente guardado en esta pestaña.':'El asistente guía centro, calendario, datos, organización y revisión.'}</p><button class="btn" data-action="new-project">${projectWizard?'Continuar asistente':'Crear proyecto'}</button></article><article class="card task-card"><h2>Continuar un trabajo</h2><p>Abre una copia <code>.ghfproject</code> sin subirla a ningún servidor.</p><button class="btn secondary" data-action="open-project">Abrir copia</button></article><article class="card task-card"><h2>Explorar centros de ejemplo</h2><p>Prueba ejemplos sintéticos preparados para generar directamente en el navegador.</p><button class="btn ghost" data-example-action="library">Abrir biblioteca</button></article></div>${renderPrinciples()}`;
  const v=validateProject(project),m=computeMetrics(project),s=analyzeDataState(project),r=v.readiness;
  const next=r.next;
  return `<div class="grid cards">${metric(`${r.progressPct}%`,'Preparación de datos',`${r.completed}/${r.total} tareas`)}${metric(`${m.completionPct}%`,'Cobertura del horario',`${m.placed}/${m.required} sesiones`)}${metric(v.errors.length,'Conflictos graves')}${metric(s.PENDING,'Elementos pendientes')}</div>
  <section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Siguiente tarea: ${esc(next.label)}</h2><p class="muted">La aplicación separa preparación, propuesta y aceptación para que el horario vigente nunca cambie a escondidas.</p></div><span class="spacer"></span><button class="btn" data-go="${routeForReadiness(next.id).page}" data-tab="${routeForReadiness(next.id).dataTab||''}" data-schedule-tab="${routeForReadiness(next.id).scheduleTab||''}">Continuar</button></div><div class="progress"><span style="width:${r.progressPct}%"></span></div>${renderReadiness(r)}</section>
  <div class="grid two" style="margin-top:16px"><section class="card"><h2>Estado de la información</h2>${dataStateRows(s)}</section><section class="card"><h2>Protecciones activas</h2><div class="status-row"><span>Proyecto activo único</span><b>Sí</b></div><div class="status-row"><span>Aceptación explícita</span><b>Sí</b></div><div class="status-row"><span>Copias rotatorias</span><b>4</b></div><div class="status-row"><span>Trabajo ordinario sin red</span><b>Sí</b></div></section></div><section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Biblioteca de centros de ejemplo</h2><p class="muted">Abrir un ejemplo crea antes una copia automática del proyecto activo.</p></div><span class="spacer"></span><button class="btn secondary" data-example-action="library">Explorar ejemplos</button></div></section>${renderPrinciples()}`;
}

function renderExampleLibrary(){
  const rows=catalogForMode({technicalMode});
  const cards=rows.map(item=>{
    const counts=item.expectedCounts||{};
    const countText=[counts.groups!=null?`${counts.groups} grupos`:'',counts.teachers!=null?`${counts.teachers} docentes`:'',counts.spaces!=null?`${counts.spaces} espacios`:'',counts.activities!=null?`${counts.activities} actividades`:'',counts.occurrences!=null?`${counts.occurrences} sesiones`:'' ].filter(Boolean).join(' · ');
    const engine=item.expectedEngine==='WEB_SOLVER'?'Genera en el navegador':item.expectedEngine==='CP_SAT_REQUIRED'?'Revisión avanzada no disponible en la web pública':item.expectedEngine==='CP_SAT_RECOMMENDED'?'Caso diagnóstico avanzado':'Generación automática';
    const badge=item.status==='REFERENCE'?'Referencia':item.status==='EXPECTED_INFEASIBLE'?'Caso diagnóstico':item.status==='MAINTENANCE_ONLY'?'Solo mantenimiento':item.expectedEngine==='WEB_SOLVER'?'Genera en navegador':'Solo revisión';
    return `<article class="card example-card" data-example-id="${esc(item.id)}"><div class="toolbar"><div><p class="eyebrow">${esc(item.centerType)}</p><h2 style="margin:0">${esc(item.title)}</h2><p class="muted">${esc(item.subtitle)}</p></div><span class="spacer"></span><span class="badge ${item.status==='EXPECTED_INFEASIBLE'?'warn':item.status==='REFERENCE'?'ok':''}">${esc(badge)}</span></div><p>${esc(item.purpose)}</p><p class="example-counts"><b>${esc(countText)}</b></p><div class="example-capabilities">${item.capabilities.map(x=>`<span>${esc(x)}</span>`).join('')}</div><p class="muted">${esc(engine)}</p><div class="toolbar wrap"><button class="btn" data-example-action="open" data-example-id="${esc(item.id)}">Abrir ejemplo</button><button class="btn secondary" data-example-action="download" data-example-id="${esc(item.id)}">Descargar copia</button></div></article>`;
  }).join('');
  return `<section class="card example-library-intro"><div class="toolbar"><div><p class="eyebrow">Biblioteca sintética</p><h2 style="margin:0">Ejemplos para la versión web</h2><p class="muted">Todos los datos son ficticios. En la vista ordinaria solo se muestran ejemplos que pueden generarse en el navegador.</p></div><span class="spacer"></span><button class="btn secondary" data-go="home">Volver al inicio</button></div></section><div class="grid two example-library" style="margin-top:16px">${cards}</div>${technicalMode?'':'<section class="card" style="margin-top:16px"><p class="muted">Los ejemplos avanzados se mantienen ocultos para evitar confusión en la versión pública.</p></section>'}`;
}

function renderPrinciples(){return `<section class="card" style="margin-top:16px"><h2>Recorrido de jefatura de estudios</h2><div class="grid three"><p><b>1. Preparar.</b><br><span class="muted">Datos y reglas pueden estar confirmados, provisionales, simulados o pendientes.</span></p><p><b>2. Proponer.</b><br><span class="muted">La generación crea una propuesta separada y explicada.</span></p><p><b>3. Decidir.</b><br><span class="muted">Aceptar, descartar, comparar o recuperar siempre requiere una acción expresa.</span></p></div></section>`;}
function renderReadiness(r){return `<div class="readiness">${r.sections.map(x=>{const route=routeForReadiness(x.id);return `<button class="readiness-step ${x.ready?'done':''}" data-go="${route.page}" data-tab="${route.dataTab||''}" data-schedule-tab="${route.scheduleTab||''}"><span>${x.ready?'✓':x.step}</span>${esc(x.label)}</button>`;}).join('')}</div>`;}

function renderData(){
  if(!project)return noProject();
  const tabs=[['project','Proyecto'],['calendar','Calendario'],['teachers','Docentes'],['groups','Grupos'],['subjects','Materias'],['spaces','Espacios'],['activities','Actividades'],['availability','Disponibilidad'],['imports','Importar datos']];
  return `<div class="tabs scroll-tabs">${tabs.map(([id,l])=>`<button data-data-tab="${id}" class="${dataTab===id?'active':''}">${l}</button>`).join('')}</div>${dataTab==='project'?renderProjectData():dataTab==='calendar'?renderCalendar():dataTab==='teachers'?renderTeachers():dataTab==='groups'?renderGroups():dataTab==='subjects'?renderSubjects():dataTab==='spaces'?renderSpaces():dataTab==='activities'?renderActivities():dataTab==='availability'?renderAvailability():renderImports()}`;
}
function renderProjectData(){const p=project.meta,v=validateProject(project);return `<form class="card" data-form="project"><h2>Identificación del proyecto</h2><div class="field-row"><label>Nombre del proyecto<input name="name" required value="${esc(p.name)}"></label><label>Centro<input name="center" value="${esc(p.center)}"></label><label>Curso académico<input name="academicYear" required value="${esc(p.academicYear)}"></label></div><div class="field-row"><label>Responsable<input name="responsible" value="${esc(p.responsible)}"></label><label>Estado general de los datos<select name="dataState">${stateOptions(p.dataState)}</select></label><label>Tipo de proyecto<select name="privacyClass">${privacyOptions(p.privacyClass)}</select></label></div><div class="toolbar"><button class="btn" type="submit">Guardar identificación</button><span class="spacer"></span><span class="badge ${v.canFinalize?'ok':'warn'}">${v.canFinalize?'Preparado para cierre':'Borrador con tareas pendientes'}</span></div></form><div class="grid three" style="margin-top:16px"><section class="card"><h2>Estado de los datos</h2>${dataStateRows(analyzeDataState(project))}</section><section class="card"><h2>Calidad y procedencia</h2>${(()=>{const q=analyzeDataQuality(project);return `<div class="status-row"><span>Con código externo</span><b>${q.withExternalId}/${q.total}</b></div><div class="status-row"><span>Verificados</span><b>${q.verified}</b></div><div class="status-row"><span>Vigencia caducada</span><b>${q.expired}</b></div><div class="status-row"><span>Importados sin fuente</span><b>${q.withoutSource}</b></div>`;})()}</section><section class="card"><h2>Resumen del trabajo</h2><div class="status-row"><span>Estado</span><b>${p.status==='FINAL'?'Definitivo':'Borrador'}</b></div><div class="status-row"><span>Revisión</span><b>${p.revisionNumber}</b></div><div class="status-row"><span>Última actualización</span><b>${fmtDate(p.updatedAt)}</b></div><div class="status-row"><span>Funcionamiento</span><b>Local y privado</b></div></section></div>`;}
function renderCalendar(){return `<section class="card"><div class="toolbar"><div><h2 style="margin:0">Semana y tramos</h2><p class="muted">Los tramos de recreo pueden utilizarse para vigilancias; la docencia ordinaria solo se coloca en tramos de clase.</p></div><span class="spacer"></span><button class="btn" data-action="add-slot">Añadir tramo</button></div><div class="table-wrap"><table><thead><tr><th>Orden</th><th>Nombre</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th></th></tr></thead><tbody>${project.calendar.slots.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(s.label)}</td><td>${s.kind==='CLASS'?'Clase':s.kind==='BREAK'?'Recreo/no lectivo':'Otro'}</td><td>${esc(s.start||'')}</td><td>${esc(s.end||'')}</td><td><button class="btn small secondary" data-action="edit-slot" data-id="${s.id}">Editar</button></td></tr>`).join('')}</tbody></table></div></section>`;}
function entitySection(title,type,rows,headers,mapper,help=''){return `<section class="card"><div class="toolbar"><div><h2 style="margin:0">${esc(title)}</h2>${help?`<p class="muted">${esc(help)}</p>`:''}</div><span class="spacer"></span><button class="btn" data-action="add-${type}">Añadir</button></div>${rows.length?`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}<th>Acciones</th></tr></thead><tbody>${rows.map(r=>`<tr>${mapper(r).map(c=>`<td>${esc(c)}</td>`).join('')}<td class="nowrap"><button class="btn small secondary" data-action="edit-${type}" data-id="${r.id}">Editar</button> <button class="btn small ghost" data-action="delete-${type}" data-id="${r.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">Todavía no hay registros.</div>`}</section>`;}
function renderTeachers(){return entitySection('Profesorado','teacher',project.teachers,['Nombre','Función / especialidad','Carga','LD / DC','Coberturas','Estado','Procedencia'],t=>[t.name,[t.role,t.specialty].filter(Boolean).join(' · ')||'—',t.weeklyTarget||0,`${t.ldQuota||0} / ${t.dcQuota||0}`,t.coverageEligible?'Sí':'No',statusLabel(t.dataState),dataEvidenceLabel(t)],'Las reducciones, LD/DC, itinerancia y elegibilidad de coberturas se configuran por docente.');}
function renderGroups(){return entitySection('Grupos','group',project.groups,['Nombre','Etapa','Tutor/a','Estado','Procedencia'],g=>[g.name,g.stage||'—',nameOf(project.teachers,g.tutorTeacherId),statusLabel(g.dataState),dataEvidenceLabel(g)]);}
function renderSubjects(){return entitySection('Materias','subject',project.subjects,['Nombre','Etapa','Estado','Procedencia'],s=>[s.name,s.stage||'—',statusLabel(s.dataState),dataEvidenceLabel(s)]);}
function renderSpaces(){return entitySection('Espacios','space',project.spaces,['Nombre','Etiquetas','Capacidad','Estado','Procedencia'],s=>[s.name,(s.tags||[]).join(', ')||'—',s.capacity||1,statusLabel(s.dataState),dataEvidenceLabel(s)],'Las etiquetas determinan qué actividades son compatibles con cada espacio.');}
function renderActivities(){return entitySection('Actividades y carga semanal','activity',project.activities,['Actividad','Tipo','Grupos','Profesorado','Sesiones','Espacio','Estado','Procedencia'],a=>[a.name,activityKindLabel(a.kind),(a.groupIds||[]).map(id=>nameOf(project.groups,id)).join(', ')||'—',(a.teacherIds||[]).map(id=>nameOf(project.teachers,id)).join(', '),a.weeklySessions,(a.requiredSpaceTags||[]).join(', ')||'Cualquiera',statusLabel(a.dataState),dataEvidenceLabel(a)],'Incluye docencia, apoyos, LD, DC, guardias, recreos, reuniones y otras actividades.');}

function presenceStatusLabel(value){return({PRESENT_REQUIRED:'Presente / disponible',AUTHORIZED_AWAY:'Fuera del centro autorizadamente',OTHER_SITE:'En otra sede',OUTSIDE_WORKDAY:'Fuera de jornada',PENDING:'Pendiente de confirmar'})[value]||value;}
function serviceTypeLabel(value){return({ENTRY:'Entrada',ORDINARY_GUARD:'Guardia ordinaria',BREAK:'Recreo',EXIT:'Salida',CUSTOM:'Otro servicio'})[value]||value;}
function presenceRequirementLabel(value){return({PRESENT_AT_SITE:'Presencia en la sede',PRESENT_ANY_SITE:'Presencia en alguna sede',NONE:'No requiere presencia física'})[value]||value;}
function renderAvailability(){
  if(!project.teachers.length)return '<section class="card"><h2>Presencia del profesorado</h2><div class="empty">Añade docentes antes de configurar su presencia.</div></section>';
  project.settings=project.settings||{};
  const selected=project.settings.availabilityTeacherId&&project.teachers.some(x=>x.id===project.settings.availabilityTeacherId)?project.settings.availabilityTeacherId:project.teachers[0].id,t=project.teachers.find(x=>x.id===selected);project.settings.availabilityTeacherId=selected;
  const sites=normalizeEducationalDomain4(project.domain||{}).sites||[];
  const byKey=new Map((t.presencePlan||[]).map(row=>[slotKey(row.dayId,row.slotId),row]));
  const derived=(dayId,slotId)=>{const key=slotKey(dayId,slotId),row=byKey.get(key);if(row)return row;if((t.unavailable||[]).includes(key))return{status:'AUTHORIZED_AWAY',siteId:''};if((t.presence||[]).length&&!(t.presence||[]).includes(key))return{status:'PENDING',siteId:''};return{status:'PRESENT_REQUIRED',siteId:t.homeSiteId||''};};
  return `<section class="card"><div class="toolbar"><div><h2 style="margin:0">Presencia explícita del profesorado</h2><p class="muted">Cada franja indica la situación real. Pendiente o sin confirmar nunca cuenta como disponible para una cobertura.</p></div><span class="spacer"></span><label>Docente<select id="availabilityTeacher">${project.teachers.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${esc(x.name)}</option>`).join('')}</select><small>Cambia de docente para revisar o guardar su presencia.</small></label></div><form data-form="availability"><input type="hidden" name="teacherId" value="${t.id}"><div class="table-wrap"><table><thead><tr><th>Tramo</th>${project.calendar.days.map(d=>`<th>${esc(d.label)}</th>`).join('')}</tr></thead><tbody>${project.calendar.slots.map(slot=>`<tr><th>${esc(slot.label)}<br><small>${esc(slot.kind)}</small></th>${project.calendar.days.map(day=>{const row=derived(day.id,slot.id);return `<td><input type="hidden" name="presenceKey" value="${day.id}:${slot.id}"><select name="presenceStatus" aria-label="${esc(t.name)} · ${esc(day.label)} · ${esc(slot.label)}">${PRESENCE_STATUSES.map(status=>`<option value="${status}" ${row.status===status?'selected':''}>${esc(presenceStatusLabel(status))}</option>`).join('')}</select><select name="presenceSite" aria-label="Sede"><option value="">Sin sede concreta</option>${sites.map(site=>`<option value="${site.id}" ${row.siteId===site.id?'selected':''}>${esc(site.name)}</option>`).join('')}</select></td>`;}).join('')}</tr>`).join('')}</tbody></table></div><div class="notice info">Para “En otra sede” debe seleccionarse una sede. La aplicación bloquea automáticamente las franjas pendientes, fuera de jornada o con ausencia autorizada.</div><div class="toolbar"><button class="btn" type="submit">Guardar presencia</button><button class="btn secondary" type="button" data-action="clear-availability" data-id="${t.id}">Volver al modo heredado</button></div></form></section>`;
}

function renderOrganization(){
  const o=project.organization,c=o.ldDc,w=o.workloadPolicy,cp=o.coveragePolicy;
  return `<form class="card" data-form="organization"><div class="toolbar"><div><h2 style="margin:0">Perfil organizativo configurable</h2><p class="muted">Las reglas específicas del centro quedan visibles, revisables y sincronizadas como actividades trazables.</p></div><span class="spacer"></span><label class="checkline"><input type="checkbox" name="enabled" ${o.enabled?'checked':''}> Activar perfil</label></div><div class="field-row"><label>Nombre del perfil<input name="profileName" value="${esc(o.profile.name)}"></label><label>Versión<input name="profileVersion" value="${esc(o.profile.version)}"></label><label>Estado<select name="profileState">${stateOptions(o.profile.dataState)}</select></label></div><h3>LD y DC</h3><div class="field-row"><label>LD ordinarias<input type="number" min="0" step="1" name="ordinaryLd" value="${c.ordinaryLd}"></label><label>DC ordinarias<input type="number" min="0" step="1" name="ordinaryDc" value="${c.ordinaryDc}"></label><label>Máximo LD simultáneas<input type="number" min="0" step="1" name="maxSimultaneousLd" value="${c.maxSimultaneousLd??''}"></label><label class="checkline"><input type="checkbox" name="dcCoverageAllowed" ${c.dcCoverageAllowed?'checked':''}> Permitir DC para coberturas</label></div><div class="field-row"><label>Tramos permitidos para LD<select name="ldAllowedSlots" multiple size="5">${project.calendar.slots.filter(s=>s.kind==='CLASS').map(s=>`<option value="${s.id}" ${c.ldAllowedSlots.includes(s.id)?'selected':''}>${esc(s.label)}</option>`).join('')}</select></label><label>Tramos permitidos para DC<select name="dcAllowedSlots" multiple size="5">${project.calendar.slots.filter(s=>s.kind==='CLASS').map(s=>`<option value="${s.id}" ${c.dcAllowedSlots.includes(s.id)?'selected':''}>${esc(s.label)}</option>`).join('')}</select></label></div><h3>Carga y coberturas</h3><div class="field-row"><label class="checkline"><input type="checkbox" name="requireExactTarget" ${w.requireExactTarget?'checked':''}> Exigir ajuste de carga para cerrar</label><label>Tolerancia de sesiones<input type="number" min="0" step="1" name="toleranceSessions" value="${w.toleranceSessions||0}"></label><label>Máximo de coberturas diarias<input type="number" min="0" step="1" name="maxDailyCoverages" value="${cp.maxDailyCoverages??''}"></label><label class="checkline"><input type="checkbox" name="preserveEssentialPresence" ${cp.preserveEssentialPresence?'checked':''}> Proteger perfiles esenciales</label></div><div class="field-row"><label>Tipos que computan en carga<select name="countedKinds" multiple size="8">${ACTIVITY_KINDS.map(k=>`<option value="${k}" ${w.countedKinds.includes(k)?'selected':''}>${esc(activityKindLabel(k))}</option>`).join('')}</select></label><label>Actividades liberables para cobertura<select name="releasableKinds" multiple size="8">${ACTIVITY_KINDS.map(k=>`<option value="${k}" ${cp.releasableKinds.includes(k)?'selected':''}>${esc(activityKindLabel(k))}</option>`).join('')}</select></label><label>Actividades que restan presencia<select name="presenceExcludingKinds" multiple size="8">${ACTIVITY_KINDS.map(k=>`<option value="${k}" ${cp.presenceExcludingKinds.includes(k)?'selected':''}>${esc(activityKindLabel(k))}</option>`).join('')}</select></label></div><div class="toolbar"><button class="btn" type="submit">Guardar y sincronizar organización</button><span class="muted">Última sincronización: ${esc(o.sync?.lastAt?fmtDate(o.sync.lastAt):'pendiente')}</span></div></form>${renderTeacherOrganization()}${renderOrganizationServices()}${renderAnchoredSegments()}${renderPresenceRules()}${renderBreakZones()}${renderOrganizationRules()}${renderEducationalDomain4()}`;
}


function domainLines(rows,mapper){return (rows||[]).map(mapper).join('\n');}
function assistantBadge(state){return state==='READY'?'<span class="badge ok">Preparado</span>':state==='BLOCKED'?'<span class="badge danger">Revisar</span>':'<span class="badge">Opcional</span>';}
function semanticMultiOptions(rows,selected=[],label=row=>row.name||row.label||row.id){const set=new Set(selected||[]);return (rows||[]).map(row=>`<option value="${esc(row.id)}" ${set.has(row.id)?'selected':''}>${esc(label(row))}</option>`).join('');}
function renderEducationalDomain4(){
  const d=normalizeEducationalDomain4(project.domain||{}),overview=semanticAssistantOverview(project),readiness=semanticAssistantReadiness(project),weeks=activeWeekIds(d);
  const cards=overview.sections.map(row=>{const def=P10M5_ASSISTANTS.find(x=>x.id===row.id);return `<article class="card task-card"><div class="toolbar"><h3 style="margin:0">${esc(def?.title||row.id)}</h3>${assistantBadge(row.status)}</div><p>${esc(def?.purpose||'')}</p><p class="muted">${esc(row.summary)}</p></article>`;}).join('');
  const siteRows=d.sites.length?`<div class="table-wrap"><table><thead><tr><th>Sede</th><th>Edificio</th><th>Referencia</th><th></th></tr></thead><tbody>${d.sites.map(row=>`<tr><td><b>${esc(row.name)}</b></td><td>${esc(row.building||'—')}</td><td>${esc(row.addressLabel||'—')}</td><td><button class="btn small secondary" data-action="semantic-edit-site" data-id="${esc(row.id)}">Editar</button> <button class="btn small ghost" data-action="semantic-delete-site" data-id="${esc(row.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No se necesitan sedes cuando toda la actividad se realiza en un único edificio.</div>';
  const travelRows=d.travelRules.length?`<div class="table-wrap"><table><thead><tr><th>Trayecto</th><th>Tiempo</th><th>Sentido</th><th></th></tr></thead><tbody>${d.travelRules.map(row=>`<tr><td>${esc(nameOf(d.sites,row.fromSiteId))} → ${esc(nameOf(d.sites,row.toSiteId))}</td><td>${row.minutes} min</td><td>${row.bidirectional!==false?'Ida y vuelta':'Solo ida'}</td><td><button class="btn small secondary" data-action="semantic-edit-travel" data-id="${esc(row.id)}">Editar</button> <button class="btn small ghost" data-action="semantic-delete-travel" data-id="${esc(row.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay desplazamientos configurados.</div>';
  const resourceRows=d.resources.length?`<div class="table-wrap"><table><thead><tr><th>Recurso</th><th>Tipo</th><th>Disponibles</th><th>Sede</th><th></th></tr></thead><tbody>${d.resources.map(row=>`<tr><td><b>${esc(row.name)}</b></td><td>${esc(RESOURCE_KIND_LABELS[row.kind]||'Otro recurso')}</td><td>${row.capacity}</td><td>${esc(nameOf(d.sites,row.siteId)||'Sin sede fija')}</td><td><button class="btn small secondary" data-action="semantic-edit-resource" data-id="${esc(row.id)}">Editar</button> <button class="btn small ghost" data-action="semantic-delete-resource" data-id="${esc(row.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay recursos compartidos limitados.</div>';
  const activityRows=project.activities.length?`<div class="table-wrap"><table><thead><tr><th>Actividad</th><th>Semanas</th><th>Duración</th><th>Necesidades</th><th></th></tr></thead><tbody>${project.activities.map(row=>{const selected=row.weekPattern?.mode==='INCLUDE'?(row.weekPattern.weekIds||[]).map(id=>nameOf(d.cycle.weeks,id)).join(', '):'Todas';const needs=(row.requiredResourceIds?.length||0)+(row.allowedSiteIds?.length||0)+(row.allowedSpaceIds?.length||0)+(row.alternativeSpaceIds?.length||0);return `<tr><td><b>${esc(row.name)}</b></td><td>${esc(selected||'Todas')}</td><td>${Number(row.durationSlots||1)} periodo(s)</td><td>${needs?`${needs} condición(es)`:'Sin condiciones especiales'}</td><td><button class="btn small secondary" data-action="semantic-configure-activity" data-id="${esc(row.id)}">Configurar</button></td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty">Añade actividades antes de configurar sus necesidades.</div>';
  const relationRows=d.activityRelations.length?`<div class="table-wrap"><table><thead><tr><th>Actividades</th><th>Relación</th><th>Importancia</th><th></th></tr></thead><tbody>${d.activityRelations.map(row=>`<tr><td>${esc(nameOf(project.activities,row.leftActivityId))} · ${esc(nameOf(project.activities,row.rightActivityId))}</td><td>${esc(RELATION_LABELS[row.type]||row.type)}${row.value?` · ${row.value} periodo(s)`:''}</td><td>${row.hard!==false?'Imprescindible':'Preferente'}</td><td><button class="btn small secondary" data-action="semantic-edit-relation" data-id="${esc(row.id)}">Editar</button> <button class="btn small ghost" data-action="semantic-delete-relation" data-id="${esc(row.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay relaciones especiales entre actividades.</div>';
  const splitRows=d.splitSets.length?`<div class="table-wrap"><table><thead><tr><th>Desdoble</th><th>Modalidad</th><th>Actividades</th><th></th></tr></thead><tbody>${d.splitSets.map(row=>`<tr><td><b>${esc(row.name)}</b></td><td>${esc(SPLIT_MODE_LABELS[row.mode]||row.mode)}</td><td>${(row.activityIds||[]).map(id=>esc(nameOf(project.activities,id))).join(', ')}</td><td><button class="btn small secondary" data-action="semantic-edit-split" data-id="${esc(row.id)}">Editar</button> <button class="btn small ghost" data-action="semantic-delete-split" data-id="${esc(row.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay desdobles o simultaneidades configurados.</div>';
  const raw=technicalMode?renderEducationalDomain4Technical(d,weeks):'';
  return `<section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Configuración educativa avanzada</h2><p class="muted">Asistentes guiados para semanas, sedes, recursos, actividades, relaciones y desdobles. No es necesario editar archivos ni estructuras técnicas.</p></div><span class="spacer"></span><span class="badge">${esc(P10M5_ASSISTANT_CONTRACT_VERSION)}</span></div><div class="grid cards" style="margin-top:16px">${cards}</div></section>
  <section class="card" style="margin-top:16px"><h2>1. Semanas y ciclos</h2><p class="muted">Elige cómo se repite el horario. Al cambiar el ciclo, las actividades volverán inicialmente a aplicarse a todas las semanas.</p><form data-form="semantic-cycle"><div class="field-row"><label>Funcionamiento<select name="mode"><option value="WEEKLY" ${d.cycle.mode==='WEEKLY'?'selected':''}>La misma semana se repite</option><option value="AB" ${d.cycle.mode==='AB'?'selected':''}>Alternan semana A y semana B</option><option value="CUSTOM" ${d.cycle.mode==='CUSTOM'?'selected':''}>Ciclo personalizado</option></select></label><label>Nombres de las semanas<textarea name="labels" rows="4" placeholder="Una semana por línea">${esc(d.cycle.weeks.map(row=>row.label).join('\n'))}</textarea><small>Para semana A/B se usarán automáticamente «Semana A» y «Semana B».</small></label></div><button class="btn" type="submit">Guardar ciclo</button></form></section>
  <section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">2. Sedes y desplazamientos</h2><p class="muted">Solo es necesario cuando el profesorado o los grupos cambian de edificio o sede.</p></div><span class="spacer"></span><button class="btn" data-action="semantic-add-site">Añadir sede</button><button class="btn secondary" data-action="semantic-add-travel" ${d.sites.length<2?'disabled':''}>Añadir desplazamiento</button></div>${siteRows}<div style="margin-top:14px">${travelRows}</div></section>
  <section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">3. Recursos compartidos</h2><p class="muted">Equipos, especialistas, materiales o servicios que no pueden utilizarse simultáneamente por encima de su disponibilidad.</p></div><span class="spacer"></span><button class="btn" data-action="semantic-add-resource">Añadir recurso</button></div>${resourceRows}</section>
  <section class="card" style="margin-top:16px"><h2>4. Necesidades de las actividades</h2><p class="muted">Configura duración, semanas, sedes, espacios y recursos de cada actividad mediante un formulario guiado.</p>${activityRows}</section>
  <section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">5. Relaciones entre actividades</h2><p class="muted">Indica coincidencia, orden, separación o continuidad entre dos actividades.</p></div><span class="spacer"></span><button class="btn" data-action="semantic-add-relation" ${project.activities.length<2?'disabled':''}>Añadir relación</button></div>${relationRows}</section>
  <section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">6. Desdobles y simultaneidades</h2><p class="muted">Agrupa actividades que deben celebrarse simultáneamente o de forma alternativa.</p></div><span class="spacer"></span><button class="btn" data-action="semantic-add-split" ${project.activities.length<2?'disabled':''}>Añadir desdoble</button></div>${splitRows}</section>
  <section class="card ${readiness.ready?'':'warning'}" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Comprobación antes de generar</h2><p>${readiness.ready?(readiness.engine.required?'La configuración es coherente y necesita optimización avanzada.':'La configuración es coherente y admite generación rápida.'):`Hay ${readiness.blockers.length} bloqueo(s) que deben corregirse antes del cierre.`}</p></div><span class="spacer"></span><button class="btn" data-go="schedule" data-schedule-tab="generate" ${readiness.ready?'':'disabled'}>Ir a generar</button></div>${readiness.blockers.map(row=>`<div class="issue ERROR"><b>${esc(row.message)}</b></div>`).join('')}</section>${raw}`;
}
function renderEducationalDomain4Technical(d,weeks){
  const weekText=domainLines(d.cycle.weeks,row=>`${row.id}|${row.label}`),siteText=domainLines(d.sites,row=>`${row.id}|${row.name}|${row.building||''}`),travelText=domainLines(d.travelRules,row=>`${row.fromSiteId}|${row.toSiteId}|${row.minutes}|${row.bidirectional!==false?'SI':'NO'}`),resourceText=domainLines(d.resources,row=>`${row.id}|${row.name}|${row.kind}|${row.capacity}|${row.siteId||''}`),relationText=domainLines(d.activityRelations,row=>`${row.id}|${row.type}|${row.leftActivityId}|${row.rightActivityId}|${row.value||0}|${row.hard!==false?'DURA':'BLANDA'}`),splitText=domainLines(d.splitSets,row=>`${row.id}|${row.name}|${row.mode}|${(row.activityIds||[]).join(',')}|${(row.groupIds||[]).join(',')}`);
  return `<details class="card" style="margin-top:16px"><summary><b>Mantenimiento avanzado del dominio</b></summary><p class="muted">Vista técnica de compatibilidad. El uso ordinario debe realizarse con los asistentes anteriores.</p><form data-form="domain4"><div class="field-row"><label>Tipo de ciclo<select name="cycleMode">${CYCLE_MODES.map(mode=>`<option value="${mode}" ${d.cycle.mode===mode?'selected':''}>${mode}</option>`).join('')}</select></label><label>Semanas<textarea name="weeks" rows="4">${esc(weekText)}</textarea></label></div><div class="field-row"><label>Sedes<textarea name="sites" rows="5">${esc(siteText)}</textarea></label><label>Desplazamientos<textarea name="travelRules" rows="5">${esc(travelText)}</textarea></label></div><div class="field-row"><label>Recursos<textarea name="resources" rows="6">${esc(resourceText)}</textarea></label><label>Relaciones<textarea name="relations" rows="6">${esc(relationText)}</textarea></label></div><label>Desdobles<textarea name="splitSets" rows="5">${esc(splitText)}</textarea></label><div class="toolbar"><button class="btn" type="submit">Guardar vista técnica</button><span class="muted">Semanas: ${weeks.map(esc).join(', ')}</span></div></form></details>`;
}

function commitSemanticAssistant(command,message){
  ensureDraft();project=normalizeProject(applySemanticAssistantCommand(project,command));appendAudit(project,'P10M5_SEMANTIC_ASSISTANT_APPLIED',message,project.meta.responsible||'Usuario',{assistantContract:P10M5_ASSISTANT_CONTRACT_VERSION,command:command.type});changed(message);render();
}
function showSemanticSiteModal(id=''){
  const d=normalizeEducationalDomain4(project.domain||{}),row=d.sites.find(x=>x.id===id)||{};
  showModal(id?'Editar sede':'Añadir sede',`<form id="modalForm"><label>Nombre de la sede<input name="name" required value="${esc(row.name||'')}"></label><div class="field-row"><label>Edificio o zona<input name="building" value="${esc(row.building||'')}"></label><label>Referencia breve<input name="addressLabel" value="${esc(row.addressLabel||'')}"></label></div><p class="muted">No incluyas una dirección personal. Basta una denominación organizativa, como «Edificio principal» o «Sede B».</p></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f);commitSemanticAssistant({type:'UPSERT_SITE',payload:{id:row.id||'',name:fd.get('name'),building:fd.get('building'),addressLabel:fd.get('addressLabel')}},id?'Sede actualizada mediante el asistente.':'Sede añadida mediante el asistente.');return true;});
}
function showSemanticTravelModal(id=''){
  const d=normalizeEducationalDomain4(project.domain||{}),row=d.travelRules.find(x=>x.id===id)||{};
  showModal(id?'Editar desplazamiento':'Añadir desplazamiento',`<form id="modalForm"><div class="field-row"><label>Desde<select name="fromSiteId" required><option value="">Selecciona</option>${semanticMultiOptions(d.sites,[row.fromSiteId])}</select></label><label>Hasta<select name="toSiteId" required><option value="">Selecciona</option>${semanticMultiOptions(d.sites,[row.toSiteId])}</select></label><label>Tiempo necesario en minutos<input type="number" min="0" step="1" name="minutes" required value="${Number(row.minutes||0)}"></label></div><label class="checkline"><input type="checkbox" name="bidirectional" ${row.bidirectional!==false?'checked':''}> Aplicar también al trayecto de vuelta</label></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f);commitSemanticAssistant({type:'UPSERT_TRAVEL',payload:{id:row.id||'',fromSiteId:fd.get('fromSiteId'),toSiteId:fd.get('toSiteId'),minutes:fd.get('minutes'),bidirectional:fd.get('bidirectional')==='on'}},id?'Desplazamiento actualizado.':'Desplazamiento añadido.');return true;});
}
function showSemanticResourceModal(id=''){
  const d=normalizeEducationalDomain4(project.domain||{}),row=d.resources.find(x=>x.id===id)||{};
  showModal(id?'Editar recurso':'Añadir recurso',`<form id="modalForm"><label>Nombre del recurso<input name="name" required value="${esc(row.name||'')}"></label><div class="field-row"><label>Tipo<select name="kind">${RESOURCE_KINDS.map(kind=>`<option value="${kind}" ${row.kind===kind?'selected':''}>${esc(RESOURCE_KIND_LABELS[kind]||kind)}</option>`).join('')}</select></label><label>Unidades disponibles<input type="number" min="1" step="1" name="capacity" value="${Number(row.capacity||1)}"></label><label>Sede habitual<select name="siteId"><option value="">Sin sede fija</option>${semanticMultiOptions(d.sites,[row.siteId])}</select></label></div><label>Etiquetas descriptivas<input name="tags" value="${esc((row.tags||[]).join(', '))}" placeholder="Ej.: laboratorio, portátil"></label></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f);commitSemanticAssistant({type:'UPSERT_RESOURCE',payload:{id:row.id||'',name:fd.get('name'),kind:fd.get('kind'),capacity:fd.get('capacity'),siteId:fd.get('siteId'),tags:String(fd.get('tags')||'').split(',').map(x=>x.trim()).filter(Boolean)}},id?'Recurso actualizado.':'Recurso añadido.');return true;});
}
function showSemanticActivityModal(id){
  const d=normalizeEducationalDomain4(project.domain||{}),row=project.activities.find(x=>x.id===id);if(!row)throw new Error('No se encontró la actividad.');
  showModal('Configurar necesidades de la actividad',`<form id="modalForm"><p><b>${esc(row.name)}</b></p><div class="field-row"><label>Duración consecutiva<input type="number" min="1" step="1" name="durationSlots" value="${Number(row.durationSlots||1)}"><small>Número de periodos que debe ocupar cada sesión.</small></label><label>Aplicación semanal<select name="weekMode"><option value="ALL" ${row.weekPattern?.mode!=='INCLUDE'?'selected':''}>Todas las semanas</option><option value="INCLUDE" ${row.weekPattern?.mode==='INCLUDE'?'selected':''}>Solo semanas seleccionadas</option></select></label><label>Semanas<select name="weekIds" multiple size="4">${semanticMultiOptions(d.cycle.weeks,row.weekPattern?.weekIds||[],x=>x.label)}</select></label></div><div class="field-row"><label>Sedes permitidas<select name="allowedSiteIds" multiple size="5">${semanticMultiOptions(d.sites,row.allowedSiteIds||[])}</select></label><label>Sedes preferentes<select name="preferredSiteIds" multiple size="5">${semanticMultiOptions(d.sites,row.preferredSiteIds||[])}</select></label></div><div class="field-row"><label>Espacios permitidos<select name="allowedSpaceIds" multiple size="6">${semanticMultiOptions(project.spaces,row.allowedSpaceIds||[])}</select></label><label>Espacios preferentes<select name="preferredSpaceIds" multiple size="6">${semanticMultiOptions(project.spaces,row.preferredSpaceIds||[])}</select></label><label>Espacios alternativos<select name="alternativeSpaceIds" multiple size="6">${semanticMultiOptions(project.spaces,row.alternativeSpaceIds||[])}</select></label></div><div class="field-row"><label>Recursos imprescindibles<select name="requiredResourceIds" multiple size="6">${semanticMultiOptions(d.resources,row.requiredResourceIds||[])}</select></label><label>Recursos preferentes<select name="preferredResourceIds" multiple size="6">${semanticMultiOptions(d.resources,row.preferredResourceIds||[])}</select></label></div></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f);commitSemanticAssistant({type:'CONFIGURE_ACTIVITY',payload:{activityId:row.id,durationSlots:fd.get('durationSlots'),weekMode:fd.get('weekMode'),weekIds:fd.getAll('weekIds'),allowedSiteIds:fd.getAll('allowedSiteIds'),preferredSiteIds:fd.getAll('preferredSiteIds'),allowedSpaceIds:fd.getAll('allowedSpaceIds'),preferredSpaceIds:fd.getAll('preferredSpaceIds'),alternativeSpaceIds:fd.getAll('alternativeSpaceIds'),requiredResourceIds:fd.getAll('requiredResourceIds'),preferredResourceIds:fd.getAll('preferredResourceIds')}},'Necesidades de la actividad actualizadas.');return true;},'Guardar necesidades');
}
function showSemanticRelationModal(id=''){
  const d=normalizeEducationalDomain4(project.domain||{}),row=d.activityRelations.find(x=>x.id===id)||{};
  showModal(id?'Editar relación':'Añadir relación',`<form id="modalForm"><div class="field-row"><label>Primera actividad<select name="leftActivityId" required><option value="">Selecciona</option>${semanticMultiOptions(project.activities,[row.leftActivityId])}</select></label><label>Segunda actividad<select name="rightActivityId" required><option value="">Selecciona</option>${semanticMultiOptions(project.activities,[row.rightActivityId])}</select></label></div><div class="field-row"><label>Relación<select name="relationType">${RELATION_TYPES.map(type=>`<option value="${type}" ${row.type===type?'selected':''}>${esc(RELATION_LABELS[type]||type)}</option>`).join('')}</select></label><label>Separación en periodos<input type="number" min="0" step="1" name="value" value="${Number(row.value||0)}"><small>Solo se usa para separación mínima o máxima.</small></label><label>Importancia<select name="importance"><option value="HARD" ${row.hard!==false?'selected':''}>Imprescindible</option><option value="SOFT" ${row.hard===false?'selected':''}>Preferente</option></select></label></div><label class="checkline"><input type="checkbox" name="sameWeek" ${row.sameWeek!==false?'checked':''}> Aplicar dentro de la misma semana del ciclo</label><label>Nota explicativa<input name="note" value="${esc(row.note||'')}"></label></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f);commitSemanticAssistant({type:'UPSERT_RELATION',payload:{id:row.id||'',relationType:fd.get('relationType'),leftActivityId:fd.get('leftActivityId'),rightActivityId:fd.get('rightActivityId'),value:fd.get('value'),hard:fd.get('importance')==='HARD',weight:40,sameWeek:fd.get('sameWeek')==='on',note:fd.get('note')}},id?'Relación actualizada.':'Relación añadida.');return true;});
}
function showSemanticSplitModal(id=''){
  const d=normalizeEducationalDomain4(project.domain||{}),row=d.splitSets.find(x=>x.id===id)||{};
  showModal(id?'Editar desdoble':'Añadir desdoble',`<form id="modalForm"><label>Nombre del desdoble<input name="name" required value="${esc(row.name||'')}"></label><div class="field-row"><label>Modalidad<select name="mode">${SPLIT_MODES.map(mode=>`<option value="${mode}" ${row.mode===mode?'selected':''}>${esc(SPLIT_MODE_LABELS[mode]||mode)}</option>`).join('')}</select></label><label>Actividades<select name="activityIds" multiple size="8" required>${semanticMultiOptions(project.activities,row.activityIds||[])}</select><small>Selecciona al menos dos.</small></label><label>Grupos afectados<select name="groupIds" multiple size="8">${semanticMultiOptions(project.groups,row.groupIds||[])}</select></label></div><label>Nota explicativa<input name="note" value="${esc(row.note||'')}"></label></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f);commitSemanticAssistant({type:'UPSERT_SPLIT',payload:{id:row.id||'',name:fd.get('name'),mode:fd.get('mode'),activityIds:fd.getAll('activityIds'),groupIds:fd.getAll('groupIds'),note:fd.get('note')}},id?'Desdoble actualizado.':'Desdoble añadido.');return true;});
}

function renderTeacherOrganization(){
  const loads=new Map(organizationalLoadSummary(project).map(x=>[x.teacherId,x]));
  return `<section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Cargos, coordinaciones y reducciones</h2><p class="muted">Cada concepto conserva tipo, sesiones, vigencia y tramos permitidos. La sincronización genera actividades editables solo desde esta configuración.</p></div><span class="spacer"></span><button class="btn" data-action="add-position">Añadir cargo</button><button class="btn secondary" data-action="add-reduction">Añadir reducción</button></div>${project.teachers.length?`<div class="table-wrap"><table><thead><tr><th>Docente</th><th>Cargos</th><th>Reducciones</th><th>Carga computable</th><th></th></tr></thead><tbody>${project.teachers.map(t=>{const l=loads.get(t.id)||{};return `<tr><td><b>${esc(t.name)}</b><br><small>${esc(t.role||'Sin función indicada')}</small></td><td>${(t.positions||[]).length?(t.positions||[]).map(x=>`<div>${esc(x.label)} · ${x.weeklySessions} <button class="btn small ghost" data-action="delete-position" data-teacher="${t.id}" data-id="${x.id}">Eliminar</button></div>`).join(''):'—'}</td><td>${(t.reductions||[]).length?(t.reductions||[]).map(x=>`<div>${esc(x.label)} · ${x.weeklySessions} <button class="btn small ghost" data-action="delete-reduction" data-teacher="${t.id}" data-id="${x.id}">Eliminar</button></div>`).join(''):'—'}</td><td>${Number(l.planned||0)} / ${Number(l.target||0)} <small>(${Number(l.difference||0)>0?'+':''}${Number(l.difference||0)})</small></td><td><button class="btn small" data-action="add-position" data-teacher="${t.id}">Cargo</button><button class="btn small secondary" data-action="add-reduction" data-teacher="${t.id}">Reducción</button></td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty">Añade docentes antes de configurar cargos o reducciones.</div>'}</section>`;
}

function renderOrganizationServices(){
  const rows=project.organization.services||[];
  return `<section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Servicios organizativos</h2><p class="muted">Entrada, guardia, recreo, salida y otros servicios comparten un modelo configurable de duración, presencia y equilibrio.</p></div><span class="spacer"></span><button class="btn" data-action="add-organization-service">Añadir servicio</button></div>${rows.length?`<div class="table-wrap"><table><thead><tr><th>Servicio</th><th>Categoría</th><th>Profesorado</th><th>Frecuencia</th><th>Duración</th><th>Presencia</th><th>Equilibrio</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.name)}</b><br><small>${esc(activityKindLabel(r.kind))}</small></td><td>${esc(serviceTypeLabel(r.serviceType||'CUSTOM'))}</td><td>${(r.teacherIds||[]).map(id=>esc(nameOf(project.teachers,id))).join(', ')||'—'}</td><td>${r.weeklySessions} semanal(es)</td><td>${Number(r.durationSlots||1)} tramo(s)</td><td>${esc(presenceRequirementLabel(r.presenceRequirement||'PRESENT_AT_SITE'))}</td><td>${Number(r.balanceWeight??1)}</td><td><button class="btn small ghost" data-action="delete-organization-service" data-id="${r.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay servicios organizativos definidos.</div>'}</section>`;
}
function renderAnchoredSegments(){
  const rows=project.organization.anchoredSegments||[];
  return `<section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Segmentos vinculados a una sesión</h2><p class="muted">Permite colocar lectura, tutoría breve, asamblea o transición inmediatamente antes o después de una sesión de referencia.</p></div><span class="spacer"></span><button class="btn" data-action="add-anchored-segment">Añadir segmento</button></div>${rows.length?`<div class="table-wrap"><table><thead><tr><th>Segmento</th><th>Actividad breve</th><th>Posición</th><th>Sesión de referencia</th><th>Estado</th><th></th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.name)}</td><td>${esc(nameOf(project.activities,row.segmentActivityId))}</td><td>${row.position==='BEFORE'?'Inmediatamente antes':'Inmediatamente después'}</td><td>${esc(nameOf(project.activities,row.anchorActivityId))}</td><td>${statusLabel(row.dataState)}</td><td><button class="btn small ghost" data-action="delete-anchored-segment" data-id="${row.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay segmentos vinculados.</div>'}</section>`;
}
function renderPresenceRules(){return `<section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Presencia mínima</h2><p class="muted">Impide que determinadas LD o coberturas dejen el centro por debajo del mínimo configurado.</p></div><span class="spacer"></span><button class="btn" data-action="add-presence-rule">Añadir regla</button></div>${project.organization.minimumPresence.length?`<div class="table-wrap"><table><thead><tr><th>Mínimo</th><th>Perfil</th><th>Días</th><th>Tramos</th><th></th></tr></thead><tbody>${project.organization.minimumPresence.map(r=>`<tr><td>${r.minimum}</td><td>${esc(r.profileTag||'Todo el profesorado')}</td><td>${(r.dayIds||[]).map(id=>nameOf(project.calendar.days,id)).join(', ')}</td><td>${(r.slotIds||[]).map(id=>nameOf(project.calendar.slots,id)).join(', ')}</td><td><button class="btn small ghost" data-action="delete-presence-rule" data-id="${r.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay reglas de presencia mínima.</div>'}</section>`;}
function renderBreakZones(){return `<section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Zonas y puestos de recreo</h2><p class="muted">Cada zona puede exigir perfiles concretos y excluir docentes. Las vigilancias se validan contra estas condiciones.</p></div><span class="spacer"></span><button class="btn" data-action="add-break-zone">Añadir zona</button></div>${project.organization.breakZones.length?`<div class="table-wrap"><table><thead><tr><th>Zona</th><th>Puestos mínimos</th><th>Tramos</th><th>Perfiles</th><th>Exclusiones</th><th>Estado</th><th></th></tr></thead><tbody>${project.organization.breakZones.map(z=>`<tr><td>${esc(z.name)}</td><td>${z.minimumStaff}</td><td>${(z.slotIds||[]).map(id=>nameOf(project.calendar.slots,id)).join(', ')}</td><td>${esc((z.essentialProfileTags||[]).join(', ')||'Cualquier perfil')}</td><td>${(z.excludedTeacherIds||[]).map(id=>esc(nameOf(project.teachers,id))).join(', ')||'—'}</td><td>${statusLabel(z.dataState)}</td><td><button class="btn small ghost" data-action="delete-break-zone" data-id="${z.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay zonas de recreo configuradas.</div>'}</section>`;}

function renderOrganizationRules(){
  const rows=[...(project.organization.rules||[]),...(project.organization.preferences||[])];
  return `<section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Reglas obligatorias y preferencias</h2><p class="muted">Las reglas obligatorias descartan destinos. Las preferencias solo ordenan alternativas y muestran su peso.</p></div><span class="spacer"></span><button class="btn" data-action="add-organization-rule">Añadir regla</button></div>${rows.length?`<div class="table-wrap"><table><thead><tr><th>Nivel</th><th>Regla</th><th>Ámbito</th><th>Condición</th><th>Peso</th><th>Estado</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.level==='HARD'?'Obligatoria':'Preferencia'}</td><td>${esc(r.label||organizationRuleTypeLabel(r.type))}</td><td>${esc(organizationRuleScopeLabel(r))}</td><td>${esc(organizationRuleConditionLabel(r))}</td><td>${r.level==='SOFT'?Number(r.weight||0):'—'}</td><td>${r.active===false?'Desactivada':statusLabel(r.dataState)}</td><td><div class="toolbar"><button class="btn small ghost" data-action="toggle-organization-rule" data-id="${r.id}">${r.active===false?'Activar':'Desactivar'}</button><button class="btn small ghost" data-action="delete-organization-rule" data-id="${r.id}">Eliminar</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay reglas adicionales. Las disponibilidades, ocupaciones, presencia mínima y compatibilidad de espacios siguen aplicándose siempre.</div>'}</section>`;
}
function organizationRuleTypeLabel(type){return({FORBID_DAY:'Excluir un día',FORBID_SLOT:'Excluir un tramo',REQUIRE_DAY:'Exigir un día',REQUIRE_SLOT:'Exigir un tramo',REQUIRE_SPACE_TAG:'Exigir etiqueta de espacio',PREFER_DAY:'Preferir un día',PREFER_SLOT:'Preferir un tramo',AVOID_LAST_SLOT:'Evitar última sesión',AVOID_FIRST_SLOT:'Evitar primera sesión',AVOID_EDGE_SLOTS:'Evitar sesiones extremas'})[type]||type||'Regla';}
function organizationRuleScopeLabel(r){if(r.activityId)return `Actividad: ${nameOf(project.activities,r.activityId)}`;if(r.teacherId)return `Docente: ${nameOf(project.teachers,r.teacherId)}`;if(r.groupId)return `Grupo: ${nameOf(project.groups,r.groupId)}`;if(r.kind)return `Tipo: ${activityKindLabel(r.kind)}`;return 'Todo el horario';}
function organizationRuleConditionLabel(r){if(r.dayId)return nameOf(project.calendar.days,r.dayId);if(r.slotId)return nameOf(project.calendar.slots,r.slotId);if(r.value)return r.value;return organizationRuleTypeLabel(r.type);}

function renderImports(){
  const preview=stagedImport?renderImportPreview(stagedImport):'';
  const recent=(project.imports||[]).slice(-5).reverse();
  return `<section class="card"><h2>Importación profesional revisable</h2><p class="muted">Admite CSV o TSV guardado desde Excel. La aplicación detecta columnas, duplicados, colisiones y referencias antes de escribir. Importa en este orden: materias, docentes, grupos, espacios, actividades y disponibilidad.</p><form data-form="stage-import"><div class="field-row"><label>Tipo de datos<select name="entityType"><option value="subjects">Materias</option><option value="teachers">Docentes</option><option value="groups">Grupos</option><option value="spaces">Espacios</option><option value="activities">Actividades</option><option value="availability">Disponibilidad y presencia</option></select></label><label>Política de coincidencias<select name="mode"><option value="UPSERT_SAFE">Actualizar por código/nombre o añadir</option><option value="INSERT_ONLY">Solo altas; bloquear coincidencias</option></select></label><label>Archivo CSV/TSV<input type="file" id="csvImportFile" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"></label></div><div class="field-row"><label>Documento o referencia de procedencia<input name="sourceRef" placeholder="P. ej., cupos aprobados 2026/2027"></label><label>Vigente desde<input type="date" name="validFrom"></label><label>Vigente hasta<input type="date" name="validTo"></label><label>Verificado por<input name="verifiedBy" value="${esc(project.meta.responsible||'')}"></label><label>Fecha de verificación<input type="date" name="verifiedAt"></label></div><label>Contenido CSV/TSV<textarea name="csvText" id="csvText" rows="10" placeholder="Codigo;Docente;Funcion;Carga_objetivo;Procedencia;Estado&#10;DOC-001;Docente 1;Tutoría;20;Cupo aprobado;Confirmado"></textarea></label><div class="toolbar"><button class="btn" type="submit">Preparar y validar</button><button class="btn secondary" type="button" data-action="download-template">Descargar plantilla</button></div></form></section>${preview}<section class="card" style="margin-top:16px"><h2>Últimas importaciones aplicadas</h2>${recent.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Fuente</th><th>Resultado</th>${technicalMode?'<th>Huella técnica</th>':''}</tr></thead><tbody>${recent.map(r=>`<tr><td>${esc(fmtDate(r.appliedAt))}</td><td>${esc(r.entityType||'')}</td><td>${esc(r.sourceRef||r.fileName||'Sin referencia')}</td><td>${Number(r.inserted||0)} altas · ${Number(r.updated||0)} actualizaciones · ${Number(r.skipped||0)} omitidas</td>${technicalMode?`<td><code>${esc(r.sourceFingerprint||'—')}</code></td>`:''}</tr>`).join('')}</tbody></table></div>`:'<div class="empty">Todavía no se aplicó ninguna importación.</div>'}</section>`;
}
function renderImportPreview(s){
  const unknown=s.unknownHeaders?.length?`<div class="notice warning">Columnas no utilizadas: ${esc(s.unknownHeaders.join(', '))}. Se conservarán fuera del proyecto y no se aplicarán.</div>`:'';
  const warningsSelected=Number(s.summary.selectedWarnings||0);
  return `<section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Vista previa: ${esc(s.entityLabel||s.entityType)}</h2><p class="muted">${s.summary.total} filas · ${s.summary.selected} seleccionadas · ${s.summary.insert} altas · ${s.summary.update} actualizaciones · ${s.summary.errors} con errores · ${s.summary.warnings} con avisos</p></div><span class="spacer"></span><button class="btn secondary" data-action="revalidate-import">Revalidar</button><button class="btn ghost" data-action="select-all-staged">Seleccionar válidas</button><button class="btn ghost" data-action="select-none-staged">Omitir todas</button></div>${unknown}<div class="status-row"><span>Archivo de origen</span><b>${esc(s.fileName||'Contenido pegado')}${technicalMode?` · <code>${esc(s.sourceFingerprint||'')}</code>`:''}</b></div><div class="status-row"><span>Procedencia</span><b>${esc(s.sourceRef||'No indicada')}</b></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Aplicar</th><th>Fila</th><th>Decisión</th><th>Dato</th><th>Estado</th><th>Vigencia / fuente</th><th>Observaciones</th><th></th></tr></thead><tbody>${s.rows.map(r=>`<tr><td><input type="checkbox" data-staged-select="${r.id}" ${r.selected?'checked':''} ${r.errors?.length?'disabled':''} aria-label="Aplicar fila ${r.sourceRow}"></td><td>${r.sourceRow}</td><td>${r.decision==='INSERT'?'Alta':r.decision==='UPDATE'?'Actualizar':r.decision==='ERROR'?'Bloqueada':'Pendiente'}</td><td><b>${esc(r.value?.name||'')}</b>${r.value?.externalId?`<br><small>${esc(r.value.externalId)}</small>`:''}</td><td><span class="badge ${r.status==='ERROR'?'danger':r.status==='WARNING'?'warn':'ok'}">${r.status==='ERROR'?'Error':r.status==='WARNING'?'Aviso':'Preparada'}</span></td><td>${esc(r.value?.provenance?.sourceRef||r.value?.provenance?.sourceFile||'Sin referencia')}<br><small>${esc(r.value?.provenance?.validFrom||'—')} → ${esc(r.value?.provenance?.validTo||'—')}</small></td><td>${esc([...(r.errors||[]),...(r.warnings||[])].join(' ')||'Sin incidencias')}</td><td><button class="btn small secondary" data-action="edit-staged-row" data-id="${r.id}">Revisar</button></td></tr>`).join('')}</tbody></table></div><div class="toolbar" style="margin-top:14px"><label class="checkline"><input type="checkbox" id="acceptImportWarnings" ${warningsSelected?'':'disabled'}> Confirmo los avisos de las filas seleccionadas (${warningsSelected})</label><span class="spacer"></span><button class="btn" data-action="apply-import" ${s.canApply?'':'disabled'}>Aplicar selección</button><button class="btn ghost" data-action="cancel-import">Cancelar revisión</button></div><p class="muted">La aplicación volverá a comprobar que el proyecto no cambió desde esta vista previa y rechazará cualquier conflicto estructural nuevo.</p></section>`;
}
function stagedFieldLabel(key){return({externalId:'Identificador técnico',name:'Nombre',teacherName:'Docente',role:'Función',specialty:'Especialidad',weeklyTarget:'Carga objetivo',leadershipReduction:'Reducción por cargo',otherReduction:'Otras reducciones',ldQuota:'LD',dcQuota:'DC',quotaJustification:'Justificación',essentialProfiles:'Perfiles esenciales',stage:'Etapa',tutorName:'Tutor/a',tags:'Etiquetas',capacity:'Capacidad',kind:'Tipo',subjectName:'Materia',groupNames:'Grupos',teacherNames:'Docentes',weeklySessions:'Sesiones semanales',requiredSpaceTags:'Etiquetas de espacio',allowedDays:'Días permitidos',allowedSlots:'Tramos permitidos',preferredDays:'Días preferentes',preferredSlots:'Tramos preferentes',priority:'Prioridad',mandatory:'Obligatoria',maxPerDay:'Máximo diario',unavailable:'No disponible',presence:'Presencia',coverageEligible:'Coberturas',sourceRef:'Procedencia',validFrom:'Vigente desde',validTo:'Vigente hasta',verifiedBy:'Verificado por',verifiedAt:'Fecha de verificación',provenanceNote:'Nota de fuente',dataState:'Estado'})[key]||key;}

function renderScheduleTabs(){
  const tabs=[['generate','Generar y estado'],['review','Revisar y editar'],['validation','Validación y cierre']];
  return `<div class="tabs schedule-tabs">${tabs.map(([id,label])=>`<button type="button" data-schedule-tab="${id}" class="${scheduleTab===id?'active':''}">${label}</button>`).join('')}</div>`;
}

function renderSchedule(){
  if(!project)return noProject();
  cleanEditorSelection();
  const body=scheduleTab==='review'?renderScheduleEditor():scheduleTab==='validation'?renderReview():renderGenerationPanel();
  return `${renderScheduleTabs()}${body}`;
}


function effectiveScheduleFilter(){
  return resolveScheduleFilter(project,scheduleFilter,{technicalMode});
}
function renderScheduleViewControls(current,{editor=false}={}){
  return renderScheduleControls(project,{current,search:editorSearch,editor,technicalMode});
}
function schedulePublicSummary(assignments){
  return renderScheduleOverview(project,assignments,{technicalMode});
}
function publicGenerationMessage(run){
  const r=run?.response||{};
  if(!run)return 'Todavía no se ha generado ninguna propuesta.';
  if(r.status==='ERROR')return 'No se pudo completar la generación. El horario guardado no se ha modificado.';
  if(r.status==='UNAVAILABLE')return 'Este proyecto supera el alcance de generación de la versión web actual. Abre un ejemplo web compatible o usa esta vista solo para revisar el horario.';
  if(r.status==='CANCELLED')return 'La generación fue cancelada. El horario guardado no se ha modificado.';
  return r.message||'Generación finalizada.';
}
function dayPublicLabel(id){return productDayPublicLabel(project,id);}
function slotPublicLabel(id){return productSlotPublicLabel(project,id);}
function publicTeacherName(name){return productPublicTeacherName(name);}
function publicSpaceName(name){return productPublicSpaceName(name);}
function publicActivityName(act){return productPublicActivityName(act);}
function publicDataState(entity){return productAssignmentPublicParts(project,{activityId:entity?.id}).stateBadge||'';}
function assignmentPublicParts(asg){return productAssignmentPublicParts(project,asg);}
function renderGenerationPanel(){
  const v=validateProject(project),proposal=project.proposals.find(x=>x.status==='PENDING');
  const running=generationState.status==='RUNNING';
  const latestRun=project.generationRuns?.at(-1)||null;
  const currentFilter=effectiveScheduleFilter();
  const advancedForm=`<form data-form="generate"><div class="field-row"><label>Política<select name="engine"><option value="AUTO">Selección automática de producto</option><option value="HEURISTIC">Solo generación rápida</option><option value="CP_SAT">Solo optimización CP-SAT</option></select></label><label>Alcance<select name="mode"><option value="COMPLETE">Horario completo</option><option value="PARTIAL">Completar actividades seleccionadas</option><option value="REPAIR">Reparar actividades seleccionadas</option></select></label><label>Actividades para alcance parcial<select name="targetActivityIds" multiple size="6">${project.activities.map(a=>`<option value="${a.id}">${esc(a.name)} · ${activityKindLabel(a.kind)}</option>`).join('')}</select></label><label>Semilla<input type="number" min="0" name="seed" value="0"></label><label>Límite temporal por intento (segundos)<input type="number" min="1" max="3600" name="maxDurationSeconds" value="30"></label><label>Procesos CP-SAT<input type="number" min="1" max="32" name="numWorkers" value="8"></label><label class="checkline"><input type="checkbox" name="forceGlobalOptimization"> Contrastar siempre con optimización avanzada</label></div><div class="toolbar"><button class="btn" type="submit" ${v.canGenerate&&!proposal&&!running?'':'disabled'}>Generar horario</button>${running?`<button class="btn danger" type="button" data-action="cancel-generation" ${generationState.cancelRequested?'disabled':''}>${generationState.cancelRequested?'Cancelación solicitada':'Cancelar generación'}</button>`:''}<button class="btn secondary" type="button" data-action="export-cp-sat-request" ${v.canGenerate&&!proposal&&!running?'':'disabled'}>Exportar solicitud CP-SAT</button><button class="btn secondary" type="button" data-action="import-cp-sat-response" ${!proposal&&!running?'':'disabled'}>Importar respuesta CP-SAT</button><input type="file" id="cpSatResponseFile" accept=".json,application/json" hidden></div></form>`;
  const productForm=`<form data-form="generate"><input type="hidden" name="engine" value="AUTO"><input type="hidden" name="mode" value="COMPLETE"><input type="hidden" name="seed" value="0"><input type="hidden" name="maxDurationSeconds" value="30"><input type="hidden" name="numWorkers" value="8"><div class="product-generate-action"><div><h2>Crear una propuesta de horario</h2><p>La aplicación generará localmente en el navegador si el proyecto es compatible. El horario vigente no cambia hasta que revises y aceptes la propuesta.</p></div><button class="btn primary-large" type="submit" ${v.canGenerate&&!proposal&&!running?'':'disabled'}>${running?'Generando…':'Generar horario'}</button>${running?`<button class="btn danger" type="button" data-action="cancel-generation" ${generationState.cancelRequested?'disabled':''}>${generationState.cancelRequested?'Cancelando…':'Cancelar'}</button>`:''}</div></form>`;
  const support=analyzeP12WebSolverSupport(project);
  const scopeNotice=(!technicalMode&&!support.supported)?`<div class="notice warning"><b>Proyecto fuera del alcance web actual.</b><br>Esta versión pública genera en navegador los ejemplos web preparados. Este proyecto puede revisarse o exportarse, pero no se presentará como generable sin una fase posterior del motor.</div>`:'';
  return `<div class="schedule-product-page">${scopeNotice}${project.assignments.length?schedulePublicSummary(project.assignments):''}<section class="card product-generation-card schedule-generation-card"><div class="toolbar"><div><p class="eyebrow">Generación local</p><h2 style="margin:0">Crear propuesta revisable</h2><p class="muted">Genera una propuesta en tu navegador cuando el proyecto entra en el alcance web. El horario vigente no cambia hasta que la revises y la aceptes.</p></div><span class="spacer"></span><span class="badge ${v.canGenerate&&support.supported?'ok':'warn'}">${v.canGenerate&&support.supported?'Preparado para generar en navegador':support.supported?'Revisa los datos':'Solo revisión'}</span></div>${technicalMode?advancedForm:productForm}${renderGenerationExecution(latestRun)}</section>${proposal?renderProposal(proposal):''}<section class="card schedule-board-card"><div class="toolbar schedule-board-head"><div><p class="eyebrow">Horario vigente</p><h2 style="margin:0">Vista de revisión</h2><p class="muted">Trabaja por grupo, docente o espacio.</p></div></div>${project.assignments.length?renderScheduleViewControls(currentFilter)+renderScheduleGrid(project.assignments,currentFilter,{interactive:false}):'<div class="empty">Todavía no hay sesiones aceptadas.</div>'}</section></div>`;
}

function renderScheduleEditor(){
  const history=editorHistoryState(project);
  const selected=assignmentSelectionSummary(project,[...editorSelection]);
  const closure=reviewOfficialClosure(project);
  const catalog=professionalHistoryCatalog(project);
  return `<section class="card editor-card"><div class="toolbar"><div><h2 style="margin:0">Revisar y modificar el horario</h2><p class="muted">Selecciona una o varias sesiones. Cada destino se comprueba contra ocupaciones, disponibilidad, espacios, bloqueos y reglas obligatorias antes de aplicar el cambio.</p></div><span class="spacer"></span><span class="badge ${project.meta.status==='FINAL'?'warn':'ok'}">${project.meta.status==='FINAL'?'Oficial protegido':'Borrador editable'}</span></div><div class="grid cards review-overview">${metric(selected.selected,'Seleccionadas')}${metric(history.applied,'Ediciones aplicadas')}${metric(catalog.restorableCount,'Versiones recuperables')}${metric(closure.blockers.length,'Bloqueos para cierre')}</div>${renderScheduleViewControls(effectiveScheduleFilter(),{editor:true})}${project.assignments.length?renderEditorToolbar(selected,history):''}${editorLivePreview?`<div class="notice ${editorLivePreview.ok?'success':'warning'}" id="editorLiveStatus" aria-live="polite"><b>${editorLivePreview.ok?'Destino compatible':'Destino no válido'}</b><br>${esc(editorLivePreview.message)}</div>`:'<div id="editorLiveStatus" class="sr-only" aria-live="polite"></div>'}${project.assignments.length?renderScheduleGrid(project.assignments,effectiveScheduleFilter(),{interactive:true}):'<div class="empty">No hay sesiones aceptadas.</div>'}</section>${project.assignments.length?renderEditorPanel(selected,history):''}${renderScenarios()}${renderLocks()}`;
}

function renderGenerationExecution(latestRun){
  if(generationState.status==='RUNNING'){
    const p=generationState.progress||{processed:0,total:0,percent:0,placed:0,unplaced:0};
    const phase=productGenerationPhaseLabel(generationState.phase||p.phase);
    return `<div class="notice info generation-live" aria-live="polite"><div class="toolbar"><div><b>${esc(phase)}${generationState.cancelRequested?' · cancelación pendiente':''}</b><br><small>${esc(p.message||generationState.message||'Generando una propuesta revisable.')}</small></div><span class="spacer"></span><b>${esc(fmtDuration(generationState.elapsedMs||p.elapsedMs||0))}</b></div><div class="progress"><span style="width:${Math.max(0,Math.min(100,Number(p.percent||0)))}%"></span></div><small>${Number(p.total||0)?`${p.processed||0}/${p.total||0} operaciones · `:''}${p.placed||0} colocadas · ${p.unplaced||0} pendientes</small></div>`;
  }
  if(!latestRun)return '<div class="empty">Todavía no se ha generado ninguna propuesta.</div>';
  const r=latestRun.response||{},productInfo=r.product||{};
  const proposal=(project.proposals||[]).find(row=>row.id===latestRun.proposalId)||null;
  const diagnostics=proposal?proposalProductDiagnostics(project,proposal):null;
  const noticeClass=r.status==='ERROR'?'error':r.status==='CANCELLED'||r.status==='UNAVAILABLE'?'warning':'info';
  const publicResultTitle=r.status==='UNAVAILABLE'?'No se generó propuesta en la versión web':r.status==='ERROR'?'No se pudo generar la propuesta':r.status==='CANCELLED'?'Generación cancelada':proposal?'Propuesta generada':'Resultado de generación';
  const metrics=diagnostics?`<div class="grid cards generation-result-metrics">${metric(diagnostics.placed,'Sesiones colocadas')}${metric(diagnostics.unplaced,'Sesiones pendientes')}${metric(`${diagnostics.completionPct} %`,'Cobertura del alcance')}${metric(diagnostics.gaps,'Huecos descriptivos')}</div>`:'';
  const technicalDetails=technicalMode?`<details class="generation-technical"><summary>Detalle de mantenimiento</summary><p><code>${esc(latestRun.request?.contractVersion||latestRun.contractVersion||'')}</code> · estrategia ${esc(productInfo.strategy||'—')} · ${esc(fmtDuration(r.durationMs||0))}</p>${productInfo.capabilities?`<p>Motor avanzado local: <b>${productInfo.capabilities.available?'disponible':'no disponible'}</b>${productInfo.capabilities.engine?.version?` · ${esc(productInfo.capabilities.engine.version)}`:''}</p>`:''}${productInfo.attempts?.length?`<div class="table-wrap"><table><thead><tr><th>Intento</th><th>Estado</th><th>Duración</th><th>Propuesta</th></tr></thead><tbody>${productInfo.attempts.map((row,index)=>`<tr><td>${index+1} · ${esc(row.engine)}</td><td>${esc(generationStatusLabel(row.status))}</td><td>${esc(fmtDuration(row.durationMs))}</td><td>${row.hasUsableProposal?'Sí':'No'}</td></tr>`).join('')}</tbody></table></div>`:''}<div class="toolbar" style="margin-top:12px"><button class="btn small secondary" type="button" data-action="export-generation-run" data-id="${esc(latestRun.request?.requestId||'')}">Exportar registro JSON</button></div></details>`:'';
  return `<div class="notice ${noticeClass} generation-result"><div class="toolbar"><div><b>${technicalMode?`Última generación: ${esc(generationStatusLabel(r.status))}`:esc(publicResultTitle)}</b><br><small>${esc(technicalMode?(r.message||''):publicGenerationMessage(latestRun))}</small></div><span class="spacer"></span><b>${esc(fmtDuration(r.durationMs||0))}</b></div>${productInfo.diagnosticStatus==='INFEASIBLE'?'<p><b>Diagnóstico avanzado:</b> no existe una solución completa con las restricciones obligatorias modeladas.</p>':''}${metrics}${technicalDetails}</div>`;
}

function qualityStatusLabel(value){return({GOOD:'Correcto',ATTENTION:'Revisar',CRITICAL:'Prioritario',NOT_APPLICABLE:'No aplica'})[value]||value||'—';}
function qualityBadgeClass(value){return value==='GOOD'||value==='NOT_APPLICABLE'?'ok':value==='ATTENTION'?'warn':'danger';}
function qualityPrimaryText(primary){if(!primary)return'—';return `${primary.value??'—'}${primary.unit?` ${primary.unit}`:''}`;}
const QUALITY_EDGE_DIAGNOSTIC_LABEL='Sesiones extremas · diagnóstico';
function renderQualityDimensions(profile,{compact=false}={}){
  if(!profile?.dimensions?.length)return '<div class="empty">No hay análisis multidimensional disponible.</div>';
  const rows=profile.dimensions.map(row=>`<div class="status-row quality-dimension"><span><b>${esc(row.id==='EDGE_SLOTS'?QUALITY_EDGE_DIAGNOSTIC_LABEL:row.label)}</b><br><small>${esc(row.explanation||'')}</small></span><span><b>${esc(qualityPrimaryText(row.primary))}</b><br><span class="badge ${qualityBadgeClass(row.status)}">${esc(qualityStatusLabel(row.status))}</span></span></div>`).join('');
  return `${compact?'':`<div class="notice info"><b>${esc(profile.overall?.label||'Análisis multidimensional')}</b><br>${esc(profile.overall?.summary||'')}<br><small>${esc(profile.overall?.note||'')}</small></div>`}${rows}`;
}
function renderProposal(p){const profile=p.quality?.dimensions?p.quality:analyzeMultidimensionalQuality({...project,assignments:p.assignments},p.assignments,{mode:'CANDIDATE',source:p.engine?.kind||'UNKNOWN',baselineAssignments:project.assignments});return `<section class="card proposal-card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Propuesta pendiente · ${p.mode==='COMPLETE'?'completa':p.mode==='PARTIAL'?'parcial':'reparación'}</h2><p class="muted">${p.summary.placed} sesiones en el alcance · ${p.summary.unplaced} sin colocar${technicalMode?` · ${esc(p.engine.id)} ${esc(p.engine.version)} · ${esc(generationStatusLabel(p.executionStatus||''))}`:''}</p></div><span class="spacer"></span><button class="btn" data-action="accept-proposal" data-id="${p.id}">Aceptar</button><button class="btn danger" data-action="reject-proposal" data-id="${p.id}">Descartar</button></div>${p.unplaced.length?`<div class="notice warning">${p.unplaced.map(u=>`<b>${esc(nameOf(project.activities,u.activityId))}</b>: ${esc((u.reasons||[]).map(semanticReasonText).join(' '))}`).join('<br>')}</div>`:''}<details><summary>Ver análisis multidimensional y vista previa</summary>${renderQualityDimensions(profile)}<div class="grid cards">${metric(p.summary.preserved,'Sesiones preservadas')}${metric(p.summary.complete?'Sí':'No','Alcance completo')}</div>${renderScheduleGrid(p.assignments,effectiveScheduleFilter(),{interactive:false})}</details></section>`;}

function renderEditorToolbar(selected,history){
  const visible=visibleEditorAssignmentIds();
  return `<div class="editor-toolbar" role="toolbar" aria-label="Herramientas del editor"><div class="toolbar"><span class="badge ${selected.selected?'ok':''}">${selected.selected} seleccionada(s)</span>${selected.locked?`<span class="badge warn">${selected.locked} bloqueada(s)</span>`:''}<button class="btn small secondary" data-action="editor-select-visible" ${visible.length?'':'disabled'}>Seleccionar visibles</button><button class="btn small ghost" data-action="editor-clear-selection" ${selected.selected?'':'disabled'}>Limpiar</button><span class="spacer"></span><button class="btn small secondary" data-action="undo" ${history.canUndo?'':'disabled'} title="Ctrl+Z">Deshacer</button><button class="btn small secondary" data-action="redo" ${history.canRedo?'':'disabled'} title="Ctrl+Y">Rehacer</button></div>${selected.selected?`<div class="toolbar"><span class="muted">Mover selección:</span><button class="btn small secondary" data-action="editor-shift" data-day="0" data-slot="-1" aria-label="Mover una fila arriba">↑ Tramo</button><button class="btn small secondary" data-action="editor-shift" data-day="0" data-slot="1" aria-label="Mover una fila abajo">↓ Tramo</button><button class="btn small secondary" data-action="editor-shift" data-day="-1" data-slot="0" aria-label="Mover un día a la izquierda">← Día</button><button class="btn small secondary" data-action="editor-shift" data-day="1" data-slot="0" aria-label="Mover un día a la derecha">→ Día</button><span class="spacer"></span><button class="btn small secondary" data-action="editor-lock-selection" ${selected.unlocked?'':'disabled'}>Bloquear</button><button class="btn small secondary" data-action="editor-unlock-selection" ${selected.locked?'':'disabled'}>Desbloquear</button><button class="btn small danger" data-action="editor-unplace-selection" ${selected.locked?'disabled':''}>Retirar del horario</button></div>`:''}</div>`;
}

function renderScheduleGrid(assignments,filter='ALL',{interactive=false}={}){
  const lockedIds=new Set((project.locks||[]).filter(l=>l.active!==false).map(l=>l.assignmentId));
  return renderProductScheduleGrid(project,assignments,{filter:filter||effectiveScheduleFilter(),search:editorSearch,interactive,editorSelection,lockedIds});
}
function matchesFilter(asg,filter){return matchesScheduleFilter(project,asg,filter);}
function matchesEditorSearch(asg){return matchesScheduleSearch(project,asg,editorSearch);}
function visibleEditorAssignmentIds(){return visibleScheduleAssignmentIds(project,project.assignments,effectiveScheduleFilter(),editorSearch);}
function cleanEditorSelection(){const ids=new Set((project?.assignments||[]).map(a=>a.id));editorSelection=new Set([...editorSelection].filter(id=>ids.has(id)));if(editorAnchorId&&!ids.has(editorAnchorId))editorAnchorId='';}

function renderEditorPanel(selected,history){
  const selectedRows=project.assignments.filter(a=>editorSelection.has(a.id));
  const historyRows=(project.editCommands||[]).slice(-10).reverse();
  const single=selectedRows.length===1?selectedRows[0]:null;
  return `<section class="card" style="margin-top:16px"><div class="grid two"><div><h2>Edición guiada y explicable</h2>${selectedRows.length?`<p><b>${selectedRows.length} sesión(es) seleccionada(s).</b> Toca una celda de destino o arrastra desde la cuadrícula. Los movimientos múltiples conservan su disposición relativa y se aplican de forma atómica: se aceptan todos o ninguno.</p><div class="editor-selection-list">${selectedRows.slice(0,12).map(a=>`<span class="source-chip">${esc(nameOf(project.activities,a.activityId))} · ${esc(dayLabel(a.dayId))} · ${esc(slotLabel(a.slotId))}</span>`).join('')}${selectedRows.length>12?`<span class="muted">+${selectedRows.length-12} más</span>`:''}</div>`:'<div class="empty">Selecciona sesiones en la cuadrícula. Un segundo toque desmarca.</div>'}${single?`<form data-form="move-search" style="margin-top:14px"><input type="hidden" name="assignmentId" value="${single.id}"><button class="btn secondary" type="submit">Consultar destinos y motivos</button></form>`:''}${moveDestinations&&single&&moveDestinations.assignment.assignmentId===single.id?renderMoveDestinations(moveDestinations):''}<details><summary>Atajos de teclado y uso táctil</summary><p><kbd>Ctrl</kbd>+<kbd>Z</kbd> deshace; <kbd>Ctrl</kbd>+<kbd>Y</kbd> rehace; <kbd>Esc</kbd> limpia la selección; <kbd>Alt</kbd>+flechas desplaza la selección; <kbd>Supr</kbd> retira las sesiones tras confirmación. En pantalla táctil: toca sesiones para seleccionarlas y después toca la celda de destino.</p></details></div><div><h2>Historial inmediato</h2><p class="muted">${technicalMode?`Contrato ${esc(MANUAL_EDITOR_CONTRACT_VERSION)} / ${esc(PRODUCT_REVIEW_CONTRACT_VERSION)} · `:''}${history.applied} aplicada(s) · ${history.undone} deshecha(s).</p>${historyRows.length?historyRows.map(c=>{const recovery=c.type==='UNPLACE_ASSIGNMENTS'?previewRemovedCommandRecovery(project,c.id):null;return `<div class="status-row"><span><b>${esc(c.label||c.type)}</b><br><small>${fmtDate(c.createdAt)} · ${c.status==='APPLIED'?'Aplicada':c.status==='UNDONE'?'Deshecha':'Sustituida por una rama nueva'}</small></span><div class="toolbar"><span class="badge ${c.status==='APPLIED'?'ok':c.status==='UNDONE'?'warn':''}">${esc(c.status||'')}</span>${recovery?.ok?`<button class="btn small secondary" data-product-action="recover-removed-command" data-id="${c.id}">Recuperar ${recovery.assignments.length}</button>`:''}</div></div>`;}).join(''):'<div class="empty">Todavía no hay ediciones manuales.</div>'}</div></div></section>`;
}

function renderMoveDestinations(result){
  return `<div style="margin-top:14px"><h3>${result.allowed.length} destinos compatibles mejor ordenados</h3>${result.allowed.length?`<div class="table-wrap"><table><thead><tr><th>Día</th><th>Tramo</th><th>Espacio</th><th>Explicación</th><th></th></tr></thead><tbody>${result.allowed.map(x=>`<tr><td>${esc(dayLabel(x.dayId))}</td><td>${esc(slotLabel(x.slotId))}</td><td>${esc(nameOf(project.spaces,x.spaceId)||'Sin espacio')}</td><td>${esc(x.explanation.summary)}${x.explanation.preferences.length?`<br><small>${esc((x.explanation.semanticPreferences||x.explanation.preferences||[]).map(row=>typeof row==='string'?row:row.message).join(' · '))}</small>`:''}</td><td><button class="btn small" data-action="editor-apply-destination" data-assignment="${result.assignment.assignmentId}" data-day="${x.dayId}" data-slot="${x.slotId}" data-space="${x.spaceId}">Mover</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="notice warning">No se encontró ningún destino compatible.</div>'}<details><summary>Por qué se descartan otros destinos</summary>${result.rejectedSummary.length?`<div class="table-wrap"><table><thead><tr><th>Motivo</th><th>Destinos afectados</th><th>Ejemplos</th></tr></thead><tbody>${result.rejectedSummary.map(x=>`<tr><td>${esc(x.label)}</td><td>${x.count}</td><td>${esc(x.examples.map(semanticReasonText).join(' · '))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay destinos descartados.</div>'}</details></div>`;
}

function renderScenarios(){return `<section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Alternativas de trabajo</h2><p class="muted">Guarda ramas completas para comparar decisiones sin perder el horario vigente.</p></div><span class="spacer"></span><button class="btn secondary" data-action="compare-scenarios" ${project.scenarios.length>=2?'':'disabled'}>Comparar dos alternativas</button></div>${project.scenarios.length?project.scenarios.map(s=>{const count=s.state?.assignments?.length??s.assignments?.length??0;const valid=s.restorable===true,q=s.quality||{};return `<div class="status-row"><span><b>${esc(s.name)}</b><br><small>${count} sesiones · ${Number(q.completionPct||q.legacy?.completionPct||0)} % cobertura · ${Number(q.gaps||q.legacy?.gaps||0)} huecos · ${esc(q.overall?.label||'análisis descriptivo')} · ${fmtDate(s.createdAt)} · ${valid?'integridad verificable':'legado no restaurable'}</small></span><button class="btn small secondary" data-action="apply-scenario" data-id="${s.id}" ${valid?'':'disabled'}>Aplicar como nueva revisión</button></div>`;}).join(''):'<div class="empty">No hay alternativas guardadas.</div>'}</section>`;}

function renderLocks(){return `<section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Bloqueos autorizados</h2><p class="muted">Una sesión bloqueada se preserva en generación y no puede moverse hasta desbloquearla.</p></div><span class="spacer"></span><button class="btn" data-action="add-lock" ${project.assignments.length?'':'disabled'}>Bloquear sesión</button></div>${project.locks.filter(x=>x.active!==false).length?project.locks.filter(x=>x.active!==false).map(l=>{const a=project.assignments.find(x=>x.id===l.assignmentId),act=project.activities.find(x=>x.id===a?.activityId);return `<div class="status-row"><span><b>${esc(act?.name||'Sesión')}</b><br><small>${esc(l.reason)} · ${esc(l.createdBy)}</small></span><button class="btn small ghost" data-action="unlock" data-id="${l.id}">Desbloquear</button></div>`;}).join(''):'<div class="empty">No hay bloqueos activos.</div>'}</section>`;}

function renderReview(){
  if(!project)return noProject();
  const v=validateProject(project),m=computeMetrics(project),s=analyzeDataState(project),r=v.readiness,closure=reviewOfficialClosure(project),catalog=professionalHistoryCatalog(project),quality=analyzeMultidimensionalQuality(project,project.assignments,{mode:'OFFICIAL',source:'CURRENT_SCHEDULE'});
  return `<div class="grid cards">${metric(m.placed,'Sesiones colocadas')}${metric(m.pending,'Pendientes')}${metric(m.gaps,'Huecos docentes')}${metric(closure.blockers.length,'Bloqueos para cierre')}</div><div class="grid two" style="margin-top:16px"><section class="card"><div class="toolbar"><h2 style="margin:0">Validación</h2><span class="spacer"></span><span class="badge ${v.errors.length?'danger':v.warnings.length?'warn':'ok'}">${v.errors.length?'Bloqueado':v.warnings.length?'Con avisos':'Correcto'}</span></div>${v.issues.length?semanticizeIssues(v.issues).map(semanticIssueHtml).join(''):'<div class="empty">No se detectaron incidencias.</div>'}</section><section class="card"><h2>Preparación y estado</h2>${renderReadiness(r)}${dataStateRows(s)}</section></div><section class="card" style="margin-top:16px" data-contract="${PRODUCT_MULTIDIMENSIONAL_QUALITY_CONTRACT_VERSION}"><h2>Calidad multidimensional</h2>${renderQualityDimensions(quality)}<details><summary>Ver carga docente detallada</summary><div class="table-wrap"><table><thead><tr><th>Docente</th><th>Sesiones</th><th>Objetivo</th><th>Diferencia</th><th>Huecos</th></tr></thead><tbody>${m.teacherLoads.map(x=>`<tr><td>${esc(nameOf(project.teachers,x.teacherId))}</td><td>${x.placed}</td><td>${x.target||'—'}</td><td>${x.target?x.placed-x.target:'—'}</td><td>${m.gapsByTeacher.find(g=>g.teacherId===x.teacherId)?.gaps||0}</td></tr>`).join('')}</tbody></table></div></details></section><section class="card" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Versiones recuperables</h2><p class="muted">Restaurar nunca borra el estado actual: crea antes una nueva versión de seguridad.</p></div><span class="spacer"></span><span class="badge ok">${catalog.restorableCount} recuperables</span></div>${catalog.history.length?catalog.history.slice(0,12).map(x=>`<div class="status-row"><span><b>${esc(x.label)}</b><br><small>Revisión ${x.revisionNumber} · ${fmtDate(x.createdAt)} · ${x.restorable?'integridad verificada':'no restaurable'}</small></span><button class="btn small secondary" data-action="restore-history" data-id="${x.id}" ${x.restorable?'':'disabled'}>Restaurar como nueva revisión</button></div>`).join(''):'<div class="empty">Todavía no hay versiones anteriores.</div>'}</section><section class="card" style="margin-top:16px"><h2>Cierre como horario oficial</h2>${closure.checks.map(x=>`<div class="status-row"><span><b>${esc(x.label)}</b><br><small>${esc(x.detail)}</small></span><span class="badge ${x.ok?'ok':'danger'}">${x.ok?'Correcto':'Pendiente'}</span></div>`).join('')}${closure.warnings.length?`<div class="notice warning"><b>Avisos no bloqueantes</b><br>${esc(closure.warnings.join(' · '))}</div>`:''}<p>${closure.canClose?'La revisión puede cerrarse como horario oficial. Un cambio posterior abrirá un nuevo borrador recuperable.':'Puede seguir trabajando y guardando borradores, pero no cerrar esta revisión hasta resolver los bloqueos indicados.'}</p><button class="btn" data-action="finalize" ${closure.canClose&&project.meta.status!=='FINAL'?'':'disabled'}>Cerrar como horario oficial</button>${project.meta.officialClosure?`<div class="notice success"><b>Versión oficial cerrada</b><br>${fmtDate(project.meta.officialClosure.closedAt)} · ${esc(project.meta.officialClosure.responsible||'')}<br><small>${esc(project.meta.officialClosure.note||'Sin nota adicional')}</small></div>`:''}</section>`;
}

function renderDaily(){
  if(!project)return noProject();
  const workspace=dailyProductWorkspace(project,{date:dailyDate,dayId:dailyDayId});
  const tabs=`<nav class="subnav daily-tabs" aria-label="Gestión diaria">${PRODUCT_DAILY_TABS.map(tab=>`<button type="button" class="${dailyTab===tab.id?'active':''}" data-daily-tab="${tab.id}" aria-current="${dailyTab===tab.id?'page':'false'}">${esc(tab.label)}</button>`).join('')}</nav>`;
  const metrics=`<div class="grid cards daily-metrics">${metric(workspace.summary.activeAbsences,'Ausencias activas')}${metric(workspace.summary.pendingCoverages,'Coberturas pendientes')}${metric(workspace.summary.completed,'Servicios realizados')}${metric(workspace.summary.uncovered,'Sin cubrir')}</div>`;
  const filter=`<form class="card daily-filter" data-form="product-daily-filter"><div class="field-row"><label>Fecha operativa<input type="date" name="date" value="${esc(dailyDate||today())}"></label><label>Día del horario<select name="dayId"><option value="">Todos los días</option>${project.calendar.days.map(d=>`<option value="${d.id}" ${(dailyDayId||'')===d.id?'selected':''}>${esc(d.label)}</option>`).join('')}</select></label><div class="daily-filter-action"><button class="btn secondary" type="submit">Actualizar jornada</button></div></div></form>`;
  const content=dailyTab==='absences'?renderProductAbsences(workspace):dailyTab==='coverages'?renderProductCoverages(workspace):dailyTab==='followup'?renderProductFollowup(workspace):dailyTab==='reports'?renderProductReports(workspace):renderProductDailyToday(workspace);
  return `<div class="daily-product" data-contract="${PRODUCT_DAILY_CONTRACT_VERSION}" data-policy="${PRODUCT_DAILY_POLICY_VERSION}">${tabs}${metrics}${filter}${content}</div>`;
}
function renderProductDailyToday(workspace){
  const stateLabel=value=>({DONE:'Completado',ATTENTION:'Requiere atención',AVAILABLE:'Disponible',WAITING:'Pendiente'}[value]||value);
  const steps=`<section class="card"><h2>Recorrido de la jornada</h2><div class="daily-workflow">${workspace.workflow.map((step,index)=>`<div class="daily-step ${step.state.toLowerCase()}"><span class="daily-step-number">${index+1}</span><div><b>${esc(step.label)}</b><small>${esc(stateLabel(step.state))}</small></div></div>`).join('')}</div></section>`;
  const queue=workspace.actionQueue.length?workspace.actionQueue.map(row=>`<button type="button" class="daily-action-card" data-daily-tab="${row.kind==='COVERAGE_DECISION'||row.kind==='COMMUNICATION'?'coverages':'followup'}" ${row.coverageId?`data-product-daily-select="${row.coverageId}"`:''}><b>${esc(row.label)}</b><small>${esc(row.detail||'')}</small><span>${row.priority==='HIGH'?'Prioritaria':'Pendiente'}</span></button>`).join(''):'<div class="empty">No hay actuaciones pendientes para esta jornada.</div>';
  const rec=workspace.reconciliation;
  return `<div class="grid two daily-product-grid">${steps}<section class="card"><h2>Actuaciones pendientes</h2><div class="daily-action-queue">${queue}</div></section></div><section class="card daily-reconciliation ${rec.obsolete?'attention':''}"><div><h2>Coherencia con el horario vigente</h2><p>${esc(rec.semantic.message)}</p></div><div class="grid cards compact">${metric(rec.current,'Necesidades vigentes')}${metric(rec.obsolete,'Necesidades anteriores')}${metric(rec.decisionsPreserved,'Decisiones conservadas')}</div>${rec.obsolete?`<button type="button" class="btn ghost" data-daily-tab="followup">Revisar trazabilidad</button>`:''}</section>${renderProductOperationalReport()}`;
}
function renderProductAbsences(workspace){
  const rows=project.daily.absences.slice().reverse();
  return `<div class="grid two daily-product-grid"><section class="card"><h2>1. Registrar ausencia</h2><p class="muted">Guárdala como borrador cuando falte confirmación. Las coberturas solo se crean al confirmar.</p><form data-form="product-absence"><div class="field-row"><label>Docente<select name="teacherId" required><option value="">Selecciona</option>${project.teachers.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label><label>Fecha<input type="date" name="date" value="${esc(dailyDate||today())}" required></label><label>Día del horario<select name="dayId" required><option value="">Selecciona</option>${project.calendar.days.map(d=>`<option value="${d.id}" ${dailyDayId===d.id?'selected':''}>${esc(d.label)}</option>`).join('')}</select></label></div><label>Tramos afectados<select name="slotIds" multiple size="7">${project.calendar.slots.map(s=>`<option value="${s.id}">${esc(s.label)}</option>`).join('')}</select><small>Sin selección se considera toda la jornada.</small></label><div class="field-row"><label>Estado inicial<select name="status"><option value="CONFIRMED">Confirmada</option><option value="DRAFT">Borrador</option></select></label><label>Nota operativa<textarea name="operationalNote" placeholder="Información necesaria para organizar el servicio"></textarea></label><label>Motivo privado opcional<textarea name="privateReason" placeholder="No aparecerá en documentos ordinarios"></textarea></label></div><button class="btn" type="submit">Guardar ausencia</button></form></section><section class="card"><h2>Ausencias registradas</h2>${rows.length?rows.map(a=>renderProductAbsenceCard(a)).join(''):'<div class="empty">No hay ausencias registradas.</div>'}</section></div>`;
}
function renderProductAbsenceCard(a){
  const services=affectedServicesForAbsence(project,a.id);
  const hasOpen=services.some(row=>['PENDING','PROPOSED','ASSIGNED','COMMUNICATED'].includes(row.coverageStatus));
  const actions=a.status==='DRAFT'?`<button class="btn small" data-product-daily-action="confirm-absence" data-id="${a.id}">Confirmar</button>`:a.status==='CONFIRMED'?`<button class="btn small ghost" data-product-daily-action="cancel-absence" data-id="${a.id}">Cancelar</button>${hasOpen?`<button class="btn small secondary" type="button" disabled title="Cierra antes todas las coberturas">Finalizar</button>`:`<button class="btn small secondary" data-product-daily-action="finish-absence" data-id="${a.id}">Finalizar</button>`}`:'';
  return `<article class="daily-record"><div class="toolbar"><div><b>${esc(nameOf(project.teachers,a.teacherId))}</b><br><small>${esc(a.date)} · ${esc(dayLabel(a.dayId))} · ${(a.slotIds||[]).map(slotLabel).join(', ')||'Jornada completa'} · ${esc(dailyStatusLabel(a.status))}</small>${a.operationalNote?`<p>${esc(a.operationalNote)}</p>`:''}</div><span class="spacer"></span><div>${actions}</div></div><details><summary>${services.length} servicio(s) afectado(s)</summary>${services.length?`<ul class="plain-list">${services.map(row=>`<li><b>${esc(row.activityName)}</b> · ${esc(row.dayLabel)} · ${esc(row.slotLabel)}${row.coverageStatus?` · ${esc(dailyStatusLabel(row.coverageStatus))}`:''}</li>`).join('')}</ul>`:'<p class="muted">No se han encontrado sesiones oficiales afectadas.</p>'}</details></article>`;
}
function renderProductCoverages(workspace){
  const current=workspace.coverages.current.filter(row=>!dailyDate||project.daily.absences.find(a=>a.id===row.absenceId)?.date===dailyDate);
  const open=current.filter(row=>['PENDING','PROPOSED'].includes(row.status));
  const decided=current.filter(row=>!['PENDING','PROPOSED'].includes(row.status));
  return `<section class="card"><h2>2. Decidir coberturas</h2><p class="muted">La aplicación filtra incompatibilidades y explica la prioridad. La decisión final corresponde a jefatura.</p>${open.length?`<div class="table-wrap"><table><thead><tr><th>Servicio</th><th>Horario</th><th>Estado</th><th>Actuación</th></tr></thead><tbody>${open.map(c=>`<tr><td><b>${esc(productPublicActivityName(project.activities.find(a=>a.id===c.activityId)||{name:nameOf(project.activities,c.activityId)},c.slotId))}</b></td><td>${esc(dayLabel(c.dayId))} · ${esc(slotLabel(c.slotId))}</td><td>${esc(dailyStatusLabel(c.status))}</td><td><button class="btn small" data-product-daily-action="select-coverage" data-id="${c.id}">Ver candidaturas</button><button class="btn small ghost" data-product-daily-action="uncovered" data-id="${c.id}">Dejar sin cubrir</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay decisiones de cobertura pendientes.</div>'}${selectedCoverageId?renderProductCoverageCandidates(selectedCoverageId):''}</section><section class="card" style="margin-top:16px"><h2>Decisiones vigentes</h2>${decided.length?decided.map(renderProductCoverageDecision).join(''):'<div class="empty">Todavía no hay decisiones registradas.</div>'}</section>`;
}
function renderProductCoverageCandidates(id){
  let guide;try{guide=coverageCandidateGuide(project,id);}catch(error){return `<div class="issue WARNING">${esc(error.message)}</div>`;}
  const eligible=guide.eligible.length?guide.eligible.map(row=>`<article class="daily-candidate ${row.priority.toLowerCase()}"><div class="daily-candidate-head"><div><b>${esc(row.teacherName)}</b><span class="badge">${esc(row.priorityLabel)}</span>${technicalMode?`<small>Puntuación técnica: ${Number(row.technicalScore||0).toFixed(2)}</small>`:''}</div><button class="btn small" data-product-daily-action="assign-coverage" data-id="${id}" data-teacher="${row.teacherId}" data-requires-justification="${row.requiresJustification?'1':'0'}">Asignar</button></div><div class="daily-reasons">${row.reasons.map(reason=>`<div class="daily-reason"><b>${esc(reason.title||reason.visibleName||'Criterio aplicado')}</b><span>${esc(reason.message||'')}</span>${reason.source?`<small>Origen: ${esc(reason.source.path||reason.source.section||'Configuración del proyecto')}</small>`:''}</div>`).join('')}</div></article>`).join(''):'<div class="empty">No hay candidaturas compatibles.</div>';
  const excluded=guide.excluded.length?`<details><summary>${guide.excluded.length} persona(s) no compatibles</summary>${guide.excluded.map(row=>`<article class="daily-candidate excluded"><b>${esc(row.teacherName)}</b>${row.reasons.map(reason=>`<p>${esc(reason.message||'')}</p>`).join('')}</article>`).join('')}</details>`:'';
  return `<div class="card inset daily-candidate-guide"><h3>Candidaturas explicadas</h3><p>${esc(guide.decisionRule.message)}</p>${eligible}${excluded}</div>`;
}
function renderProductCoverageDecision(c){
  const actions=c.status==='ASSIGNED'?`<button class="btn small secondary" data-product-daily-action="communicate" data-id="${c.id}">Registrar comunicación</button><button class="btn small" data-product-daily-action="complete" data-id="${c.id}">Marcar realizada</button>`:c.status==='COMMUNICATED'?`<button class="btn small" data-product-daily-action="complete" data-id="${c.id}">Marcar realizada</button>`:['CANCELLED','UNCOVERED'].includes(c.status)?`<button class="btn small ghost" data-product-daily-action="reopen" data-id="${c.id}">Reabrir</button>`:'';
  return `<article class="daily-record"><div class="toolbar"><div><b>${esc(productPublicActivityName(project.activities.find(a=>a.id===c.activityId)||{name:nameOf(project.activities,c.activityId)},c.slotId))}</b><br><small>${esc(dayLabel(c.dayId))} · ${esc(slotLabel(c.slotId))} · ${esc(dailyStatusLabel(c.status))}</small><p>${c.coverTeacherId?`Cobertura: ${esc(nameOf(project.teachers,c.coverTeacherId))}`:'Sin docente asignado'}${c.decisionReason?` · ${esc(c.decisionReason)}`:''}</p></div><span class="spacer"></span><div>${actions}</div></div>${['ASSIGNED','COMMUNICATED'].includes(c.status)?`<div class="daily-secondary-actions"><button class="link-button" data-product-daily-action="impact-suspend" data-id="${c.id}">Suspender actividad</button><button class="link-button" data-product-daily-action="impact-cancel" data-id="${c.id}">Cancelar actividad</button><button class="link-button" data-product-daily-action="impact-recovery" data-id="${c.id}">Requiere recuperación</button></div>`:''}</article>`;
}
function renderProductFollowup(workspace){
  const incidents=project.daily.incidents||[],recoveries=project.daily.recoveries||[],services=project.daily.guards||[],subs=project.daily.temporarySubstitutions||[],rec=workspace.reconciliation;
  return `<div class="grid two daily-product-grid"><section class="card"><h2>3. Seguimiento de incidencias</h2>${incidents.length?incidents.slice().reverse().map(r=>`<article class="daily-record"><b>${esc(productPublicActivityName(project.activities.find(a=>a.id===r.activityId)||{name:nameOf(project.activities,r.activityId)},r.slotId))}</b><small>${esc(impactLabel(r.type))} · ${esc(r.date||'')} · ${esc(dailyStatusLabel(r.status))}</small>${r.operationalNote?`<p>${esc(r.operationalNote)}</p>`:''}${r.status==='OPEN'?`<button class="btn small secondary" data-product-daily-action="resolve-impact" data-id="${r.id}">Marcar resuelta</button>`:''}</article>`).join(''):'<div class="empty">No hay incidencias operativas.</div>'}</section><section class="card"><h2>Recuperaciones</h2>${recoveries.length?recoveries.slice().reverse().map(r=>`<article class="daily-record"><b>${esc(productPublicActivityName(project.activities.find(a=>a.id===r.activityId)||{name:nameOf(project.activities,r.activityId)},r.slotId))}</b><small>${esc(dailyStatusLabel(r.status))}${r.plannedDate?` · ${esc(r.plannedDate)}`:''}</small><p>${esc(r.publicNote||'')}</p><div>${r.status==='PENDING'?`<button class="btn small secondary" data-product-daily-action="schedule-recovery" data-id="${r.id}">Programar</button>`:''}${['PENDING','SCHEDULED'].includes(r.status)?`<button class="btn small" data-product-daily-action="complete-recovery" data-id="${r.id}">Completar</button><button class="btn small ghost" data-product-daily-action="cancel-recovery" data-id="${r.id}">Cancelar</button>`:''}</div></article>`).join(''):'<div class="empty">No hay recuperaciones.</div>'}</section></div><section class="card" style="margin-top:16px"><div class="toolbar"><div><h2>Sustituciones temporales</h2><p class="muted">Designaciones con intervalo y ámbito definidos.</p></div><span class="spacer"></span><button class="btn" data-product-daily-action="add-substitution">Registrar sustitución</button></div>${subs.length?subs.slice().reverse().map(r=>`<article class="daily-record"><div class="toolbar"><div><b>${esc(nameOf(project.teachers,r.substituteTeacherId))}</b> sustituye a <b>${esc(nameOf(project.teachers,r.absentTeacherId))}</b><br><small>${esc(r.startDate)}${r.endDate?`–${esc(r.endDate)}`:' en adelante'} · ${esc(dailyStatusLabel(r.status))}</small><p>${esc(r.operationalNote||'')}</p></div><span class="spacer"></span>${['PLANNED','ACTIVE'].includes(r.status)?`<button class="btn small secondary" data-product-daily-action="finish-substitution" data-id="${r.id}">Finalizar</button><button class="btn small ghost" data-product-daily-action="cancel-substitution" data-id="${r.id}">Cancelar</button>`:''}</div></article>`).join(''):'<div class="empty">No hay sustituciones temporales.</div>'}</section><section class="card" style="margin-top:16px"><h2>Servicios realizados</h2>${services.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Docente</th><th>Actividad</th><th>Duración</th><th>Estado</th></tr></thead><tbody>${services.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(nameOf(project.teachers,x.teacherId))}</td><td>${esc(nameOf(project.activities,x.activityId))}</td><td>${Number(x.durationMinutes||0)} min</td><td>${esc(dailyStatusLabel(x.status))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay servicios realizados.</div>'}</section><section class="card daily-reconciliation ${rec.obsolete?'attention':''}" style="margin-top:16px"><h2>Trazabilidad después de cambios del horario</h2><p>${esc(rec.semantic.message)}</p>${rec.obsoleteCoverages.length?`<div class="table-wrap"><table><thead><tr><th>Actividad</th><th>Decisión anterior</th><th>Estado</th><th>Motivo</th></tr></thead><tbody>${rec.obsoleteCoverages.map(row=>`<tr><td>${esc(row.activityName)}</td><td>${esc(row.teacherName||row.decisionReason||'Sin asignación')}</td><td>${esc(row.statusLabel)}</td><td>${esc(row.reason)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay decisiones obsoletas.</div>'}</section>`;
}
function renderProductOperationalReport(){
  const r=operationalReport;
  return `<section class="card" style="margin-top:16px"><h2>Horario operativo del día</h2><form data-form="product-daily-operational"><div class="field-row"><label>Fecha<input type="date" name="date" value="${esc(r?.date||dailyDate||today())}"></label><label>Día del horario<select name="dayId">${project.calendar.days.map(d=>`<option value="${d.id}" ${(r?.dayId||dailyDayId)===d.id?'selected':''}>${esc(d.label)}</option>`).join('')}</select></label><div class="daily-filter-action"><button class="btn secondary" type="submit">Construir informe</button></div></div></form>${r?`<div class="grid cards compact">${metric(r.summary.affected,'Servicios afectados')}${metric(r.summary.covered,'Cubiertos')}${metric(r.summary.uncovered,'Sin cobertura')}${metric(r.summary.performedServices,'Realizados')}</div><p class="muted">Este informe operativo no modifica el horario oficial.</p>`:''}</section>`;
}
function renderProductReports(){
  const r=periodReport,periods=project.daily?.settings?.reportingPeriods||[];
  const periodRows=[0,1,2].map((_,index)=>periods[index]||{id:`evaluation_${index+1}`,label:`${index+1}.ª evaluación`,fromDate:'',toDate:''});
  return `<section class="card"><h2>Informes diarios, semanales y de evaluación</h2><form data-form="product-daily-period"><div class="field-row"><label>Ámbito<select name="scope"><option value="DAY">Día</option><option value="WEEK">Semana</option><option value="MONTH" selected>Mes</option><option value="TERM">Evaluación configurada</option><option value="COURSE">Curso</option><option value="GLOBAL">Histórico global</option><option value="CUSTOM">Personalizado</option></select></label><label>Fecha de referencia<input type="date" name="referenceDate" value="${esc(dailyDate||today())}"></label><label>Desde<input type="date" name="fromDate" value="${esc(r?.fromDate||monthStart())}"></label><label>Hasta<input type="date" name="toDate" value="${esc(r?.toDate||today())}"></label></div><button class="btn secondary" type="submit">Calcular informe</button></form>${r?renderProductPeriodResult(r):''}<details style="margin-top:16px"><summary>Configurar periodos de evaluación</summary><form data-form="product-daily-reporting-periods"><p class="muted">Las fechas deben corresponder al calendario aprobado por el centro.</p>${periodRows.map((row,index)=>`<fieldset><legend>${index+1}.º periodo</legend><div class="field-row"><input type="hidden" name="periodId" value="${esc(row.id)}"><label>Denominación<input name="periodLabel" value="${esc(row.label)}" required></label><label>Desde<input type="date" name="periodFrom" value="${esc(row.fromDate)}" required></label><label>Hasta<input type="date" name="periodTo" value="${esc(row.toDate)}" required></label></div></fieldset>`).join('')}<button class="btn secondary" type="submit">Guardar periodos</button></form></details></section>`;
}
function renderProductPeriodResult(r){
  return `<div class="daily-report-result"><div class="grid cards compact">${metric(r.totals.absences,'Ausencias')}${metric(r.totals.completed,'Coberturas realizadas')}${metric(r.totals.performedServices,'Servicios registrados')}${metric(r.totals.recoveriesPending,'Recuperaciones abiertas')}</div><p class="muted">Periodo: ${esc(r.scopeLabel)} · ${esc(r.fromDate||'inicio')} — ${esc(r.toDate||'fin')}. Los motivos privados no se incluyen.</p>${r.byTeacher?.length?`<div class="table-wrap"><table><thead><tr><th>Docente</th><th>Actuaciones</th><th>Peso organizativo</th><th>Minutos</th><th>Diferencia media</th></tr></thead><tbody>${r.byTeacher.map(x=>`<tr><td>${esc(nameOf(project.teachers,x.teacherId))}</td><td>${x.completed}</td><td>${Number(x.weightedCompleted).toFixed(2)}</td><td>${x.minutes}</td><td>${Number(x.deviationFromMean).toFixed(2)}</td></tr>`).join('')}</tbody></table></div>`:''}</div>`;
}
function publicStatus(v){return dailyStatusLabel(v);}

function currentDocumentOptions(){
  const options={};
  if(dailyDayId)options.dayId=dailyDayId;
  if(dailyDate)options.date=dailyDate;
  if(periodReport){
    options.scope=periodReport.scope||'';options.fromDate=periodReport.fromDate||'';options.toDate=periodReport.toDate||'';
  }
  return options;
}
function getDocumentSession({refresh=false}={}){
  if(!project)return null;
  if(refresh||!documentSession||!productDocumentSessionMatches(documentSession,project))documentSession=createProductDocumentSession(project,currentDocumentOptions());
  return documentSession;
}
function renderDocuments(){
  if(!project)return noProject();
  const session=getDocumentSession(),catalog=productDocumentCatalog(session,{includeTechnical:technicalMode});
  const query=String(documentSearch||'').trim().toLowerCase();
  const defaultSelected=new Set(['general','groups','teachers','spaces','guards','validation']);
  const matchesDoc=doc=>!query||[doc.label,doc.audience,doc.groupLabel,doc.description].join(' ').toLowerCase().includes(query);
  const visibleDocs=catalog.flatMap(group=>group.documents.map(doc=>({...doc,groupLabel:group.label,technical:group.technical}))).filter(matchesDoc);
  const blockers=session.readiness.blockers.map(row=>`<li>${esc(row.message)}</li>`).join('');
  const readiness=session.readiness.officialReady
    ?`<div class="notice success"><b>Preparado para documentación oficial.</b> La revisión está cerrada, sin conflictos graves ni sesiones obligatorias pendientes.</div>`
    :`<div class="notice warning"><b>Borrador de trabajo.</b><ul>${blockers}</ul><p>Puede imprimirse para revisión, pero no debe etiquetarse como horario oficial.</p></div>`;
  const assistantChoices=[
    {id:'group',label:'Horario de un grupo',description:'Para revisar o entregar el horario de un grupo concreto.',type:'groups',entity:'groups',filterKey:'groupId'},
    {id:'teacher',label:'Horario de un docente',description:'Para entregar o comprobar el horario individual del profesorado.',type:'teachers',entity:'teachers',filterKey:'teacherId'},
    {id:'space',label:'Horario de un espacio',description:'Para revisar ocupación de aula, patio, biblioteca u otro espacio.',type:'spaces',entity:'spaces',filterKey:'spaceId'},
    {id:'services',label:'Servicios y guardias',description:'Para imprimir guardias, recreos, entrada, salida y servicios organizativos.',type:'guards',entity:'',filterKey:''},
    {id:'dossier',label:'Dossier completo',description:'Para archivo o revisión integral del horario.',type:'dossier',entity:'',filterKey:''},
    {id:'pending',label:'Pendientes y validación',description:'Para ver qué impide cerrar oficialmente.',type:'validation',entity:'',filterKey:''},
  ];
  const choice=assistantChoices.find(row=>row.id===documentAssistantKind)||assistantChoices[0];
  if(choice.id!==documentAssistantKind){documentAssistantKind=choice.id;documentAssistantEntity='';}
  const entityRows=choice.entity?sortedEntities(project[choice.entity]||[]):[];
  if(choice.entity&&(!documentAssistantEntity||!entityRows.some(row=>row.id===documentAssistantEntity)))documentAssistantEntity=entityRows[0]?.id||'';
  if(!choice.entity)documentAssistantEntity='';
  const selectedEntity=entityRows.find(row=>row.id===documentAssistantEntity)||null;
  const filterAttrs=choice.filterKey&&selectedEntity?` data-filter-key="${esc(choice.filterKey)}" data-filter-value="${esc(selectedEntity.id)}"`:'';
  const entitySelect=choice.entity?`<label class="document-assistant-field"><span>${choice.entity==='groups'?'Grupo':choice.entity==='teachers'?'Docente':'Espacio'}</span><select id="documentAssistantEntity">${entityRows.map(row=>`<option value="${esc(row.id)}" ${row.id===documentAssistantEntity?'selected':''}>${esc(row.name||row.label||row.id)}</option>`).join('')}</select></label>`:'';
  const resultTitle=choice.entity&&selectedEntity?`${choice.label}: ${selectedEntity.name||selectedEntity.label||selectedEntity.id}`:choice.label;
  const resultHelp=choice.id==='dossier'?'Incluye documentos principales, informes y anexos disponibles.':choice.id==='services'?'Incluye servicios programados y gestión de guardias disponible.':choice.id==='pending'?'Muestra bloqueos, avisos y condiciones pendientes.':choice.description;
  const row=doc=>`<div class="document-picker-row ${doc.available?'':'is-unavailable'}"><label><input type="checkbox" data-product-doc-select value="${esc(doc.id)}" ${doc.available&&defaultSelected.has(doc.id)?'checked':''} ${doc.available?'':'disabled'}><span>${esc(doc.label)}<small>${esc(doc.groupLabel)} · ${esc(doc.audience)} · ${doc.available?`A4 ${doc.orientation==='landscape'?'horizontal':doc.orientation==='portrait'?'vertical':'mixto'}`:'sin datos publicables'}</small></span></label><span class="badge ${doc.available?'info':'muted'}">${esc(doc.pagePolicyLabel)}</span><div class="document-picker-actions"><button class="btn small" data-product-doc-open="${doc.id}" ${doc.available?'':'disabled'}>Vista previa</button><button class="btn small secondary" data-product-doc-pdf="${doc.id}" ${doc.available?'':'disabled'}>PDF</button><button class="btn small ghost" data-product-doc-download="${doc.id}" ${doc.available?'':'disabled'}>HTML</button></div></div>`;
  const pickerGroups=catalog.map((group)=>{const docs=group.documents.map(doc=>({...doc,groupLabel:group.label})).filter(matchesDoc);if(!docs.length)return '';return `<details class="document-picker-group ${group.technical?'technical-panel':''}"><summary><span><b>${esc(group.label)}</b><small>${esc(group.description)}</small></span><span class="badge ${group.technical?'warning':'info'}">${docs.filter(x=>x.available).length}/${group.documents.length}</span></summary><div class="document-picker">${docs.map(doc=>row(doc)).join('')}</div></details>`;}).join('');
  const technicalArchive=technicalMode?`<button class="btn secondary" data-product-package="ARCHIVE">Descargar archivo técnico</button>`:'';
  const technicalData=technicalMode?`<section class="card technical-panel" style="margin-top:16px"><h2>Datos reutilizables</h2><p class="muted">Exportaciones tabulares para auditoría o tratamiento técnico. No son edición masiva del proyecto.</p><div class="toolbar wrap"><button class="btn secondary" data-export-csv="teachers">Docentes</button><button class="btn secondary" data-export-csv="groups">Grupos</button><button class="btn secondary" data-export-csv="subjects">Materias</button><button class="btn secondary" data-export-csv="spaces">Espacios</button><button class="btn secondary" data-export-csv="activities">Actividades</button><button class="btn secondary" data-export-csv="assignments">Horario</button><button class="btn secondary" data-action="download-excel">XML legado</button></div></section>`:'';
  return `<section class="card document-session-card"><div class="toolbar"><div><p class="eyebrow">${PRODUCT_DOCUMENT_CONTRACT_VERSION}</p><h2 style="margin:0">Documentos</h2><p class="muted">Elige primero qué documento necesitas. No hace falta recorrer un catálogo completo.</p></div><span class="spacer"></span><button class="btn secondary" data-product-doc-refresh>Actualizar edición</button></div><div class="document-session-meta"><span>Revisión <b>${esc(session.revisionNumber)}</b></span><span>Estado: <b>${esc(session.statusLabel)}</b></span><span>Sesiones: <b>${esc(session.readiness.placed)}</b></span><span>Pendientes: <b>${esc(session.readiness.pending)}</b></span><span>Edición: <b>${esc(session.sessionId)}</b></span></div>${readiness}</section>
  <section class="card document-assistant" style="margin-top:16px"><div class="document-assistant-head"><div><h2 style="margin:0">¿Qué quieres obtener?</h2><p class="muted">Selecciona el tipo de documento, la persona/grupo/espacio si procede, y el formato de salida.</p></div><span class="badge info">Asistente simple</span></div><div class="document-assistant-grid"><label class="document-assistant-field"><span>Tipo de documento</span><select id="documentAssistantKind">${assistantChoices.map(row=>`<option value="${esc(row.id)}" ${row.id===choice.id?'selected':''}>${esc(row.label)}</option>`).join('')}</select></label>${entitySelect}<div class="document-assistant-result"><span class="context-label">Documento seleccionado</span><b>${esc(resultTitle)}</b><small>${esc(resultHelp)}</small></div></div><div class="document-assistant-actions"><button class="btn" data-product-assistant-open="${esc(choice.type)}"${filterAttrs}>Vista previa</button><button class="btn secondary" data-product-assistant-pdf="${esc(choice.type)}"${filterAttrs}>Imprimir / Guardar PDF</button><button class="btn secondary" data-product-assistant-download="${esc(choice.type)}"${filterAttrs}>Descargar HTML</button><button class="btn secondary" data-product-download-xlsx>Descargar Excel</button><button class="btn ghost" data-product-package="WORKING_COPY">Paquete de trabajo</button><button class="btn" data-product-package="OFFICIAL" ${session.readiness.officialReady?'':'disabled'}>Paquete oficial</button>${technicalArchive}</div><p class="document-selected-note">El paquete oficial solo se activa cuando el horario está cerrado. Para revisión usa vista previa, PDF o paquete de trabajo.</p></section>
  <section class="card" style="margin-top:16px"><details class="document-advanced-options"><summary><span><b>Otros documentos y selección avanzada</b><small>Buscar documentos concretos o preparar un paquete seleccionado.</small></span><span class="badge muted">Plegado</span></summary><div class="document-advanced-inner"><label>Buscar documento<input id="documentSearch" value="${esc(documentSearch)}" placeholder="Ej.: profesorado, recreo, pendientes, trazabilidad..."></label><div class="document-format-grid"><label><input type="checkbox" id="selectedIncludeXlsx" checked> Incluir libro XLSX</label><label><input type="checkbox" id="selectedIncludeHtml" checked disabled> Incluir HTML imprimible</label></div><div class="toolbar wrap"><button class="btn" data-product-selected-package>Descargar paquete seleccionado</button><button class="btn secondary" data-product-download-xlsx>Descargar solo XLSX</button></div><p class="document-selected-note">La reimportación masiva desde Excel queda aplazada hasta existir vista previa de diferencias, validación por fila y copia automática previa.</p>${pickerGroups||'<div class="empty">No hay documentos que coincidan con la búsqueda.</div>'}</div></details></section>${technicalData}`;
}

function sortedEntities(rows=[]){return [...rows].sort((a,b)=>String(a.name||a.label||a.id).localeCompare(String(b.name||b.label||b.id),'es',{numeric:true,sensitivity:'base'}));}


function renderSystem(){
  const projectSection=project?`<div class="grid two"><section class="card"><h2>Proyecto y copias externas</h2><div class="toolbar wrap"><button class="btn" data-action="export-project">Descargar copia del proyecto</button><button class="btn secondary" data-action="open-project">Abrir otra copia</button><button class="btn ghost" data-action="new-project">Nuevo proyecto</button></div><p class="muted">Abrir otro proyecto nunca sustituye el activo sin confirmación.</p></section><section class="card"><h2>Copias locales</h2><div class="toolbar"><button class="btn" data-action="backup">Crear copia estable</button><button class="btn secondary" data-action="list-backups">Ver copias</button></div><div id="backupsHost"><div class="empty">Pulsa “Ver copias”.</div></div></section></div><div class="grid two" style="margin-top:16px"><section class="card"><h2>Versiones recuperables</h2>${project.history.length?project.history.slice().reverse().map(h=>{const valid=h.restorable===true;return `<div class="status-row"><span><b>Revisión ${h.revisionNumber}</b><br><small>${esc(h.reason)} · ${fmtDate(h.createdAt)} · ${valid?'copia verificada':'legado no restaurable'}</small></span><button class="btn small secondary" data-action="restore-history" data-id="${h.id}" ${valid?'':'disabled'}>Restaurar como nueva revisión</button></div>`;}).join(''):'<div class="empty">No hay versiones anteriores.</div>'}</section><section class="card"><h2>Preparar el siguiente curso</h2><p>Copia centro, calendario, organización, docentes, grupos y espacios; no copia sesiones, incidencias ni ausencias.</p><button class="btn" data-action="next-course">Crear proyecto del siguiente curso</button></section></div>`:`<section class="card"><h2>No hay un proyecto activo</h2><p>Puedes crear un proyecto, abrir una copia o revisar las opciones de mantenimiento.</p><div class="toolbar wrap"><button class="btn" data-action="new-project">Crear proyecto</button><button class="btn secondary" data-action="open-project">Abrir copia</button><button class="btn ghost" data-action="load-demo">Abrir simulación</button></div></section>`;
  const safety=`<section class="card" style="margin-top:16px"><h2>Estado y recuperación</h2><div class="grid three"><div class="status-panel"><span>Almacenamiento</span><b>${storageStatus?.mode==='INDEXED_DB'?'Preparado':'Modo de reserva'}</b><small>Los datos permanecen en este dispositivo.</small></div><div class="status-panel"><span>Conexión</span><b>${onlineState()==='OFFLINE'?'Sin conexión':'En línea'}</b><small>El trabajo ordinario puede continuar sin red.</small></div><div class="status-panel"><span>Aplicación</span><b>${PRODUCT_VERSION}</b><small>Núcleo técnico ${APP_VERSION}</small></div></div>${waitingServiceWorker?'<div class="notice warning" style="margin-top:14px">Hay una actualización preparada. Guarda el proyecto antes de activarla.</div>':''}<div class="toolbar wrap" style="margin-top:14px"><button class="btn secondary" data-action="activate-update" ${waitingServiceWorker?'':'disabled'}>Activar actualización</button></div></section>`;
  const a11y=`<section class="card a11y-preferences" style="margin-top:16px"><div class="toolbar"><div><p class="eyebrow">P10-1A · preferencias personales</p><h2 style="margin:0">Accesibilidad y comodidad de uso</h2><p class="muted">Estas preferencias se guardan solo en este navegador y no modifican el proyecto.</p></div><span class="spacer"></span><a class="btn secondary" href="qa/qa-product-accessibility-p10-1a.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Abrir evaluación P10-1A</a></div><div class="choice-grid"><button class="btn secondary" type="button" data-a11y-pref="textScale" aria-pressed="${accessibilityPreferences.textScale==='LARGE'}">Texto ampliado</button><button class="btn secondary" type="button" data-a11y-pref="contrast" aria-pressed="${accessibilityPreferences.contrast==='HIGH'}">Contraste reforzado</button><button class="btn secondary" type="button" data-a11y-pref="motion" aria-pressed="${accessibilityPreferences.motion==='REDUCED'}">Reducir movimiento</button><button class="btn secondary" type="button" data-a11y-pref="spacing" aria-pressed="${accessibilityPreferences.spacing==='SPACIOUS'}">Controles más espaciosos</button><button class="btn ghost" type="button" data-a11y-pref="reset">Restablecer</button></div></section>`;
  const pilotPreparation=`<section class="card pilot-preparation-entry" style="margin-top:16px"><div class="toolbar"><div><p class="eyebrow">P11-0 · piloto privado</p><h2 style="margin:0">Ejecutar el piloto con un proyecto real</h2><p class="muted">Carga localmente el proyecto y el dossier P8-0, registra las doce tareas, incidencias, tiempos y decisión de jefatura sin incorporar datos privados al producto.</p></div><span class="spacer"></span><a class="btn" href="private/piloto-privado-p11-0.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Abrir P11-0</a><a class="btn secondary" href="private/preparar-piloto-real-p8-0.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Preparar P8-0</a></div><div class="notice warning">El paquete no contiene proyectos reales. P11-1 permanece bloqueada hasta cargar un archivo real o anonimizado y realizar el recorrido observado.</div></section>`;
  const advanced=technicalMode?renderAdvancedMaintenance():`<section class="card advanced-entry" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Mantenimiento avanzado</h2><p class="muted">Herramientas reservadas para diagnóstico, pruebas y auditoría. No son necesarias para crear y gestionar un horario.</p></div><span class="spacer"></span><button class="btn secondary" type="button" data-product-action="enable-technical-mode">Acceder</button></div></section>`;
  const danger=project?`<section class="card danger-zone" style="margin-top:16px"><h2>Eliminar copia local</h2><p>No elimina los archivos que hayas descargado.</p><button class="btn danger" data-action="clear-project">Eliminar proyecto local</button></section>`:'';
  return `${projectSection}${safety}${a11y}${pilotPreparation}${advanced}${danger}`;
}

function renderAdvancedMaintenance(){
  const mode=storageStatus?.mode==='INDEXED_DB'?'IndexedDB transaccional':storageStatus?.mode==='LOCAL_STORAGE_FALLBACK'?'Reserva localStorage':'Comprobando';
  const recovery=storageStatus?.recovery||getLastRecovery();
  const projectTechnical=project?`<section class="card technical-panel"><h2>Identidad técnica del proyecto</h2><div class="status-row"><span>Aplicación núcleo</span><b>${APP_VERSION}</b></div><div class="status-row"><span>Esquema</span><b>${SCHEMA_VERSION}</b></div><div class="status-row"><span>Contrato de producto</span><b>${CONTRACT_VERSION}</b></div><div class="status-row"><span>Fundación semántica</span><b>${SEMANTIC_FOUNDATION_CONTRACT_VERSION}</b></div><div class="status-row"><span>Huella estructural</span><code>${esc(structuralFingerprint(project))}</code></div></section>`:'';
  return `<section class="card technical-panel" style="margin-top:16px"><div class="toolbar"><div><p class="eyebrow">${PRODUCT_PHASE}</p><h2 style="margin:0">Mantenimiento avanzado activo</h2><p class="muted">Diagnóstico, QA, contratos, matrices, paridades, evidencias e información interna.</p></div><span class="spacer"></span><button class="btn secondary" type="button" data-product-action="disable-technical-mode">Salir de mantenimiento</button></div><div class="notice warning">Estas herramientas pueden mostrar identificadores internos y deben usarse solo para mantenimiento.</div></section><div class="grid two" style="margin-top:16px">${projectTechnical}<section class="card technical-panel"><h2>Estado técnico</h2><div class="status-row"><span>Almacenamiento</span><b>${esc(mode)}</b></div><div class="status-row"><span>Recuperación</span><b>${esc(recovery.action||'NONE')}</b></div><div class="status-row"><span>Service worker</span><b>${esc(serviceWorkerStatus?.contractVersion||'En comprobación')}</b></div></section></div><section class="card technical-panel" style="margin-top:16px"><div class="toolbar"><div><h2 style="margin:0">Diagnóstico local A13</h2><p class="muted">Persistencia, recuperación, offline, rendimiento y registro de errores.</p></div><span class="spacer"></span><button class="btn secondary" data-action="refresh-diagnostics">Actualizar diagnóstico</button></div><div id="a13DiagnosticsHost" class="diagnostics-host" aria-live="polite"><div class="empty">Actualizando diagnóstico…</div></div><div class="toolbar wrap"><button class="btn secondary" data-action="clear-runtime-cache">Limpiar caché temporal</button><button class="btn secondary" data-action="clear-local-errors">Borrar registro de errores</button></div></section><section class="card technical-panel" style="margin-top:16px"><h2>Rendimiento de la sesión</h2><div id="performanceHost"><div class="empty">Calculando métricas disponibles…</div></div></section><section class="card technical-panel" style="margin-top:16px"><h2>Calibración privada · A14</h2><div class="toolbar wrap"><a class="btn" href="private/preparar-datos-reales-a14-0.html?v=${APP_VERSION}" target="_blank" rel="noopener">Preparar A14-0</a><a class="btn" href="private/simulacion-organizativa-a14-1.html?v=${APP_VERSION}" target="_blank" rel="noopener">Simular A14-1</a><a class="btn secondary" href="private/calibracion-aceptacion-a14-2.html?v=${APP_VERSION}" target="_blank" rel="noopener">Calibrar A14-2</a><a class="btn secondary" href="qa/qa-private-data-a14-0.html?v=${APP_VERSION}" target="_blank" rel="noopener">QA A14-0</a><a class="btn secondary" href="qa/qa-private-simulation-a14-1.html?v=${APP_VERSION}" target="_blank" rel="noopener">QA A14-1</a><a class="btn secondary" href="qa/qa-private-calibration-a14-2.html?v=${APP_VERSION}" target="_blank" rel="noopener">QA A14-2</a></div></section><section class="card technical-panel" style="margin-top:16px"><h2>QA y auditoría · producto y A15</h2><div class="toolbar wrap"><a class="btn" href="qa/qa-p11-private-pilot.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">QA P11-0</a><a class="btn secondary" href="p11/private-pilot-contract-1.0.json?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Contrato P11-0</a><a class="btn secondary" href="p11/evidence/P11_0_INFRASTRUCTURE_EVIDENCE.json?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Evidencia P11-0</a><a class="btn" href="qa/qa-p10m7-benchmark.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Benchmark P10M-7</a><a class="btn secondary" href="p10m/benchmark-contract-1.1.json?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Contrato P10M-7</a><a class="btn secondary" href="p10m/evidence/P10M7_BENCHMARK_EVIDENCE.json?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Evidencia P10M-7</a><a class="btn" href="qa/qa-product-physical-p10-0.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">QA físico preliminar P10-0</a><a class="btn" href="qa/qa-product-accessibility-p10-1a.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">QA accesibilidad P10-1A</a><a class="btn" href="qa/qa-p10m5-semantic-assistants.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Asistentes P10M-5</a><a class="btn secondary" href="p10m/semantic-assistants-contract-1.0.json?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Contrato P10M-5</a><a class="btn" href="qa/qa-p10m4-parity.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Paridad P10M-4</a><a class="btn secondary" href="p10m/engine-parity-contract-1.0.json?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Contrato de paridad</a><a class="btn secondary" href="p10m/evidence/P10M4_PARITY_EVIDENCE.json?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Evidencia CP-SAT real</a><a class="btn" href="qa/qa-p10m-independent-validator.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Validador P10M-2</a><a class="btn secondary" href="p10m/independent-validator-contract-1.0.json?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Contrato P10M-2</a><a class="btn" href="qa/qa-p10m-capabilities.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Capacidades P10M-1</a><a class="btn secondary" href="p10m/capability-manifest-1.0.json?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Manifiesto P10M-1</a><a class="btn secondary" href="p10m/capability-matrix-1.0.json?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Matriz P10M-0</a><a class="btn secondary" href="p10m/corpus/manifest.json?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">Corpus P10M-0B</a><a class="btn" href="qa/qa-pilot-preparation-p8-0.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">QA preparación P8-0</a><a class="btn" href="qa/qa-product-documents-p7.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">QA documentos P7</a><a class="btn" href="qa/qa-product-daily-p6.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">QA gestión diaria P6</a><a class="btn" href="qa/qa-semantic-foundation-p5s.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">QA semántica P5S</a><a class="btn" href="qa/qa-product-review-p5.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">QA revisión P5</a><a class="btn" href="qa/qa-example-library-p4.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">QA ejemplos P4</a><a class="btn" href="qa/qa-product-generation-p3.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">QA generador P3</a><a class="btn" href="qa/qa-product-wizard-p2.html?v=${PRODUCT_VERSION}" target="_blank" rel="noopener">QA asistente P2</a><a class="btn secondary" href="qa/qa-robustness-a13.html?v=${APP_VERSION}" target="_blank" rel="noopener">Robustez A13</a><a class="btn secondary" href="qa/qa-browser.html?v=${APP_VERSION}" target="_blank" rel="noopener">Dominio y dispositivo</a><a class="btn secondary" href="qa/qa-ui-a2.html?v=${APP_VERSION}" target="_blank" rel="noopener">Recorridos</a><a class="btn secondary" href="qa/qa-history-a3.html?v=${APP_VERSION}" target="_blank" rel="noopener">Histórico</a><a class="btn secondary" href="qa/qa-data-a4.html?v=${APP_VERSION}" target="_blank" rel="noopener">Datos</a><a class="btn secondary" href="qa/qa-organization-a5.html?v=${APP_VERSION}" target="_blank" rel="noopener">Organización</a><a class="btn secondary" href="qa/qa-daily-a10.html?v=${APP_VERSION}" target="_blank" rel="noopener">Gestión diaria</a><a class="btn secondary" href="qa/qa-documents-a11.html?v=${APP_VERSION}" target="_blank" rel="noopener">Documentos</a><a class="btn secondary" href="qa/qa-exports-a12.html?v=${APP_VERSION}" target="_blank" rel="noopener">XLSX</a><a class="btn" href="qa/qa-physical-a15-0.html?v=${APP_VERSION}" target="_blank" rel="noopener">Matriz A15-0</a><a class="btn" href="qa/qa-release-a15-1.html?v=${APP_VERSION}" target="_blank" rel="noopener">Auditoría A15-1</a><a class="btn" href="qa/qa-convergence-a15-1-1.html?v=${APP_VERSION}" target="_blank" rel="noopener">Convergencia A15-1.1</a></div></section>`;
}

async function refreshSystemDiagnostics(){
  try{
    [storageStatus,localErrorRows]=await Promise.all([getStorageStatus(),listLocalErrors()]);
    serviceWorkerStatus=await requestServiceWorkerStatus(serviceWorkerRegistration)||serviceWorkerStatus;
  }catch(err){await recordLocalError(err,'storage');}
  if(page!=='system'||!technicalMode)return;
  const diag=document.querySelector('#a13DiagnosticsHost');
  if(diag){
    const estimate=storageStatus?.estimate;
    const quota=estimate?.quota?`${formatBytes(estimate.usage)} de ${formatBytes(estimate.quota)}`:'No disponible';
    const recent=localErrorRows.slice(-5).reverse();
    diag.innerHTML=`<div class="table-wrap"><table><caption class="sr-only">Estado del almacenamiento y del service worker</caption><tbody><tr><th scope="row">Contrato</th><td>${esc(storageStatus?.contractVersion||STORAGE_CONTRACT_VERSION)}</td></tr><tr><th scope="row">Base local</th><td>v${esc(storageStatus?.dbVersion||'—')} · ${esc(storageStatus?.activeIntegrity||'—')}</td></tr><tr><th scope="row">Escritura pendiente</th><td>${esc(storageStatus?.pendingIntegrity||'—')}</td></tr><tr><th scope="row">Última copia íntegra</th><td>${esc(storageStatus?.lastGoodIntegrity||'—')}</td></tr><tr><th scope="row">Uso estimado</th><td>${esc(quota)}</td></tr><tr><th scope="row">Service worker</th><td>${esc(serviceWorkerStatus?.appVersion||serviceWorkerStatus?.state||'No controlado')} · ${esc(serviceWorkerStatus?.coreCache||'')}</td></tr></tbody></table></div><h3>Errores locales recientes (${localErrorRows.length})</h3>${recent.length?recent.map(row=>`<div class="issue INFO"><b>${esc(row.context)} · ${fmtDate(row.at)}</b><br><small>${esc(row.name)}: ${esc(row.message)}</small></div>`).join(''):'<div class="empty">No hay errores registrados.</div>'}`;
  }
  const perf=document.querySelector('#performanceHost');
  if(perf){
    const rows=getSessionPerformance();const evaluation=evaluatePerformance(rows);
    const measured=evaluation.checks.filter(row=>row.status!=='NOT_MEASURED');
    perf.innerHTML=measured.length?`<div class="table-wrap"><table><thead><tr><th scope="col">Operación</th><th scope="col">Medición</th><th scope="col">Presupuesto</th><th scope="col">Estado</th></tr></thead><tbody>${measured.map(row=>`<tr><td>${esc(row.name)}</td><td>${Number(row.measuredMs).toFixed(1)} ms</td><td>${row.budgetMs} ms</td><td><span class="badge ${row.status==='PASS'?'ok':'danger'}">${esc(row.status)}</span></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Todavía no se han ejecutado operaciones comparables con el escenario técnico de 502 sesiones.</div>';
  }
}


async function handleProductDailyAction(button){
  const action=button.dataset.productDailyAction,id=button.dataset.id||'';
  if(action==='select-coverage'){selectedCoverageId=id;dailyTab='coverages';render();return;}
  if(action==='confirm-absence'){ensureDraft();project=confirmProductAbsence(project,id);changed('Ausencia confirmada y servicios afectados identificados.');render();return;}
  if(action==='cancel-absence'){const reason=prompt('Motivo de cancelación:','Ausencia anulada o corregida.');if(!reason)return;ensureDraft();project=cancelProductAbsence(project,id,reason);changed('Ausencia cancelada con trazabilidad.');render();return;}
  if(action==='finish-absence'){if(!confirm('¿Finalizar esta ausencia?'))return;ensureDraft();project=finishProductAbsence(project,id);changed('Ausencia finalizada.');render();return;}
  if(action==='assign-coverage'){
    const guide=coverageCandidateGuide(project,id),candidate=guide.eligible.find(row=>row.teacherId===button.dataset.teacher);if(!candidate)throw new Error('La candidatura ya no es compatible con el estado actual.');
    const defaultReason=candidate.requiresJustification?'':'Candidatura recomendada según disponibilidad, compatibilidad y equilibrio actual.';
    const reason=prompt(candidate.requiresJustification?'Esta opción no es la recomendada. Indica el motivo de la decisión:':'Motivo de la decisión, opcional:',defaultReason);
    if(candidate.requiresJustification&&!String(reason||'').trim())throw new Error('La excepción respecto de la candidatura recomendada necesita justificación.');
    ensureDraft();project=assignProductCoverage(project,id,candidate.teacherId,{decisionReason:String(reason||defaultReason)});selectedCoverageId='';changed('Cobertura asignada y decisión registrada.');render();return;
  }
  if(action==='uncovered'){const reason=prompt('Explica por qué el servicio queda sin cubrir:');if(!String(reason||'').trim())return;ensureDraft();project=markProductCoverageUncovered(project,id,reason);selectedCoverageId='';changed('Servicio registrado como sin cubrir.');render();return;}
  if(action==='communicate'){const channel=prompt('Canal de comunicación:','Teléfono');if(!String(channel||'').trim())return;const note=prompt('Nota de comunicación, opcional:','')||'';ensureDraft();project=communicateProductCoverage(project,id,{channel,note});changed('Comunicación registrada.');render();return;}
  if(action==='complete'){const note=prompt('Nota del servicio realizado:','Servicio realizado según la asignación.')||'Servicio realizado';ensureDraft();project=completeProductCoverage(project,id,note);changed('Servicio marcado como realizado.');render();return;}
  if(action==='reopen'){const reason=prompt('Motivo para reabrir la cobertura:');if(!String(reason||'').trim())return;ensureDraft();project=reopenProductCoverage(project,id,reason);changed('Cobertura reabierta.');render();return;}
  if(['impact-suspend','impact-cancel','impact-recovery'].includes(action)){
    const coverage=project.daily.coverages.find(row=>row.id===id);if(!coverage)throw new Error('No se encontró la cobertura.');
    const type=action==='impact-suspend'?'SUSPENDED':action==='impact-cancel'?'CANCELLED':'RECOVERY_REQUIRED';
    const note=prompt('Explica la decisión operativa:');if(!String(note||'').trim())return;ensureDraft();project=recordProductImpact(project,{coverageId:id,assignmentId:coverage.assignmentId,type,operationalNote:note});changed('Consecuencia operativa registrada.');dailyTab='followup';render();return;
  }
  if(action==='resolve-impact'){ensureDraft();project=resolveProductImpact(project,id,{status:'RESOLVED',resolvedAt:nowIso()});changed('Incidencia resuelta.');render();return;}
  if(action==='schedule-recovery'){const date=prompt('Fecha prevista (AAAA-MM-DD):',today());if(!date)return;ensureDraft();project=updateProductRecovery(project,id,{status:'SCHEDULED',plannedDate:date});changed('Recuperación programada.');render();return;}
  if(action==='complete-recovery'){if(!confirm('¿Marcar la recuperación como realizada?'))return;ensureDraft();project=updateProductRecovery(project,id,{status:'COMPLETED',completedAt:nowIso()});changed('Recuperación completada.');render();return;}
  if(action==='cancel-recovery'){const reason=prompt('Motivo de cancelación:');if(!String(reason||'').trim())return;ensureDraft();project=updateProductRecovery(project,id,{status:'CANCELLED_WITH_REASON',cancellationReason:reason,publicNote:reason});changed('Recuperación cancelada con motivo.');render();return;}
  if(action==='add-substitution'){showProductTemporarySubstitutionModal();return;}
  if(action==='finish-substitution'){ensureDraft();project=updateProductTemporarySubstitution(project,id,{status:'FINISHED',finishedAt:nowIso()});changed('Sustitución temporal finalizada.');render();return;}
  if(action==='cancel-substitution'){const reason=prompt('Motivo de cancelación:');if(!String(reason||'').trim())return;ensureDraft();project=updateProductTemporarySubstitution(project,id,{status:'CANCELLED',cancellationReason:reason});changed('Sustitución temporal cancelada.');render();return;}
}

async function handleClick(e){
  const a11y=e.target.closest('[data-a11y-pref]');if(a11y){const key=a11y.dataset.a11yPref;if(key==='reset')accessibilityPreferences=defaultAccessibilityPreferences();else if(key==='textScale')accessibilityPreferences.textScale=accessibilityPreferences.textScale==='LARGE'?'NORMAL':'LARGE';else if(key==='contrast')accessibilityPreferences.contrast=accessibilityPreferences.contrast==='HIGH'?'STANDARD':'HIGH';else if(key==='motion')accessibilityPreferences.motion=accessibilityPreferences.motion==='REDUCED'?'SYSTEM':'REDUCED';else if(key==='spacing')accessibilityPreferences.spacing=accessibilityPreferences.spacing==='SPACIOUS'?'COMFORTABLE':'SPACIOUS';accessibilityPreferences=saveAccessibilityPreferences(accessibilityPreferences);applyAccessibilityPreferences(accessibilityPreferences);notice('Preferencias de accesibilidad actualizadas.','success');render();return;}

  const go=e.target.closest('[data-go]');if(go){page=go.dataset.go;if(go.dataset.tab)dataTab=go.dataset.tab;if(go.dataset.scheduleTab)scheduleTab=go.dataset.scheduleTab;if(go.dataset.dailyTab)dailyTab=go.dataset.dailyTab;setActiveNav();render();return;}
  const tab=e.target.closest('[data-data-tab]');if(tab){dataTab=tab.dataset.dataTab;render();return;}
  const scheduleTabButton=e.target.closest('[data-schedule-tab]');if(scheduleTabButton){scheduleTab=scheduleTabButton.dataset.scheduleTab;render();return;}
  const dailyTabButton=e.target.closest('[data-daily-tab]');if(dailyTabButton){dailyTab=dailyTabButton.dataset.dailyTab;if(dailyTabButton.dataset.productDailySelect)selectedCoverageId=dailyTabButton.dataset.productDailySelect;render();return;}
  const productDailyAction=e.target.closest('[data-product-daily-action]');if(productDailyAction){try{await handleProductDailyAction(productDailyAction);}catch(error){notice(error.message||String(error),'error');}return;}
  const productAction=e.target.closest('[data-product-action]');
  if(productAction){
    if(productAction.dataset.productAction==='recover-removed-command'){try{const preview=previewRemovedCommandRecovery(project,productAction.dataset.id);if(!preview.ok)throw new Error(preview.reasons.join(' '));if(!confirm(`¿Recuperar ${preview.assignments.length} sesión(es) en sus posiciones anteriores?`))return;ensureDraft();project=assertNoNewIndependentScheduleBlockers(project,recoverRemovedCommand(project,productAction.dataset.id));changed(`${preview.assignments.length} sesión(es) recuperadas.`);render();}catch(error){notice(error.message||String(error),'error');}return;}
    if(productAction.dataset.productAction==='enable-technical-mode'){
      if(!confirm('El mantenimiento avanzado muestra diagnósticos e identificadores internos. ¿Deseas continuar?'))return;
      technicalMode=true;writeTechnicalMode(true);render();return;
    }
    if(productAction.dataset.productAction==='disable-technical-mode'){technicalMode=false;writeTechnicalMode(false);render();return;}
  }
  const exampleAction=e.target.closest('[data-example-action]');
  if(exampleAction){
    const action=exampleAction.dataset.exampleAction,id=exampleAction.dataset.exampleId;
    if(action==='library'){page='examples';setActiveNav();render();return;}
    const definition=exampleDefinition(id);if(!definition){notice('No se encontró el centro de ejemplo solicitado.','error');return;}
    try{
      exampleAction.disabled=true;exampleAction.setAttribute('aria-busy','true');
      const candidate=await loadExampleProject(id);
      if(id==='CANONICAL_REFERENCE'){const gate=verifyCanonicalReference(candidate);if(!gate.ok)throw new Error(`${CANONICAL_REGRESSION_GATE}: ${gate.errors.join(' · ')}`);}
      if(action==='open'){
        await replaceProject(candidate,`Abrir ejemplo: ${definition.title}`,{source:'EXAMPLE_LIBRARY',warnings:['Proyecto completamente sintético: no contiene datos reales ni sustituye la validación del centro.']});
      }else if(action==='download'){
        const bytes=await buildProjectContainer(candidate);const safe=id.toLowerCase().replace(/[^a-z0-9]+/g,'_');downloadBytes(bytes,`centro_ejemplo_${safe}.ghfproject`,'application/vnd.ghfproject+zip');notice(`Copia de ${definition.title} descargada.`, 'success');
      }
    }catch(error){await recordLocalError(error,'example-library');notice(error.message||String(error),'error');}
    finally{exampleAction.disabled=false;exampleAction.removeAttribute('aria-busy');}
    return;
  }
  const wizardAction=e.target.closest('[data-wizard-action]');if(wizardAction){await handleWizardAction(wizardAction);return;}
  const docRefresh=e.target.closest('[data-product-doc-refresh]');if(docRefresh){documentSession=getDocumentSession({refresh:true});notice(`Edición documental ${documentSession.sessionId} actualizada.`,'success');render();return;}
  const assistantDownload=e.target.closest('[data-product-assistant-download]');if(assistantDownload){try{const options=documentAssistantOptions(assistantDownload);downloadProductDocument(getDocumentSession(),assistantDownload.dataset.productAssistantDownload,{includeTechnical:technicalMode,documentOptions:options});notice('Documento HTML descargado.','success');}catch(err){notice(err.message,'error');}return;}
  const assistantPdf=e.target.closest('[data-product-assistant-pdf]');if(assistantPdf){try{const options=documentAssistantOptions(assistantPdf);openProductDocument(getDocumentSession(),assistantPdf.dataset.productAssistantPdf,{output:'PDF_PRINT',includeTechnical:technicalMode,documentOptions:options});}catch(err){notice(err.message,'error');}return;}
  const assistantOpen=e.target.closest('[data-product-assistant-open]');if(assistantOpen){try{const options=documentAssistantOptions(assistantOpen);openProductDocument(getDocumentSession(),assistantOpen.dataset.productAssistantOpen,{output:'VIEW',includeTechnical:technicalMode,documentOptions:options});}catch(err){notice(err.message,'error');}return;}
  const docDownload=e.target.closest('[data-product-doc-download]');if(docDownload){try{downloadProductDocument(getDocumentSession(),docDownload.dataset.productDocDownload,{includeTechnical:technicalMode});notice('Documento HTML descargado.','success');}catch(err){notice(err.message,'error');}return;}
  const docPdf=e.target.closest('[data-product-doc-pdf]');if(docPdf){try{openProductDocument(getDocumentSession(),docPdf.dataset.productDocPdf,{output:'PDF_PRINT',includeTechnical:technicalMode});}catch(err){notice(err.message,'error');}return;}
  const doc=e.target.closest('[data-product-doc-open]');if(doc){try{openProductDocument(getDocumentSession(),doc.dataset.productDocOpen,{output:'VIEW',includeTechnical:technicalMode});}catch(err){notice(err.message,'error');}return;}
  const xlsxBtn=e.target.closest('[data-product-download-xlsx]');if(xlsxBtn){try{const session=getDocumentSession(),bytes=await buildProductXlsx(session);downloadBytes(bytes,productXlsxFileName(session),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');notice('Libro XLSX de la edición documental descargado.','success');}catch(err){notice(err.message,'error');}return;}
  const packageBtn=e.target.closest('[data-product-package]');if(packageBtn){try{const session=getDocumentSession(),scope=packageBtn.dataset.productPackage;const bytes=await buildProductDocumentPackage(session,{scope,includeTechnical:technicalMode});downloadBytes(bytes,productPackageFileName(session,scope),'application/zip');notice(scope==='OFFICIAL'?'Paquete oficial descargado.':'Paquete documental verificable descargado.','success');}catch(err){notice(err.message,'error');}return;}
  const selectedPackageBtn=e.target.closest('[data-product-selected-package]');if(selectedPackageBtn){try{const session=getDocumentSession(),selected=[...document.querySelectorAll('[data-product-doc-select]:checked')].map(x=>x.value),includeXlsx=document.querySelector('#selectedIncludeXlsx')?.checked!==false;const bytes=await buildSelectedProductDocumentPackage(session,{selectedTypes:selected,includeXlsx,includeTechnical:technicalMode});downloadBytes(bytes,productPackageFileName(session,'SELECTED'),'application/zip');notice('Paquete seleccionado descargado.','success');}catch(err){notice(err.message,'error');}return;}
  const csvBtn=e.target.closest('[data-export-csv]');if(csvBtn){downloadText(exportEntityCsv(project,csvBtn.dataset.exportCsv),makeDownloadName(project,csvBtn.dataset.exportCsv,'csv'),'text/csv;charset=utf-8');return;}
  const editorTarget=e.target.closest('[data-editor-target]');
  if(editorTarget&&!e.target.closest('[data-action]')){if(editorSelection.size)await handleEditorCellTarget(editorTarget.dataset.day,editorTarget.dataset.slot);return;}
  const semanticRoute=e.target.closest('[data-semantic-route]');if(semanticRoute){try{const route=JSON.parse(semanticRoute.dataset.semanticRoute||'{}');if(route.page){page=route.page;if(route.dataTab)dataTab=route.dataTab;if(route.scheduleTab)scheduleTab=route.scheduleTab;if(route.dailyTab)dailyTab=route.dailyTab;setActiveNav();render();}}catch{}return;}
  const b=e.target.closest('[data-action]');if(!b)return;
  try{
    const route=assertKnownUiAction(b.dataset.action);
    if(route.kind==='entity'){
      if(route.operation==='delete')return deleteEntity(route.entityType,b.dataset.id);
      return showEntityModal(route.entityType,b.dataset.id||'');
    }
    const a=route.action;
    if(a==='new-project')return startProjectWizard();
    if(a==='open-project'){fileInput.value='';fileInput.click();return;}
    if(a==='load-demo'){page='examples';setActiveNav();render();return;}
    if(a==='add-slot'||a==='edit-slot')return showSlotModal(b.dataset.id||'');
    if(a==='clear-availability'){const t=project.teachers.find(x=>x.id===b.dataset.id);if(t&&confirm('¿Volver al modo heredado para este docente?')){t.unavailable=[];t.presence=[];t.presencePlan=[];project.organization.presencePolicy={...(project.organization.presencePolicy||{}),explicitPlanEnabled:project.teachers.some(x=>x.id!==t.id&&(x.presencePlan||[]).length>0)};changed();render();}return;}
    if(a==='semantic-add-site')return showSemanticSiteModal();
    if(a==='semantic-edit-site')return showSemanticSiteModal(b.dataset.id||'');
    if(a==='semantic-delete-site'){if(!confirm('¿Eliminar esta sede?'))return;commitSemanticAssistant({type:'DELETE_SITE',payload:{id:b.dataset.id}},'Sede eliminada.');return;}
    if(a==='semantic-add-travel')return showSemanticTravelModal();
    if(a==='semantic-edit-travel')return showSemanticTravelModal(b.dataset.id||'');
    if(a==='semantic-delete-travel'){if(!confirm('¿Eliminar este desplazamiento?'))return;commitSemanticAssistant({type:'DELETE_TRAVEL',payload:{id:b.dataset.id}},'Desplazamiento eliminado.');return;}
    if(a==='semantic-add-resource')return showSemanticResourceModal();
    if(a==='semantic-edit-resource')return showSemanticResourceModal(b.dataset.id||'');
    if(a==='semantic-delete-resource'){if(!confirm('¿Eliminar este recurso?'))return;commitSemanticAssistant({type:'DELETE_RESOURCE',payload:{id:b.dataset.id}},'Recurso eliminado.');return;}
    if(a==='semantic-configure-activity')return showSemanticActivityModal(b.dataset.id||'');
    if(a==='semantic-add-relation')return showSemanticRelationModal();
    if(a==='semantic-edit-relation')return showSemanticRelationModal(b.dataset.id||'');
    if(a==='semantic-delete-relation'){if(!confirm('¿Eliminar esta relación?'))return;commitSemanticAssistant({type:'DELETE_RELATION',payload:{id:b.dataset.id}},'Relación eliminada.');return;}
    if(a==='semantic-add-split')return showSemanticSplitModal();
    if(a==='semantic-edit-split')return showSemanticSplitModal(b.dataset.id||'');
    if(a==='semantic-delete-split'){if(!confirm('¿Eliminar este desdoble?'))return;commitSemanticAssistant({type:'DELETE_SPLIT',payload:{id:b.dataset.id}},'Desdoble eliminado.');return;}
    if(a==='add-presence-rule')return showPresenceRuleModal();
    if(a==='delete-presence-rule'){const row=project.organization.minimumPresence.find(x=>x.id===b.dataset.id);if(!row)return;if(!confirm('¿Eliminar esta regla de presencia mínima?'))return;ensureDraft();project.organization.minimumPresence=project.organization.minimumPresence.filter(x=>x.id!==b.dataset.id);appendAudit(project,'PRESENCE_RULE_DELETED',`Regla ${row.id} eliminada.`);changed();render();return;}
    if(a==='add-break-zone')return showBreakZoneModal();
    if(a==='delete-break-zone'){const row=project.organization.breakZones.find(x=>x.id===b.dataset.id);if(!row)return;if(project.organization.services.some(x=>x.zoneId===row.id))throw new Error('No se puede eliminar: hay servicios de vigilancia vinculados a esta zona.');if(!confirm(`¿Eliminar la zona de recreo ${row.name||''}?`))return;ensureDraft();project.organization.breakZones=project.organization.breakZones.filter(x=>x.id!==b.dataset.id);appendAudit(project,'BREAK_ZONE_DELETED',`Zona de recreo: ${row.name||row.id}.`);syncOrganizationalActivities(project);changed();render();return;}
    if(a==='add-position')return showTeacherDefinitionModal('position',b.dataset.teacher||'');
    if(a==='delete-position'){const t=project.teachers.find(x=>x.id===b.dataset.teacher);const row=t?.positions?.find(x=>x.id===b.dataset.id);if(!row)return;if(!confirm(`¿Eliminar el cargo ${row.label}?`))return;ensureDraft();t.positions=t.positions.filter(x=>x.id!==row.id);syncOrganizationalActivities(project);appendAudit(project,'POSITION_DELETED',`${t.name}: ${row.label}.`);changed();render();return;}
    if(a==='add-reduction')return showTeacherDefinitionModal('reduction',b.dataset.teacher||'');
    if(a==='delete-reduction'){const t=project.teachers.find(x=>x.id===b.dataset.teacher);const row=t?.reductions?.find(x=>x.id===b.dataset.id);if(!row)return;if(!confirm(`¿Eliminar la reducción ${row.label}?`))return;ensureDraft();t.reductions=t.reductions.filter(x=>x.id!==row.id);syncOrganizationalActivities(project);appendAudit(project,'REDUCTION_DELETED',`${t.name}: ${row.label}.`);changed();render();return;}
    if(a==='add-organization-service')return showOrganizationServiceModal();
    if(a==='add-anchored-segment')return showAnchoredSegmentModal();
    if(a==='delete-anchored-segment'){const row=project.organization.anchoredSegments.find(x=>x.id===b.dataset.id);if(!row)return;if(!confirm('¿Eliminar este segmento vinculado?'))return;ensureDraft();project.organization.anchoredSegments=project.organization.anchoredSegments.filter(x=>x.id!==row.id);syncOrganizationalActivities(project);appendAudit(project,'ANCHORED_SEGMENT_DELETED',row.name);changed();render();return;}
    if(a==='delete-organization-service'){const row=project.organization.services.find(x=>x.id===b.dataset.id);if(!row)return;if(!confirm(`¿Eliminar el servicio ${row.name}?`))return;ensureDraft();project.organization.services=project.organization.services.filter(x=>x.id!==row.id);syncOrganizationalActivities(project);appendAudit(project,'ORGANIZATION_SERVICE_DELETED',row.name);changed();render();return;}
    if(a==='add-organization-rule')return showOrganizationRuleModal();
    if(a==='toggle-organization-rule'){const all=[...(project.organization.rules||[]),...(project.organization.preferences||[])],r=all.find(x=>x.id===b.dataset.id);if(r){ensureDraft();r.active=r.active===false;appendAudit(project,'ORGANIZATION_RULE_TOGGLED',`${r.label||r.id}: ${r.active?'activa':'desactivada'}.`);changed();render();}return;}
    if(a==='delete-organization-rule'){const all=[...(project.organization.rules||[]),...(project.organization.preferences||[])],row=all.find(x=>x.id===b.dataset.id);if(!row)return;if(!confirm(`¿Eliminar la regla ${row.label||''}?`))return;ensureDraft();project.organization.rules=(project.organization.rules||[]).filter(x=>x.id!==b.dataset.id);project.organization.preferences=(project.organization.preferences||[]).filter(x=>x.id!==b.dataset.id);appendAudit(project,'ORGANIZATION_RULE_DELETED',row.label||row.id);changed();render();return;}
    if(a==='download-template')return downloadImportTemplate();
    if(a==='revalidate-import'){stagedImport=revalidateStaging(project,stagedImport);notice('Vista previa revalidada contra el proyecto actual.','success');render();return;}
    if(a==='edit-staged-row')return showStagedRowModal(b.dataset.id);
    if(a==='select-all-staged'){stagedImport=setAllStagedRowsSelected(stagedImport,true);render();return;}
    if(a==='select-none-staged'){stagedImport=setAllStagedRowsSelected(stagedImport,false);render();return;}
    if(a==='apply-import'){
      const acceptWarnings=Boolean(document.querySelector('#acceptImportWarnings')?.checked);
      const base=deepClone(project);
      if(base.meta.status==='FINAL'){createRevision(base,'Antes de aplicar una importación de datos');base.meta.status='DRAFT';appendAudit(base,'FINAL_REOPENED','Se abrió una revisión borrador para importar datos.');}
      const result=applyStagedImport(base,stagedImport,{acceptWarnings});project=result.project;stagedImport=null;
      changed(`Importación aplicada: ${result.report.inserted} altas, ${result.report.updated} actualizaciones y ${result.report.skipped} filas omitidas.`);render();return;
    }
    if(a==='cancel-import'){stagedImport=null;render();return;}
    if(a==='cancel-generation'){const ok=await getProductGenerationOrchestrator().cancel();if(ok){generationState.cancelRequested=true;generationState.message='Cancelación solicitada.';render();}return;}
    if(a==='export-cp-sat-request'){const form=b.closest('form[data-form="generate"]');if(!form)throw new Error('No se encontró el formulario de generación.');if(project.meta.privacyClass==='REAL'&&!confirm('La solicitud CP-SAT contiene una copia completa de los datos del proyecto. Guárdala y transfiérela únicamente por canales privados controlados. ¿Continuar?'))return;const request=cpSatRequestFromForm(new FormData(form),deepClone(project));downloadText(cpSatRequestDownload(request),`solicitud_cp_sat_${request.requestId}.json`,'application/json;charset=utf-8');return;}
    if(a==='import-cp-sat-response'){document.querySelector('#cpSatResponseFile')?.click();return;}
    if(a==='export-generation-run'){const run=(project.generationRuns||[]).find(x=>x.request?.requestId===b.dataset.id);if(!run)throw new Error('No se encontró el recibo de generación.');downloadText(generationRunDownload(run),`ejecucion_${run.request.requestId}.json`,'application/json;charset=utf-8');return;}
    if(a==='accept-proposal')return acceptPending(b.dataset.id);
    if(a==='reject-proposal')return rejectPending(b.dataset.id);
    if(a==='undo'){if(!editorHistoryState(project).canUndo)throw new Error('No hay una edición que deshacer.');ensureDraft();project=assertNoNewIndependentScheduleBlockers(project,undoEditorCommand(project));editorSelection.clear();editorAnchorId='';moveDestinations=null;changed('Edición deshecha.');render();return;}
    if(a==='redo'){if(!editorHistoryState(project).canRedo)throw new Error('No hay una edición que rehacer.');ensureDraft();project=assertNoNewIndependentScheduleBlockers(project,redoEditorCommand(project));editorSelection.clear();editorAnchorId='';moveDestinations=null;changed('Edición rehecha.');render();return;}
    if(a==='select-assignment'){toggleEditorSelection(b.dataset.id);render();return;}
    if(a==='apply-move'||a==='editor-apply-destination'){const preview=previewSingleMove(project,b.dataset.assignment,b.dataset.day,b.dataset.slot,b.dataset.space||'');if(!preview.ok)throw new Error(preview.reasons.join(' '));ensureDraft();project=assertNoNewIndependentScheduleBlockers(project,applyMovePreview(project,preview,'Mover sesión desde el editor'));editorSelection=new Set([b.dataset.assignment]);editorAnchorId=b.dataset.assignment;moveDestinations=null;changed('Sesión movida; la edición puede deshacerse.');render();return;}
    if(a==='editor-select-visible'){editorSelection=new Set(visibleEditorAssignmentIds());editorAnchorId=[...editorSelection][0]||'';moveDestinations=null;render();return;}
    if(a==='editor-clear-selection'){editorSelection.clear();editorAnchorId='';moveDestinations=null;editorLivePreview=null;render();return;}
    if(a==='editor-shift'){await applyEditorShift(Number(b.dataset.day||0),Number(b.dataset.slot||0));return;}
    if(a==='editor-lock-selection'){return showEditorLockModal(false);}
    if(a==='editor-unlock-selection'){return showEditorLockModal(true);}
    if(a==='editor-unplace-selection'){return unplaceEditorSelection();}
    if(a==='save-scenario')return promptScenario();
    if(a==='apply-scenario'){if(confirm('¿Aplicar esta alternativa como una nueva revisión?')){project=assertNoNewIndependentScheduleBlockers(project,applyScenario(project,b.dataset.id));changed('Alternativa aplicada.');render();}return;}
    if(a==='compare-scenarios')return showScenarioCompare();
    if(a==='add-lock')return showLockModal();
    if(a==='unlock'){const l=project.locks.find(x=>x.id===b.dataset.id);if(l){const reason=prompt('Motivo para desbloquear:');if(!reason)return;l.active=false;l.unlockedAt=nowIso();l.unlockReason=reason;appendAudit(project,'ASSIGNMENT_UNLOCKED',reason);changed();render();}return;}
    if(a==='finalize')return finalizeProject();
    if(a==='recommend-coverage'){selectedCoverageId=b.dataset.id;render();return;}
    if(a==='assign-coverage'){const reason=prompt('Motivo breve de la decisión (opcional):','Candidato disponible según las reglas actuales.')||'';project=assignCoverage(project,b.dataset.id,b.dataset.teacher,{decisionReason:reason});selectedCoverageId='';changed('Cobertura asignada.');render();return;}
    if(a==='uncovered'){const reason=prompt('Motivo obligatorio para dejar la sesión sin cubrir:');if(!reason)return;project=markCoverageUncovered(project,b.dataset.id,reason);changed();render();return;}
    if(a==='coverage-complete'){project=updateCoverageStatus(project,b.dataset.id,'COMPLETED','Servicio completado');changed();render();return;}
    if(a==='coverage-communicate'){const channel=prompt('Canal de comunicación:','Teléfono')||'';project=communicateCoverage(project,b.dataset.id,{channel});changed('Cobertura comunicada.');render();return;}
    if(a==='coverage-reopen'){const reason=prompt('Motivo obligatorio para reabrir:');if(!reason)return;project=reopenCoverage(project,b.dataset.id,reason);changed('Cobertura reabierta.');render();return;}
    if(a==='confirm-absence'){project=confirmAbsence(project,b.dataset.id);changed('Ausencia confirmada y servicios identificados.');render();return;}
    if(a==='impact-suspend'||a==='impact-cancel'||a==='impact-recovery'){const c=project.daily.coverages.find(x=>x.id===b.dataset.id);if(!c)throw new Error('No se encontró la cobertura.');const type=a==='impact-suspend'?'SUSPENDED':a==='impact-cancel'?'CANCELLED':'RECOVERY_REQUIRED';const note=prompt('Nota operativa de la decisión:')||'';project=createActivityImpact(project,{coverageId:c.id,assignmentId:c.assignmentId,type,operationalNote:note});changed('Consecuencia operativa registrada.');render();return;}
    if(a==='resolve-impact'){project=updateActivityImpact(project,b.dataset.id,{status:'RESOLVED'});changed('Incidencia resuelta.');render();return;}
    if(a==='cancel-absence'){const reason=prompt('Motivo de cancelación:');if(!reason)return;project=cancelAbsence(project,b.dataset.id,reason);changed();render();return;}
    if(a==='finish-absence'){project=finishAbsence(project,b.dataset.id);changed();render();return;}
    if(a==='create-recovery'){project=createRecovery(project,{coverageId:b.dataset.id,activityId:b.dataset.activity,status:'PENDING'});changed();render();return;}
    if(a==='schedule-recovery'){const date=prompt('Fecha prevista (AAAA-MM-DD):',today());if(!date)return;project=updateRecovery(project,b.dataset.id,{status:'SCHEDULED',plannedDate:date});changed();render();return;}
    if(a==='recovery-complete'){project=updateRecovery(project,b.dataset.id,{status:'COMPLETED'});changed('Recuperación completada.');render();return;}
    if(a==='recovery-cancel'){const reason=prompt('Motivo obligatorio de cancelación:');if(!reason)return;project=updateRecovery(project,b.dataset.id,{status:'CANCELLED_WITH_REASON',cancellationReason:reason,publicNote:reason});changed('Recuperación cancelada con motivo.');render();return;}
    if(a==='add-temporary-substitution')return showTemporarySubstitutionModal();
    if(a==='finish-temporary-substitution'){project=updateTemporarySubstitution(project,b.dataset.id,{status:'FINISHED',finishedAt:nowIso()});changed('Sustitución temporal finalizada.');render();return;}
    if(a==='cancel-temporary-substitution'){const reason=prompt('Motivo de cancelación:');if(!reason)return;project=updateTemporarySubstitution(project,b.dataset.id,{status:'CANCELLED',cancellationReason:reason,cancelledAt:nowIso()});changed('Sustitución temporal cancelada.');render();return;}
    if(a==='download-excel'){downloadText(exportExcelXml(project),makeDownloadName(project,'datos_y_horarios','xml'),'application/vnd.ms-excel;charset=utf-8');return;}
    if(a==='export-project')return exportProject();
    if(a==='refresh-diagnostics'){await refreshSystemDiagnostics();notice('Diagnóstico local actualizado.','success');return;}
    if(a==='clear-local-errors'){await clearLocalErrors();localErrorRows=[];await refreshSystemDiagnostics();notice('Registro local de errores eliminado.','success');return;}
    if(a==='clear-runtime-cache'){const result=await clearRuntimeCaches(serviceWorkerRegistration);if(!result?.ok)throw new Error('No se pudo limpiar la caché temporal.');notice('Caché temporal eliminada; la caché básica offline se conserva.','success');await refreshSystemDiagnostics();return;}
    if(a==='activate-update'){if(dirty)await saveNow(false);const activated=await activateWaitingWorker(serviceWorkerRegistration);if(!activated)throw new Error('No hay una actualización preparada.');notice('Actualización activada. La aplicación se recargará con la nueva versión.','success');return;}
    if(a==='backup'){await createBackup(project,'Copia estable manual');notice('Copia local creada.','success');return showBackups();}
    if(a==='list-backups')return showBackups();
    if(a==='restore-backup'){const record=await readBackup(b.dataset.id);await replaceProject(record.project,`Restaurar copia ${b.dataset.id}`,{preview:previewFromProject(record.project,`Copia local ${b.dataset.id}`,'COPIA_LOCAL'),warnings:['La copia se abrirá como proyecto activo después de crear una copia preventiva del estado actual.'],source:'LOCAL_BACKUP'});return;}
    if(a==='restore-history'){if(confirm('¿Restaurar esta versión como una nueva revisión?')){project=restoreSnapshot(project,b.dataset.id);changed('Versión restaurada.');render();}return;}
    if(a==='next-course')return showNextCourse();
    if(a==='clear-project'){if(confirm('¿Eliminar la copia local del proyecto? Los archivos descargados se conservarán.')){await clearActive();project=null;dirty=false;render();}return;}
    throw new Error(`Acción registrada sin controlador: ${a}.`);
  }catch(err){notice(err.message,'error');}
}

function independentBlockerKey(row){return [row.code,row.assignmentId||'',row.activityId||'',row.entity||'',row.dayId||'',row.slotId||'',row.ruleId||''].join('|');}
function assertNoNewIndependentScheduleBlockers(before,candidate,source='MANUAL_EDIT'){
  const baseline=validateScheduleIndependently(before,{mode:'INCREMENTAL',source});
  const next=validateScheduleIndependently(candidate,{mode:'INCREMENTAL',source});
  const known=new Set(baseline.blockers.map(independentBlockerKey));
  const created=next.blockers.filter(row=>!known.has(independentBlockerKey(row)));
  if(created.length){const error=new Error(`P10M-2 bloquea la operación: ${created[0].message}`);error.code=created[0].code;error.independentValidation=next;throw error;}
  return candidate;
}

function toggleEditorSelection(id){
  if(!project.assignments.some(a=>a.id===id))return;
  if(editorSelection.has(id)){
    editorSelection.delete(id);
    if(editorAnchorId===id)editorAnchorId=[...editorSelection][0]||'';
  }else{
    editorSelection.add(id);
    editorAnchorId=id;
  }
  moveDestinations=null;
  editorLivePreview=null;
}

async function applyEditorShift(deltaDay,deltaSlot){
  if(!editorSelection.size)throw new Error('Selecciona al menos una sesión.');
  const preview=previewSelectionShift(project,[...editorSelection],deltaDay,deltaSlot);
  if(!preview.ok){notice(preview.reasons.join(' '),'error');return;}
  if(preview.moves.length>1&&!confirm(`¿Mover ${preview.moves.length} sesiones conservando su disposición relativa?`))return;
  ensureDraft();
  project=assertNoNewIndependentScheduleBlockers(project,applyMovePreview(project,preview,`Desplazar ${preview.moves.length} sesión(es)`));
  moveDestinations=null;editorLivePreview=null;
  changed(`${preview.moves.length} sesión(es) movida(s).`);render();
}

async function handleEditorCellTarget(dayId,slotId){
  if(!editorSelection.size)return;
  const anchor=editorAnchorId||[...editorSelection][0];
  const explanation=explainSelectionDestination(project,[...editorSelection],anchor,dayId,slotId);
  const preview=explanation.preview;
  editorLivePreview={ok:explanation.ok,message:explanation.summary};
  if(!explanation.ok){notice(editorLivePreview.message,'error');render();return;}
  const label=preview.moves.length===1?'esta sesión':`${preview.moves.length} sesiones conservando su disposición relativa`;
  if(!confirm(`¿Mover ${label} al destino indicado?`))return;
  ensureDraft();
  project=assertNoNewIndependentScheduleBlockers(project,applyMovePreview(project,preview,`Mover ${preview.moves.length} sesión(es) desde la cuadrícula`));
  moveDestinations=null;editorLivePreview=null;
  changed(`${preview.moves.length} sesión(es) movida(s).`);render();
}

function showEditorLockModal(unlock=false){
  const selected=[...editorSelection];
  if(!selected.length)throw new Error('Selecciona al menos una sesión.');
  const title=unlock?'Desbloquear sesiones':'Bloquear sesiones';
  showModal(title,`<form id="modalForm"><p>${selected.length} sesión(es) seleccionada(s).</p><label>Motivo<input name="reason" required placeholder="Decisión organizativa o incidencia"></label><label>Responsable<input name="responsible" required value="${esc(project.meta.responsible||'')}"></label></form>`,()=>{
    const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;
    const fd=new FormData(f);ensureDraft();
    project=unlock?unlockAssignments(project,selected,{reason:fd.get('reason'),responsible:fd.get('responsible')}):lockAssignments(project,selected,{reason:fd.get('reason'),responsible:fd.get('responsible')});
    changed(unlock?'Sesiones desbloqueadas.':'Sesiones bloqueadas.');render();return true;
  },unlock?'Desbloquear':'Bloquear');
}

function unplaceEditorSelection(){
  const selected=[...editorSelection];
  if(!selected.length)throw new Error('Selecciona al menos una sesión.');
  const summary=assignmentSelectionSummary(project,selected);if(summary.locked)throw new Error('Desbloquea primero las sesiones seleccionadas.');
  showModal('Retirar sesiones del horario',`<form id="modalForm"><p>Se retirarán ${selected.length} sesión(es). Las actividades seguirán existiendo y volverán a aparecer como carga pendiente.</p><label>Motivo<input name="reason" required placeholder="Corrección, revisión o cambio organizativo"></label></form>`,()=>{
    const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;
    ensureDraft();project=unplaceAssignments(project,selected,new FormData(f).get('reason'));
    editorSelection.clear();editorAnchorId='';moveDestinations=null;
    changed(`${selected.length} sesión(es) retiradas del horario.`);render();return true;
  },'Retirar');
}

function documentAssistantOptions(el){
  const key=el?.dataset?.filterKey||'';
  const value=el?.dataset?.filterValue||'';
  return key&&value?{[key]:value}:{};
}

function handleInput(e){
  if(page==='wizard'&&updateWizardFromElement(e.target)){persistProjectWizard();return;}
  if(e.target.id==='documentAssistantKind'){
    documentAssistantKind=e.target.value||'group';
    documentAssistantEntity='';
    render();
    return;
  }
  if(e.target.id==='documentAssistantEntity'){
    documentAssistantEntity=e.target.value||'';
    render();
    return;
  }
  if(e.target.id==='documentSearch'){
    documentSearch=e.target.value;
    clearTimeout(editorSearchTimer);
    editorSearchTimer=setTimeout(()=>{render();const input=document.querySelector('#documentSearch');if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}},120);
    return;
  }
  if(e.target.id!=='editorSearch')return;
  editorSearch=e.target.value;
  clearTimeout(editorSearchTimer);
  editorSearchTimer=setTimeout(()=>{
    render();
    const input=document.querySelector('#editorSearch');
    if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}
  },120);
}

async function handleEditorKeydown(e){
  if(page!=='schedule'||!project)return;
  const formControl=e.target.closest('input,select,textarea,[contenteditable="true"]');
  if(formControl)return;
  const modifier=e.ctrlKey||e.metaKey;
  if(modifier&&e.key.toLowerCase()==='z'){
    e.preventDefault();
    try{const state=editorHistoryState(project);if(e.shiftKey?!state.canRedo:!state.canUndo)throw new Error(e.shiftKey?'No hay una edición que rehacer.':'No hay una edición que deshacer.');ensureDraft();project=e.shiftKey?redoEditorCommand(project):undoEditorCommand(project);editorSelection.clear();editorAnchorId='';changed(e.shiftKey?'Edición rehecha.':'Edición deshecha.');render();}catch(err){notice(err.message,'error');}
    return;
  }
  if(modifier&&e.key.toLowerCase()==='y'){
    e.preventDefault();try{const state=editorHistoryState(project);if(!state.canRedo)throw new Error('No hay una edición que rehacer.');ensureDraft();project=redoEditorCommand(project);editorSelection.clear();editorAnchorId='';changed('Edición rehecha.');render();}catch(err){notice(err.message,'error');}return;
  }
  if(e.key==='Escape'&&editorSelection.size){e.preventDefault();editorSelection.clear();editorAnchorId='';moveDestinations=null;render();return;}
  if((e.key==='Delete'||e.key==='Backspace')&&editorSelection.size){e.preventDefault();unplaceEditorSelection();return;}
  if(e.altKey&&editorSelection.size&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
    e.preventDefault();const map={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};await applyEditorShift(...map[e.key]);return;
  }
  const cell=e.target.closest('[data-editor-target]');
  if(cell&&(e.key==='Enter'||e.key===' ')){e.preventDefault();await handleEditorCellTarget(cell.dataset.day,cell.dataset.slot);}
}

function clearEditorDragClasses(){host.querySelectorAll('[data-editor-target].drag-valid,[data-editor-target].drag-invalid').forEach(el=>el.classList.remove('drag-valid','drag-invalid'));}
function handleEditorDragStart(e){
  if(page!=='schedule')return;
  const lesson=e.target.closest('.editor-lesson[data-id]');if(!lesson||lesson.classList.contains('locked')){e.preventDefault();return;}
  editorDragId=lesson.dataset.id;
  if(!editorSelection.has(editorDragId)){editorSelection=new Set([editorDragId]);editorAnchorId=editorDragId;lesson.classList.add('selected');lesson.setAttribute('aria-pressed','true');}
  e.dataTransfer?.setData('text/plain',editorDragId);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';
}
function handleEditorDragOver(e){
  if(page!=='schedule'||!editorSelection.size)return;
  const cell=e.target.closest('[data-editor-target]');if(!cell)return;
  e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';
  clearEditorDragClasses();
  const preview=previewSelectionToCell(project,[...editorSelection],editorAnchorId||editorDragId,cell.dataset.day,cell.dataset.slot);
  cell.classList.add(preview.ok?'drag-valid':'drag-invalid');
  const live=document.querySelector('#editorLiveStatus');if(live)live.textContent=preview.ok?`${preview.moves.length} sesión(es): destino válido.`:preview.reasons.join(' ');
}
function handleEditorDragLeave(e){const cell=e.target.closest('[data-editor-target]');if(cell&&!cell.contains(e.relatedTarget))cell.classList.remove('drag-valid','drag-invalid');}
async function handleEditorDrop(e){
  const cell=e.target.closest('[data-editor-target]');if(!cell)return;
  e.preventDefault();clearEditorDragClasses();editorDragId='';
  try{await handleEditorCellTarget(cell.dataset.day,cell.dataset.slot);}catch(err){notice(err.message,'error');}
}

function handleChange(e){
  if(page==='wizard'&&updateWizardFromElement(e.target)){persistProjectWizard();render();return;}
  if(e.target.id==='scheduleFilter'){scheduleFilter=e.target.value;render();return;}
  if(e.target.id==='availabilityTeacher'){project.settings.availabilityTeacherId=e.target.value;render();return;}
  if(e.target.matches('[data-staged-select]')){stagedImport=setStagedRowSelected(stagedImport,e.target.dataset.stagedSelect,e.target.checked);render();return;}
  if(e.target.id==='cpSatResponseFile'&&e.target.files?.[0]){handleCpSatResponseFile(e.target.files[0]).finally(()=>{e.target.value='';});return;}
  if(e.target.id==='csvImportFile'&&e.target.files?.[0]){const reader=new FileReader();reader.onload=()=>{const area=document.querySelector('#csvText');if(area)area.value=String(reader.result||'');};reader.readAsText(e.target.files[0]);}
}
async function handleSubmit(e){
  e.preventDefault();const form=e.target,fd=new FormData(form);
  try{
    if(form.dataset.form==='project'){Object.assign(project.meta,{name:String(fd.get('name')).trim(),center:String(fd.get('center')).trim(),academicYear:String(fd.get('academicYear')).trim(),responsible:String(fd.get('responsible')).trim(),dataState:fd.get('dataState'),privacyClass:fd.get('privacyClass')});appendAudit(project,'PROJECT_UPDATED','Identificación actualizada.');changed();render();}
    if(form.dataset.form==='availability'){const t=project.teachers.find(x=>x.id===fd.get('teacherId'));if(!t)throw new Error('Docente no encontrado.');const keys=fd.getAll('presenceKey').map(String),statuses=fd.getAll('presenceStatus').map(normalizePresenceStatus),sites=fd.getAll('presenceSite').map(String);t.presencePlan=keys.map((key,index)=>{const [dayId,slotId]=key.split(':');return{id:uid('presence'),dayId,slotId,status:statuses[index]||'PENDING',siteId:sites[index]||'',note:'',dataState:t.dataState||'PENDING',provenance:manualDataProvenance({origin:'USER',sourceRef:'Matriz de presencia explícita'},project.meta.responsible||'')};});const invalid=t.presencePlan.find(row=>row.status==='OTHER_SITE'&&!row.siteId);if(invalid)throw new Error('Selecciona la sede en todas las franjas marcadas como “En otra sede”.');t.unavailable=[];t.presence=[];project.organization.presencePolicy={...(project.organization.presencePolicy||{}),explicitPlanEnabled:true,unknownBlocksCoverage:true,pendingBlocksCoverage:true,legacyFallback:true};appendAudit(project,'EXPLICIT_PRESENCE_UPDATED',`Presencia explícita actualizada: ${t.name}.`);changed();render();}
    if(form.dataset.form==='organization'){ensureDraft();project.organization.enabled=Boolean(fd.get('enabled'));project.organization.profile={...project.organization.profile,name:String(fd.get('profileName')).trim(),version:String(fd.get('profileVersion')).trim(),dataState:fd.get('profileState')};Object.assign(project.organization.ldDc,{ordinaryLd:Number(fd.get('ordinaryLd')||0),ordinaryDc:Number(fd.get('ordinaryDc')||0),maxSimultaneousLd:fd.get('maxSimultaneousLd')===''?null:Number(fd.get('maxSimultaneousLd')),dcCoverageAllowed:Boolean(fd.get('dcCoverageAllowed')),ldAllowedSlots:fd.getAll('ldAllowedSlots').map(String),dcAllowedSlots:fd.getAll('dcAllowedSlots').map(String)});project.organization.workloadPolicy={...project.organization.workloadPolicy,requireExactTarget:Boolean(fd.get('requireExactTarget')),toleranceSessions:Number(fd.get('toleranceSessions')||0),countedKinds:fd.getAll('countedKinds').map(String)};project.organization.coveragePolicy={...project.organization.coveragePolicy,maxDailyCoverages:fd.get('maxDailyCoverages')===''?null:Number(fd.get('maxDailyCoverages')),preserveEssentialPresence:Boolean(fd.get('preserveEssentialPresence')),releasableKinds:fd.getAll('releasableKinds').map(String),presenceExcludingKinds:fd.getAll('presenceExcludingKinds').map(String)};syncOrganizationalActivities(project);changed('Organización guardada y sincronizada.');render();}
    if(form.dataset.form==='semantic-cycle'){const labels=String(fd.get('labels')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);commitSemanticAssistant({type:'SET_CYCLE',payload:{mode:String(fd.get('mode')||'WEEKLY'),labels}},'Ciclo semanal actualizado mediante el asistente.');return;}
    if(form.dataset.form==='domain4'){ensureDraft();project.domain=parseDomain4Form(fd,project.domain);project=normalizeProject(project);appendAudit(project,'EDUCATIONAL_DOMAIN_4_UPDATED','Dominio educativo 4.0 actualizado.');changed('Dominio educativo guardado. Las capacidades 4.0 no triviales exigirán CP-SAT real con paridad P10M-4.');render();return;}
    if(form.dataset.form==='stage-import'){const text=String(fd.get('csvText')||'');stagedImport=stageEntityImport(project,fd.get('entityType'),text,{mode:fd.get('mode'),fileName:document.querySelector('#csvImportFile')?.files?.[0]?.name||'',sourceRef:fd.get('sourceRef'),validFrom:fd.get('validFrom'),validTo:fd.get('validTo'),verifiedBy:fd.get('verifiedBy'),verifiedAt:fd.get('verifiedAt')});render();}
    if(form.dataset.form==='generate'){await startGeneration(fd);}
    if(form.dataset.form==='move-search'){const id=fd.get('assignmentId');moveDestinations=professionalDestinationGuide(project,id,{limit:30});render();}
    if(form.dataset.form==='product-daily-filter'){dailyDate=String(fd.get('date')||'');dailyDayId=String(fd.get('dayId')||'');operationalReport=null;render();return;}
    if(form.dataset.form==='product-absence'){ensureDraft();project=registerProductAbsence(project,{teacherId:fd.get('teacherId'),date:fd.get('date'),dayId:fd.get('dayId'),slotIds:fd.getAll('slotIds').map(String),status:String(fd.get('status')||'CONFIRMED'),operationalNote:String(fd.get('operationalNote')||''),privateReason:String(fd.get('privateReason')||'')});changed(fd.get('status')==='DRAFT'?'Ausencia guardada como borrador.':'Ausencia confirmada y coberturas creadas.');render();return;}
    if(form.dataset.form==='product-daily-operational'){operationalReport=productOperationalReport(project,{date:String(fd.get('date')||''),dayId:String(fd.get('dayId')||'')});render();return;}
    if(form.dataset.form==='product-daily-reporting-periods'){
      const ids=fd.getAll('periodId').map(String),labels=fd.getAll('periodLabel').map(String),froms=fd.getAll('periodFrom').map(String),tos=fd.getAll('periodTo').map(String);
      const nextPeriods=ids.map((id,index)=>({id,label:labels[index].trim(),fromDate:froms[index],toDate:tos[index],kind:'EVALUATION',active:true}));
      const candidate=deepClone(project);candidate.daily.settings.reportingPeriods=nextPeriods;candidate.daily.settings.reportingPeriodsState='CONFIGURED';
      const validation=validateProject(candidate);const periodError=validation.errors.find(row=>row.code.startsWith('REPORTING_PERIOD_'));if(periodError)throw new Error(periodError.message);
      ensureDraft();project.daily.settings.reportingPeriods=nextPeriods;project.daily.settings.reportingPeriodsState='CONFIGURED';changed('Periodos de evaluación guardados.');render();return;
    }
    if(form.dataset.form==='product-daily-period'){periodReport=productPeriodReport(project,{scope:String(fd.get('scope')||'CUSTOM'),referenceDate:String(fd.get('referenceDate')||''),fromDate:String(fd.get('fromDate')||''),toDate:String(fd.get('toDate')||'')});render();return;}
    if(form.dataset.form==='absence'){project=registerAbsence(project,{teacherId:fd.get('teacherId'),date:fd.get('date'),dayId:fd.get('dayId'),slotIds:fd.getAll('slotIds').map(String),operationalNote:String(fd.get('operationalNote')||''),privateReason:String(fd.get('privateReason')||'')});changed('Ausencia registrada y servicios afectados creados.');render();}
    if(form.dataset.form==='daily-operational'){operationalReport=dailyOperationalReport(project,{date:String(fd.get('date')||''),dayId:String(fd.get('dayId')||'')});render();return;}
    if(form.dataset.form==='daily-reporting-periods'){
      const ids=fd.getAll('periodId').map(String),labels=fd.getAll('periodLabel').map(String),froms=fd.getAll('periodFrom').map(String),tos=fd.getAll('periodTo').map(String);
      const nextPeriods=ids.map((id,index)=>({id,label:labels[index].trim(),fromDate:froms[index],toDate:tos[index],kind:'EVALUATION',active:true}));
      const candidate=deepClone(project);candidate.daily.settings.reportingPeriods=nextPeriods;candidate.daily.settings.reportingPeriodsState='CONFIGURED';
      const validation=validateProject(candidate);const periodError=validation.errors.find(row=>row.code.startsWith('REPORTING_PERIOD_'));if(periodError)throw new Error(periodError.message);
      project.daily.settings.reportingPeriods=nextPeriods;project.daily.settings.reportingPeriodsState='CONFIGURED';
      changed('Periodos de evaluación guardados.');render();return;
    }
    if(form.dataset.form==='daily-period'){periodReport=dailyPeriodReport(project,{scope:String(fd.get('scope')||'CUSTOM'),referenceDate:String(fd.get('referenceDate')||''),fromDate:String(fd.get('fromDate')||''),toDate:String(fd.get('toDate')||'')});render();}
  }catch(err){notice(err.message,'error');}
}


function cpSatRequestFromForm(fd,source){
  return createCpSatRequest(source,{
    requestId:globalThis.crypto?.randomUUID?.()||`cp_sat_request_${Date.now()}`,
    mode:String(fd.get('mode')||'COMPLETE'),targetActivityIds:fd.getAll('targetActivityIds').map(String),
    seed:Number(fd.get('seed')||0),maxDurationMs:Number(fd.get('maxDurationSeconds')||30)*1000,
    numWorkers:Number(fd.get('numWorkers')||8),
  });
}

async function startGeneration(fd){
  if(generationState.status==='RUNNING')throw new Error('Ya hay una generación en curso.');
  ensureDraft();
  const source=deepClone(project);
  const requestId=globalThis.crypto?.randomUUID?.()||`product_generation_${Date.now()}`;
  const options={
    requestId,enginePreference:String(fd.get('engine')||'AUTO'),mode:String(fd.get('mode')||'COMPLETE'),
    targetActivityIds:fd.getAll('targetActivityIds').map(String),seed:Number(fd.get('seed')||0),
    maxDurationMs:Number(fd.get('maxDurationSeconds')||30)*1000,numWorkers:Number(fd.get('numWorkers')||8),
    forceGlobalOptimization:Boolean(fd.get('forceGlobalOptimization')),
  };
  generationState={status:'RUNNING',engine:'AUTO',phase:'PREPARING',progress:{phase:'PREPARING',processed:0,total:0,percent:1,placed:0,unplaced:0,message:'Preparando la generación.'},elapsedMs:0,cancelRequested:false,message:''};render();
  try{
    const result=await getProductGenerationOrchestrator().start(source,options,{onProgress:(progress)=>{
      generationState={...generationState,status:'RUNNING',engine:'AUTO',phase:progress.phase||'',progress,elapsedMs:Number(progress.elapsedMs||0)};render();
    }});
    applyGenerationResult(result);
  }catch(error){
    const run={contractVersion:PRODUCT_GENERATION_CONTRACT_VERSION,request:{contractVersion:PRODUCT_GENERATION_CONTRACT_VERSION,requestId,engine:{kind:'AUTO'}},response:{contractVersion:PRODUCT_GENERATION_CONTRACT_VERSION,requestId,status:'ERROR',startedAt:nowIso(),finishedAt:nowIso(),durationMs:0,progress:null,hasUsableProposal:false,proposalId:'',error:{name:error.name||'Error',message:error.message},message:'La orquestación terminó con un error controlado.'},proposalId:'',recordedAt:nowIso()};
    project.generationRuns.push(run);generationState={status:'IDLE',engine:'',phase:'',progress:null,elapsedMs:0,cancelRequested:false,message:error.message};changed('La ejecución terminó con error y quedó registrada.');render();
  }
}

function applyGenerationResult(result){
  const run={contractVersion:result.contractVersion,request:compactCpSatRequest(result.request||{}),response:result.response,proposalId:'',recordedAt:nowIso()};
  const hasSource=Boolean(result.request?.sourceProjectId||result.request?.sourceRevisionId||result.request?.sourceFingerprint);
  const sourceStillCurrent=!hasSource||(result.request?.sourceProjectId===project.meta.projectId&&result.request?.sourceRevisionId===project.meta.revisionId&&result.request?.sourceFingerprint===structuralFingerprint(project));
  if(!sourceStillCurrent){run.response={...run.response,status:'ERROR',hasUsableProposal:false,proposalId:'',error:{name:'StaleGenerationResult',message:'La respuesta pertenece a otro proyecto, revisión o huella.'},message:'El resultado se descartó porque no corresponde al proyecto abierto.'};}
  else if(result.proposal){
    const candidate=deepClone(project);candidate.proposals.push(result.proposal);const check=revalidateProposal(candidate,result.proposal.id);if(check.validation.errors.length)throw new Error(`La propuesta externa no supera la revalidación heredada: ${check.validation.errors[0].message}`);const independent=validateScheduleIndependently(check.draft,{mode:'CANDIDATE',source:result.request?.engine?.kind==='CP_SAT'?'CP_SAT':result.request?.engine?.kind==='WEB_SOLVER'?'WEB_SOLVER':'IMPORTED_PROPOSAL'});if(!independent.valid)throw new Error(`La propuesta externa no supera P10M-2: ${independent.blockers[0]?.message||'incumplimiento semántico independiente.'}`);project.proposals.push(result.proposal);run.proposalId=result.proposal.id;
  }
  project.generationRuns.push(run);appendAudit(project,'GENERATION_RUN_RECORDED',`${generationStatusLabel(run.response.status)}.`,project.meta.responsible||'Usuario',{requestId:run.request?.requestId||'',status:run.response.status,proposalId:run.proposalId,engine:run.request?.engine?.kind||''});
  generationState={status:'IDLE',engine:'',phase:'',progress:null,elapsedMs:0,cancelRequested:false,message:run.response.message||''};changed(run.proposalId?'Propuesta generada y revalidada sin modificar el horario vigente.':run.response.message||'Ejecución registrada.');render();
}

async function handleCpSatResponseFile(file){
  try{const value=validateCpSatResult(JSON.parse(await file.text()));applyGenerationResult(value);notice('Respuesta CP-SAT importada y revalidada.','success');}
  catch(error){notice(`No se pudo importar la respuesta CP-SAT: ${error.message}`,'error');}
}

function startProjectWizard(){
  if(!projectWizard){
    projectWizard=createProjectWizardState({
      centerName:project?.meta?.center||'',
      projectName:project?.meta?.name?`${project.meta.name} · nueva copia`:'Horario escolar',
      academicYear:project?.meta?.academicYear||undefined,
      responsible:project?.meta?.responsible||'',
      privacyMode:project?.meta?.privacyClass==='SYNTHETIC'?'SYNTHETIC':project?.meta?.privacyClass==='ANONYMIZED'?'ANONYMIZED':'REAL_LOCAL',
      dataState:project?.meta?.dataState||'PENDING',
    });
    persistProjectWizard();
  }
  page='wizard';setActiveNav();render();
}
function persistProjectWizard(){if(projectWizard)saveProjectWizardState(projectWizard);}
function wizardElementValue(el){
  if(el.dataset.wizardMultiple!==undefined)return [...el.selectedOptions].map(option=>option.value).filter(Boolean);
  if(el.dataset.wizardType==='boolean')return Boolean(el.checked);
  if(el.dataset.wizardType==='number')return el.value===''?0:Number(el.value);
  if(el.dataset.wizardType==='number-or-empty')return el.value===''?'':Number(el.value);
  return el.value;
}
function updateWizardFromElement(el){
  if(!projectWizard||!el)return false;
  const listPath=el.dataset?.wizardListPath;
  if(listPath){
    const values=[...host.querySelectorAll('[data-wizard-list-path]')]
      .filter(node=>node.dataset.wizardListPath===listPath&&node.checked)
      .map(node=>node.value);
    setWizardValue(projectWizard,listPath,values);return true;
  }
  const path=el.dataset?.wizardPath;
  if(path){
    if(el.type==='radio'&&!el.checked)return false;
    setWizardValue(projectWizard,path,wizardElementValue(el));return true;
  }
  const collection=el.dataset?.wizardCollection,rowId=el.dataset?.wizardRow,field=el.dataset?.wizardField;
  if(collection&&rowId&&field){setWizardRowValue(projectWizard,collection,rowId,field,wizardElementValue(el));return true;}
  return false;
}
async function handleWizardAction(button){
  if(!projectWizard)projectWizard=createProjectWizardState();
  const action=button.dataset.wizardAction;
  try{
    if(action==='add-row'){
      addWizardRow(projectWizard,button.dataset.collection);persistProjectWizard();render();return;
    }
    if(action==='remove-row'){
      if(!confirm('¿Eliminar esta fila del asistente? Las referencias asociadas también se limpiarán.'))return;
      removeWizardRow(projectWizard,button.dataset.collection,button.dataset.row);persistProjectWizard();render();return;
    }
    if(action==='previous'){
      projectWizard.step=Math.max(1,Number(projectWizard.step||1)-1);persistProjectWizard();render();return;
    }
    if(action==='next'){
      const current=Number(projectWizard.step||1),review=validateProjectWizard(projectWizard);
      const blockers=review.blocking.filter(row=>Number(row.step||5)<=current);
      if(blockers.length){notice(blockers[0].message,'error');return;}
      projectWizard.step=Math.min(5,current+1);persistProjectWizard();render();return;
    }
    if(action==='go-step'){
      const target=Math.max(1,Math.min(5,Number(button.dataset.step||1)));
      if(target>Number(projectWizard.step||1)){
        const review=validateProjectWizard(projectWizard);
        const blockers=review.blocking.filter(row=>Number(row.step||5)<target);
        if(blockers.length){notice(blockers[0].message,'error');return;}
      }
      projectWizard.step=target;persistProjectWizard();render();return;
    }
    if(action==='cancel'){
      persistProjectWizard();page='home';setActiveNav();render();notice('El borrador del asistente queda guardado en esta pestaña.','info');return;
    }
    if(action==='restart'){
      if(!confirm('¿Reiniciar el asistente? Se eliminará el borrador actual de esta pestaña.'))return;
      clearProjectWizardState();projectWizard=createProjectWizardState({centerName:project?.meta?.center||'',academicYear:project?.meta?.academicYear||undefined,responsible:project?.meta?.responsible||''});persistProjectWizard();render();return;
    }
    if(action==='finish'){
      const review=validateProjectWizard(projectWizard);
      if(!review.canCreateDraft||!review.project){notice(review.blocking[0]?.message||'Corrige los bloqueos antes de crear el proyecto.','error');return;}
      const accepted=await replaceProject(review.project,'Crear el proyecto con el asistente',{source:'PRODUCT_WIZARD'});
      if(accepted){clearProjectWizardState();projectWizard=null;notice(review.canGenerateAfterCreate?'Proyecto creado y preparado para generar.':'Proyecto creado como borrador; la revisión indica qué falta completar.','success');}
      return;
    }
  }catch(error){await recordLocalError(error,'project-wizard');notice(error.message||String(error),'error');}
}

function showNewProject(){showModal('Crear proyecto',`<form id="modalForm"><div class="field-row"><label>Nombre<input name="name" required value="Nuevo proyecto"></label><label>Centro<input name="center"></label><label>Curso académico<input name="academicYear" required value="2026/2027"></label></div><div class="field-row"><label>Responsable<input name="responsible"></label><label>Tipo<select name="privacyClass">${privacyOptions('ANONYMIZED')}</select></label></div></form>`,async()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f),p=createEmptyProject({name:fd.get('name'),center:fd.get('center'),academicYear:fd.get('academicYear'),responsible:fd.get('responsible'),privacyClass:fd.get('privacyClass')});return replaceProject(p,'Crear el nuevo proyecto');});}
async function replaceProject(next,label,context={}){
  const checked=validatePortableProject(next,{allowMigration:true});
  const normalized=checked.project;
  const preview=context.preview||previewFromProject(normalized,label,'PROYECTO');
  const independent=validateScheduleIndependently(normalized,{mode:'INCREMENTAL',source:context.source==='WORKSPACE'?'UNKNOWN':'IMPORTED_PROJECT'});
  const independentWarning=independent.blockers.length?`P10M-2 detecta ${independent.blockers.length} conflicto(s) semántico(s). El proyecto podrá abrirse como borrador, pero no cerrarse como oficial hasta corregirlos.`:'';
  const warnings=[...(context.warnings||[]),...(checked.warnings||[]),...(independentWarning?[independentWarning]:[])];
  if(project||context.preview){const ok=await confirmProjectReplacement(label,preview,warnings);if(!ok)return false;}
  const previous=project?deepClone(project):null;
  const saved=await replaceActiveWithBackup(previous,normalized,previous?`Copia automática previa a ${label}`:'');
  project=saved;
  projectFileContext={source:context.source||'WORKSPACE',preservedEntries:context.preservedEntries instanceof Map?context.preservedEntries:new Map(),warnings:[...(context.warnings||[])]};
  editorSelection.clear();editorAnchorId='';editorSearch='';moveDestinations=null;editorLivePreview=null;
  dirty=false;saveState.textContent='Guardado local';saveState.classList.remove('dirty');
  page='home';dataTab='project';setActiveNav();render();
  notice(previous?'Proyecto sustituido; se creó una copia automática del anterior.':'Proyecto abierto y guardado localmente.','success');
  return true;
}
async function handleProjectFile(){
  const file=fileInput.files?.[0];if(!file)return;
  try{
    const parsed=await readProjectFile(await file.arrayBuffer(),{fileName:file.name});
    await replaceProject(parsed.project,`Abrir ${file.name}`,{preview:parsed.preview,warnings:parsed.warnings,source:parsed.source,preservedEntries:parsed.preservedEntries});
  }catch(err){notice(`No se pudo abrir: ${err.message}`,'error');}
  finally{fileInput.value='';}
}
function previewFromProject(value,fileName,integrity){const p=normalizeProject(value);return{fileName,name:p.meta.name,center:p.meta.center,academicYear:p.meta.academicYear,privacyClass:p.meta.privacyClass,schemaVersion:p.meta.schemaVersion,revisionNumber:p.meta.revisionNumber,projectId:p.meta.projectId,integrity,containsPersonalData:p.meta.privacyClass==='REAL'};}
function confirmProjectReplacement(label,preview,warnings=[]){
  return new Promise(resolve=>{
    const modalHost=document.querySelector('#modalHost');
    const warningRows=warnings.length?`<div class="notice warning">${warnings.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:'';
    const safety=project?'Se creará una copia automática del proyecto activo antes de sustituirlo.':'No existe un proyecto activo; se guardará esta copia como proyecto de trabajo.';
    modalHost.innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="Vista previa del proyecto"><h2>Revisar antes de abrir</h2><p><b>${esc(label)}</b></p><div class="table-wrap"><table><tbody><tr><th>Archivo</th><td>${esc(preview.fileName||'—')}</td></tr><tr><th>Proyecto</th><td>${esc(preview.name||'—')}</td></tr><tr><th>Centro</th><td>${esc(preview.center||'Sin indicar')}</td></tr><tr><th>Curso</th><td>${esc(preview.academicYear||'—')}</td></tr><tr><th>Revisión</th><td>${esc(preview.revisionNumber??'—')}</td></tr>${technicalMode?`<tr><th>Esquema</th><td>${esc(preview.schemaVersion||'—')}</td></tr><tr><th>Integridad</th><td>${esc(preview.integrity||'—')}</td></tr>`:'<tr><th>Comprobación del archivo</th><td>Realizada</td></tr>'}<tr><th>Privacidad</th><td>${esc(preview.privacyClass||'—')}${preview.containsPersonalData?' · contiene datos del centro':''}</td></tr></tbody></table></div>${warningRows}<p class="muted">${esc(safety)}</p><div class="modal-actions"><button class="btn secondary" data-replacement-cancel>Cancelar</button><button class="btn" data-replacement-confirm>Abrir proyecto</button></div></div></div>`;
    const close=value=>{modalHost.innerHTML='';resolve(value);};
    modalHost.querySelector('[data-replacement-cancel]').onclick=()=>close(false);
    modalHost.querySelector('[data-replacement-confirm]').onclick=()=>close(true);
    modalHost.querySelector('.modal-backdrop').onclick=e=>{if(e.target===e.currentTarget)close(false);};
    setTimeout(()=>modalHost.querySelector('[data-replacement-cancel]')?.focus(),0);
  });
}

function showStagedRowModal(id){
  const row=stagedImport?.rows?.find(x=>x.id===id);if(!row)throw new Error('No se encontró la fila preparada.');
  const fields=Object.keys(row.raw||{});
  const body=`<form id="modalForm"><p class="muted">Edita los valores interpretados de la fila ${row.sourceRow}. Al guardar se repetirán todas las validaciones y coincidencias.</p><div class="field-row">${fields.map(key=>`<label>${esc(stagedFieldLabel(key))}<input name="${esc(key)}" value="${esc(row.raw[key]||'')}"></label>`).join('')}</div></form>`;
  showModal(`Revisar fila ${row.sourceRow}`,body,()=>{const f=document.querySelector('#modalForm');const fd=new FormData(f),patch={};for(const key of fields)patch[key]=fd.get(key);stagedImport=editStagedRow(project,stagedImport,id,patch);render();return true;},'Revalidar fila');
}

const SUBJECT_CATALOG=['Matemáticas','Lengua Castellana','Lingua Galega','Ciencias da Natureza','Ciencias Sociais','Inglés','Educación Física','Música','Religión / Atención educativa','Atención educativa','Tutoría','Lectura diaria','Proxecto competencial','Valores cívicos e éticos','Educación Plástica e Visual','Apoyo de convivencia'];
const SPECIALTY_CATALOG=['Educación Infantil','Educación Primaria','Inglés','Educación Física','Música','Pedagogía Terapéutica','Audición e Linguaxe','Religión','Orientación','Dirección','Jefatura de estudios','Secretaría','Apoyo'];
const GROUP_CATALOG=['3 años','4 años','5 años','1.º Primaria A','1.º Primaria B','2.º Primaria A','2.º Primaria B','3.º Primaria A','3.º Primaria B','4.º Primaria A','4.º Primaria B','5.º Primaria A','5.º Primaria B','6.º Primaria A','6.º Primaria B'];
function normalizedName(value=''){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ºª\.]/g,'').replace(/\s+/g,' ').trim().toLowerCase();}
function datalist(id,values=[]){const unique=[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));return `<datalist id="${esc(id)}">${unique.map(value=>`<option value="${esc(value)}"></option>`).join('')}</datalist>`;}
function similarCatalogNotice(label,value,values=[]){const raw=String(value||'').trim();if(!raw)return '';const n=normalizedName(raw);if(values.some(v=>normalizedName(v)===n))return '';const similar=values.filter(v=>normalizedName(v).includes(n)||n.includes(normalizedName(v))).slice(0,3);return `<p class="muted catalog-hint">${esc(label)} no está en el catálogo principal.${similar.length?` Posibles coincidencias: ${esc(similar.join(', '))}.`:''} Si es realmente nuevo, se guardará como propuesta revisable.</p>`;}
function checkEntityDuplicate(type,value,row){const map={teacher:'teachers',group:'groups',subject:'subjects',space:'spaces',activity:'activities'};const key=map[type],name=String(value?.name||'').trim();if(!key||!name)return;const duplicate=(project[key]||[]).find(item=>item.id!==row?.id&&normalizedName(item.name)===normalizedName(name));if(duplicate)throw new Error(`${entityLabel(type)} duplicado o equivalente: ya existe “${duplicate.name}”. Usa el registro existente o cambia el nombre.`);}
function showEntityModal(type,id=''){
  ensureDraft();const map={teacher:'teachers',group:'groups',subject:'subjects',space:'spaces',activity:'activities'};const key=map[type];if(!key)return;const row=id?project[key].find(x=>x.id===id):null;
  const body=type==='teacher'?teacherForm(row):type==='group'?groupForm(row):type==='subject'?subjectForm(row):type==='space'?spaceForm(row):activityForm(row);
  showModal(`${row?'Editar':'Añadir'} ${entityLabel(type)}`,`<form id="modalForm">${body}</form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f),value=type==='teacher'?readTeacher(fd,row):type==='group'?readGroup(fd,row):type==='subject'?readSubject(fd,row):type==='space'?readSpace(fd,row):readActivity(fd,row);checkEntityDuplicate(type,value,row);if(row)Object.assign(row,value);else project[key].push(value);appendAudit(project,row?'ENTITY_UPDATED':'ENTITY_CREATED',`${entityLabel(type)}: ${value.name}.`);changed();render();return true;});
}
function entityLabel(type){return({teacher:'docente',group:'grupo',subject:'materia',space:'espacio',activity:'actividad'})[type]||type;}
function siteOptions(selected='',blank='Sin sede'){const rows=normalizeEducationalDomain4(project.domain||{}).sites;return `<option value="">${esc(blank)}</option>${rows.map(row=>`<option value="${row.id}" ${selected===row.id?'selected':''}>${esc(row.name)}</option>`).join('')}`;}
function multiOptions(rows,selected=[]){return rows.map(row=>`<option value="${row.id}" ${(selected||[]).includes(row.id)?'selected':''}>${esc(row.name||row.label||row.id)}</option>`).join('');}
function teacherForm(r={}){const d=normalizeEducationalDomain4(project.domain||{});const specialtyValues=[...SPECIALTY_CATALOG,...project.teachers.map(t=>t.specialty).filter(Boolean)];return `<div class="field-row"><label>Nombre<input name="name" required value="${esc(r.name||'')}"></label><label>Función<input name="role" value="${esc(r.role||'')}"></label><label>Especialidad<input name="specialty" list="specialtyCatalog" value="${esc(r.specialty||'')}" placeholder="Buscar o proponer especialidad"></label>${datalist('specialtyCatalog',specialtyValues)}${similarCatalogNotice('La especialidad',r.specialty,specialtyValues)}</div><div class="field-row"><label>Carga objetivo<input type="number" min="0" name="weeklyTarget" value="${r.weeklyTarget||0}"></label><div class="field"><span>Cargos y reducciones</span><small>Se gestionan en Datos y organización → Organización para conservar tipo, sesiones y trazabilidad.</small></div></div><div class="field-row"><label>Cuota LD<input type="number" min="0" name="ldQuota" value="${r.ldQuota||0}"></label><label>Cuota DC<input type="number" min="0" name="dcQuota" value="${r.dcQuota||0}"></label><label>Justificación si difiere<input name="quotaJustification" value="${esc(r.quotaJustification||'')}"></label></div><div class="field-row"><label>Perfiles esenciales<input name="essentialProfiles" value="${esc((r.essentialProfiles||[]).join(', '))}" placeholder="APOYO, DIRECCION"></label><label class="checkline"><input type="checkbox" name="coverageEligible" ${r.coverageEligible!==false?'checked':''}> Elegible para coberturas</label><label>Estado<select name="dataState">${stateOptions(r.dataState||'PENDING')}</select></label></div><fieldset><legend>Sedes e itinerancia</legend><div class="field-row"><label>Sede habitual<select name="homeSiteId">${siteOptions(r.homeSiteId)}</select></label><label>Sedes permitidas<select name="allowedSiteIds" multiple size="5">${multiOptions(d.sites,r.allowedSiteIds)}</select></label><label>Ruta de itinerancia<select name="routeSiteIds" multiple size="5">${multiOptions(d.sites,r.itinerary?.routeSiteIds)}</select></label></div><label class="checkline"><input type="checkbox" name="itineraryEnabled" ${r.itinerary?.enabled?'checked':''}> Docente itinerante</label><div class="field-row"><label>Días de presencia<select name="itineraryDays" multiple size="5">${project.calendar.days.map(day=>`<option value="${day.id}" ${r.itinerary?.presenceDays?.includes(day.id)?'selected':''}>${esc(day.label)}</option>`).join('')}</select></label><label>Minutos heredados<input type="number" min="0" name="travelMinutes" value="${r.itinerary?.travelMinutes||0}"></label><label>Política de desplazamiento<select name="travelPolicy"><option value="SITE_MATRIX" ${r.itinerary?.travelPolicy!=='FIXED'?'selected':''}>Usar desplazamientos configurados entre sedes</option><option value="FIXED" ${r.itinerary?.travelPolicy==='FIXED'?'selected':''}>Usar tiempo fijo indicado</option></select></label><label>Estado<select name="itineraryState"><option value="CONFIRMED" ${r.itinerary?.state==='CONFIRMED'?'selected':''}>Confirmada</option><option value="PROVISIONAL" ${r.itinerary?.state!=='CONFIRMED'?'selected':''}>Provisional</option></select></label></div></fieldset>${dataEvidenceForm(r)}`;}
function groupForm(r={}){const groupValues=[...GROUP_CATALOG,...project.groups.map(g=>g.name).filter(Boolean)];const stageValues=['Educación Infantil','Educación Primaria','ESO','Bachillerato','Formación Profesional',...project.groups.map(g=>g.stage).filter(Boolean)];return `<div class="field-row"><label>Nombre<input name="name" list="groupCatalog" required value="${esc(r.name||'')}" placeholder="Buscar o proponer grupo"></label>${datalist('groupCatalog',groupValues)}<label>Etapa<input name="stage" list="stageCatalog" value="${esc(r.stage||'')}" placeholder="Seleccionar etapa"></label>${datalist('stageCatalog',stageValues)}<label>Número de alumnado<input type="number" min="0" name="size" value="${r.size||0}"></label><label>Sede habitual<select name="homeSiteId">${siteOptions(r.homeSiteId)}</select></label><label>Tutor/a<select name="tutorTeacherId"><option value="">Pendiente</option>${project.teachers.map(t=>`<option value="${t.id}" ${r.tutorTeacherId===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label><label>Estado<select name="dataState">${stateOptions(r.dataState||'PENDING')}</select></label></div>${similarCatalogNotice('El grupo',r.name,groupValues)}${dataEvidenceForm(r)}`;}
function spaceForm(r={}){const d=normalizeEducationalDomain4(project.domain||{});return `<div class="field-row"><label>Nombre<input name="name" required value="${esc(r.name||'')}"></label><label>Etiquetas<input name="tags" value="${esc((r.tags||[]).join(', '))}" placeholder="AULA, DEPORTIVO"></label><label>Uso simultáneo permitido<input type="number" min="1" name="capacity" value="${r.capacity||1}"><small>Número máximo de actividades que pueden usar este espacio a la vez.</small></label><label>Aforo de alumnado<input type="number" min="0" name="seatCapacity" value="${r.seatCapacity||0}"></label></div><div class="field-row"><label>Sede<select name="siteId">${siteOptions(r.siteId)}</select></label><label>Recursos instalados<select name="resourceIds" multiple size="5">${multiOptions(d.resources,r.resourceIds)}</select></label><label>Espacios equivalentes<select name="equivalentSpaceIds" multiple size="5">${multiOptions(project.spaces.filter(row=>row.id!==r.id),r.equivalentSpaceIds)}</select></label><label>Estado<select name="dataState">${stateOptions(r.dataState||'PENDING')}</select></label></div>${dataEvidenceForm(r)}`;}
function subjectForm(r={}){const subjectValues=[...SUBJECT_CATALOG,...project.subjects.map(subject=>subject.name).filter(Boolean)];const stageValues=['Educación Infantil','Educación Primaria','ESO','Bachillerato','Formación Profesional',...project.subjects.map(subject=>subject.stage).filter(Boolean)];return `<div class="field-row"><label>Materia<input name="name" list="subjectCatalog" required value="${esc(r.name||'')}" placeholder="Buscar o proponer materia"></label>${datalist('subjectCatalog',subjectValues)}<label>Etapa<input name="stage" list="subjectStageCatalog" value="${esc(r.stage||'')}" placeholder="Etapa o ámbito"></label>${datalist('subjectStageCatalog',stageValues)}<label>Estado<select name="dataState">${stateOptions(r.dataState||'PENDING')}</select></label></div><p class="muted">Usa una materia del catálogo si existe. Si propones otra, la aplicación comprobará duplicados exactos antes de guardarla.</p>${similarCatalogNotice('La materia',r.name,subjectValues)}${dataEvidenceForm(r)}`;}
function readSubject(fd,r){return{id:r?.id||uid('subject'),externalId:String(fd.get('externalId')||'').trim(),name:String(fd.get('name')).trim(),stage:String(fd.get('stage')||'').trim(),dataState:fd.get('dataState')||'PENDING',provenance:readDataEvidence(fd,r)};}
function activityForm(r={}){const d=normalizeEducationalDomain4(project.domain||{});return `<div class="field-row"><label>Nombre<input name="name" required value="${esc(r.name||'')}"></label><label>Tipo<select name="kind">${kindOptions(r.kind||'TEACHING')}</select></label><label>Materia<select name="subjectId"><option value="">Sin vincular</option>${project.subjects.map(subject=>`<option value="${subject.id}" ${r.subjectId===subject.id?'selected':''}>${esc(subject.name)}</option>`).join('')}</select></label><label>Sesiones por semana aplicable<input type="number" min="1" step="1" name="weeklySessions" value="${r.weeklySessions||1}" required></label><label>Duración en tramos<input type="number" min="1" step="1" name="durationSlots" value="${r.durationSlots||1}"></label></div><div class="field-row"><label>Grupos<select name="groupIds" multiple size="6">${multiOptions(project.groups,r.groupIds)}</select></label><label>Profesorado<select name="teacherIds" multiple size="6" required>${multiOptions(project.teachers,r.teacherIds)}</select></label><label>Etiquetas de espacio<input name="requiredSpaceTags" value="${esc((r.requiredSpaceTags||[]).join(', '))}"></label></div><div class="field-row"><label>Aplicación semanal<select name="weekPatternMode"><option value="ALL" ${r.weekPattern?.mode!=='INCLUDE'?'selected':''}>Todas las semanas activas</option><option value="INCLUDE" ${r.weekPattern?.mode==='INCLUDE'?'selected':''}>Solo semanas seleccionadas</option></select></label><label>Semanas<select name="weekIds" multiple size="5">${d.cycle.weeks.map(row=>`<option value="${row.id}" ${(r.weekPattern?.weekIds||[]).includes(row.id)?'selected':''}>${esc(row.label)}</option>`).join('')}</select></label><label>Sedes permitidas<select name="allowedSiteIds" multiple size="5">${multiOptions(d.sites,r.allowedSiteIds)}</select></label><label>Sedes preferentes<select name="preferredSiteIds" multiple size="5">${multiOptions(d.sites,r.preferredSiteIds)}</select></label></div><div class="field-row"><label>Espacios permitidos<select name="allowedSpaceIds" multiple size="6">${multiOptions(project.spaces,r.allowedSpaceIds)}</select></label><label>Espacios preferentes<select name="preferredSpaceIds" multiple size="6">${multiOptions(project.spaces,r.preferredSpaceIds)}</select></label><label>Espacios alternativos<select name="alternativeSpaceIds" multiple size="6">${multiOptions(project.spaces,r.alternativeSpaceIds)}</select></label></div><div class="field-row"><label>Recursos obligatorios<select name="requiredResourceIds" multiple size="5">${multiOptions(d.resources,r.requiredResourceIds)}</select></label><label>Recursos preferentes<select name="preferredResourceIds" multiple size="5">${multiOptions(d.resources,r.preferredResourceIds)}</select></label><label>Desdoble<select name="splitSetId"><option value="">Sin desdoble</option>${d.splitSets.map(row=>`<option value="${row.id}" ${r.splitSetId===row.id?'selected':''}>${esc(row.name)}</option>`).join('')}</select></label><label>Clave de concurrencia<input name="concurrencyKey" value="${esc(r.concurrencyKey||'')}"></label></div><div class="field-row"><label>Días permitidos<select name="allowedDays" multiple size="5">${project.calendar.days.map(day=>`<option value="${day.id}" ${(r.allowedDays||[]).includes(day.id)?'selected':''}>${esc(day.label)}</option>`).join('')}</select></label><label>Tramos permitidos<select name="allowedSlots" multiple size="7">${project.calendar.slots.map(slot=>`<option value="${slot.id}" ${(r.allowedSlots||[]).includes(slot.id)?'selected':''}>${esc(slot.label)}</option>`).join('')}</select></label><label>Días preferentes<select name="preferredDays" multiple size="5">${project.calendar.days.map(day=>`<option value="${day.id}" ${(r.preferredDays||[]).includes(day.id)?'selected':''}>${esc(day.label)}</option>`).join('')}</select></label><label>Tramos preferentes<select name="preferredSlots" multiple size="7">${project.calendar.slots.map(slot=>`<option value="${slot.id}" ${(r.preferredSlots||[]).includes(slot.id)?'selected':''}>${esc(slot.label)}</option>`).join('')}</select></label></div><div class="field-row"><label>Prioridad<input type="number" min="0" max="100" name="priority" value="${r.priority??50}"></label><label>Máximo diario<input type="number" min="1" name="maxPerDay" value="${r.maxPerDay||1}"></label><label class="checkline"><input type="checkbox" name="mandatory" ${r.mandatory!==false?'checked':''}> Obligatoria</label><label>Estado<select name="dataState">${stateOptions(r.dataState||'PENDING')}</select></label></div>${dataEvidenceForm(r)}`;}
function readTeacher(fd,r){return{id:r?.id||uid('teacher'),externalId:String(fd.get('externalId')||'').trim(),name:String(fd.get('name')).trim(),role:String(fd.get('role')||'').trim(),specialty:String(fd.get('specialty')||'').trim(),weeklyTarget:Number(fd.get('weeklyTarget')||0),unavailable:r?.unavailable||[],presence:r?.presence||[],presencePlan:r?.presencePlan||[],coverageEligible:Boolean(fd.get('coverageEligible')),essentialProfiles:normalizeStringList(fd.get('essentialProfiles')).map(x=>x.toUpperCase()),leadershipReduction:Number(fd.get('leadershipReduction')||0),otherReduction:Number(fd.get('otherReduction')||0),ldQuota:Number(fd.get('ldQuota')||0),dcQuota:Number(fd.get('dcQuota')||0),quotaJustification:String(fd.get('quotaJustification')||''),homeSiteId:String(fd.get('homeSiteId')||''),allowedSiteIds:fd.getAll('allowedSiteIds').map(String),itinerary:{enabled:Boolean(fd.get('itineraryEnabled')),presenceDays:fd.getAll('itineraryDays').map(String),travelMinutes:Number(fd.get('travelMinutes')||0),routeSiteIds:fd.getAll('routeSiteIds').map(String),travelPolicy:String(fd.get('travelPolicy')||'SITE_MATRIX'),state:fd.get('itineraryState')},positions:r?.positions||[],reductions:r?.reductions||[],dataState:fd.get('dataState'),provenance:readDataEvidence(fd,r)};}
function readGroup(fd,r){return{id:r?.id||uid('group'),externalId:String(fd.get('externalId')||'').trim(),name:String(fd.get('name')).trim(),stage:String(fd.get('stage')||'').trim(),size:Number(fd.get('size')||0),homeSiteId:String(fd.get('homeSiteId')||''),tutorTeacherId:fd.get('tutorTeacherId'),dataState:fd.get('dataState'),provenance:readDataEvidence(fd,r)};}
function readSpace(fd,r){return{id:r?.id||uid('space'),externalId:String(fd.get('externalId')||'').trim(),name:String(fd.get('name')).trim(),tags:normalizeStringList(fd.get('tags')).map(x=>x.toUpperCase()),capacity:Number(fd.get('capacity')||1),seatCapacity:Number(fd.get('seatCapacity')||0),siteId:String(fd.get('siteId')||''),resourceIds:fd.getAll('resourceIds').map(String),equivalentSpaceIds:fd.getAll('equivalentSpaceIds').map(String),dataState:fd.get('dataState'),provenance:readDataEvidence(fd,r)};}
function readActivity(fd,r){const groupIds=fd.getAll('groupIds').map(String);return{id:r?.id||uid('activity'),externalId:String(fd.get('externalId')||'').trim(),name:String(fd.get('name')).trim(),kind:fd.get('kind'),subjectId:fd.get('subjectId'),groupId:groupIds[0]||'',groupIds,teacherIds:fd.getAll('teacherIds').map(String),weeklySessions:Number(fd.get('weeklySessions')),durationSlots:Number(fd.get('durationSlots')||1),weekPattern:{mode:String(fd.get('weekPatternMode')||'ALL'),weekIds:fd.getAll('weekIds').map(String)},requiredSpaceTags:normalizeStringList(fd.get('requiredSpaceTags')).map(x=>x.toUpperCase()),allowedSiteIds:fd.getAll('allowedSiteIds').map(String),preferredSiteIds:fd.getAll('preferredSiteIds').map(String),allowedSpaceIds:fd.getAll('allowedSpaceIds').map(String),preferredSpaceIds:fd.getAll('preferredSpaceIds').map(String),alternativeSpaceIds:fd.getAll('alternativeSpaceIds').map(String),requiredResourceIds:fd.getAll('requiredResourceIds').map(String),preferredResourceIds:fd.getAll('preferredResourceIds').map(String),splitSetId:String(fd.get('splitSetId')||''),relationIds:r?.relationIds||[],concurrencyKey:String(fd.get('concurrencyKey')||''),allowedDays:fd.getAll('allowedDays').map(String),allowedSlots:fd.getAll('allowedSlots').map(String),preferredDays:fd.getAll('preferredDays').map(String),preferredSlots:fd.getAll('preferredSlots').map(String),fixedOccurrences:r?.fixedOccurrences||[],priority:Number(fd.get('priority')||50),mandatory:Boolean(fd.get('mandatory')),maxPerDay:Number(fd.get('maxPerDay')||1),consecutive:r?.consecutive||'NONE',source:r?.source||'USER',dataState:fd.get('dataState'),provenance:readDataEvidence(fd,r)};}

function deleteEntity(type,id){ensureDraft();const map={teacher:'teachers',group:'groups',subject:'subjects',space:'spaces',activity:'activities'},key=map[type],row=project[key]?.find(x=>x.id===id);const deps=entityDependencies(type,id);if(deps.length)throw new Error(`No se puede eliminar: ${deps.join(' ')}`);if(!confirm(`¿Eliminar ${row?.name||'este registro'}?`))return;project[key]=project[key].filter(x=>x.id!==id);appendAudit(project,'ENTITY_DELETED',`${entityLabel(type)}: ${row?.name||id}.`);changed();render();}
function entityDependencies(type,id){const out=[];if(type==='teacher'){const acts=project.activities.filter(a=>a.teacherIds.includes(id)).length,groups=project.groups.filter(g=>g.tutorTeacherId===id).length;if(acts)out.push(`Participa en ${acts} actividad(es).`);if(groups)out.push(`Es tutor/a de ${groups} grupo(s).`);}if(type==='group'){const acts=project.activities.filter(a=>a.groupIds.includes(id)).length;if(acts)out.push(`Tiene ${acts} actividad(es).`);}if(type==='subject'){const acts=project.activities.filter(a=>a.subjectId===id).length;if(acts)out.push(`Se usa en ${acts} actividad(es).`);}if(type==='space'){const asg=project.assignments.filter(a=>a.spaceId===id).length;if(asg)out.push(`Se usa en ${asg} sesión(es).`);}if(type==='activity'){const asg=project.assignments.filter(a=>a.activityId===id).length;if(asg)out.push(`Tiene ${asg} sesión(es).`);}return out;}
function showSlotModal(id){ensureDraft();const r=id?project.calendar.slots.find(x=>x.id===id):null;showModal(`${r?'Editar':'Añadir'} tramo`,`<form id="modalForm"><div class="field-row"><label>Nombre<input name="label" required value="${esc(r?.label||'')}"></label><label>Tipo<select name="kind"><option value="CLASS" ${r?.kind==='CLASS'?'selected':''}>Clase</option><option value="BREAK" ${r?.kind==='BREAK'?'selected':''}>Recreo/no lectivo</option><option value="OTHER" ${r?.kind==='OTHER'?'selected':''}>Otro</option></select></label><label>Inicio<input type="time" name="start" value="${esc(r?.start||'')}"></label><label>Fin<input type="time" name="end" value="${esc(r?.end||'')}"></label></div></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f),value={id:r?.id||uid('slot'),label:fd.get('label'),kind:fd.get('kind'),start:fd.get('start'),end:fd.get('end')};if(r)Object.assign(r,value);else project.calendar.slots.push(value);appendAudit(project,r?'SLOT_UPDATED':'SLOT_CREATED',value.label);changed();render();return true;});}
function positionTypeLabel(type){return({LEADERSHIP:'Dirección o jefatura',COORDINATION:'Coordinación',TUTORSHIP:'Tutoría',OTHER:'Otro cargo'})[type]||type;}
function reductionTypeLabel(type){return({LEADERSHIP:'Por cargo directivo',COORDINATION:'Por coordinación',AGE:'Por edad',PART_TIME:'Jornada parcial',OTHER:'Otra reducción'})[type]||type;}

function showTeacherDefinitionModal(kind,teacherId=''){
  ensureDraft();
  if(!project.teachers.length)throw new Error('Añade al menos un docente antes de configurar cargos o reducciones.');
  const isPosition=kind==='position',types=isPosition?POSITION_TYPES:REDUCTION_TYPES;
  const title=isPosition?'Añadir cargo o coordinación':'Añadir reducción horaria';
  showModal(title,`<form id="modalForm"><div class="field-row"><label>Docente<select name="teacherId" required><option value="">Selecciona</option>${project.teachers.map(t=>`<option value="${t.id}" ${t.id===teacherId?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label><label>Denominación<input name="label" required placeholder="${isPosition?'Ej.: Jefatura de estudios':'Ej.: Reducción por edad'}"></label><label>Tipo<select name="type">${types.map(x=>`<option value="${x}">${esc(isPosition?positionTypeLabel(x):reductionTypeLabel(x))}</option>`).join('')}</select></label><label>Sesiones semanales<input type="number" min="1" step="1" name="weeklySessions" value="1" required></label></div><div class="field-row"><label>Días permitidos, opcional<select name="allowedDays" multiple size="5">${project.calendar.days.map(d=>`<option value="${d.id}">${esc(d.label)}</option>`).join('')}</select></label><label>Tramos permitidos, opcional<select name="allowedSlots" multiple size="7">${project.calendar.slots.filter(x=>x.kind==='CLASS').map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('')}</select></label><label>Estado<select name="dataState">${stateOptions('PENDING')}</select></label></div><label>Referencia o acuerdo<input name="sourceRef" placeholder="Documento, resolución o acuerdo del centro"></label></form>`,()=>{
    const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f),t=project.teachers.find(x=>x.id===fd.get('teacherId'));if(!t)throw new Error('Docente no encontrado.');
    const row={id:uid(isPosition?'position':'reduction'),label:String(fd.get('label')).trim(),type:fd.get('type'),weeklySessions:Number(fd.get('weeklySessions')),allowedDays:fd.getAll('allowedDays').map(String),allowedSlots:fd.getAll('allowedSlots').map(String),active:true,dataState:fd.get('dataState'),provenance:manualDataProvenance({origin:'USER',sourceRef:String(fd.get('sourceRef')||'').trim()},project.meta.responsible||'')};
    if(isPosition)t.positions.push(row);else t.reductions.push(row);syncOrganizationalActivities(project);appendAudit(project,isPosition?'POSITION_CREATED':'REDUCTION_CREATED',`${t.name}: ${row.label} · ${row.weeklySessions} sesión(es).`);changed();render();return true;
  });
}

function showOrganizationServiceModal(){
  ensureDraft();
  if(!project.teachers.length)throw new Error('Añade al menos un docente antes de configurar servicios.');
  const sites=normalizeEducationalDomain4(project.domain||{}).sites||[];
  showModal('Añadir servicio organizativo',`<form id="modalForm"><div class="field-row"><label>Nombre<input name="name" required placeholder="Ej.: Guardia de entrada"></label><label>Categoría<select name="serviceType">${SERVICE_TYPES.map(type=>`<option value="${type}">${esc(serviceTypeLabel(type))}</option>`).join('')}</select></label><label>Tipo funcional<select name="kind">${ORGANIZATIONAL_SERVICE_KINDS.map(k=>`<option value="${k}">${esc(activityKindLabel(k))}</option>`).join('')}</select></label></div><div class="field-row"><label>Sesiones semanales<input type="number" min="1" step="1" name="weeklySessions" value="1" required></label><label>Duración en tramos<input type="number" min="1" step="1" name="durationSlots" value="1" required></label><label>Máximo diario<input type="number" min="1" step="1" name="maxPerDay" value="1" required></label><label>Peso de equilibrio<input type="number" min="0" step="0.05" name="balanceWeight" value="1"></label></div><div class="field-row"><label>Profesorado asignado<select name="teacherIds" multiple size="8" required>${project.teachers.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label><label>Grupos, opcional<select name="groupIds" multiple size="8">${project.groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label><label>Zona de recreo<select name="zoneId"><option value="">No aplica</option>${project.organization.breakZones.map(z=>`<option value="${z.id}">${esc(z.name)}</option>`).join('')}</select></label><label>Sede<select name="siteId"><option value="">Sin sede concreta</option>${sites.map(site=>`<option value="${site.id}">${esc(site.name)}</option>`).join('')}</select></label></div><div class="field-row"><label>Días compatibles<select name="allowedDays" multiple size="5">${project.calendar.days.map(d=>`<option value="${d.id}">${esc(d.label)}</option>`).join('')}</select></label><label>Tramos compatibles<select name="allowedSlots" multiple size="8">${project.calendar.slots.map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('')}</select></label><label>Tipos de tramo<select name="compatibleSlotKinds" multiple size="3"><option value="CLASS">Clase</option><option value="BREAK">Recreo</option><option value="OTHER">Entrada, salida u otro</option></select></label><label>Presencia necesaria<select name="presenceRequirement">${PRESENCE_REQUIREMENTS.map(value=>`<option value="${value}">${esc(presenceRequirementLabel(value))}</option>`).join('')}</select></label></div><div class="field-row"><label>Etiquetas de espacio<input name="requiredSpaceTags" placeholder="AULA, BIBLIOTECA"></label><label>Prioridad<input type="number" min="0" max="100" step="1" name="priority" value="60"></label><label class="checkline"><input type="checkbox" name="mandatory" checked> Servicio obligatorio</label><label>Estado<select name="dataState">${stateOptions('PENDING')}</select></label></div><label>Referencia o acuerdo<input name="sourceRef" placeholder="Documento, acta o acuerdo"></label><p class="muted">El profesorado seleccionado queda asignado al servicio. La aplicación no interpreta esa lista como una bolsa de candidatos.</p></form>`,()=>{
    const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f),serviceType=fd.get('serviceType'),zoneId=fd.get('zoneId')||'';let kind=fd.get('kind');if(serviceType==='BREAK')kind='BREAK_DUTY';else if(['ENTRY','ORDINARY_GUARD','EXIT'].includes(serviceType))kind='GUARD';if(kind==='BREAK_DUTY'&&!zoneId)throw new Error('La vigilancia de recreo necesita una zona.');
    const row={id:uid('org_service'),name:String(fd.get('name')).trim(),serviceType,kind,teacherIds:fd.getAll('teacherIds').map(String),groupIds:fd.getAll('groupIds').map(String),weeklySessions:Number(fd.get('weeklySessions')),durationSlots:Number(fd.get('durationSlots')||1),allowedDays:fd.getAll('allowedDays').map(String),allowedSlots:fd.getAll('allowedSlots').map(String),compatibleSlotKinds:fd.getAll('compatibleSlotKinds').map(String),presenceRequirement:fd.get('presenceRequirement'),balanceWeight:Number(fd.get('balanceWeight')||0),siteId:String(fd.get('siteId')||''),requiredSpaceTags:normalizeStringList(fd.get('requiredSpaceTags')).map(x=>x.toUpperCase()),zoneId,priority:Number(fd.get('priority')||50),mandatory:Boolean(fd.get('mandatory')),maxPerDay:Number(fd.get('maxPerDay')||1),active:true,dataState:fd.get('dataState'),provenance:manualDataProvenance({origin:'USER',sourceRef:String(fd.get('sourceRef')||'').trim()},project.meta.responsible||'')};
    project.organization.services.push(row);syncOrganizationalActivities(project);appendAudit(project,'ORGANIZATION_SERVICE_CREATED',`${row.name} · ${serviceTypeLabel(row.serviceType)}.`);changed();render();return true;
  });
}
function showAnchoredSegmentModal(){
  ensureDraft();if(project.activities.length<2)throw new Error('Se necesitan al menos dos actividades para crear un segmento vinculado.');
  showModal('Añadir segmento vinculado',`<form id="modalForm"><label>Nombre<input name="name" required placeholder="Ej.: Lectura diaria"></label><div class="field-row"><label>Actividad breve<select name="segmentActivityId" required><option value="">Selecciona</option>${project.activities.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label><label>Posición<select name="position"><option value="BEFORE">Inmediatamente antes</option><option value="AFTER">Inmediatamente después</option></select></label><label>Sesión de referencia<select name="anchorActivityId" required><option value="">Selecciona</option>${project.activities.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label><label>Estado<select name="dataState">${stateOptions('PENDING')}</select></label></div><label>Referencia o acuerdo<input name="sourceRef" placeholder="Plan lector, acuerdo organizativo..."></label></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f);if(fd.get('segmentActivityId')===fd.get('anchorActivityId'))throw new Error('La actividad breve y la sesión de referencia deben ser distintas.');const row={id:uid('anchored_segment'),name:String(fd.get('name')).trim(),segmentActivityId:String(fd.get('segmentActivityId')),anchorActivityId:String(fd.get('anchorActivityId')),position:String(fd.get('position')),active:true,dataState:String(fd.get('dataState')),provenance:manualDataProvenance({origin:'USER',sourceRef:String(fd.get('sourceRef')||'').trim()},project.meta.responsible||'')};project.organization.anchoredSegments.push(row);syncOrganizationalActivities(project);appendAudit(project,'ANCHORED_SEGMENT_CREATED',row.name);changed();render();return true;});
}
function showPresenceRuleModal(){ensureDraft();showModal('Añadir regla de presencia mínima',`<form id="modalForm"><div class="field-row"><label>Mínimo<input type="number" min="0" step="1" name="minimum" required value="1"></label><label>Perfil esencial opcional<input name="profileTag" placeholder="APOYO"></label></div><div class="field-row"><label>Días<select name="dayIds" multiple size="5" required>${project.calendar.days.map(d=>`<option value="${d.id}" selected>${esc(d.label)}</option>`).join('')}</select></label><label>Tramos<select name="slotIds" multiple size="7" required>${project.calendar.slots.filter(s=>s.kind==='CLASS').map(s=>`<option value="${s.id}" selected>${esc(s.label)}</option>`).join('')}</select></label></div></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f);const value={id:uid('presence'),minimum:Number(fd.get('minimum')),profileTag:String(fd.get('profileTag')||'').trim().toUpperCase(),dayIds:fd.getAll('dayIds').map(String),slotIds:fd.getAll('slotIds').map(String),dataState:'PENDING'};project.organization.minimumPresence.push(value);appendAudit(project,'PRESENCE_RULE_CREATED',`Mínimo ${value.minimum}${value.profileTag?` · ${value.profileTag}`:''}.`);changed();render();return true;});}
function showBreakZoneModal(){ensureDraft();showModal('Añadir zona de recreo',`<form id="modalForm"><div class="field-row"><label>Nombre<input name="name" required></label><label>Puestos mínimos<input type="number" min="1" step="1" name="minimumStaff" value="1" required></label><label>Estado<select name="dataState">${stateOptions('PENDING')}</select></label></div><div class="field-row"><label>Tramos de recreo<select name="slotIds" multiple size="5" required>${project.calendar.slots.filter(s=>s.kind==='BREAK').map(s=>`<option value="${s.id}">${esc(s.label)}</option>`).join('')}</select></label><label>Perfiles habilitados, opcional<input name="essentialProfileTags" placeholder="RECREO, DIRECCION"></label><label>Docentes excluidos, opcional<select name="excludedTeacherIds" multiple size="7">${project.teachers.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label></div></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f);const value={id:uid('break_zone'),name:String(fd.get('name')).trim(),minimumStaff:Number(fd.get('minimumStaff')),slotIds:fd.getAll('slotIds').map(String),essentialProfileTags:normalizeStringList(fd.get('essentialProfileTags')).map(x=>x.toUpperCase()),excludedTeacherIds:fd.getAll('excludedTeacherIds').map(String),dataState:fd.get('dataState')};project.organization.breakZones.push(value);appendAudit(project,'BREAK_ZONE_CREATED',`${value.name} · ${value.minimumStaff} puesto(s).`);syncOrganizationalActivities(project);changed();render();return true;});}

function showProductTemporarySubstitutionModal(){showModal('Registrar sustitución temporal',`<form id="modalForm"><div class="field-row"><label>Persona sustituida<select name="absentTeacherId" required><option value="">Selecciona</option>${project.teachers.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label><label>Persona sustituta<select name="substituteTeacherId" required><option value="">Selecciona</option>${project.teachers.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label><label>Estado<select name="status"><option value="ACTIVE">Activa</option><option value="PLANNED">Planificada</option></select></label></div><div class="field-row"><label>Desde<input type="date" name="startDate" value="${today()}" required></label><label>Hasta, opcional<input type="date" name="endDate"></label></div><label>Actividades concretas, opcional<select name="scopeActivityIds" multiple size="7">${project.activities.filter(a=>['TEACHING','SUPPORT','GUARD','BREAK_DUTY','MEETING','OTHER'].includes(a.kind)).map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label><label>Nota operativa<textarea name="operationalNote" placeholder="Información necesaria para organizar el servicio"></textarea></label><label>Nota privada opcional<textarea name="privateNote" placeholder="No aparecerá en documentos ordinarios"></textarea></label></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f);ensureDraft();project=createProductTemporarySubstitution(project,{absentTeacherId:fd.get('absentTeacherId'),substituteTeacherId:fd.get('substituteTeacherId'),startDate:fd.get('startDate'),endDate:fd.get('endDate'),scopeActivityIds:fd.getAll('scopeActivityIds').map(String),operationalNote:String(fd.get('operationalNote')||''),privateNote:String(fd.get('privateNote')||''),status:fd.get('status')});changed('Sustitución temporal registrada.');render();return true;});}
function showTemporarySubstitutionModal(){return showProductTemporarySubstitutionModal();}

function showOrganizationRuleModal(){ensureDraft();showModal('Añadir regla organizativa',`<form id="modalForm"><div class="field-row"><label>Nivel<select name="level"><option value="HARD">Obligatoria</option><option value="SOFT">Preferencia</option></select></label><label>Tipo<select name="type"><option value="FORBID_DAY">Excluir un día</option><option value="FORBID_SLOT">Excluir un tramo</option><option value="REQUIRE_DAY">Exigir un día</option><option value="REQUIRE_SLOT">Exigir un tramo</option><option value="REQUIRE_SPACE_TAG">Exigir etiqueta de espacio</option><option value="PREFER_DAY">Preferir un día</option><option value="PREFER_SLOT">Preferir un tramo</option><option value="AVOID_LAST_SLOT">Evitar última sesión</option><option value="AVOID_FIRST_SLOT">Evitar primera sesión</option><option value="AVOID_EDGE_SLOTS">Evitar primera y última sesión</option></select></label><label>Descripción<input name="label" required placeholder="Ej.: Inglés no se imparte el lunes"></label></div><fieldset><legend>Ámbito: completar como máximo uno</legend><div class="field-row"><label>Actividad<select name="activityId"><option value="">Todas</option>${project.activities.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label><label>Docente<select name="teacherId"><option value="">Todos</option>${project.teachers.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label><label>Grupo<select name="groupId"><option value="">Todos</option>${project.groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label><label>Tipo de actividad<select name="kind"><option value="">Todos</option><option value="TEACHING">Docencia</option><option value="SUPPORT">Apoyo o codocencia</option><option value="LD">LD</option><option value="DC">DC</option><option value="GUARD">Guardia</option><option value="BREAK_DUTY">Vigilancia de recreo</option><option value="MEETING">Reunión</option><option value="OTHER">Otra</option></select></label></div></fieldset><div class="field-row"><label>Día<select name="dayId"><option value="">No aplica</option>${project.calendar.days.map(d=>`<option value="${d.id}">${esc(d.label)}</option>`).join('')}</select></label><label>Tramo<select name="slotId"><option value="">No aplica</option>${project.calendar.slots.map(sl=>`<option value="${sl.id}">${esc(sl.label)}</option>`).join('')}</select></label><label>Etiqueta de espacio<input name="value" placeholder="AULA, DEPORTIVO…"></label><label>Peso de preferencia<input type="number" min="0" step="1" name="weight" value="10"></label></div><label>Estado<select name="dataState">${stateOptions('PENDING')}</select></label><p class="muted">El tipo elegido determina si se usa el día, el tramo o la etiqueta. Las reglas obligatorias no usan peso.</p></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f),level=fd.get('level'),type=fd.get('type');const selectedScopes=['activityId','teacherId','groupId','kind'].filter(k=>fd.get(k));if(selectedScopes.length>1)throw new Error('Selecciona un único ámbito: actividad, docente, grupo o tipo.');if(['FORBID_DAY','REQUIRE_DAY','PREFER_DAY'].includes(type)&&!fd.get('dayId'))throw new Error('Selecciona el día de la regla.');if(['FORBID_SLOT','REQUIRE_SLOT','PREFER_SLOT'].includes(type)&&!fd.get('slotId'))throw new Error('Selecciona el tramo de la regla.');if(type==='REQUIRE_SPACE_TAG'&&!String(fd.get('value')||'').trim())throw new Error('Indica la etiqueta de espacio requerida.');if(level==='HARD'&&['PREFER_DAY','PREFER_SLOT','AVOID_LAST_SLOT','AVOID_FIRST_SLOT','AVOID_EDGE_SLOTS'].includes(type))throw new Error('Ese tipo debe registrarse como preferencia.');if(level==='SOFT'&&!['PREFER_DAY','PREFER_SLOT','AVOID_LAST_SLOT','AVOID_FIRST_SLOT','AVOID_EDGE_SLOTS'].includes(type))throw new Error('Ese tipo debe registrarse como regla obligatoria.');const value={id:uid('org_rule'),label:String(fd.get('label')).trim(),level,type,activityId:fd.get('activityId')||'',teacherId:fd.get('teacherId')||'',groupId:fd.get('groupId')||'',kind:fd.get('kind')||'',dayId:fd.get('dayId')||'',slotId:fd.get('slotId')||'',value:String(fd.get('value')||'').trim().toUpperCase(),weight:level==='SOFT'?Number(fd.get('weight')||0):0,active:true,dataState:fd.get('dataState')};(level==='HARD'?project.organization.rules:project.organization.preferences).push(value);appendAudit(project,'ORGANIZATION_RULE_CREATED',value.label);changed();render();return true;});}

function showLockModal(){ensureDraft();showModal('Bloquear una sesión',`<form id="modalForm"><label>Sesión<select name="assignmentId" required><option value="">Selecciona</option>${project.assignments.filter(a=>!project.locks.some(l=>l.active!==false&&l.assignmentId===a.id)).map(a=>`<option value="${a.id}">${esc(nameOf(project.activities,a.activityId))} · ${esc(dayLabel(a.dayId))} · ${esc(slotLabel(a.slotId))}</option>`).join('')}</select></label><label>Motivo<input name="reason" required></label><label>Responsable<input name="createdBy" required value="${esc(project.meta.responsible||'')}"></label></form>`,()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f);project.locks.push({id:uid('lock'),assignmentId:fd.get('assignmentId'),reason:String(fd.get('reason')).trim(),createdBy:String(fd.get('createdBy')).trim(),createdAt:nowIso(),active:true});appendAudit(project,'ASSIGNMENT_LOCKED',fd.get('reason'));changed();render();return true;});}

function acceptPending(id){ensureDraft();if(!confirm('¿Aceptar la propuesta? Se conservará una versión anterior recuperable.'))return;project=assertNoNewIndependentScheduleBlockers(project,acceptProposal(project,id),'IMPORTED_PROPOSAL');changed('Propuesta aceptada.');render();}
function rejectPending(id){const reason=prompt('Motivo opcional para descartar:','')??null;if(reason===null)return;project=rejectProposal(project,id,reason);changed('Propuesta descartada sin modificar el horario.');render();}
function promptScenario(){const name=prompt('Nombre de la alternativa:',`Alternativa ${project.scenarios.length+1}`);if(!name)return;project=saveScenario(project,name.trim());changed('Alternativa guardada.');render();}
function showScenarioCompare(){
  const opts=project.scenarios.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
  showModal('Comparar alternativas',`<form id="modalForm"><div class="field-row"><label>Primera<select name="a">${opts}</select></label><label>Segunda<select name="b">${opts}</select></label></div><div id="scenarioResult" class="scenario-comparison-result"><p class="muted">Selecciona dos alternativas y pulsa Comparar.</p></div></form>`,()=>{
    const fd=new FormData(document.querySelector('#modalForm')),r=compareAlternativesForUser(project,fd.get('a'),fd.get('b'));
    const tradeoffs=r.tradeoffs.length?`<div class="table-wrap"><table><thead><tr><th>Indicador</th><th>${esc(r.a.name)}</th><th>${esc(r.b.name)}</th><th>Mejor dato</th></tr></thead><tbody>${r.tradeoffs.map(x=>`<tr><td>${esc(x.label)}</td><td>${esc(qualityPrimaryText(x.a))}</td><td>${esc(qualityPrimaryText(x.b))}</td><td>${x.better==='A'?esc(r.a.name):esc(r.b.name)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Los indicadores descriptivos coinciden.</div>';
    document.querySelector('#scenarioResult').innerHTML=`<div class="notice ${r.contextChanged?'warning':'info'}"><b>${esc(r.summary)}</b></div><div class="grid cards">${metric(r.unchanged,'Sin cambios')}${metric(r.moved,'Movidas')}${metric(r.added,'Añadidas')}${metric(r.removed,'Retiradas')}</div>${tradeoffs}<p class="muted">La comparación no sustituye la decisión organizativa. Integridad: ${esc(r.integrityA)} / ${esc(r.integrityB)}.</p>`;return false;
  },'Comparar');
}
function finalizeProject(){
  const review=reviewOfficialClosure(project);if(!review.canClose)throw new Error(review.blockers[0]?.detail||'La revisión todavía tiene bloqueos para cierre.');
  showModal('Cerrar como horario oficial',`<form id="modalForm"><div class="notice warning">El cierre protege esta revisión. Cualquier cambio posterior abrirá un nuevo borrador recuperable.</div><label>Responsable<input name="responsible" required value="${esc(project.meta.responsible||'')}"></label><label>Nota de cierre<textarea name="note" placeholder="Acuerdo, fecha de aprobación o alcance de la versión"></textarea></label><div class="grid cards">${metric(review.metrics.placed,'Sesiones')}${metric(review.metrics.pending,'Pendientes')}${metric(review.metrics.gaps,'Huecos docentes')}${metric(review.metrics.completionPct+' %','Cobertura')}</div></form>`,()=>{const form=document.querySelector('#modalForm');if(!form.reportValidity())return false;const fd=new FormData(form);project=finalizeOfficialVersion(project,{responsible:fd.get('responsible'),note:fd.get('note')});changed('Horario cerrado como versión oficial.');render();return true;},'Cerrar como oficial');
}
function showNextCourse(){showModal('Crear proyecto del siguiente curso',`<form id="modalForm"><div class="field-row"><label>Curso académico<input name="academicYear" required value="2027/2028"></label><label>Nombre<input name="name" value="${esc(project.meta.name)} · nuevo curso"></label></div></form>`,async()=>{const f=document.querySelector('#modalForm');if(!f.reportValidity())return false;const fd=new FormData(f),next=createNextCourse(project,{academicYear:fd.get('academicYear'),name:fd.get('name')});await exportProject();return replaceProject(next,'Crear el proyecto del siguiente curso');});}
function downloadImportTemplate(){const type=document.querySelector('[data-form="stage-import"] select[name="entityType"]')?.value||'teachers';downloadText(importTemplate(type),`plantilla_${type}.csv`,'text/csv;charset=utf-8');}
async function exportProject(){const bytes=await buildProjectContainer(project,{preservedEntries:projectFileContext.preservedEntries});downloadBytes(bytes,makeDownloadName(project,'proyecto','ghfproject'),'application/vnd.ghfproject+zip');notice('Contenedor .ghfproject verificado descargado.','success');}
function downloadBytes(bytes,name,type){const blob=new Blob([bytes],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadText(text,name,type){const blob=new Blob(['\uFEFF',text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function showBackups(){const rows=await listBackups(),h=document.querySelector('#backupsHost');if(!h)return;h.innerHTML=rows.length?rows.map(r=>`<div class="status-row"><span><b>${r.slot==='current'?'Actual':r.slot}</b><br><small>${esc(r.label)} · ${fmtDate(r.createdAt)}</small></span><button class="btn small secondary" data-action="restore-backup" data-id="${r.slot}">Restaurar</button></div>`).join(''):'<div class="empty">No hay copias locales.</div>';}
function dayLabel(id){return productDayPublicLabel(project,id)}function slotLabel(id){return productSlotPublicLabel(project,id)}
function ensureDraft(){if(project.meta.status==='FINAL'){createRevision(project,'Apertura de borrador desde horario definitivo');project.meta.status='DRAFT';appendAudit(project,'FINAL_REOPENED','Se abrió una nueva revisión borrador.');}}
function changed(message='Cambios pendientes de guardar.'){documentSession=null;dirty=true;project.meta.updatedAt=nowIso();project.meta.structuralFingerprint=structuralFingerprint(project);saveState.textContent='Cambios pendientes';saveState.classList.add('dirty');clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>saveNow(false),500);if(message)notice(message,'success');}
async function saveNow(showMessage=false){
  if(!project)return;
  saveState.textContent='Guardando…';saveState.setAttribute('aria-busy','true');
  try{
    const metric=(project.assignments?.length||0)>=500?'saveProject502':'saveProject';
    project=await measureAsync(metric,()=>saveActive(project),projectScale(project));
    dirty=false;saveState.textContent='Guardado local';saveState.classList.remove('dirty');storageStatus=await getStorageStatus();
    if(showMessage)notice('Proyecto guardado y verificado en este dispositivo.','success');
  }catch(err){
    saveState.textContent='Error al guardar';saveState.classList.add('dirty');await recordLocalError(err,'save');notice(`No se pudo guardar: ${err.message}`,'error');throw err;
  }finally{saveState.setAttribute('aria-busy','false');}
}
function notice(message,type='info'){
  const role=type==='error'?'alert':'status';noticeHost.innerHTML=`<div class="notice ${type}" role="${role}" tabindex="-1">${esc(message)}</div>`;
  if(type==='error')noticeHost.firstElementChild?.focus({preventScroll:true});
  clearTimeout(noticeHost._timer);noticeHost._timer=setTimeout(()=>noticeHost.innerHTML='',7000);
}
function showModal(title,body,onConfirm,confirmLabel='Guardar'){
  const modalHost=document.querySelector('#modalHost');const titleId=`modal-title-${Date.now()}`;lastFocusedBeforeModal=document.activeElement;
  modalHost.innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="${titleId}"><h2 id="${titleId}">${esc(title)}</h2>${body}<div class="modal-actions"><button class="btn secondary" data-modal-cancel>Cancelar</button><button class="btn" data-modal-confirm>${esc(confirmLabel)}</button></div></div></div>`;
  const dialog=modalHost.querySelector('.modal');
  const close=()=>{modalHost.innerHTML='';lastFocusedBeforeModal?.focus?.({preventScroll:true});lastFocusedBeforeModal=null;};
  modalHost.querySelector('[data-modal-cancel]').onclick=close;
  modalHost.querySelector('[data-modal-confirm]').onclick=async()=>{try{const ok=await onConfirm();if(ok!==false)close();}catch(err){await recordLocalError(err,'runtime');notice(err.message,'error');}};
  dialog.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key!=='Tab')return;
    const focusable=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')];
    if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  setTimeout(()=>dialog.querySelector('input,select,textarea,button')?.focus(),0);
}
