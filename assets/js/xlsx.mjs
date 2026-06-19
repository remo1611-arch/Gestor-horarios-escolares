import { buildDocumentModel, DOCUMENT_MODEL_CONTRACT_VERSION } from './core.mjs';
import { writeStoredZip } from './project_file.mjs';
import { publicDayLabel, publicSlotLabel, publicTeacherName, publicSpaceName, publicActivityName, publicActivityKindLabel, replaceDayCodes, stripDayAndSlot } from './public_labels.mjs';

export const XLSX_OUTPUT_CONTRACT_VERSION='xlsx-ooxml-contract-1.0';
const encoder=new TextEncoder();
const pubTeacher=value=>publicTeacherName(value);
const pubTeachers=values=>(values||[]).map(pubTeacher).join(' · ');
const pubGroups=values=>(values||[]).map(stripDayAndSlot).join(' · ');
const pubDay=(model,id,fallback='')=>publicDayLabel(model.calendar,id)||replaceDayCodes(fallback);
const pubSlot=(model,id,fallback='')=>publicSlotLabel(model.calendar,id)||fallback;

export async function buildXlsxWorkbook(project,options={}){
  const model=buildDocumentModel(project);
  if(model.contractVersion!==DOCUMENT_MODEL_CONTRACT_VERSION)throw new Error('El XLSX requiere el DocumentModel vigente.');
  const sheets=buildWorkbookSheets(model,options);
  const generatedAt=options.generatedAt||model.generatedAt||new Date().toISOString();
  const entries=buildOoxmlEntries(model,sheets,generatedAt);
  return writeStoredZip(entries,generatedAt);
}

export function xlsxFileName(project){
  const base=slug(project?.meta?.center||project?.meta?.name||'centro');
  return `${base}_horarios_documentacion.xlsx`;
}

export function buildWorkbookSheets(model){
  const assignmentCounts=countBy(model.assignments,'activityId');
  const groupCounts=countMembership(model.assignments,'groupIds');
  const teacherCounts=countMembership(model.assignments,'teacherIds');
  const spaceCounts=countBy(model.assignments,'spaceId');
  const slotMap=Object.fromEntries((model.calendar?.slots||[]).map(x=>[x.id,x]));
  const sheets=[];
  sheets.push(sheet('Portada',[
    ['Campo','Valor'],
    ['Centro',model.project.center||''],
    ['Proyecto',model.project.name||''],
    ['Curso',model.project.academicYear||''],
    ['Responsable',model.project.responsible||''],
    ['Estado',model.project.status==='FINAL'?'Horario definitivo':'Borrador'],
    ['Revisión',model.project.revisionNumber],
    ['Clasificación',model.project.privacyLabel||model.project.privacyClass||''],
    ['Sesiones requeridas',model.metrics?.required||0],
    ['Sesiones colocadas',model.metrics?.placed||0],
    ['Sesiones pendientes',model.metrics?.pending||0],
    ['Contrato documental',model.contractVersion],
    ['Contrato XLSX',XLSX_OUTPUT_CONTRACT_VERSION],
  ],{orientation:'portrait',widths:[28,78],header:true,filter:false}));
  sheets.push(sheet('Asignaciones',[
    ['Día','Tramo','Inicio','Fin','Actividad','Tipo','Grupos','Docentes','Espacio','Zona','Origen'],
    ...model.assignments.map(a=>{
      const slot=slotMap[a.slotId]||{};
      return [pubDay(model,a.dayId,a.day),pubSlot(model,a.slotId,a.slot),slot.start||'',slot.end||'',publicActivityName(a,a.slotId),publicActivityKindLabel(a.activityKind),(a.groups||[]).map(stripDayAndSlot).join(' · '),pubTeachers(a.teachers),publicSpaceName(a.space||''),stripDayAndSlot(a.zone||''),a.source||''];
    }),
  ],{orientation:'landscape',widths:[14,18,10,10,36,24,28,34,24,22,18],header:true,filter:true}));
  sheets.push(sheet('Actividades',[
    ['Actividad','Tipo','Sesiones semanales','Sesiones colocadas','Grupos','Docentes','Días permitidos','Tramos permitidos','Estado del dato'],
    ...model.activities.map(a=>[publicActivityName(a),publicActivityKindLabel(a.kind),a.weeklySessions,assignmentCounts[a.id]||0,(a.groups||[]).map(stripDayAndSlot).join(' · '),pubTeachers(a.teachers),(a.allowedDays||[]).map(id=>publicDayLabel(model.calendar,id)).join(', '),(a.allowedSlots||[]).map(id=>publicSlotLabel(model.calendar,id)).join(', '),publicDataState(a.dataState)]),
  ],{orientation:'landscape',widths:[36,25,18,18,30,35,25,28,18],header:true,filter:true}));
  sheets.push(sheet('Grupos',[
    ['Grupo','Etapa','Tutoría','Sesiones asignadas'],
    ...model.groups.map(g=>[g.name,g.stage||'',publicTeacherName(g.tutor||''),groupCounts[g.id]||0]),
  ],{orientation:'portrait',widths:[24,20,34,20],header:true,filter:true}));
  sheets.push(sheet('Docentes',[
    ['Docente','Función','Especialidad','Carga objetivo','Sesiones asignadas','LD','DC','Coberturas','Cargos','Reducciones','Itinerancia'],
    ...model.teachers.map(t=>[publicTeacherName(t.name),t.role||'',t.specialty||'',t.weeklyTarget||0,teacherCounts[t.id]||0,t.ldQuota||0,t.dcQuota||0,t.coverageEligible?'Sí':'No',(t.positions||[]).filter(x=>x.active!==false).map(x=>`${stripDayAndSlot(x.label)} (${x.weeklySessions})`).join(' · '),(t.reductions||[]).filter(x=>x.active!==false).map(x=>`${stripDayAndSlot(x.label)} (${x.weeklySessions})`).join(' · '),itineraryText(t.itinerary)]),
  ],{orientation:'landscape',widths:[30,24,28,16,18,10,10,14,36,36,30],header:true,filter:true}));
  sheets.push(sheet('Espacios',[
    ['Espacio','Etiquetas','Capacidad','Sesiones asignadas','Estado del dato'],
    ...model.spaces.map(s=>[publicSpaceName(s.name),(s.tags||[]).join(', '),s.capacity||'',spaceCounts[s.id]||0,publicDataState(s.dataState)]),
  ],{orientation:'portrait',widths:[30,38,14,20,18],header:true,filter:true}));
  const breaks=model.assignments.filter(a=>a.activityKind==='BREAK_DUTY');
  sheets.push(sheet('Recreos',[
    ['Día','Tramo','Zona','Vigilancia','Docentes'],
    ...breaks.map(a=>[pubDay(model,a.dayId,a.day),pubSlot(model,a.slotId,a.slot),stripDayAndSlot(a.zone||''),publicActivityName(a,a.slotId),pubTeachers(a.teachers)]),
  ],{orientation:'landscape',widths:[16,18,28,36,42],header:true,filter:true}));
  const guards=model.assignments.filter(a=>a.activityKind==='GUARD');
  const performed=model.daily?.performedServices||[];
  sheets.push(sheet('Guardias',[
    ['Tipo','Fecha/Día','Tramo','Servicio','Docentes','Estado'],
    ...guards.map(a=>['Programada',pubDay(model,a.dayId,a.day),pubSlot(model,a.slotId,a.slot),publicActivityName(a,a.slotId),pubTeachers(a.teachers),'Programada']),
    ...performed.map(r=>['Realizada',r.date||'',r.slot||r.slotId||'',r.activity||r.serviceLabel||'Servicio realizado',r.teacher||r.teacherName||'',publicStatus(r.status||'COMPLETED')]),
  ],{orientation:'landscape',widths:[16,18,18,38,36,20],header:true,filter:true}));
  const coverages=model.daily?.coverages||[];
  sheets.push(sheet('Coberturas',[
    ['Fecha','Día','Tramo','Actividad','Docente ausente','Docente de cobertura','Estado','Decisión'],
    ...coverages.map(c=>[c.date||'',replaceDayCodes(c.day||c.dayId||''),c.slot||c.slotId||'',stripDayAndSlot(c.activity||''),publicTeacherName(c.absentTeacher||''),publicTeacherName(c.coverTeacher||''),publicStatus(c.status),c.decisionReason||'']),
  ],{orientation:'landscape',widths:[14,16,18,36,30,30,18,42],header:true,filter:true}));
  const incidents=model.daily?.incidents||[];
  const recoveries=model.daily?.recoveries||[];
  sheets.push(sheet('Incidencias',[
    ['Clase','Fecha','Actividad','Estado','Información operativa'],
    ...incidents.map(r=>['Incidencia',r.date||'',stripDayAndSlot(r.activity||''),publicStatus(r.status),r.operationalNote||'']),
    ...recoveries.map(r=>['Recuperación',r.plannedDate||r.date||'',stripDayAndSlot(r.activity||''),publicStatus(r.status),r.publicNote||'']),
  ],{orientation:'landscape',widths:[18,16,38,22,55],header:true,filter:true}));
  sheets.push(sheet('Validación',[
    ['Nivel','Incidencia','Actuación sugerida'],
    ...(model.validation?.errors||[]).map(i=>['Error',i.message||'',i.suggestedAction||'']),
    ...(model.validation?.warnings||[]).map(i=>['Aviso',i.message||'',i.suggestedAction||'']),
    ...(!(model.validation?.errors||[]).length&&!(model.validation?.warnings||[]).length?[['Correcto','No se detectaron incidencias.','']]:[]),
  ],{orientation:'portrait',widths:[14,72,62],header:true,filter:true}));
  const q=model.quality||{};
  const qualityRows=(q.dimensions||[]).map(row=>[row.label,row.status,`${row.primary?.value??''}${row.primary?.unit?` ${row.primary.unit}`:''}`,row.explanation||'',(row.actions||[]).join(' · ')]);
  sheets.push(sheet('Calidad',[
    ['Dimensión','Estado','Indicador','Interpretación','Actuación sugerida'],
    ...qualityRows,
    ['Dictamen visible',q.overall?.label||'',q.overall?.state||'',q.overall?.summary||'',q.overall?.note||q.explanatoryNote||''],
    ['Estado referencia aceptada',q.acceptedMetricsState||'UNAVAILABLE','','Trazabilidad',''],
  ],{orientation:'landscape',widths:[34,20,26,72,62],header:true,filter:true}));
  const traceRows=[];
  for(const r of model.traceability?.acceptanceReceipts||[])traceRows.push(['Aceptación',r.createdAt||'',r.decision||'',r.actor||'',r.note||'']);
  for(const r of model.traceability?.generationRuns||[])traceRows.push(['Generación',r.createdAt||'',`${r.engine||''} · ${r.status||''}`,r.mode||'',`${r.placed||0} colocadas · ${r.unplaced||0} pendientes`]);
  for(const r of model.traceability?.imports||[])traceRows.push(['Importación',r.createdAt||'',r.entityType||'',r.sourceName||'',`${r.created||0} altas · ${r.updated||0} actualizaciones · ${r.skipped||0} omitidas`]);
  for(const r of model.traceability?.recentAudit||model.audit||[])traceRows.push(['Auditoría',r.at||'',r.action||'',r.actor||'','']);
  sheets.push(sheet('Trazabilidad',[
    ['Tipo','Fecha','Acción/Estado','Responsable/Ámbito','Detalle'],
    ...(traceRows.length?traceRows:[['Información','','Sin actuaciones registradas','','']]),
  ],{orientation:'landscape',widths:[18,24,36,30,60],header:true,filter:true}));
  return sheets;
}

function buildOoxmlEntries(model,sheets,generatedAt){
  const entries=new Map();
  const sheetRels=[];
  sheets.forEach((s,index)=>sheetRels.push({id:`rId${index+1}`,target:`worksheets/sheet${index+1}.xml`}));
  entries.set('[Content_Types].xml',bytes(contentTypes(sheets.length)));
  entries.set('_rels/.rels',bytes(rootRels()));
  entries.set('docProps/core.xml',bytes(coreProps(model,generatedAt)));
  entries.set('docProps/app.xml',bytes(appProps(sheets)));
  entries.set('xl/workbook.xml',bytes(workbookXml(sheets)));
  entries.set('xl/_rels/workbook.xml.rels',bytes(workbookRels(sheetRels)));
  entries.set('xl/styles.xml',bytes(stylesXml()));
  entries.set('xl/theme/theme1.xml',bytes(themeXml()));
  sheets.forEach((s,index)=>entries.set(`xl/worksheets/sheet${index+1}.xml`,bytes(worksheetXml(s))));
  return entries;
}

function sheet(name,rows,options={}){return{name:safeSheetName(name),rows,orientation:options.orientation||'landscape',widths:options.widths||[],header:options.header!==false,filter:options.filter!==false};}
function worksheetXml(s){
  const rowXml=s.rows.map((row,ri)=>`<row r="${ri+1}"${ri===0&&s.header?' ht="24" customHeight="1"':''}>${row.map((v,ci)=>cellXml(v,ri+1,ci+1,ri===0&&s.header?1:0)).join('')}</row>`).join('');
  const maxCols=Math.max(1,...s.rows.map(r=>r.length));
  const maxRows=Math.max(1,s.rows.length);
  const dim=`A1:${colName(maxCols)}${maxRows}`;
  const cols=s.widths.length?`<cols>${s.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${Number(w)}" customWidth="1"/>`).join('')}</cols>`:'';
  const pane=s.header?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':'';
  const selection=s.header?'<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>':'<selection activeCell="A1" sqref="A1"/>';
  const filter=s.filter&&s.header&&maxRows>1?`<autoFilter ref="A1:${colName(maxCols)}${maxRows}"/>`:'';
  const landscape=s.orientation==='landscape';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="${dim}"/><sheetViews><sheetView workbookViewId="0" tabSelected="0">${pane}${selection}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${rowXml}</sheetData>${filter}<printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.45" bottom="0.45" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="${landscape?'landscape':'portrait'}" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L${xmlText(s.name)}&amp;C&amp;P / &amp;N&amp;RGestor de Horarios Escolares</oddFooter></headerFooter></worksheet>`;
}
function cellXml(value,row,col,style=0){
  const ref=`${colName(col)}${row}`;
  if(value===null||value===undefined||value==='')return `<c r="${ref}" s="${style}"/>`;
  if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}" s="${style}" t="n"><v>${value}</v></c>`;
  if(typeof value==='boolean')return `<c r="${ref}" s="${style}" t="b"><v>${value?1:0}</v></c>`;
  const text=safeXmlText(value);
  return `<c r="${ref}" s="${style||2}" t="inlineStr"><is><t xml:space="preserve">${xmlText(text)}</t></is></c>`;
}
function contentTypes(n){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${Array.from({length:n},(_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;}
function rootRels(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;}
function workbookXml(sheets){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="27328"/><workbookPr defaultThemeVersion="166925"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="22000" windowHeight="12000"/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${xmlAttr(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;}
function workbookRels(rels){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map(r=>`<Relationship Id="${r.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${r.target}"/>`).join('')}<Relationship Id="rId${rels.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId${rels.length+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>`;}
function stylesXml(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Aptos"/><family val="2"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos Display"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123F5B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD5DEE7"/></left><right style="thin"><color rgb="FFD5DEE7"/></right><top style="thin"><color rgb="FFD5DEE7"/></top><bottom style="thin"><color rgb="FFD5DEE7"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;}
function themeXml(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="123F5B"/></a:dk2><a:lt2><a:srgbClr val="EAF1F7"/></a:lt2><a:accent1><a:srgbClr val="235A8F"/></a:accent1><a:accent2><a:srgbClr val="4F81BD"/></a:accent2><a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4><a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme></a:themeElements></a:theme>`;}
function coreProps(model,generatedAt){const stamp=new Date(generatedAt).toISOString();return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlText(model.project.center||model.project.name||'Horarios escolares')}</dc:title><dc:subject>Horarios escolares y documentación</dc:subject><dc:creator>Gestor de Horarios Escolares</dc:creator><cp:lastModifiedBy>Gestor de Horarios Escolares</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified><cp:keywords>${XLSX_OUTPUT_CONTRACT_VERSION}</cp:keywords></cp:coreProperties>`;}
function appProps(sheets){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Gestor de Horarios Escolares</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Hojas de cálculo</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${sheets.map(s=>`<vt:lpstr>${xmlText(s.name)}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>`;}
function colName(n){let s='';for(let x=n;x>0;x=Math.floor((x-1)/26))s=String.fromCharCode(65+((x-1)%26))+s;return s;}
function safeSheetName(v){return String(v||'Hoja').replace(/[\\/*?:\[\]]/g,' ').replace(/^'+|'+$/g,'').slice(0,31)||'Hoja';}
function safeXmlText(v){return String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');}
function xmlText(v){return safeXmlText(v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
function xmlAttr(v){return xmlText(v).replace(/"/g,'&quot;');}
function bytes(v){return encoder.encode(v);}
function slug(v){return String(v||'centro').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').toLowerCase()||'centro';}
function countBy(rows,key){const out={};for(const r of rows||[]){const v=r[key];if(v)out[v]=(out[v]||0)+1;}return out;}
function countMembership(rows,key){const out={};for(const r of rows||[])for(const v of r[key]||[])out[v]=(out[v]||0)+1;return out;}
function publicDataState(v){return({CONFIRMED:'Confirmado',PROVISIONAL:'Provisional',SIMULATED:'Simulado',PENDING:'Pendiente'})[v]||String(v||'');}
function publicStatus(v){return({DRAFT:'Borrador',CONFIRMED:'Confirmada',CANCELLED:'Cancelada',FINISHED:'Finalizada',PLANNED:'Planificada',ACTIVE:'Activa',PENDING:'Pendiente',PROPOSED:'Propuesta',ASSIGNED:'Asignada',COMMUNICATED:'Comunicada',COMPLETED:'Completada',UNCOVERED:'Sin cubrir',NOT_APPLICABLE:'No procede',SCHEDULED:'Programada',CANCELLED_WITH_REASON:'Cancelada con motivo',OPEN:'Abierta',RESOLVED:'Resuelta'})[v]||String(v||'');}
function itineraryText(v){if(!v)return'';if(typeof v==='string')return v;return [v.origin,v.destination,v.note].filter(Boolean).join(' · ');}
