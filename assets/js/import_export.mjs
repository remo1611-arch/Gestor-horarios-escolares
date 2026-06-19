import {
  deepClone, uid, nowIso, normalizeProject, normalizeStringList, appendAudit,
  buildDocumentModel, nameOf, structuralFingerprint, validateProject,
  normalizeDataProvenance,
} from './core.mjs';

export const IMPORT_ENTITY_TYPES = Object.freeze([
  'subjects','teachers','groups','spaces','activities','availability',
]);
export const IMPORT_MODES = Object.freeze(['UPSERT_SAFE','INSERT_ONLY']);

const COMMON_ALIASES = {
  externalId:['codigo','código','id_externo','identificador','ref'],
  dataState:['estado','estado_dato'],
  sourceRef:['procedencia','fuente','referencia_fuente','documento_fuente'],
  validFrom:['vigente_desde','valido_desde','válido_desde','fecha_inicio'],
  validTo:['vigente_hasta','valido_hasta','válido_hasta','fecha_fin'],
  verifiedBy:['verificado_por','revisado_por'],
  verifiedAt:['fecha_verificacion','fecha_verificación','verificado_el'],
  provenanceNote:['nota_fuente','observaciones_fuente'],
};


const localDateString = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

const ENTITY_ALIASES = {
  subjects: {
    label:'Materias', required:['name'],
    aliases:{ name:['materia','asignatura','nombre'], stage:['etapa','nivel'], ...COMMON_ALIASES },
  },
  teachers: {
    label:'Docentes', required:['name'],
    aliases:{
      name:['docente','profesor','profesora','nombre'], role:['funcion','función','cargo'], specialty:['especialidad'],
      weeklyTarget:['carga','carga_objetivo','horas'], coverageEligible:['coberturas','disponible_coberturas'],
      leadershipReduction:['reduccion_cargo','reducción_cargo'], otherReduction:['otras_reducciones'],
      ldQuota:['ld'], dcQuota:['dc'], quotaJustification:['justificacion','justificación'],
      essentialProfiles:['perfiles_esenciales','perfil_esencial'],
      ...COMMON_ALIASES,
    },
  },
  groups: {
    label:'Grupos', required:['name'],
    aliases:{ name:['grupo','nombre'], stage:['etapa','nivel'], tutorName:['tutor','tutora'], ...COMMON_ALIASES },
  },
  spaces: {
    label:'Espacios', required:['name'],
    aliases:{ name:['espacio','aula','nombre'], tags:['etiquetas','tipos'], capacity:['capacidad'], ...COMMON_ALIASES },
  },
  activities: {
    label:'Actividades', required:['name','weeklySessions'],
    aliases:{
      name:['actividad','materia','nombre'], kind:['tipo'], subjectName:['asignatura','materia_catalogo'],
      groupNames:['grupo','grupos'], teacherNames:['docente','docentes','profesorado'], weeklySessions:['sesiones','sesiones_semanales'],
      requiredSpaceTags:['espacio','etiquetas_espacio'], allowedDays:['dias_permitidos','días_permitidos'],
      allowedSlots:['tramos_permitidos'], preferredDays:['dias_preferentes','días_preferentes'],
      preferredSlots:['tramos_preferentes'], priority:['prioridad'], mandatory:['obligatoria'], maxPerDay:['maximo_diario','máximo_diario'],
      ...COMMON_ALIASES,
    },
  },
  availability: {
    label:'Disponibilidad y presencia', required:['teacherName'],
    aliases:{
      teacherName:['docente','profesor','profesora','nombre'], unavailable:['no_disponible','indisponibilidades','franjas_no_disponibles'],
      presence:['presencia','presencia_confirmada'], coverageEligible:['coberturas','disponible_coberturas'],
      ...COMMON_ALIASES,
    },
  },
};

export function parseDelimitedText(text, delimiter = null) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const sep = delimiter || detectDelimiter(firstLine);
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (quoted) throw new Error('El archivo contiene una comilla de apertura sin cierre.');
  row.push(field.replace(/\r$/, ''));
  if (row.some(x => x !== '') || !rows.length) rows.push(row);
  return { delimiter: sep, rows: rows.filter(r => r.some(c => String(c).trim() !== '')) };
}

function detectDelimiter(line) {
  const candidates = [';', '\t', ','];
  let best = ';', bestCount = -1;
  for (const sep of candidates) {
    const count = countOutsideQuotes(line, sep);
    if (count > bestCount) { best = sep; bestCount = count; }
  }
  return best;
}
function countOutsideQuotes(text, sep) {
  let quoted = false, count = 0;
  for (let i=0;i<text.length;i+=1) {
    if (text[i] === '"' && text[i+1] === '"') { i += 1; continue; }
    if (text[i] === '"') quoted = !quoted;
    else if (!quoted && text[i] === sep) count += 1;
  }
  return count;
}

export function stageEntityImport(input, entityType, text, options = {}) {
  const p = normalizeProject(input);
  const config = ENTITY_ALIASES[entityType];
  if (!config) throw new Error('El tipo de importación no es válido.');
  const parsed = parseDelimitedText(text, options.delimiter || null);
  if (parsed.rows.length < 2) throw new Error('El archivo necesita una cabecera y al menos una fila de datos.');
  const originalHeaders = parsed.rows[0].map(value=>String(value || '').trim());
  const normalizedHeaders = originalHeaders.map(normalizeHeader);
  const duplicates = duplicateValues(normalizedHeaders.filter(Boolean));
  if (duplicates.length) throw new Error(`La cabecera repite columnas: ${duplicates.join(', ')}.`);
  const headerMap = buildHeaderMap(normalizedHeaders, config.aliases);
  const missing = config.required.filter(key => headerMap[key] == null);
  if (missing.length) throw new Error(`Faltan columnas obligatorias: ${missing.join(', ')}.`);
  const knownIndexes = new Set(Object.values(headerMap));
  const unknownHeaders = originalHeaders.filter((_,index)=>!knownIndexes.has(index) && normalizedHeaders[index]);
  const mode = normalizeImportMode(options.mode);
  const importId = uid('import');
  const staging = {
    id:importId,
    contractVersion:'data-import-contract-1.0',
    entityType,
    entityLabel:config.label,
    createdAt:nowIso(),
    delimiter:parsed.delimiter,
    fileName:String(options.fileName || ''),
    mode,
    sourceFingerprint:`fnv1a-${fnv1a(String(text || ''))}`,
    sourceRef:String(options.sourceRef || '').trim(),
    validFrom:String(options.validFrom || '').trim(),
    validTo:String(options.validTo || '').trim(),
    verifiedBy:String(options.verifiedBy || '').trim(),
    verifiedAt:String(options.verifiedAt || '').trim(),
    originalHeaders,
    headerMap,
    unknownHeaders,
    baseFingerprint:structuralFingerprint(p),
    rows:parsed.rows.slice(1).map((cells,index)=>({
      id:uid('staged_row'), sourceRow:index+2, selected:true,
      raw:Object.fromEntries(Object.entries(headerMap).map(([key,column])=>[key,String(cells[column] ?? '').trim()])),
    })),
  };
  return rebuildStaging(p, staging);
}

export function revalidateStaging(input, staging) {
  if (!staging?.entityType || !Array.isArray(staging.rows)) throw new Error('La importación preparada no es válida.');
  const project = normalizeProject(input);
  const next = deepClone(staging);
  next.baseFingerprint = structuralFingerprint(project);
  next.revalidatedAt = nowIso();
  return rebuildStaging(project, next);
}

export function editStagedRow(input, staging, rowId, patch = {}) {
  const next = deepClone(staging);
  const row = next.rows.find(x=>x.id===rowId);
  if (!row) throw new Error('No se encontró la fila preparada.');
  row.raw = { ...(row.raw || {}), ...Object.fromEntries(Object.entries(patch).map(([key,value])=>[key,String(value ?? '').trim()])) };
  return rebuildStaging(normalizeProject(input), next);
}

export function setStagedRowSelected(staging, rowId, selected) {
  const next = deepClone(staging);
  const row = next.rows.find(x=>x.id===rowId);
  if (!row) throw new Error('No se encontró la fila preparada.');
  row.selected = Boolean(selected) && !(row.errors || []).length;
  return summarizeStaging(next);
}

export function setAllStagedRowsSelected(staging, selected) {
  const next = deepClone(staging);
  for (const row of next.rows || []) row.selected = Boolean(selected) && !(row.errors || []).length;
  return summarizeStaging(next);
}

function rebuildStaging(p, staging) {
  const config = ENTITY_ALIASES[staging.entityType];
  if (!config) throw new Error('El tipo de importación no es válido.');
  const rows = (staging.rows || []).map(row=>{
    const converted = convertRow(p, staging.entityType, row.raw || {}, row.sourceRow, staging);
    return {
      ...row,
      value:converted.value,
      errors:converted.errors,
      warnings:converted.warnings,
      selected:row.selected !== false,
      decision:'PENDING',
      targetId:'',
      matchKey:'',
    };
  });

  const keyMap = new Map();
  for (const row of rows) {
    const key = rowKey(row.value, staging.entityType);
    row.matchKey = key;
    if (!key) continue;
    const list = keyMap.get(key) || [];
    list.push(row);
    keyMap.set(key,list);
  }
  for (const [key,list] of keyMap) if (list.length > 1) {
    for (const row of list) row.errors.push(`La importación repite el identificador ${humanMatchKey(key)}.`);
  }

  for (const row of rows) {
    const match = findExistingMatch(p, staging.entityType, row.value);
    if (match.ambiguous) row.errors.push(`La coincidencia con datos existentes es ambigua: ${match.label}.`);
    else if (staging.entityType === 'availability') {
      if (!match.row) row.errors.push('No existe el docente indicado para actualizar su disponibilidad.');
      else { row.decision='UPDATE'; row.targetId=match.row.id; }
    } else if (match.row) {
      row.targetId=match.row.id;
      if (staging.mode === 'INSERT_ONLY') row.errors.push(`Ya existe un registro coincidente: ${match.row.name}.`);
      else row.decision='UPDATE';
    } else row.decision='INSERT';

    row.errors = uniqueStrings(row.errors);
    row.warnings = uniqueStrings(row.warnings);
    if (row.errors.length) { row.status='ERROR'; row.selected=false; row.decision='ERROR'; }
    else if (row.warnings.length) row.status='WARNING';
    else row.status='READY';
  }
  staging.rows=rows;
  return summarizeStaging(staging);
}

function summarizeStaging(staging) {
  const rows=staging.rows || [];
  staging.summary={
    total:rows.length,
    selected:rows.filter(x=>x.selected).length,
    ready:rows.filter(x=>x.status==='READY').length,
    warnings:rows.filter(x=>x.status==='WARNING').length,
    errors:rows.filter(x=>x.status==='ERROR').length,
    insert:rows.filter(x=>x.selected&&x.decision==='INSERT').length,
    update:rows.filter(x=>x.selected&&x.decision==='UPDATE').length,
    skipped:rows.filter(x=>!x.selected).length,
    selectedWarnings:rows.filter(x=>x.selected&&x.warnings?.length).length,
  };
  staging.canApply = staging.summary.selected > 0 && !rows.some(x=>x.selected&&x.errors?.length);
  return staging;
}

function buildHeaderMap(headers, aliases) {
  const result = {};
  for (const [canonical,names] of Object.entries(aliases)) {
    const candidates=[canonical,...names].map(normalizeHeader);
    const idx=headers.findIndex(h=>candidates.includes(h));
    if(idx>=0) result[canonical]=idx;
  }
  return result;
}
function normalizeHeader(value) {
  return String(value || '').trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}
function normalizeImportMode(value) {
  if (value === 'INSERT_ONLY' || value === 'APPEND') return 'INSERT_ONLY';
  return 'UPSERT_SAFE';
}
function normalizeState(value) {
  const v=normalizeHeader(value);
  return ({ confirmado:'CONFIRMED',confirmada:'CONFIRMED',provisional:'PROVISIONAL',simulado:'SIMULATED',simulada:'SIMULATED',pendiente:'PENDING' })[v] || 'PENDING';
}
function boolValue(value, fallback=true) {
  const v=normalizeHeader(value); if(!v) return fallback;
  if(['si','s','true','1','yes'].includes(v)) return true;
  if(['no','n','false','0'].includes(v)) return false;
  return fallback;
}
function strictInteger(value, label, errors, { fallback=0, minimum=null, required=false } = {}) {
  const raw=String(value ?? '').trim();
  if(!raw){if(required)errors.push(`${label}: falta un valor.`);return fallback;}
  const n=Number(raw.replace(',','.'));
  if(!Number.isInteger(n)){errors.push(`${label}: debe ser un número entero.`);return fallback;}
  if(minimum!=null&&n<minimum){errors.push(`${label}: debe ser igual o superior a ${minimum}.`);return fallback;}
  return n;
}
function splitNames(value) { return String(value||'').split(/[|;]/).map(x=>x.trim()).filter(Boolean); }
function splitKeys(value) { return String(value||'').split(/[|;,]/).map(x=>x.trim()).filter(Boolean); }
function resolveReferences(rows, tokens) {
  const ids=[],missing=[],ambiguous=[];
  for(const token of tokens){
    const normalized=normalizeHeader(token);
    const matches=rows.filter(x=>normalizeHeader(x.externalId)===normalized||normalizeHeader(x.name)===normalized);
    const unique=[...new Map(matches.map(x=>[x.id,x])).values()];
    if(unique.length===1)ids.push(unique[0].id);else if(unique.length>1)ambiguous.push(token);else missing.push(token);
  }
  return {ids:[...new Set(ids)],missing,ambiguous};
}
function validateIsoDate(value,label,errors) {
  if(!value)return '';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)){errors.push(`${label}: usa el formato AAAA-MM-DD.`);return value;}
  const d=new Date(`${value}T00:00:00Z`);
  if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)errors.push(`${label}: la fecha no es válida.`);
  return value;
}
function buildProvenance(raw, staging, sourceRow, errors, warnings) {
  const validFrom=validateIsoDate(raw.validFrom||staging.validFrom||'','Vigente desde',errors);
  const validTo=validateIsoDate(raw.validTo||staging.validTo||'','Vigente hasta',errors);
  const verifiedAt=validateIsoDate(raw.verifiedAt||staging.verifiedAt||'','Fecha de verificación',errors);
  if(validFrom&&validTo&&validTo<validFrom)errors.push('La vigencia termina antes de comenzar.');
  if(validTo&&validTo<localDateString())warnings.push(`La vigencia terminó el ${validTo}.`);
  const sourceRef=String(raw.sourceRef||staging.sourceRef||'').trim();
  if(!sourceRef&&!staging.fileName)warnings.push('No se indicó documento o referencia de procedencia.');
  return normalizeDataProvenance({
    origin:'IMPORT', sourceRef, sourceFile:staging.fileName||'', sourceRow,
    importId:staging.id, importedAt:staging.createdAt,
    validFrom, validTo,
    verifiedBy:String(raw.verifiedBy||staging.verifiedBy||'').trim(),
    verifiedAt,
    note:String(raw.provenanceNote||'').trim(),
  },'IMPORT');
}
function convertRow(p,type,raw,sourceRow,staging) {
  const errors=[],warnings=[];
  const provenance=buildProvenance(raw,staging,sourceRow,errors,warnings);
  const externalId=String(raw.externalId||'').trim();
  const requiredName=String(raw.name||'').trim();
  if(type!=='availability'&&!requiredName)errors.push(`Fila ${sourceRow}: falta el nombre.`);
  let value;
  if(type==='subjects') value={id:uid('subject'),externalId,name:requiredName,stage:raw.stage||'',dataState:normalizeState(raw.dataState),provenance};
  if(type==='teachers') value={
    id:uid('teacher'),externalId,name:requiredName,role:raw.role||'',specialty:raw.specialty||'',
    weeklyTarget:strictInteger(raw.weeklyTarget,'Carga objetivo',errors,{minimum:0}),unavailable:[],presence:[],
    coverageEligible:boolValue(raw.coverageEligible,true),essentialProfiles:normalizeStringList(raw.essentialProfiles).map(x=>x.toUpperCase()),
    leadershipReduction:strictInteger(raw.leadershipReduction,'Reducción por cargo',errors,{minimum:0}),
    otherReduction:strictInteger(raw.otherReduction,'Otras reducciones',errors,{minimum:0}),
    ldQuota:strictInteger(raw.ldQuota,'LD',errors,{minimum:0}),dcQuota:strictInteger(raw.dcQuota,'DC',errors,{minimum:0}),
    quotaJustification:raw.quotaJustification||'',itinerary:{enabled:false,presenceDays:[],travelMinutes:0,state:'CONFIRMED'},
    dataState:normalizeState(raw.dataState),provenance,
  };
  if(type==='groups'){
    const tutor=resolveReferences(p.teachers,raw.tutorName?[raw.tutorName]:[]);
    if(tutor.missing.length)warnings.push(`Tutor/a no encontrado/a: ${tutor.missing.join(', ')}.`);
    if(tutor.ambiguous.length)errors.push(`Tutor/a ambiguo/a: ${tutor.ambiguous.join(', ')}.`);
    value={id:uid('group'),externalId,name:requiredName,stage:raw.stage||'',tutorTeacherId:tutor.ids[0]||'',dataState:normalizeState(raw.dataState),provenance};
  }
  if(type==='spaces') value={
    id:uid('space'),externalId,name:requiredName,tags:normalizeStringList(raw.tags).map(x=>x.toUpperCase()),
    capacity:strictInteger(raw.capacity,'Capacidad',errors,{fallback:1,minimum:1}),dataState:normalizeState(raw.dataState),provenance,
  };
  if(type==='activities'){
    const teachers=resolveReferences(p.teachers,splitNames(raw.teacherNames));
    const groups=resolveReferences(p.groups,splitNames(raw.groupNames));
    const subject=resolveReferences(p.subjects,raw.subjectName?[raw.subjectName]:[]);
    if(teachers.missing.length)errors.push(`Docentes no encontrados: ${teachers.missing.join(', ')}.`);
    if(teachers.ambiguous.length)errors.push(`Docentes ambiguos: ${teachers.ambiguous.join(', ')}.`);
    if(groups.missing.length)errors.push(`Grupos no encontrados: ${groups.missing.join(', ')}.`);
    if(groups.ambiguous.length)errors.push(`Grupos ambiguos: ${groups.ambiguous.join(', ')}.`);
    if(subject.missing.length)warnings.push(`Materia de catálogo no encontrada: ${subject.missing.join(', ')}.`);
    if(subject.ambiguous.length)errors.push(`Materia ambigua: ${subject.ambiguous.join(', ')}.`);
    const weekly=strictInteger(raw.weeklySessions,'Sesiones semanales',errors,{fallback:0,minimum:1,required:true});
    const kind=String(raw.kind||'TEACHING').trim().toUpperCase();
    const allowedDays=normalizeStringList(raw.allowedDays).map(x=>x.toUpperCase());
    const allowedSlots=normalizeStringList(raw.allowedSlots).map(x=>x.toUpperCase());
    const preferredDays=normalizeStringList(raw.preferredDays).map(x=>x.toUpperCase());
    const preferredSlots=normalizeStringList(raw.preferredSlots).map(x=>x.toUpperCase());
    const validDays=new Set(p.calendar.days.map(x=>x.id)),validSlots=new Set(p.calendar.slots.map(x=>x.id));
    const badDays=[...allowedDays,...preferredDays].filter(x=>!validDays.has(x));
    const badSlots=[...allowedSlots,...preferredSlots].filter(x=>!validSlots.has(x));
    if(badDays.length)errors.push(`Días no reconocidos: ${[...new Set(badDays)].join(', ')}.`);
    if(badSlots.length)errors.push(`Tramos no reconocidos: ${[...new Set(badSlots)].join(', ')}.`);
    value={
      id:uid('activity'),externalId,name:requiredName,kind,subjectId:subject.ids[0]||'',groupId:groups.ids[0]||'',groupIds:groups.ids,
      teacherIds:teachers.ids,weeklySessions:weekly,durationSlots:1,requiredSpaceTags:normalizeStringList(raw.requiredSpaceTags).map(x=>x.toUpperCase()),
      allowedDays,allowedSlots,preferredDays,preferredSlots,fixedOccurrences:[],
      priority:strictInteger(raw.priority,'Prioridad',errors,{fallback:50,minimum:0}),mandatory:boolValue(raw.mandatory,true),
      maxPerDay:strictInteger(raw.maxPerDay,'Máximo diario',errors,{fallback:1,minimum:1}),consecutive:'NONE',source:'IMPORT',
      dataState:normalizeState(raw.dataState),provenance,
    };
  }
  if(type==='availability'){
    const teacher=resolveReferences(p.teachers,[String(raw.teacherName||'').trim()].filter(Boolean));
    if(!String(raw.teacherName||'').trim())errors.push(`Fila ${sourceRow}: falta el docente.`);
    if(teacher.missing.length)errors.push(`Docente no encontrado: ${teacher.missing.join(', ')}.`);
    if(teacher.ambiguous.length)errors.push(`Docente ambiguo: ${teacher.ambiguous.join(', ')}.`);
    const validKeys=new Set(p.calendar.days.flatMap(d=>p.calendar.slots.map(s=>`${d.id}:${s.id}`)));
    const unavailable=splitKeys(raw.unavailable).map(x=>x.toUpperCase());
    const presence=splitKeys(raw.presence).map(x=>x.toUpperCase());
    const invalid=[...unavailable,...presence].filter(x=>!validKeys.has(x));
    if(invalid.length)errors.push(`Franjas no reconocidas: ${[...new Set(invalid)].join(', ')}.`);
    value={
      id:teacher.ids[0]||'',teacherId:teacher.ids[0]||'',name:String(raw.teacherName||'').trim(),externalId:'',
      unavailable:[...new Set(unavailable)],presence:[...new Set(presence)],coverageEligible:boolValue(raw.coverageEligible,true),
      dataState:normalizeState(raw.dataState),provenance,
    };
  }
  if(value?.dataState==='PENDING')warnings.push('El dato queda pendiente de confirmación.');
  return {value,errors,warnings};
}

function rowKey(value,type) {
  if(type==='availability')return value?.teacherId?`teacher:${value.teacherId}`:'';
  const external=normalizeHeader(value?.externalId);
  if(external)return `external:${external}`;
  const name=normalizeHeader(value?.name);
  return name?`name:${name}`:'';
}
function humanMatchKey(key){return key.replace(/^external:/,'código ').replace(/^name:/,'nombre ').replace(/^teacher:/,'docente ');}
function findExistingMatch(p,type,value) {
  if(type==='availability'){
    const rows=p.teachers.filter(x=>x.id===value?.teacherId);
    return {row:rows[0]||null,ambiguous:rows.length>1,label:value?.name||''};
  }
  const collection=p[type]||[];
  const ext=normalizeHeader(value?.externalId);
  let matches=ext?collection.filter(x=>normalizeHeader(x.externalId)===ext):[];
  if(!matches.length){const name=normalizeHeader(value?.name);matches=collection.filter(x=>normalizeHeader(x.name)===name);}
  return {row:matches.length===1?matches[0]:null,ambiguous:matches.length>1,label:value?.externalId||value?.name||''};
}
function duplicateValues(values){const counts=new Map();for(const value of values)counts.set(value,(counts.get(value)||0)+1);return [...counts].filter(([,count])=>count>1).map(([value])=>value);}
function uniqueStrings(values){return [...new Set((values||[]).filter(Boolean))];}
function fnv1a(text){let hash=0x811c9dc5;for(let i=0;i<text.length;i+=1){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193);}return (hash>>>0).toString(16).padStart(8,'0');}

export function applyStagedImport(input, staging, { acceptWarnings = false } = {}) {
  const original=normalizeProject(input);
  if(!staging?.entityType||!Array.isArray(staging.rows))throw new Error('La importación preparada no es válida.');
  if(structuralFingerprint(original)!==staging.baseFingerprint)throw new Error('El proyecto cambió después de preparar la vista previa. Vuelve a validar la importación.');
  const selected=staging.rows.filter(x=>x.selected);
  if(!selected.length)throw new Error('No hay filas seleccionadas para aplicar.');
  const invalid=selected.filter(x=>x.errors?.length);
  if(invalid.length)throw new Error(`Hay ${invalid.length} fila(s) seleccionadas con errores.`);
  const warningRows=selected.filter(x=>x.warnings?.length);
  if(warningRows.length&&!acceptWarnings)throw new Error('La importación contiene avisos seleccionados que deben aceptarse expresamente.');

  const p=deepClone(original);
  const baselineErrors=new Set(validateProject(original).errors.map(issue=>`${issue.code}:${issue.entity||''}`));
  let inserted=0,updated=0;
  for(const row of selected){
    const value=deepClone(row.value);
    if(staging.entityType==='availability'){
      const target=p.teachers.find(x=>x.id===row.targetId);
      if(!target)throw new Error(`El docente de la fila ${row.sourceRow} ya no existe.`);
      target.unavailable=value.unavailable;
      target.presence=value.presence;
      target.coverageEligible=value.coverageEligible;
      target.dataState=value.dataState;
      target.provenance=value.provenance;
      updated+=1;
      continue;
    }
    const collection=p[staging.entityType];
    if(!Array.isArray(collection))throw new Error('La colección de destino no existe.');
    if(row.decision==='UPDATE'){
      const idx=collection.findIndex(x=>x.id===row.targetId);
      if(idx<0)throw new Error(`El registro de destino de la fila ${row.sourceRow} ya no existe.`);
      value.id=collection[idx].id;
      collection[idx]={...collection[idx],...value};
      updated+=1;
    }else if(row.decision==='INSERT'){
      collection.push(value);inserted+=1;
    }else throw new Error(`La fila ${row.sourceRow} no tiene una decisión aplicable.`);
  }
  const normalized=normalizeProject(p);
  const afterValidation=validateProject(normalized);
  const introduced=afterValidation.errors.filter(issue=>!baselineErrors.has(`${issue.code}:${issue.entity||''}`));
  if(introduced.length)throw new Error(`La importación introduciría ${introduced.length} conflicto(s) estructural(es): ${introduced.slice(0,3).map(x=>x.message).join(' ')}`);

  const report={
    id:staging.id||uid('import'),contractVersion:'data-import-contract-1.0',entityType:staging.entityType,
    fileName:staging.fileName||'',sourceRef:staging.sourceRef||'',sourceFingerprint:staging.sourceFingerprint||'',
    createdAt:staging.createdAt||nowIso(),appliedAt:nowIso(),baseFingerprint:staging.baseFingerprint,
    resultFingerprint:structuralFingerprint(normalized),inserted,updated,selected:selected.length,skipped:staging.rows.length-selected.length,
    warnings:warningRows.reduce((sum,row)=>sum+(row.warnings?.length||0),0),
    rows:selected.map(row=>({sourceRow:row.sourceRow,decision:row.decision,targetId:row.targetId||row.value?.id||'',name:row.value?.name||''})),
  };
  normalized.imports.push(report);
  appendAudit(normalized,'IMPORT_APPLIED',`Importación de ${staging.entityLabel||staging.entityType}: ${inserted} altas, ${updated} actualizaciones y ${report.skipped} omitidas.`,normalized.meta.responsible,{importId:report.id,sourceFingerprint:report.sourceFingerprint});
  normalized.meta.structuralFingerprint=structuralFingerprint(normalized);
  return {project:normalizeProject(normalized),report};
}

export function exportEntityCsv(input, entityType, delimiter=';') {
  const p=normalizeProject(input);
  const rows=entityRows(p,entityType);
  if(!rows.length)return '';
  const headers=Object.keys(rows[0]);
  return [headers,...rows.map(r=>headers.map(h=>r[h]??''))].map(r=>r.map(v=>quoteCsv(v,delimiter)).join(delimiter)).join('\r\n');
}
function quoteCsv(value,delimiter){const s=String(value??'');return /["\r\n]/.test(s)||s.includes(delimiter)?`"${s.replace(/"/g,'""')}"`:s;}
function provenanceColumns(row){const pr=row?.provenance||{};return{Codigo:row?.externalId||'',Procedencia:pr.sourceRef||pr.origin||'',Vigente_desde:pr.validFrom||'',Vigente_hasta:pr.validTo||'',Verificado_por:pr.verifiedBy||'',Fecha_verificacion:pr.verifiedAt||''};}
function entityRows(p,type){
  if(type==='subjects')return p.subjects.map(x=>({Materia:x.name,Etapa:x.stage,...provenanceColumns(x),Estado:x.dataState}));
  if(type==='teachers')return p.teachers.map(x=>({Docente:x.name,Funcion:x.role,Especialidad:x.specialty,Carga_objetivo:x.weeklyTarget,Reduccion_cargo:x.leadershipReduction,Otras_reducciones:x.otherReduction,LD:x.ldQuota,DC:x.dcQuota,Coberturas:x.coverageEligible?'Sí':'No',Perfiles_esenciales:(x.essentialProfiles||[]).join('|'),...provenanceColumns(x),Estado:x.dataState}));
  if(type==='groups')return p.groups.map(x=>({Grupo:x.name,Etapa:x.stage,Tutor:nameOf(p.teachers,x.tutorTeacherId),...provenanceColumns(x),Estado:x.dataState}));
  if(type==='spaces')return p.spaces.map(x=>({Espacio:x.name,Etiquetas:(x.tags||[]).join('|'),Capacidad:x.capacity,...provenanceColumns(x),Estado:x.dataState}));
  if(type==='activities')return p.activities.map(x=>({Actividad:x.name,Tipo:x.kind,Asignatura:nameOf(p.subjects,x.subjectId),Grupos:(x.groupIds||[]).map(id=>nameOf(p.groups,id)).join('|'),Docentes:(x.teacherIds||[]).map(id=>nameOf(p.teachers,id)).join('|'),Sesiones_semanales:x.weeklySessions,Etiquetas_espacio:(x.requiredSpaceTags||[]).join('|'),Dias_permitidos:(x.allowedDays||[]).join('|'),Tramos_permitidos:(x.allowedSlots||[]).join('|'),Prioridad:x.priority,Obligatoria:x.mandatory?'Sí':'No',...provenanceColumns(x),Estado:x.dataState}));
  if(type==='availability')return p.teachers.map(x=>({Docente:x.name,No_disponible:(x.unavailable||[]).join('|'),Presencia:(x.presence||[]).join('|'),Coberturas:x.coverageEligible?'Sí':'No',...provenanceColumns(x),Estado:x.dataState}));
  if(type==='assignments')return buildDocumentModel(p).assignments.map(x=>({Dia:x.day,Tramo:x.slot,Actividad:x.activity,Tipo:x.activityKindLabel,Grupos:x.groups.join('|'),Docentes:x.teachers.join('|'),Espacio:x.space}));
  return [];
}

export function exportExcelXml(input) {
  const p=normalizeProject(input);
  const sheets=[
    ['Proyecto',[{Campo:'Nombre',Valor:p.meta.name},{Campo:'Centro',Valor:p.meta.center},{Campo:'Curso',Valor:p.meta.academicYear},{Campo:'Responsable',Valor:p.meta.responsible},{Campo:'Estado',Valor:p.meta.status},{Campo:'Revision',Valor:p.meta.revisionNumber}]],
    ['Materias',entityRows(p,'subjects')],['Docentes',entityRows(p,'teachers')],['Grupos',entityRows(p,'groups')],['Espacios',entityRows(p,'spaces')],['Actividades',entityRows(p,'activities')],['Disponibilidad',entityRows(p,'availability')],['Horario',entityRows(p,'assignments')],
    ['Ausencias',p.daily.absences.map(x=>({Fecha:x.date||'',Dia:nameOf(p.calendar.days,x.dayId),Docente:nameOf(p.teachers,x.teacherId),Tramos:(x.slotIds||[]).map(id=>nameOf(p.calendar.slots,id)).join('|'),Estado:x.status,Nota_operativa:x.operationalNote||''}))],
    ['Coberturas',p.daily.coverages.map(x=>({Dia:nameOf(p.calendar.days,x.dayId),Tramo:nameOf(p.calendar.slots,x.slotId),Actividad:nameOf(p.activities,x.activityId),Docente_cobertura:nameOf(p.teachers,x.coverTeacherId),Estado:x.status,Motivo_decision:x.decisionReason||''}))],
    ['Sustituciones',p.daily.temporarySubstitutions.map(x=>({Persona_sustituida:nameOf(p.teachers,x.absentTeacherId),Persona_sustituta:nameOf(p.teachers,x.substituteTeacherId),Desde:x.startDate,Hasta:x.endDate||'',Estado:x.status,Actividades:(x.scopeActivityIds||[]).map(id=>nameOf(p.activities,id)).join('|'),Nota_operativa:x.operationalNote||''}))],
    ['Importaciones',p.imports.map(x=>({Tipo:x.entityType,Archivo:x.fileName||'',Procedencia:x.sourceRef||'',Aplicada:x.appliedAt||'',Altas:x.inserted||0,Actualizaciones:x.updated||0,Omitidas:x.skipped||0,Avisos:x.warnings||0,Huella_fuente:x.sourceFingerprint||''}))],
  ];
  const workbook=sheets.map(([name,rows])=>worksheet(name,rows)).join('');
  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style></Styles>${workbook}</Workbook>`;
}
function worksheet(name,rows){const safe=String(name).slice(0,31);const headers=rows.length?Object.keys(rows[0]):['Sin datos'];const header=`<Row>${headers.map(h=>cell(h,'Header')).join('')}</Row>`;const body=rows.length?rows.map(r=>`<Row>${headers.map(h=>cell(r[h])).join('')}</Row>`).join(''):`<Row>${cell('Sin datos')}</Row>`;return `<Worksheet ss:Name="${xml(safe)}"><Table>${header}${body}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;}
function cell(value,style=''){const n=Number(value);const numeric=value!==''&&value!=null&&Number.isFinite(n)&&String(value).trim()!=='';return `<Cell${style?` ss:StyleID="${style}"`:''}><Data ss:Type="${numeric?'Number':'String'}">${xml(value??'')}</Data></Cell>`;}
function xml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}

export function importTemplate(entityType) {
  const templates={
    teachers:'Codigo;Docente;Funcion;Especialidad;Carga_objetivo;Reduccion_cargo;Otras_reducciones;LD;DC;Coberturas;Perfiles_esenciales;Procedencia;Vigente_desde;Vigente_hasta;Verificado_por;Fecha_verificacion;Estado\r\n',
    groups:'Codigo;Grupo;Etapa;Tutor;Procedencia;Vigente_desde;Vigente_hasta;Verificado_por;Fecha_verificacion;Estado\r\n',
    subjects:'Codigo;Materia;Etapa;Procedencia;Vigente_desde;Vigente_hasta;Verificado_por;Fecha_verificacion;Estado\r\n',
    spaces:'Codigo;Espacio;Etiquetas;Capacidad;Procedencia;Vigente_desde;Vigente_hasta;Verificado_por;Fecha_verificacion;Estado\r\n',
    activities:'Codigo;Actividad;Tipo;Asignatura;Grupos;Docentes;Sesiones_semanales;Etiquetas_espacio;Dias_permitidos;Tramos_permitidos;Dias_preferentes;Tramos_preferentes;Prioridad;Maximo_diario;Obligatoria;Procedencia;Vigente_desde;Vigente_hasta;Verificado_por;Fecha_verificacion;Estado\r\n',
    availability:'Docente;No_disponible;Presencia;Coberturas;Procedencia;Vigente_desde;Vigente_hasta;Verificado_por;Fecha_verificacion;Estado\r\n',
  };
  if(!templates[entityType])throw new Error('No existe plantilla para ese tipo de datos.');
  return templates[entityType];
}

export function makeDownloadName(project,suffix,extension){const base=String(project?.meta?.center||project?.meta?.name||'gestor_horarios').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'');return `${base}_${suffix}_${localDateString()}.${extension}`;}
