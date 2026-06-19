import {
  APP_VERSION, SCHEMA_VERSION, CONTRACT_VERSION, deepClone, migrateProject,
  normalizeProject, validateProject, nowIso, verifyHistoricalEntry, HISTORY_CONTRACT_VERSION, DATA_CONTRACT_VERSION, ORGANIZATIONAL_CONTRACT_VERSION, GENERATION_EXECUTION_CONTRACT_VERSION, CP_SAT_EXECUTION_CONTRACT_VERSION, MANUAL_EDITOR_CONTRACT_VERSION, DAILY_OPERATIONS_CONTRACT_VERSION, EDUCATIONAL_DOMAIN_CONTRACT_VERSION, ORGANIZATIONAL_DOMAIN_CONTRACT_VERSION,
} from './core.mjs';

export const CONTAINER_FORMAT = 'ghfproject';
export const CONTAINER_VERSION = '1.0';
export const PROJECT_SCHEMA_ID = 'ghe_project';
export const MAX_ENTRY_BYTES = 32 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 96 * 1024 * 1024;
export const REQUIRED_ENTRIES = ['envelope.json', 'project.json', 'manifest.sha256', 'traceability/index.json'];
export const SUPPORTED_REQUIRED_CAPABILITIES = new Set([
  'project-core-2.3',
  'project-core-2.4',
  'project-core-2.5',
  'project-core-2.6',
  'project-core-2.7',
  'project-core-2.8',
  'project-core-2.9',
  'project-core-3.0',
  'project-core-4.0',
  'educational-domain-4.0',
  'organizational-domain-4.1',
  'history-contract-1.0',
  'data-contract-1.0',
  'organizational-contract-1.0',
  'generation-execution-contract-1.0',
  'cp-sat-execution-contract-1.0',
  'manual-editor-contract-1.0',
  'daily-operations-contract-1.0',
  'integrity-sha256',
  'explicit-replacement',
]);

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export class ProjectFileError extends Error {
  constructor(code, message, detail = null) {
    super(message);
    this.name = 'ProjectFileError';
    this.code = code;
    this.detail = detail;
  }
}

export async function buildProjectContainer(input, options = {}) {
  const checked = validatePortableProject(input, { allowMigration: false });
  const project = deepClone(checked.project);
  const generatedAt = options.generatedAt || nowIso();
  const projectText = stableJson(project);
  const projectBytes = encoder.encode(projectText);
  const projectHash = await sha256Hex(projectBytes);
  const privacyClass = project.meta.privacyClass || 'ANONYMIZED';
  const containsPersonalData = privacyClass === 'REAL';
  const envelope = {
    format: CONTAINER_FORMAT,
    formatVersion: CONTAINER_VERSION,
    generatedAt,
    producer: {
      name: 'Gestor de Horarios Escolares',
      version: APP_VERSION,
    },
    project: {
      schemaId: PROJECT_SCHEMA_ID,
      schemaVersion: SCHEMA_VERSION,
      contractVersion: CONTRACT_VERSION,
      projectId: project.meta.projectId,
      revisionId: project.meta.revisionId,
      revisionNumber: project.meta.revisionNumber,
      sha256: projectHash,
    },
    capabilities: {
      required: ['project-core-4.0', 'educational-domain-4.0', 'organizational-domain-4.1', 'history-contract-1.0', 'data-contract-1.0', 'organizational-contract-1.0', 'generation-execution-contract-1.0', 'cp-sat-execution-contract-1.0', 'manual-editor-contract-1.0', 'daily-operations-contract-1.0', 'integrity-sha256', 'explicit-replacement'],
      optional: [],
    },
    privacy: {
      classification: privacyClass,
      containsPersonalData,
      publicReleaseAllowed: !containsPersonalData,
    },
  };
  const traceIndex = {
    format: 'ghfproject-traceability-index',
    version: '1.0',
    generatedAt,
    projectId: project.meta.projectId,
    auditEntries: Array.isArray(project.audit) ? project.audit.length : 0,
    acceptanceReceipts: Array.isArray(project.acceptanceReceipts) ? project.acceptanceReceipts.length : 0,
    structuralSnapshots: Array.isArray(project.history) ? project.history.filter(row => row.restorable === true).length : 0,
    verifiedScenarios: Array.isArray(project.scenarios) ? project.scenarios.filter(row => row.restorable === true).length : 0,
    historyContractVersion: project.meta.historyContractVersion || HISTORY_CONTRACT_VERSION,
    dataContractVersion: project.meta.dataContractVersion || DATA_CONTRACT_VERSION,
    organizationalContractVersion: project.meta.organizationalContractVersion || ORGANIZATIONAL_CONTRACT_VERSION,
    generationExecutionContractVersion: project.meta.generationExecutionContractVersion || GENERATION_EXECUTION_CONTRACT_VERSION,
    cpSatExecutionContractVersion: project.meta.cpSatExecutionContractVersion || CP_SAT_EXECUTION_CONTRACT_VERSION,
    manualEditorContractVersion: project.meta.manualEditorContractVersion || MANUAL_EDITOR_CONTRACT_VERSION,
    dailyOperationsContractVersion: project.meta.dailyOperationsContractVersion || DAILY_OPERATIONS_CONTRACT_VERSION,
    educationalDomainContractVersion: project.meta.educationalDomainContractVersion || EDUCATIONAL_DOMAIN_CONTRACT_VERSION,
    organizationalDomainContractVersion: project.meta.organizationalDomainContractVersion || ORGANIZATIONAL_DOMAIN_CONTRACT_VERSION,
    generationRuns: Array.isArray(project.generationRuns) ? project.generationRuns.length : 0,
    importReports: Array.isArray(project.imports) ? project.imports.length : 0,
    note: 'Trazabilidad derivada. La autoridad funcional permanece en project.json.',
  };
  const auditText = (project.audit || []).map(row => JSON.stringify(row)).join('\n') + ((project.audit || []).length ? '\n' : '');
  const entries = new Map([
    ['envelope.json', encoder.encode(stableJson(envelope))],
    ['project.json', projectBytes],
    ['traceability/index.json', encoder.encode(stableJson(traceIndex))],
    ['traceability/audit.jsonl', encoder.encode(auditText)],
  ]);
  const preserved = options.preservedEntries instanceof Map ? options.preservedEntries : new Map();
  for (const [name, bytes] of preserved) {
    validateEntryPath(name);
    if (!name.startsWith('extensions/')) continue;
    if (!entries.has(name)) entries.set(name, toBytes(bytes));
  }
  const manifestText = await createManifest(entries);
  entries.set('manifest.sha256', encoder.encode(manifestText));
  return writeStoredZip(entries, generatedAt);
}

export async function readProjectFile(data, options = {}) {
  const bytes = toBytes(data);
  if (!bytes.length) throw new ProjectFileError('EMPTY_FILE', 'El archivo está vacío.');
  const fileName = String(options.fileName || 'proyecto.ghfproject');
  if (isZip(bytes)) return readProjectContainer(bytes, { fileName });
  return readLegacyJson(bytes, { fileName });
}

export async function readProjectContainer(bytes, { fileName = 'proyecto.ghfproject' } = {}) {
  const entries = await readZip(bytes);
  for (const required of REQUIRED_ENTRIES) {
    if (!entries.has(required)) throw new ProjectFileError('MISSING_ENTRY', `Falta el archivo obligatorio ${required}.`);
  }
  const envelope = parseJsonEntry(entries, 'envelope.json');
  validateEnvelope(envelope);
  await verifyManifest(entries);
  const projectBytes = entries.get('project.json');
  const actualProjectHash = await sha256Hex(projectBytes);
  if (actualProjectHash !== String(envelope.project.sha256 || '').toLowerCase()) {
    throw new ProjectFileError('PROJECT_HASH_MISMATCH', 'El contenido de project.json no coincide con el hash declarado.');
  }
  const rawProject = parseJsonBytes(projectBytes, 'project.json');
  const checked = validatePortableProject(rawProject, { allowMigration: true });
  if (envelope.project.projectId !== checked.project.meta.projectId) {
    throw new ProjectFileError('PROJECT_ID_MISMATCH', 'El identificador del sobre no coincide con el proyecto.');
  }
  const preservedEntries = new Map();
  for (const [name, content] of entries) if (name.startsWith('extensions/')) preservedEntries.set(name, content.slice());
  return {
    project: checked.project,
    source: 'GHFPROJECT_ZIP',
    fileName,
    envelope,
    integrity: 'VERIFIED',
    migration: checked.migration,
    warnings: checked.warnings,
    preservedEntries,
    preview: projectPreview(checked.project, envelope, fileName, 'VERIFIED'),
  };
}

export function validatePortableProject(input, { allowMigration = true } = {}) {
  if (!isPlainObject(input)) throw new ProjectFileError('PROJECT_NOT_OBJECT', 'El proyecto debe ser un objeto JSON.');
  if (!isPlainObject(input.meta)) throw new ProjectFileError('PROJECT_META_MISSING', 'Falta el bloque meta del proyecto.');
  const requiredMeta = ['schemaVersion', 'contractVersion', 'projectId', 'revisionId', 'name', 'academicYear'];
  for (const key of requiredMeta) {
    if (typeof input.meta[key] !== 'string' || !input.meta[key].trim()) {
      throw new ProjectFileError('PROJECT_META_INVALID', `Falta o no es válido meta.${key}.`);
    }
  }
  const comparison = compareVersion(String(input.meta.schemaVersion), SCHEMA_VERSION);
  if (comparison === 0 && input.meta.dataContractVersion !== DATA_CONTRACT_VERSION) {
    throw new ProjectFileError('DATA_CONTRACT_INVALID', `El proyecto actual debe declarar ${DATA_CONTRACT_VERSION}.`);
  }
  if (comparison === 0 && input.meta.organizationalContractVersion !== ORGANIZATIONAL_CONTRACT_VERSION) {
    throw new ProjectFileError('ORGANIZATIONAL_CONTRACT_INVALID', `El proyecto actual debe declarar ${ORGANIZATIONAL_CONTRACT_VERSION}.`);
  }
  if (comparison === 0 && input.meta.generationExecutionContractVersion !== GENERATION_EXECUTION_CONTRACT_VERSION) {
    throw new ProjectFileError('GENERATION_EXECUTION_CONTRACT_INVALID', `El proyecto actual debe declarar ${GENERATION_EXECUTION_CONTRACT_VERSION}.`);
  }
  if (comparison === 0 && input.meta.cpSatExecutionContractVersion !== CP_SAT_EXECUTION_CONTRACT_VERSION) {
    throw new ProjectFileError('CP_SAT_EXECUTION_CONTRACT_INVALID', `El proyecto actual debe declarar ${CP_SAT_EXECUTION_CONTRACT_VERSION}.`);
  }
  if (comparison === 0 && input.meta.manualEditorContractVersion !== MANUAL_EDITOR_CONTRACT_VERSION) {
    throw new ProjectFileError('MANUAL_EDITOR_CONTRACT_INVALID', `El proyecto actual debe declarar ${MANUAL_EDITOR_CONTRACT_VERSION}.`);
  }
  if (comparison === 0 && input.meta.dailyOperationsContractVersion !== DAILY_OPERATIONS_CONTRACT_VERSION) {
    throw new ProjectFileError('DAILY_OPERATIONS_CONTRACT_INVALID', `El proyecto actual debe declarar ${DAILY_OPERATIONS_CONTRACT_VERSION}.`);
  }
  if (comparison === 0 && input.meta.educationalDomainContractVersion !== EDUCATIONAL_DOMAIN_CONTRACT_VERSION) {
    throw new ProjectFileError('EDUCATIONAL_DOMAIN_CONTRACT_INVALID', `El proyecto actual debe declarar ${EDUCATIONAL_DOMAIN_CONTRACT_VERSION}.`);
  }
  if (comparison === 0 && input.meta.organizationalDomainContractVersion !== ORGANIZATIONAL_DOMAIN_CONTRACT_VERSION) {
    throw new ProjectFileError('ORGANIZATIONAL_DOMAIN_CONTRACT_INVALID', `El proyecto actual debe declarar ${ORGANIZATIONAL_DOMAIN_CONTRACT_VERSION}.`);
  }
  if (comparison === 0 && input.domain?.contractVersion !== EDUCATIONAL_DOMAIN_CONTRACT_VERSION) {
    throw new ProjectFileError('EDUCATIONAL_DOMAIN_BLOCK_INVALID', `El dominio educativo debe declarar ${EDUCATIONAL_DOMAIN_CONTRACT_VERSION}.`);
  }
  if (comparison === 0 && input.daily?.contractVersion !== DAILY_OPERATIONS_CONTRACT_VERSION) {
    throw new ProjectFileError('DAILY_BLOCK_CONTRACT_INVALID', `La gestión diaria debe declarar ${DAILY_OPERATIONS_CONTRACT_VERSION}.`);
  }
  const requiredTop = comparison < 0
    ? ['calendar', 'subjects', 'teachers', 'groups', 'spaces', 'activities', 'assignments']
    : ['calendar', 'settings', 'organization', 'domain', 'subjects', 'teachers', 'groups', 'spaces', 'activities', 'assignments', 'proposals', 'generationRuns', 'scenarios', 'constraints', 'locks', 'editCommands', 'history', 'daily', 'audit'];
  for (const key of requiredTop) {
    if (!(key in input)) throw new ProjectFileError('PROJECT_STRUCTURE_MISSING', `Falta el bloque obligatorio ${key}.`);
  }
  for (const key of ['subjects', 'teachers', 'groups', 'spaces', 'activities', 'assignments']) {
    if (!Array.isArray(input[key])) throw new ProjectFileError('PROJECT_STRUCTURE_INVALID', `${key} debe ser una lista.`);
  }
  if (comparison >= 0) {
    for (const key of ['proposals', 'generationRuns', 'scenarios', 'constraints', 'locks', 'editCommands', 'history', 'audit']) if (!Array.isArray(input[key])) throw new ProjectFileError('PROJECT_STRUCTURE_INVALID', `${key} debe ser una lista.`);
    if (!isPlainObject(input.daily)) throw new ProjectFileError('DAILY_INVALID', 'Falta el bloque de gestión diaria.');
  }
  if (!isPlainObject(input.calendar) || !Array.isArray(input.calendar.days) || !Array.isArray(input.calendar.slots)) {
    throw new ProjectFileError('CALENDAR_INVALID', 'El calendario debe contener listas de días y tramos.');
  }
  if (comparison > 0) {
    throw new ProjectFileError('FUTURE_SCHEMA', `El proyecto usa el esquema ${input.meta.schemaVersion}, posterior al compatible ${SCHEMA_VERSION}.`);
  }
  if (comparison < 0 && !allowMigration) {
    throw new ProjectFileError('OLD_SCHEMA', `El proyecto usa el esquema ${input.meta.schemaVersion} y necesita migración explícita.`);
  }
  let migration = { from: input.meta.schemaVersion, to: input.meta.schemaVersion, changed: false, steps: [], warnings: [] };
  let candidate = deepClone(input);
  if (comparison < 0) {
    const migrated = migrateProject(candidate);
    candidate = migrated.project;
    migration = migrated.report;
  }
  const project = normalizeProject(candidate);
  for (const row of project.history || []) {
    if (row.restorable !== true) continue;
    const check = verifyHistoricalEntry(row, 'snapshot');
    if (!check.ok) throw new ProjectFileError('HISTORY_INTEGRITY_INVALID', `El histórico contiene una versión dañada: ${check.message}`);
  }
  for (const row of project.scenarios || []) {
    if (row.restorable !== true) continue;
    const check = verifyHistoricalEntry(row, 'scenario');
    if (!check.ok) throw new ProjectFileError('SCENARIO_INTEGRITY_INVALID', `Las alternativas contienen un estado dañado: ${check.message}`);
  }
  const validation = validateProject(project);
  const structuralCodes = new Set([
    'ID_REQUIRED', 'ID_DUPLICATED', 'EXTERNAL_ID_DUPLICATED', 'DATA_DATE_INVALID', 'DATA_VALIDITY_RANGE_INVALID', 'GROUP_TUTOR_BROKEN', 'TEACHER_TIME_REFERENCE_INVALID',
    'ACTIVITY_GROUP_BROKEN', 'ACTIVITY_SUBJECT_BROKEN', 'ACTIVITY_TEACHER_BROKEN',
    'FIXED_OCCURRENCE_INVALID', 'ASSIGNMENT_ACTIVITY_BROKEN', 'ASSIGNMENT_SPACE_BROKEN',
    'ASSIGNMENT_TIME_BROKEN', 'ORG_RULE_ACTIVITY_BROKEN', 'ORG_RULE_TEACHER_BROKEN',
    'ORG_RULE_GROUP_BROKEN', 'ORG_RULE_DAY_BROKEN', 'ORG_RULE_SLOT_BROKEN',
    'MINIMUM_PRESENCE_DAY_INVALID', 'MINIMUM_PRESENCE_SLOT_INVALID', 'BREAK_ZONE_SLOT_INVALID',
    'COVERAGE_ABSENCE_BROKEN', 'COVERAGE_TEACHER_BROKEN', 'TEMP_SUB_ABSENT_TEACHER_BROKEN',
    'TEMP_SUB_TEACHER_BROKEN', 'TEMP_SUB_ACTIVITY_BROKEN',
    'TRAVEL_SITE_REFERENCE_BROKEN', 'RESOURCE_SITE_BROKEN', 'RELATION_ACTIVITY_BROKEN', 'SPLIT_ACTIVITY_BROKEN', 'SPLIT_GROUP_BROKEN',
    'TEACHER_HOME_SITE_BROKEN', 'TEACHER_ALLOWED_SITE_BROKEN', 'TEACHER_ROUTE_SITE_BROKEN', 'GROUP_HOME_SITE_BROKEN', 'SPACE_SITE_BROKEN',
    'SPACE_RESOURCE_BROKEN', 'EQUIVALENT_SPACE_BROKEN', 'ACTIVITY_ALLOWED_SITE_BROKEN', 'ACTIVITY_PREFERRED_SITE_BROKEN',
    'ACTIVITY_SPACE_REFERENCE_BROKEN', 'ACTIVITY_RESOURCE_REFERENCE_BROKEN', 'ACTIVITY_SPLIT_SET_BROKEN', 'ACTIVITY_RELATION_BROKEN',
    'ASSIGNMENT_WEEK_BROKEN', 'ASSIGNMENT_RESOURCE_BROKEN', 'PRESENCE_PLAN_TIME_BROKEN', 'PRESENCE_PLAN_SITE_BROKEN', 'PRESENCE_OTHER_SITE_REQUIRED', 'ORG_SERVICE_SITE_BROKEN', 'ANCHORED_SEGMENT_ACTIVITY_BROKEN', 'ANCHORED_SEGMENT_SELF_REFERENCE',
  ]);
  const structuralErrors = validation.errors.filter(issue => structuralCodes.has(issue.code));
  if (structuralErrors.length) {
    throw new ProjectFileError('BROKEN_REFERENCES', `El proyecto contiene ${structuralErrors.length} referencia(s) o identificador(es) no válidos.`, structuralErrors);
  }
  const warnings = [];
  if (migration.changed) warnings.push(`El proyecto se migrará de ${migration.from} a ${migration.to} en memoria.`);
  warnings.push(...(migration.warnings || []));
  const legacyHistory = (project.history || []).filter(row => row.restorable !== true).length;
  const legacyScenarios = (project.scenarios || []).filter(row => row.restorable !== true).length;
  if (legacyHistory) warnings.push(`${legacyHistory} versión(es) históricas se conservan solo como referencia no restaurable.`);
  if (legacyScenarios) warnings.push(`${legacyScenarios} alternativa(s) antiguas se conservan solo como referencia no aplicable.`);
  if (validation.errors.length) warnings.push(`El proyecto contiene ${validation.errors.length} conflicto(s) funcional(es); se abre para poder corregirlos.`);
  return { project, validation, migration, warnings };
}

function readLegacyJson(bytes, { fileName }) {
  const raw = parseJsonBytes(bytes, fileName);
  const checked = validatePortableProject(raw, { allowMigration: true });
  const warnings = [
    'Archivo JSON heredado: no contiene manifiesto ni verificación criptográfica.',
    ...checked.warnings,
    'Guárdalo de nuevo como .ghfproject para recuperar integridad verificable.',
  ];
  return {
    project: checked.project,
    source: 'LEGACY_JSON',
    fileName,
    envelope: null,
    integrity: 'UNVERIFIED_LEGACY',
    migration: checked.migration,
    warnings,
    preservedEntries: new Map(),
    preview: projectPreview(checked.project, null, fileName, 'UNVERIFIED_LEGACY'),
  };
}

function validateEnvelope(value) {
  if (!isPlainObject(value)) throw new ProjectFileError('ENVELOPE_INVALID', 'envelope.json no es un objeto válido.');
  if (value.format !== CONTAINER_FORMAT) throw new ProjectFileError('FORMAT_INVALID', 'El archivo no usa el formato ghfproject.');
  if (majorOf(value.formatVersion) !== majorOf(CONTAINER_VERSION)) {
    throw new ProjectFileError('FORMAT_VERSION_UNSUPPORTED', `La versión de contenedor ${value.formatVersion || 'desconocida'} no es compatible.`);
  }
  if (!isPlainObject(value.project)) throw new ProjectFileError('ENVELOPE_PROJECT_MISSING', 'El sobre no identifica el proyecto.');
  if (value.project.schemaId !== PROJECT_SCHEMA_ID) throw new ProjectFileError('SCHEMA_ID_UNSUPPORTED', `El esquema ${value.project.schemaId || 'desconocido'} no es compatible.`);
  if (compareVersion(String(value.project.schemaVersion || '0'), SCHEMA_VERSION) > 0) {
    throw new ProjectFileError('FUTURE_SCHEMA', `El contenedor exige el esquema ${value.project.schemaVersion}, posterior al compatible ${SCHEMA_VERSION}.`);
  }
  const required = Array.isArray(value.capabilities?.required) ? value.capabilities.required : [];
  const unknown = required.filter(capability => !SUPPORTED_REQUIRED_CAPABILITIES.has(capability));
  if (unknown.length) throw new ProjectFileError('UNKNOWN_REQUIRED_CAPABILITY', `El archivo exige capacidades no compatibles: ${unknown.join(', ')}.`);
  if (value.privacy?.containsPersonalData === true && value.privacy?.publicReleaseAllowed === true) {
    throw new ProjectFileError('PRIVACY_CONTRADICTION', 'El sobre marca datos personales y, a la vez, autoriza publicación pública.');
  }
}

async function createManifest(entries) {
  const lines = [];
  for (const name of [...entries.keys()].sort()) lines.push(`${await sha256Hex(entries.get(name))}  ${name}`);
  return `${lines.join('\n')}\n`;
}

async function verifyManifest(entries) {
  const text = decodeUtf8(entries.get('manifest.sha256'), 'manifest.sha256').replace(/^\uFEFF/, '');
  const rows = text.split(/\r?\n/).filter(Boolean);
  const listed = new Map();
  for (const row of rows) {
    const match = /^([a-fA-F0-9]{64})  ([^\r\n]+)$/.exec(row);
    if (!match) throw new ProjectFileError('MANIFEST_INVALID', `Línea de manifiesto no válida: ${row.slice(0, 120)}.`);
    validateEntryPath(match[2]);
    if (listed.has(match[2])) throw new ProjectFileError('MANIFEST_DUPLICATE', `El manifiesto repite ${match[2]}.`);
    listed.set(match[2], match[1].toLowerCase());
  }
  const actual = [...entries.keys()].filter(name => name !== 'manifest.sha256').sort();
  const expected = [...listed.keys()].sort();
  if (actual.length !== expected.length || actual.some((name, i) => name !== expected[i])) {
    throw new ProjectFileError('MANIFEST_COVERAGE', 'El manifiesto no cubre exactamente el contenido del contenedor.');
  }
  for (const [name, expectedHash] of listed) {
    const actualHash = await sha256Hex(entries.get(name));
    if (actualHash !== expectedHash) throw new ProjectFileError('MANIFEST_HASH_MISMATCH', `La integridad de ${name} no es válida.`);
  }
}

export async function readZip(bytes) {
  const data = toBytes(bytes);
  if (data.length > MAX_TOTAL_BYTES) throw new ProjectFileError('ZIP_TOO_LARGE', 'El contenedor supera el tamaño máximo permitido.');
  const eocdOffset = findEndOfCentralDirectory(data);
  if (eocdOffset < 0) throw new ProjectFileError('ZIP_EOCD_MISSING', 'El archivo ZIP no tiene un directorio central válido.');
  const eocd = new DataView(data.buffer, data.byteOffset + eocdOffset, data.byteLength - eocdOffset);
  const disk = eocd.getUint16(4, true), centralDisk = eocd.getUint16(6, true);
  const entriesOnDisk = eocd.getUint16(8, true), totalEntries = eocd.getUint16(10, true);
  const centralSize = eocd.getUint32(12, true), centralOffset = eocd.getUint32(16, true);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== totalEntries) throw new ProjectFileError('ZIP_MULTIDISK', 'No se admiten archivos ZIP multidisco.');
  if (centralOffset + centralSize > eocdOffset) throw new ProjectFileError('ZIP_CENTRAL_BOUNDS', 'El directorio central está fuera de los límites del archivo.');
  const entries = new Map();
  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let i = 0; i < totalEntries; i += 1) {
    if (offset + 46 > data.length || readU32(data, offset) !== 0x02014b50) throw new ProjectFileError('ZIP_CENTRAL_INVALID', 'El directorio central contiene una entrada no válida.');
    const madeBy = readU16(data, offset + 4);
    const flags = readU16(data, offset + 8);
    const method = readU16(data, offset + 10);
    const crc = readU32(data, offset + 16);
    const compressedSize = readU32(data, offset + 20);
    const uncompressedSize = readU32(data, offset + 24);
    const nameLength = readU16(data, offset + 28);
    const extraLength = readU16(data, offset + 30);
    const commentLength = readU16(data, offset + 32);
    const externalAttributes = readU32(data, offset + 38);
    const localOffset = readU32(data, offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd + extraLength + commentLength > data.length) throw new ProjectFileError('ZIP_NAME_BOUNDS', 'Una ruta ZIP está fuera de los límites.');
    const name = decodeUtf8(data.slice(nameStart, nameEnd), 'ruta ZIP');
    validateEntryPath(name);
    if (entries.has(name)) throw new ProjectFileError('ZIP_DUPLICATE_PATH', `El ZIP contiene la ruta duplicada ${name}.`);
    if ((madeBy >> 8) === 3) {
      const unixMode = externalAttributes >>> 16;
      if ((unixMode & 0o170000) === 0o120000) throw new ProjectFileError('ZIP_SYMLINK', `No se admiten enlaces simbólicos: ${name}.`);
    }
    if (flags & 0x0001) throw new ProjectFileError('ZIP_ENCRYPTED', 'No se admiten contenedores ZIP cifrados internamente.');
    if (![0, 8].includes(method)) throw new ProjectFileError('ZIP_METHOD_UNSUPPORTED', `Método de compresión no compatible en ${name}.`);
    if (uncompressedSize > MAX_ENTRY_BYTES) throw new ProjectFileError('ZIP_ENTRY_TOO_LARGE', `La entrada ${name} supera el tamaño permitido.`);
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_TOTAL_BYTES) throw new ProjectFileError('ZIP_TOTAL_TOO_LARGE', 'El contenido descomprimido supera el tamaño permitido.');
    if (localOffset + 30 > data.length || readU32(data, localOffset) !== 0x04034b50) throw new ProjectFileError('ZIP_LOCAL_INVALID', `La cabecera local de ${name} no es válida.`);
    const localNameLength = readU16(data, localOffset + 26);
    const localExtraLength = readU16(data, localOffset + 28);
    const payloadStart = localOffset + 30 + localNameLength + localExtraLength;
    const payloadEnd = payloadStart + compressedSize;
    if (payloadEnd > data.length) throw new ProjectFileError('ZIP_PAYLOAD_BOUNDS', `El contenido de ${name} está truncado.`);
    const compressed = data.slice(payloadStart, payloadEnd);
    const content = method === 0 ? compressed : await inflateRaw(compressed);
    if (content.length !== uncompressedSize) throw new ProjectFileError('ZIP_SIZE_MISMATCH', `El tamaño descomprimido de ${name} no coincide.`);
    if (crc32(content) !== crc) throw new ProjectFileError('ZIP_CRC_MISMATCH', `El CRC-32 de ${name} no coincide.`);
    entries.set(name, content);
    offset = nameEnd + extraLength + commentLength;
  }
  if (offset !== centralOffset + centralSize) throw new ProjectFileError('ZIP_CENTRAL_SIZE_MISMATCH', 'El tamaño del directorio central no coincide.');
  return entries;
}

export function writeStoredZip(entriesInput, generatedAt = nowIso()) {
  const entries = entriesInput instanceof Map ? entriesInput : new Map(Object.entries(entriesInput || {}));
  const date = new Date(generatedAt);
  const { dosDate, dosTime } = toDosDateTime(Number.isNaN(date.getTime()) ? new Date() : date);
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const name of [...entries.keys()].sort()) {
    validateEntryPath(name);
    const content = toBytes(entries.get(name));
    if (content.length > MAX_ENTRY_BYTES) throw new ProjectFileError('ZIP_ENTRY_TOO_LARGE', `La entrada ${name} supera el tamaño permitido.`);
    const nameBytes = encoder.encode(name);
    const crc = crc32(content);
    const local = new Uint8Array(30 + nameBytes.length + content.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, content.length, true);
    lv.setUint32(22, content.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(content, 30 + nameBytes.length);
    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, content.length, true);
    cv.setUint32(24, content.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, localOffset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);
    localOffset += local.length;
  }
  const centralOffset = localOffset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.size, true);
  ev.setUint16(10, entries.size, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralOffset, true);
  ev.setUint16(20, 0, true);
  return concatBytes([...localParts, ...centralParts, eocd]);
}

function projectPreview(project, envelope, fileName, integrity) {
  return {
    fileName,
    name: project.meta.name,
    center: project.meta.center,
    academicYear: project.meta.academicYear,
    privacyClass: project.meta.privacyClass,
    schemaVersion: project.meta.schemaVersion,
    revisionNumber: project.meta.revisionNumber,
    projectId: project.meta.projectId,
    integrity,
    containsPersonalData: envelope?.privacy?.containsPersonalData ?? project.meta.privacyClass === 'REAL',
  };
}

function parseJsonEntry(entries, name) {
  return parseJsonBytes(entries.get(name), name);
}

function parseJsonBytes(bytes, label) {
  let text;
  try { text = decodeUtf8(bytes, label).replace(/^\uFEFF/, ''); }
  catch (error) { throw new ProjectFileError('UTF8_INVALID', `${label} no usa UTF-8 válido.`, error.message); }
  try { return JSON.parse(text); }
  catch (error) { throw new ProjectFileError('JSON_INVALID', `${label} no contiene JSON válido.`, error.message); }
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function sha256Hex(value) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new ProjectFileError('CRYPTO_UNAVAILABLE', 'El dispositivo no ofrece SHA-256 mediante Web Crypto.');
  const digest = await subtle.digest('SHA-256', toBytes(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'function') throw new ProjectFileError('DEFLATE_UNAVAILABLE', 'Este navegador no puede abrir entradas ZIP comprimidas con DEFLATE.');
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (error) {
    throw new ProjectFileError('DEFLATE_INVALID', 'No se pudo descomprimir una entrada ZIP.', error.message);
  }
}

function isZip(bytes) {
  return bytes.length >= 4 && readU32(bytes, 0) === 0x04034b50;
}

function findEndOfCentralDirectory(bytes) {
  const min = Math.max(0, bytes.length - 22 - 0xffff);
  for (let offset = bytes.length - 22; offset >= min; offset -= 1) {
    if (readU32(bytes, offset) === 0x06054b50) {
      const commentLength = readU16(bytes, offset + 20);
      if (offset + 22 + commentLength === bytes.length) return offset;
    }
  }
  return -1;
}

function validateEntryPath(name) {
  if (typeof name !== 'string' || !name || name.length > 240) throw new ProjectFileError('ZIP_PATH_INVALID', 'El ZIP contiene una ruta vacía o demasiado larga.');
  if (name.includes('\\') || name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.split('/').includes('..') || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new ProjectFileError('ZIP_PATH_UNSAFE', `Ruta no permitida en el contenedor: ${name}.`);
  }
}

function compareVersion(a, b) {
  const pa = String(a).split('.').map(part => Number(part) || 0);
  const pb = String(b).split('.').map(part => Number(part) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const delta = (pa[i] || 0) - (pb[i] || 0);
    if (delta) return delta > 0 ? 1 : -1;
  }
  return 0;
}

function majorOf(version) {
  return Number(String(version || '0').split('.')[0]) || 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function decodeUtf8(bytes, label) {
  try { return decoder.decode(toBytes(bytes)); }
  catch (error) { throw new ProjectFileError('UTF8_INVALID', `${label} no usa UTF-8 válido.`, error.message); }
}

function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === 'string') return encoder.encode(value);
  throw new TypeError('Se esperaba texto, ArrayBuffer o Uint8Array.');
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

function toDosDateTime(date) {
  const year = Math.min(2107, Math.max(1980, date.getFullYear()));
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  return { dosDate, dosTime };
}

function readU16(bytes, offset) {
  if (offset < 0 || offset + 2 > bytes.length) throw new ProjectFileError('ZIP_TRUNCATED', 'El archivo ZIP está truncado.');
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, true);
}
function readU32(bytes, offset) {
  if (offset < 0 || offset + 4 > bytes.length) throw new ProjectFileError('ZIP_TRUNCATED', 'El archivo ZIP está truncado.');
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of toBytes(bytes)) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
