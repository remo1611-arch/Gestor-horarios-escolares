import { buildDocumentModel, deepClone, normalizeProject, structuralFingerprint } from './core.mjs';
import { DOCUMENT_TYPES, documentCoverage, documentType, renderDocument } from './documents.mjs';
import { buildXlsxWorkbook, XLSX_OUTPUT_CONTRACT_VERSION } from './xlsx.mjs';
import { writeStoredZip } from './project_file.mjs';
import { PRODUCT_VERSION } from './product_mode.mjs';

export const PRODUCT_DOCUMENT_CONTRACT_VERSION='product-documents-1.0';
export const PRODUCT_DOCUMENT_POLICY_VERSION='product-document-policy-1.0';
export const PRODUCT_DOCUMENT_SESSION_VERSION='product-document-session-1.0';
export const PRODUCT_DOCUMENT_PACKAGE_VERSION='product-document-package-1.0';

export const PRODUCT_DOCUMENT_GROUPS=Object.freeze([
  {id:'OFFICIAL',label:'Documentos para imprimir',description:'Horarios y cuadrantes para revisión, comunicación o archivo. Si el horario no está cerrado se marcan como borrador.',technical:false,types:['general','groups','teachers','spaces','breaks','meetings','supports','leadership','guards']},
  {id:'WORK',label:'Informes de revisión',description:'Validación, calidad, gestión diaria, coberturas, incidencias y seguimiento.',technical:false,types:['daily','coverages','incidents','period','validation','quality']},
  {id:'TECHNICAL',label:'Documentos técnicos',description:'Trazabilidad y dossier completo para auditoría y mantenimiento.',technical:true,types:['traceability','dossier']},
]);

const encoder=new TextEncoder();
const clean=v=>String(v??'').trim();
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').toLowerCase()||'centro';
const stamp=v=>String(v||'').replace(/[-:TZ.]/g,'').slice(0,12)||'sin_fecha';

export function createProductDocumentSession(input,options={}){
  const project=normalizeProject(deepClone(input));
  const model=buildDocumentModel(project);
  const generatedAt=options.generatedAt||new Date().toISOString();
  const fingerprint=model.project.fingerprint||project.meta?.structuralFingerprint||structuralFingerprint(project);
  const revisionNumber=Number(model.project.revisionNumber||0);
  const sessionId=`DOC-R${revisionNumber}-${stamp(generatedAt)}-${String(fingerprint).slice(0,8).toUpperCase()}`;
  const documentOptions=normalizeDocumentOptions(options);
  const readiness=documentReleaseReadiness(project,model);
  return {
    contractVersion:PRODUCT_DOCUMENT_CONTRACT_VERSION,
    policyVersion:PRODUCT_DOCUMENT_POLICY_VERSION,
    sessionVersion:PRODUCT_DOCUMENT_SESSION_VERSION,
    sessionId,generatedAt,productVersion:PRODUCT_VERSION,
    projectFingerprint:fingerprint,revisionNumber,status:model.project.status,
    statusLabel:model.project.status==='FINAL'?'Horario oficial':'Borrador de trabajo',
    privacyClass:model.project.privacyClass,privacyLabel:model.project.privacyLabel,
    documentModelVersion:model.modelVersion,documentModelContractVersion:model.contractVersion,
    project,options:documentOptions,readiness,
  };
}

export function documentReleaseReadiness(input,modelInput=null){
  const project=normalizeProject(input),model=modelInput||buildDocumentModel(project);
  const blockers=[];
  if(model.project.status!=='FINAL')blockers.push({code:'PROJECT_NOT_FINAL',message:'El horario todavía no está cerrado como versión oficial.'});
  if(Number(model.metrics?.pending||0)>0)blockers.push({code:'PENDING_SESSIONS',message:`Quedan ${Number(model.metrics.pending)} sesión(es) obligatoria(s) sin colocar.`});
  if((model.validation?.errors||[]).length)blockers.push({code:'VALIDATION_ERRORS',message:`Existen ${(model.validation.errors||[]).length} conflicto(s) grave(s) pendiente(s).`});
  return {
    officialReady:blockers.length===0,
    blockers,
    warnings:(model.validation?.warnings||[]).map(row=>({code:row.code||'VALIDATION_WARNING',message:row.message||String(row)})),
    placed:Number(model.metrics?.placed||0),pending:Number(model.metrics?.pending||0),
    validationErrors:(model.validation?.errors||[]).length,validationWarnings:(model.validation?.warnings||[]).length,
  };
}

export function productDocumentCatalog(session,{includeTechnical=false}={}){
  assertSession(session);
  const coverage=documentCoverage(session.project,session.options);
  const availability=new Map([...coverage.structural,...coverage.operational,...coverage.aggregate].map(row=>[row.id,row]));
  return PRODUCT_DOCUMENT_GROUPS.filter(group=>includeTechnical||!group.technical).map(group=>({
    ...group,
    documents:group.types.map(id=>{
      const def=documentType(id),row=availability.get(id)||{};
      return {
        id,label:def?.label||id,audience:def?.audience||'',orientation:def?.orientation||'portrait',
        pagePolicy:def?.pagePolicy||'REPORT',pagePolicyLabel:pagePolicyLabel(def?.pagePolicy),
        available:row.available!==false,sections:Number(row.sections||0),groupId:group.id,technical:group.technical,
        outputs:['VIEW','HTML','PDF_PRINT'],
      };
    }),
  }));
}

export function productDocumentById(session,type,{includeTechnical=false}={}){
  return productDocumentCatalog(session,{includeTechnical}).flatMap(group=>group.documents).find(row=>row.id===type)||null;
}

export function renderProductDocument(session,type,options={}){
  const {output='VIEW',includeTechnical=false}=options;
  assertSession(session);
  const item=productDocumentById(session,type,{includeTechnical});
  if(!item)throw new Error('El documento no forma parte del catálogo disponible.');
  if(!item.available)throw new Error('Este documento no contiene registros publicables en la sesión documental actual.');
  const documentOptions={...session.options,...(options.documentOptions||{})};
  let html=renderDocument(session.project,type,{...documentOptions,generatedAt:session.generatedAt});
  const group=PRODUCT_DOCUMENT_GROUPS.find(row=>row.id===item.groupId);
  const control=publicSessionControl(session);
  const stampHtml=`<div class="product-document-stamp"><span>${esc(group?.label||'Documento')}</span><span>${esc(session.statusLabel)} · revisión ${esc(session.revisionNumber)}</span><span>Edición ${esc(session.sessionId)}</span><span>${esc(formatDateTime(session.generatedAt))}</span></div>`;
  const panel=`<aside class="product-document-control no-print" role="note"><b>${esc(group?.label||'Documento')}</b><span>${esc(session.statusLabel)} · revisión ${esc(session.revisionNumber)}</span><span>Edición documental: ${esc(session.sessionId)}</span><span>Generada: ${esc(formatDateTime(session.generatedAt))}</span><span>Producto: ${esc(session.productVersion)}</span></aside>`;
  const attrs=` data-product-document-contract="${esc(PRODUCT_DOCUMENT_CONTRACT_VERSION)}" data-product-document-session="${esc(session.sessionId)}" data-product-version="${esc(session.productVersion)}" data-project-revision="${esc(session.revisionNumber)}" data-project-fingerprint="${esc(session.projectFingerprint)}" data-output-mode="${esc(output)}"`;
  html=html.replace(/<body([^>]*)>/,`<body$1${attrs}>${panel}`);
  html=html.replace(/<header class="doc-head">/g,`${stampHtml}<header class="doc-head">`);
  html=html.replace(/<div class="cover-content">/g,`<div class="cover-content">${stampHtml}`);
  html=html.replace('</style>',`${productDocumentCss()}</style>`);
  html=html.replace('</body>',`<script type="application/json" id="product-document-control">${escapeJsonForHtml(JSON.stringify(control))}</script>${output==='PDF_PRINT'?'<script>addEventListener("load",()=>setTimeout(()=>print(),250),{once:true});</script>':''}</body>`);
  return html;
}

export function openProductDocument(session,type,{output='VIEW',includeTechnical=false}={}){
  const html=renderProductDocument(session,type,{output,includeTechnical});
  const blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob);
  const w=window.open(url,'_blank');
  if(!w){URL.revokeObjectURL(url);throw new Error('El navegador bloqueó la apertura del documento.');}
  setTimeout(()=>URL.revokeObjectURL(url),120000);
}

export function downloadProductDocument(session,type,{includeTechnical=false}={}){
  const html=renderProductDocument(session,type,{output:'HTML',includeTechnical});
  downloadBytes(encoder.encode('\uFEFF'+html),productDocumentFileName(session,type),'text/html;charset=utf-8');
}

export async function buildProductXlsx(session){
  assertSession(session);
  return buildXlsxWorkbook(session.project,{generatedAt:session.generatedAt});
}

export function productDocumentFileName(session,type){
  const center=slug(session?.project?.meta?.center||session?.project?.meta?.name||'centro');
  return `${center}_rev${Number(session?.revisionNumber||0)}_${stamp(session?.generatedAt)}_${slug(type)}.html`;
}
export function productXlsxFileName(session){
  const center=slug(session?.project?.meta?.center||session?.project?.meta?.name||'centro');
  return `${center}_rev${Number(session?.revisionNumber||0)}_${stamp(session?.generatedAt)}_horarios.xlsx`;
}
export function productPackageFileName(session,scope='WORKING_COPY'){
  const center=slug(session?.project?.meta?.center||session?.project?.meta?.name||'centro');
  const label=scope==='OFFICIAL'?'oficial':scope==='ARCHIVE'?'archivo_tecnico':scope==='SELECTED'?'seleccionado':'trabajo';
  return `${center}_rev${Number(session?.revisionNumber||0)}_${stamp(session?.generatedAt)}_paquete_${label}.zip`;
}

export async function buildProductDocumentPackage(session,{scope='WORKING_COPY',includeTechnical=false}={}){
  assertSession(session);
  if(!['OFFICIAL','WORKING_COPY','ARCHIVE'].includes(scope))throw new Error('El ámbito del paquete documental no es válido.');
  if(scope==='OFFICIAL'&&!session.readiness.officialReady)throw new Error(session.readiness.blockers.map(row=>row.message).join(' '));
  if(scope==='ARCHIVE'&&!includeTechnical)throw new Error('El archivo técnico requiere activar Mantenimiento avanzado.');
  const selectedGroups=scope==='OFFICIAL'?['OFFICIAL']:scope==='ARCHIVE'?['OFFICIAL','WORK','TECHNICAL']:['OFFICIAL','WORK'];
  const catalog=productDocumentCatalog(session,{includeTechnical:scope==='ARCHIVE'});
  const entries=new Map(),files=[];
  for(const group of catalog.filter(row=>selectedGroups.includes(row.id))){
    for(const doc of group.documents){
      if(!doc.available)continue;
      const folder=group.id==='OFFICIAL'?'documentos_oficiales':group.id==='WORK'?'documentos_trabajo':'documentos_tecnicos';
      const path=`${folder}/${productDocumentFileName(session,doc.id)}`;
      const bytes=encoder.encode(renderProductDocument(session,doc.id,{output:'HTML',includeTechnical:scope==='ARCHIVE'}));
      entries.set(path,bytes);files.push({path,type:'HTML',documentType:doc.id,group:group.id,label:doc.label,bytes:bytes.length});
    }
  }
  const xlsxPath=`hojas_calculo/${productXlsxFileName(session)}`;
  const xlsx=await buildProductXlsx(session);entries.set(xlsxPath,xlsx);files.push({path:xlsxPath,type:'XLSX',label:'Libro Excel OOXML',bytes:xlsx.length});
  const metadata={
    format:'ghe-product-document-package',version:'1.0',contractVersion:PRODUCT_DOCUMENT_PACKAGE_VERSION,
    productDocumentContract:PRODUCT_DOCUMENT_CONTRACT_VERSION,policyVersion:PRODUCT_DOCUMENT_POLICY_VERSION,
    scope,scopeLabel:packageScopeLabel(scope),generatedAt:session.generatedAt,sessionId:session.sessionId,
    producer:{name:'Gestor de Horarios Escolares',productVersion:session.productVersion},
    project:{name:session.project.meta.name,center:session.project.meta.center,academicYear:session.project.meta.academicYear,revisionNumber:session.revisionNumber,status:session.status,statusLabel:session.statusLabel,fingerprint:session.projectFingerprint},
    readiness:session.readiness,
    privacy:{classification:session.privacyClass,label:session.privacyLabel,containsPersonalData:session.privacyClass==='REAL',warning:session.privacyClass==='REAL'?'Este paquete contiene datos del centro. Debe conservarse en un entorno autorizado y no publicarse.':'El proyecto no está clasificado como real.'},
    contracts:{documentModel:session.documentModelContractVersion,xlsx:XLSX_OUTPUT_CONTRACT_VERSION,productDocuments:PRODUCT_DOCUMENT_CONTRACT_VERSION,package:PRODUCT_DOCUMENT_PACKAGE_VERSION},
    files,
  };
  entries.set('control_documental.json',encoder.encode(stableJson(publicSessionControl(session))));
  entries.set('catalogo_documental.json',encoder.encode(stableJson({groups:catalog.filter(row=>selectedGroups.includes(row.id))})));
  entries.set('package.json',encoder.encode(stableJson(metadata)));
  entries.set('LEER_PRIMERO.txt',encoder.encode(packageReadme(metadata)));
  entries.set('COMO_GUARDAR_PDF.txt',encoder.encode(pdfReadme(session)));
  entries.set('manifest.sha256',encoder.encode(await manifest(entries)));
  return writeStoredZip(entries,session.generatedAt);
}


export async function buildSelectedProductDocumentPackage(session,{selectedTypes=[],includeXlsx=true,includeTechnical=false}={}){
  assertSession(session);
  const selected=[...new Set((selectedTypes||[]).map(clean).filter(Boolean))];
  if(!selected.length&&!includeXlsx)throw new Error('Selecciona al menos un documento o el libro XLSX.');
  const catalog=productDocumentCatalog(session,{includeTechnical});
  const available=new Map(catalog.flatMap(group=>group.documents.map(doc=>[doc.id,{...doc,groupId:group.id,groupLabel:group.label}])));
  const entries=new Map(),files=[];
  for(const type of selected){
    const doc=available.get(type);
    if(!doc)throw new Error(`El documento ${type} no existe en el catálogo disponible.`);
    if(!doc.available)throw new Error(`El documento ${doc.label} no contiene registros publicables.`);
    const folder=doc.technical?'documentos_tecnicos':doc.groupId==='WORK'?'informes_revision':'documentos_horario';
    const path=`${folder}/${productDocumentFileName(session,type)}`;
    const bytes=encoder.encode(renderProductDocument(session,type,{output:'HTML',includeTechnical}));
    entries.set(path,bytes);files.push({path,type:'HTML',documentType:type,group:doc.groupId,label:doc.label,bytes:bytes.length});
  }
  if(includeXlsx){
    const xlsxPath=`hojas_calculo/${productXlsxFileName(session)}`;
    const xlsx=await buildProductXlsx(session);entries.set(xlsxPath,xlsx);files.push({path:xlsxPath,type:'XLSX',label:'Libro Excel OOXML',bytes:xlsx.length});
  }
  const metadata={
    format:'ghe-selected-document-package',version:'1.0',contractVersion:PRODUCT_DOCUMENT_PACKAGE_VERSION,
    productDocumentContract:PRODUCT_DOCUMENT_CONTRACT_VERSION,policyVersion:PRODUCT_DOCUMENT_POLICY_VERSION,
    scope:'SELECTED',scopeLabel:'Paquete seleccionado',generatedAt:session.generatedAt,sessionId:session.sessionId,
    producer:{name:'Gestor de Horarios Escolares',productVersion:session.productVersion},
    project:{name:session.project.meta.name,center:session.project.meta.center,academicYear:session.project.meta.academicYear,revisionNumber:session.revisionNumber,status:session.status,statusLabel:session.statusLabel,fingerprint:session.projectFingerprint},
    readiness:session.readiness,privacy:{classification:session.privacyClass,label:session.privacyLabel,containsPersonalData:session.privacyClass==='REAL',warning:session.privacyClass==='REAL'?'Este paquete contiene datos del centro. Debe conservarse en un entorno autorizado y no publicarse.':'El proyecto no está clasificado como real.'},
    selectedTypes:selected,includeXlsx,files,
  };
  entries.set('control_documental.json',encoder.encode(stableJson(publicSessionControl(session))));
  entries.set('seleccion_documental.json',encoder.encode(stableJson(metadata)));
  entries.set('LEER_PRIMERO.txt',encoder.encode(packageReadme(metadata)));
  entries.set('COMO_GUARDAR_PDF.txt',encoder.encode(pdfReadme(session)));
  entries.set('manifest.sha256',encoder.encode(await manifest(entries)));
  return writeStoredZip(entries,session.generatedAt);
}

export function publicSessionControl(session){
  assertSession(session);
  return {
    contractVersion:session.contractVersion,policyVersion:session.policyVersion,sessionVersion:session.sessionVersion,
    sessionId:session.sessionId,generatedAt:session.generatedAt,productVersion:session.productVersion,
    projectFingerprint:session.projectFingerprint,revisionNumber:session.revisionNumber,status:session.status,statusLabel:session.statusLabel,
    privacyClass:session.privacyClass,documentModelVersion:session.documentModelVersion,
    documentModelContractVersion:session.documentModelContractVersion,options:deepClone(session.options),readiness:deepClone(session.readiness),
  };
}

export function productDocumentSessionMatches(session,input){
  if(!session||session.contractVersion!==PRODUCT_DOCUMENT_CONTRACT_VERSION)return false;
  const project=normalizeProject(input);
  const fingerprint=project.meta?.structuralFingerprint||structuralFingerprint(project);
  return session.projectFingerprint===fingerprint&&Number(session.revisionNumber)===Number(project.meta?.revisionNumber||0)&&session.status===(project.meta?.status||'DRAFT');
}

export function packageScopeLabel(scope){return scope==='OFFICIAL'?'Paquete oficial':scope==='ARCHIVE'?'Archivo técnico completo':scope==='SELECTED'?'Paquete seleccionado':'Paquete de trabajo';}
export function pagePolicyLabel(value='REPORT'){
  return ({ONE_GROUP_PER_PAGE:'Una unidad por grupo',ONE_ENTITY_PER_PAGE:'Una unidad por entidad',SECTION:'Sección continua',REPORT:'Informe',SUMMARY_AND_ENTITY_PAGES:'Resumen y fichas',COVER_INDEX_SECTIONS:'Portada, índice y documentos'})[value]||'Documento';
}

function normalizeDocumentOptions(options){
  const allowed=['dayId','date','scope','referenceDate','fromDate','toDate','groupId','teacherId','spaceId'];
  return Object.fromEntries(allowed.filter(key=>clean(options[key])).map(key=>[key,clean(options[key])]));
}
function assertSession(session){
  if(!session||session.contractVersion!==PRODUCT_DOCUMENT_CONTRACT_VERSION||!session.project)throw new Error('La sesión documental no es válida.');
}
function formatDateTime(value){const d=new Date(value);return Number.isNaN(d.valueOf())?String(value||''):new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short'}).format(d);}
function productDocumentCss(){return `
.product-document-control{max-width:1200px;margin:10px auto 0;padding:10px 14px;display:flex;flex-wrap:wrap;gap:8px 18px;background:#eef6fb;border:1px solid #9db8ca;color:#17384e;font-size:8.5pt}.product-document-control b{font-size:9pt}.product-document-stamp{display:flex;flex-wrap:wrap;gap:2mm 5mm;margin:0 0 3mm;padding:1.7mm 2mm;border:1px solid #b7c5d1;background:#f5f8fa;color:#40566a;font-size:7.2pt}.product-document-stamp span:first-child{font-weight:700;color:#1e638d}@media print{.product-document-control{display:none!important}.product-document-stamp{background:#fff;break-inside:avoid}}
`;}
function escapeJsonForHtml(value){return value.replace(/</g,'\\u003c').replace(/-->/g,'--\\u003e');}
function downloadBytes(bytes,name,type){const blob=new Blob([bytes],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function manifest(entries){const rows=[];for(const name of [...entries.keys()].sort())rows.push(`${await sha256(entries.get(name))}  ${name}`);return rows.join('\n')+'\n';}
async function sha256(value){const bytes=value instanceof Uint8Array?value:new Uint8Array(value);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function stableJson(value){return JSON.stringify(sortObject(value),null,2)+'\n';}
function sortObject(value){if(Array.isArray(value))return value.map(sortObject);if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sortObject(value[key])]));return value;}
function packageReadme(meta){return `PAQUETE DOCUMENTAL · GESTOR DE HORARIOS ESCOLARES\n\nÁmbito: ${meta.scopeLabel}\nEdición documental: ${meta.sessionId}\nCentro: ${meta.project.center||'Sin indicar'}\nCurso: ${meta.project.academicYear||'Sin indicar'}\nEstado: ${meta.project.statusLabel}\nRevisión: ${meta.project.revisionNumber}\nGenerado: ${meta.generatedAt}\nProducto: ${meta.producer.productVersion}\n\n${meta.privacy.warning}\n\nTodos los archivos se han generado desde la misma copia inmutable del proyecto, con la misma revisión, fecha y huella.\nEl manifiesto SHA-256 permite comprobar la integridad de cada archivo.\nLos documentos HTML son autónomos y están preparados para imprimir o guardar como PDF en A4.\n`;}
function pdfReadme(session){return `CÓMO OBTENER PDF\n\n1. Abra el documento HTML en un navegador actualizado.\n2. Pulse “Imprimir / Guardar PDF”.\n3. Seleccione papel A4 y respete la orientación indicada.\n4. Elija “Guardar como PDF” o la impresora del centro.\n5. Compruebe que la edición documental sea ${session.sessionId} y la revisión ${session.revisionNumber}.\n\nLa aplicación no incorpora un conversor PDF paralelo: el PDF se genera desde el mismo HTML A4 y el mismo DocumentModel que el resto de las salidas.\n`;}
