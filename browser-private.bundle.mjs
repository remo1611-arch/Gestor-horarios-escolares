import { Inflate, deflateSync } from './vendor/fflate/fflate-0.8.3.esm.js';
const M_constants=(()=>{
const BUILD = Object.freeze({
  id: 'P6-0G-1A4-browser-private-beta.1',
  applicationVersion: '0.7.0-beta.1',
  phase: 'P6-0G-1A4-CANDIDATA',
  authorization: 'REAL_PARCIAL_EXPERIMENTAL_PENDIENTE_QA_FISICA',
});

const MODES = Object.freeze({
  BROWSER_PRIVATE_TEMPORAL: Object.freeze({
    label: 'Privado temporal en este navegador',
    description: 'El proyecto permanece en memoria de esta pestaña. No se envía ni se persiste por la aplicación.',
    implemented: true,
  }),
  PUBLIC_DEMO: Object.freeze({
    label: 'Demostración pública sintética',
    description: 'Abre la aplicación estable con datos inequívocamente sintéticos.',
    implemented: true,
  }),
  LOCAL_PRIVATE: Object.freeze({
    label: 'Servidor local privado',
    description: 'Reservado para Python, CP-SAT, XLSX y operaciones avanzadas en 127.0.0.1.',
    implemented: false,
  }),
});

const HARD_LIMITS = Object.freeze({
  compressedInput: 16 * 1024 * 1024,
  members: 64,
  member: 8 * 1024 * 1024,
  total: 24 * 1024 * 1024,
  ratio: 100,
  pathBytes: 512,
  jsonDepth: 64,
  jsonNodes: 250000,
  jsonString: 1024 * 1024,
});

const AUTHORIZED_CLASSIFICATIONS = Object.freeze(['SYNTHETIC', 'ANONYMIZED', 'REAL']);
const REQUIRED_CAPABILITIES = Object.freeze(['CANONICAL_PROJECT', 'EXPLICIT_ACCEPTANCE', 'NO_DIRECT_WRITE']);

return {BUILD,MODES,HARD_LIMITS,AUTHORIZED_CLASSIFICATIONS,REQUIRED_CAPABILITIES};})();
const M_mode=(({MODES})=>{

function createModeGate(initial = 'BROWSER_PRIVATE_TEMPORAL') {
  let selected = initial;
  let committed = null;
  return Object.freeze({
    get selected() { return selected; },
    get committed() { return committed; },
    get canOpenData() { return committed === 'BROWSER_PRIVATE_TEMPORAL'; },
    select(mode) {
      if (committed) throw new Error('MODE_ALREADY_COMMITTED');
      if (!Object.hasOwn(MODES, mode)) throw new Error('MODE_UNKNOWN');
      selected = mode;
    },
    commit() {
      if (committed) throw new Error('MODE_ALREADY_COMMITTED');
      if (!MODES[selected].implemented) throw new Error('MODE_NOT_IMPLEMENTED');
      committed = selected;
      return committed;
    },
    reset() { selected = initial; committed = null; },
    snapshot() { return { selected, committed, canOpenData: committed === 'BROWSER_PRIVATE_TEMPORAL' }; },
  });
}

return {createModeGate};})(M_constants);
const M_network=(()=>{
const DENIED = 'NETWORK_DENIED_IN_BROWSER_PRIVATE';
function deniedError() { return new DOMException(DENIED, 'SecurityError'); }

function installNetworkGuard(globalObject = globalThis) {
  if (globalObject.__GHF_NETWORK_GUARD__) return globalObject.__GHF_NETWORK_GUARD__;
  const events = [];
  let active = false;
  const record = (api, target = '') => {
    events.push({ api, target: String(target).slice(0, 160), at: new Date().toISOString() });
    throw deniedError();
  };
  const original = {
    fetch: globalObject.fetch?.bind(globalObject),
    XMLHttpRequest: globalObject.XMLHttpRequest,
    WebSocket: globalObject.WebSocket,
    EventSource: globalObject.EventSource,
    sendBeacon: globalObject.navigator?.sendBeacon?.bind(globalObject.navigator),
  };
  if (original.fetch) globalObject.fetch = (...args) => active ? record('fetch', args[0]) : original.fetch(...args);
  if (original.XMLHttpRequest) {
    globalObject.XMLHttpRequest = class GuardedXHR extends original.XMLHttpRequest {
      open(method, url, ...rest) { if (active) record('XMLHttpRequest', url); return super.open(method, url, ...rest); }
    };
  }
  if (original.WebSocket) globalObject.WebSocket = class { constructor(url) { if (active) record('WebSocket', url); return new original.WebSocket(url); } };
  if (original.EventSource) globalObject.EventSource = class { constructor(url, options) { if (active) record('EventSource', url); return new original.EventSource(url, options); } };
  if (globalObject.navigator?.sendBeacon) {
    try { Object.defineProperty(globalObject.navigator, 'sendBeacon', { configurable: true, value: (url, data) => active ? record('sendBeacon', url) : original.sendBeacon(url, data) }); } catch { /* Navegadores con propiedad no configurable: CSP connect-src 'none' mantiene la frontera. */ }
  }
  const guard = Object.freeze({
    activate() { active = true; },
    get active() { return active; },
    events() { return events.map(item => ({ ...item })); },
    assertClean() { return events.length === 0; },
  });
  Object.defineProperty(globalObject, '__GHF_NETWORK_GUARD__', { value: guard, configurable: false });
  return guard;
}

return {installNetworkGuard};})();
const M_null=(()=>{
class NullStorage {
  get length() { return 0; }
  clear() {}
  getItem() { return null; }
  key() { return null; }
  removeItem() {}
  setItem() { throw new DOMException('PROJECT_PERSISTENCE_DENIED', 'SecurityError'); }
}

async function inventoryBrowserPersistence(globalObject = globalThis) {
  const databases = globalObject.indexedDB?.databases ? await globalObject.indexedDB.databases().catch(() => []) : [];
  const caches = globalObject.caches?.keys ? await globalObject.caches.keys().catch(() => []) : [];
  return {
    localStorageKeys: safeKeys(globalObject.localStorage),
    sessionStorageKeys: safeKeys(globalObject.sessionStorage),
    indexedDbNames: databases.map(item => item.name).filter(Boolean),
    cacheNames: caches,
    cookieLength: globalObject.document?.cookie?.length ?? 0,
  };
}
function safeKeys(storage) {
  try { return Array.from({ length: storage?.length ?? 0 }, (_, index) => storage.key(index)).filter(Boolean); }
  catch { return []; }
}

return {NullStorage,inventoryBrowserPersistence};})();
const M_zip=(({HARD_LIMITS})=>{

const CRC_TABLE = (() => { const table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } return table; })();
function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function assertRange(start, length, total, label) { if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) || start < 0 || length < 0 || start + length > total) throw new Error(`ZIP_RANGE:${label}`); }
function decodeName(bytes, utf8) { if (!bytes.length) throw new Error('ZIP_PATH_EMPTY'); if (!utf8 && bytes.some(b => b >= 128)) throw new Error('ZIP_PATH_ENCODING_AMBIGUOUS'); return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
function pathKey(path) { return path.normalize('NFKC').toLocaleLowerCase('und'); }
function validatePath(path, byteLength = new TextEncoder().encode(path).length, limits = HARD_LIMITS) {
  if (byteLength > limits.pathBytes) throw new Error('ZIP_PATH_TOO_LONG');
  if (path !== path.normalize('NFC')) throw new Error('ZIP_PATH_NOT_NFC');
  if (!path || path.includes('\\') || path.includes('\0') || path.startsWith('/') || /^[A-Za-z]:/.test(path)) throw new Error('ZIP_PATH_UNSAFE');
  if (/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(path)) throw new Error('ZIP_PATH_CONTROL');
  if (path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('ZIP_PATH_NOT_NORMALIZED');
  if (/\.(exe|dll|com|bat|cmd|msi|scr|ps1|sh|app|dmg|jar|class|vbs|js|mjs|wasm)$/i.test(path)) throw new Error('ZIP_EXECUTABLE_EXTENSION');
  return path;
}
function inflateBounded(compressed, expected, absoluteLimit) {
  const chunks = []; let total = 0;
  const inflater = new Inflate(chunk => { total += chunk.length; if (total > expected || total > absoluteLimit) throw new Error('ZIP_INFLATE_LIMIT'); chunks.push(chunk); });
  inflater.push(compressed, true);
  if (total !== expected) throw new Error('ZIP_SIZE_MISMATCH');
  const out = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; } return out;
}
function findEocd(bytes, view) { const min = Math.max(0, bytes.length - 65557); for (let i = bytes.length - 22; i >= min; i--) { if (view.getUint32(i, true) !== 0x06054b50) continue; const comment = view.getUint16(i + 20, true); if (i + 22 + comment === bytes.length) return i; } throw new Error('ZIP_EOCD_NOT_FOUND'); }
function inspectZip(buffer, limits = HARD_LIMITS) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength > limits.compressedInput) throw new Error('ZIP_INPUT_TOO_LARGE');
  if (bytes.length < 22) throw new Error('ZIP_TRUNCATED');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); const eocd = findEocd(bytes, view);
  const disk = view.getUint16(eocd + 4, true), centralDisk = view.getUint16(eocd + 6, true), countDisk = view.getUint16(eocd + 8, true), count = view.getUint16(eocd + 10, true), centralSize = view.getUint32(eocd + 12, true), centralOffset = view.getUint32(eocd + 16, true);
  if (disk !== 0 || centralDisk !== 0 || countDisk !== count) throw new Error('ZIP_MULTIDISK_UNSUPPORTED');
  if (count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new Error('ZIP64_UNSUPPORTED');
  if (count > limits.members) throw new Error('ZIP_TOO_MANY_MEMBERS');
  assertRange(centralOffset, centralSize, bytes.length, 'central'); if (centralOffset + centralSize !== eocd) throw new Error('ZIP_CENTRAL_BOUNDARY');
  let p = centralOffset, total = 0; const entries = [], keys = new Map(), intervals = [];
  for (let i = 0; i < count; i++) {
    assertRange(p, 46, bytes.length, `central-header-${i}`); if (view.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP_CENTRAL_SIGNATURE');
    const flags = view.getUint16(p + 8, true), method = view.getUint16(p + 10, true), crc = view.getUint32(p + 16, true), compressedSize = view.getUint32(p + 20, true), size = view.getUint32(p + 24, true), nameLength = view.getUint16(p + 28, true), extraLength = view.getUint16(p + 30, true), commentLength = view.getUint16(p + 32, true), diskStart = view.getUint16(p + 34, true), external = view.getUint32(p + 38, true), localOffset = view.getUint32(p + 42, true);
    if (diskStart !== 0) throw new Error('ZIP_MULTIDISK_UNSUPPORTED'); if ([compressedSize, size, localOffset].includes(0xffffffff)) throw new Error('ZIP64_UNSUPPORTED');
    assertRange(p + 46, nameLength + extraLength + commentLength, bytes.length, `central-variable-${i}`);
    const utf8 = !!(flags & 0x0800), name = validatePath(decodeName(bytes.slice(p + 46, p + 46 + nameLength), utf8), nameLength, limits), key = pathKey(name);
    if (keys.has(key)) throw new Error(`ZIP_DUPLICATE_NORMALIZED:${name}`); keys.set(key, name);
    if (flags & 0x0001) throw new Error('ZIP_ENCRYPTED'); if (flags & 0x0008) throw new Error('ZIP_DATA_DESCRIPTOR_UNSUPPORTED'); if (flags & ~0x0806) throw new Error('ZIP_FLAGS_UNSUPPORTED');
    if (method !== 0 && method !== 8) throw new Error('ZIP_METHOD_UNSUPPORTED');
    const unixMode = (external >>> 16) & 0xffff, kind = unixMode & 0xf000; if (kind === 0xa000) throw new Error('ZIP_SYMLINK'); if (unixMode & 0o111) throw new Error('ZIP_EXECUTABLE_MODE');
    if (size > limits.member) throw new Error('ZIP_MEMBER_TOO_LARGE'); if (size > 0 && compressedSize === 0) throw new Error('ZIP_COMPRESSED_SIZE_ZERO'); if (compressedSize > 0 && size / compressedSize > limits.ratio) throw new Error('ZIP_RATIO_EXCEEDED');
    total += size; if (total > limits.total) throw new Error('ZIP_TOTAL_TOO_LARGE');
    assertRange(localOffset, 30, bytes.length, `local-header-${name}`); if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('ZIP_LOCAL_SIGNATURE');
    const localFlags = view.getUint16(localOffset + 6, true), localMethod = view.getUint16(localOffset + 8, true), localCrc = view.getUint32(localOffset + 14, true), localCompressed = view.getUint32(localOffset + 18, true), localSize = view.getUint32(localOffset + 22, true), localNameLength = view.getUint16(localOffset + 26, true), localExtraLength = view.getUint16(localOffset + 28, true);
    assertRange(localOffset + 30, localNameLength + localExtraLength, bytes.length, `local-variable-${name}`);
    const localName = decodeName(bytes.slice(localOffset + 30, localOffset + 30 + localNameLength), !!(localFlags & 0x0800));
    if (localName !== name || localFlags !== flags || localMethod !== method || localCrc !== crc || localCompressed !== compressedSize || localSize !== size) throw new Error('ZIP_LOCAL_CENTRAL_MISMATCH');
    const start = localOffset + 30 + localNameLength + localExtraLength, end = start + compressedSize; assertRange(start, compressedSize, bytes.length, `compressed-${name}`); if (end > centralOffset) throw new Error('ZIP_MEMBER_CROSSES_CENTRAL');
    intervals.push({ start: localOffset, end, name }); entries.push({ name, method, crc, compressedSize, size, start, end }); p += 46 + nameLength + extraLength + commentLength;
  }
  if (p !== centralOffset + centralSize) throw new Error('ZIP_CENTRAL_SIZE_MISMATCH'); intervals.sort((a,b) => a.start - b.start); for (let i = 1; i < intervals.length; i++) if (intervals[i].start < intervals[i-1].end) throw new Error('ZIP_MEMBER_OVERLAP');
  return { bytes, entries, total };
}
function readZipHardened(buffer, limits = HARD_LIMITS) {
  const info = inspectZip(buffer, limits), files = new Map(), meta = [];
  for (const entry of info.entries) { const compressed = info.bytes.slice(entry.start, entry.end); const raw = entry.method === 0 ? compressed : inflateBounded(compressed, entry.size, limits.member); if (raw.length !== entry.size) throw new Error('ZIP_SIZE_MISMATCH'); if (crc32(raw) !== entry.crc) throw new Error('ZIP_CRC_MISMATCH'); files.set(entry.name, raw); meta.push({ name: entry.name, method: entry.method, compressedSize: entry.compressedSize, size: entry.size }); }
  return { files, meta, total: info.total };
}

function u16(view, offset, value) { view.setUint16(offset, value, true); }
function u32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
function concat(chunks) { const size = chunks.reduce((sum, item) => sum + item.length, 0), out = new Uint8Array(size); let p = 0; for (const item of chunks) { out.set(item, p); p += item.length; } return out; }
function writeCanonicalZip(fileMap, limits = HARD_LIMITS) {
  const encoder = new TextEncoder(); const names = [...fileMap.keys()].sort((a,b) => a.localeCompare(b, 'en'));
  if (names.length > limits.members) throw new Error('ZIP_TOO_MANY_MEMBERS');
  const localChunks = [], centralChunks = []; let localOffset = 0, totalRaw = 0;
  for (const name of names) {
    const nameBytes = encoder.encode(validatePath(name)); const raw = fileMap.get(name) instanceof Uint8Array ? fileMap.get(name) : encoder.encode(String(fileMap.get(name)));
    totalRaw += raw.length; if (raw.length > limits.member || totalRaw > limits.total) throw new Error('ZIP_OUTPUT_LIMIT');
    const compressedCandidate = deflateSync(raw, { level: 6 }); const safeDeflate = compressedCandidate.length > 0 && raw.length / compressedCandidate.length <= limits.ratio; const method = safeDeflate && compressedCandidate.length < raw.length ? 8 : 0; const payload = method === 8 ? compressedCandidate : raw; const crc = crc32(raw); const flags = 0x0800;
    const local = new Uint8Array(30 + nameBytes.length); const lv = new DataView(local.buffer); u32(lv,0,0x04034b50); u16(lv,4,20); u16(lv,6,flags); u16(lv,8,method); u16(lv,10,0); u16(lv,12,0x21); u32(lv,14,crc); u32(lv,18,payload.length); u32(lv,22,raw.length); u16(lv,26,nameBytes.length); u16(lv,28,0); local.set(nameBytes,30); localChunks.push(local,payload);
    const central = new Uint8Array(46 + nameBytes.length); const cv = new DataView(central.buffer); u32(cv,0,0x02014b50); u16(cv,4,0x0314); u16(cv,6,20); u16(cv,8,flags); u16(cv,10,method); u16(cv,12,0); u16(cv,14,0x21); u32(cv,16,crc); u32(cv,20,payload.length); u32(cv,24,raw.length); u16(cv,28,nameBytes.length); u16(cv,30,0); u16(cv,32,0); u16(cv,34,0); u16(cv,36,0); u32(cv,38,0); u32(cv,42,localOffset); central.set(nameBytes,46); centralChunks.push(central); localOffset += local.length + payload.length;
  }
  const central = concat(centralChunks); const eocd = new Uint8Array(22); const ev = new DataView(eocd.buffer); u32(ev,0,0x06054b50); u16(ev,4,0); u16(ev,6,0); u16(ev,8,names.length); u16(ev,10,names.length); u32(ev,12,central.length); u32(ev,16,localOffset); u16(ev,20,0);
  const out = concat([...localChunks, central, eocd]); if (out.length > limits.compressedInput) throw new Error('ZIP_OUTPUT_COMPRESSED_LIMIT'); return out;
}

return {crc32,validatePath,inspectZip,readZipHardened,writeCanonicalZip};})(M_constants);
const M_ghf=((C,Z)=>{const {AUTHORIZED_CLASSIFICATIONS,HARD_LIMITS,REQUIRED_CAPABILITIES}=C;const {readZipHardened,validatePath}=Z;
const decoder = new TextDecoder('utf-8', { fatal: true });
const encoder = new TextEncoder();
const HEX64 = /^[a-f0-9]{64}$/;
async function sha256Hex(bytes) { const digest = await crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2,'0')).join(''); }
function parseJson(bytes, label) { let value; try { value = JSON.parse(decoder.decode(bytes)); } catch { throw new Error(`JSON_INVALID:${label}`); } validateJsonValue(value); return value; }
function validateJsonValue(root, limits = HARD_LIMITS) {
  let nodes = 0; const stack = [{ value: root, depth: 0 }];
  while (stack.length) { const { value, depth } = stack.pop(); if (++nodes > limits.jsonNodes) throw new Error('JSON_TOO_MANY_NODES'); if (depth > limits.jsonDepth) throw new Error('JSON_TOO_DEEP');
    if (typeof value === 'string' && encoder.encode(value).length > limits.jsonString) throw new Error('JSON_STRING_TOO_LONG');
    if (value && typeof value === 'object') { for (const [key, child] of Object.entries(value)) { if (key === '__proto__' || key === 'prototype' || key === 'constructor') throw new Error('JSON_DANGEROUS_KEY'); stack.push({ value: child, depth: depth + 1 }); } }
  }
}
function parseManifest(bytes) { const text = decoder.decode(bytes); const entries = new Map(); for (const raw of text.split(/\r?\n/)) { if (!raw) continue; const match = /^([a-f0-9]{64})  (.+)$/.exec(raw); if (!match) throw new Error('MANIFEST_LINE_INVALID'); const path = validatePath(match[2]); if (path === 'manifest.sha256' || entries.has(path)) throw new Error('MANIFEST_DUPLICATE_OR_SELF'); entries.set(path, match[1]); } return entries; }
function getClassification(envelope, project) { const direct = String(envelope?.privacy?.classification || '').toUpperCase(); const nature = String(project?.metadata?.dataNature || '').toUpperCase(); if (AUTHORIZED_CLASSIFICATIONS.includes(direct)) return direct; if (AUTHORIZED_CLASSIFICATIONS.includes(nature)) return nature; if (direct === 'PRIVATE' && AUTHORIZED_CLASSIFICATIONS.includes(nature)) return nature; throw new Error('CLASSIFICATION_UNKNOWN'); }
function validateCore(envelope, project) {
  if (envelope?.containerSchemaId !== 'ghf_container_1.0') throw new Error('ENVELOPE_SCHEMA_UNSUPPORTED');
  if (project?.schemaId !== 'ghf_project_1.0' || project?.schemaVersion !== '1.0.0') throw new Error('PROJECT_SCHEMA_UNSUPPORTED');
  if (!project?.identity?.projectId || envelope.projectId !== project.identity.projectId) throw new Error('PROJECT_ID_MISMATCH');
  const required = envelope?.capabilities?.required; if (!Array.isArray(required)) throw new Error('CAPABILITIES_INVALID'); for (const capability of REQUIRED_CAPABILITIES) if (!required.includes(capability)) throw new Error(`CAPABILITY_REQUIRED:${capability}`);
  if (project?.workflowPolicy?.directWriteAllowed !== false) throw new Error('DIRECT_WRITE_FORBIDDEN');
}
async function readGhfProject(buffer, { allowedClassifications = AUTHORIZED_CLASSIFICATIONS } = {}) {
  const sourceBytes = buffer instanceof Uint8Array ? new Uint8Array(buffer) : new Uint8Array(buffer); const archive = readZipHardened(sourceBytes);
  for (const required of ['envelope.json','manifest.sha256','project.json']) if (!archive.files.has(required)) throw new Error(`MEMBER_REQUIRED:${required}`);
  const manifest = parseManifest(archive.files.get('manifest.sha256')); const fileNames = [...archive.files.keys()].filter(name => name !== 'manifest.sha256').sort(); const manifestNames = [...manifest.keys()].sort(); if (JSON.stringify(fileNames) !== JSON.stringify(manifestNames)) throw new Error('MANIFEST_MEMBERS_MISMATCH');
  for (const [path, expected] of manifest) { const actual = await sha256Hex(archive.files.get(path)); if (actual !== expected) throw new Error(`MANIFEST_HASH_MISMATCH:${path}`); }
  const envelope = parseJson(archive.files.get('envelope.json'), 'envelope.json'), project = parseJson(archive.files.get('project.json'), 'project.json'); validateCore(envelope, project);
  const projectHash = await sha256Hex(archive.files.get('project.json')); if (envelope?.integrity?.projectSha256 !== projectHash) throw new Error('PROJECT_HASH_MISMATCH');
  const classification = getClassification(envelope, project); if (!allowedClassifications.includes(classification)) throw new Error(`CLASSIFICATION_NOT_AUTHORIZED:${classification}`);
  return { sourceBytes, files: archive.files, meta: archive.meta, envelope, project, classification, sourceSha256: await sha256Hex(sourceBytes), projectSha256: projectHash };
}
function jsonBytes(value) { return encoder.encode(JSON.stringify(value, null, 2) + '\n'); }
function cloneValue(value) { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function sanitizeError(error) { const code = String(error?.message || error || 'ERROR_UNKNOWN').split('\n')[0].replace(/[^A-Z0-9_:\-.]/gi, '_').slice(0, 180); return code || 'ERROR_UNKNOWN'; }

return {sha256Hex,validateJsonValue,readGhfProject,jsonBytes,cloneValue,sanitizeError};})(M_constants,M_zip);
const M_empty=(()=>{
function createEmptyProject({ classification = 'SYNTHETIC', title = 'Proyecto nuevo', now = new Date().toISOString(), projectId = makeId() } = {}) {
  const containsPersonalData = classification === 'REAL';
  const project = {
    schemaId: 'ghf_project_1.0', schemaVersion: '1.0.0',
    identity: { projectId, title, status: 'DRAFT', createdAt: now, updatedAt: now, contractId: 'GHFPROJECT-1.0', description: 'Proyecto creado localmente en el navegador. Configuración parcial pendiente.' },
    center: { centerId: `CENTER-${projectId}`, name: 'Centro pendiente de configurar', centerType: 'PENDING_CONFIGURATION', autonomousCommunity: 'PENDIENTE', locality: 'PENDIENTE', responsibleRole: null },
    academicYear: { label: '2026/2027', startDate: null, endDate: null },
    timeModel: { timezone: 'Europe/Madrid', days: [{ id: 'DAY-PENDING', label: 'Día pendiente de configurar', order: 1 }], slots: [{ id: 'SLOT-PENDING', label: 'Tramo pendiente de configurar', order: 1, kind: 'NON_LECTIVE', start: '00:00', end: '00:01', countsPresence: false }] },
    groups: [], teachers: [], subjects: [], spaces: [], teachingNeeds: [], availability: [], organizationalActivities: [], constraints: [],
    workflowPolicy: { directWriteAllowed: false, previewRequired: true, explicitAcceptanceRequired: true, repairCreatesCopy: true, blockHardConflicts: true, importedDraftRequiresRevalidation: true, allowWarningsInDraft: true, automaticPlacement: false },
    solverConfiguration: { profileId: 'PROFILE-PENDING', backendPreference: 'AUTO', seed: 0, timeLimitSeconds: 120, objectives: [], prevalidation: { minimumPresenceMode: 'BLOCKING', weeklyLectiveSlotsExpected: 1, countReadingAsLective: false } },
    schedule: { status: 'DRAFT', sessions: [], candidateId: null, acceptedAt: null },
    metadata: { dataNature: classification, privacyClassification: classification, sourcePhase: 'P6-0G-1A3', sourceApplicationVersion: '0.7.0-beta.1', importedAt: null, notes: 'Proyecto vacío con edición parcial. Completar estructura antes de prevalidar o generar.', tags: ['empty','browser-private','partial-editor'] },
    extensionReferences: [],
  };
  const envelope = {
    containerSchemaId: 'ghf_container_1.0', containerVersion: '1.0.0', projectSchemaId: 'ghf_project_1.0', projectSchemaVersion: '1.0.0', projectId, createdAt: now, savedAt: now,
    application: { name: 'Gestor de Horarios Escolares', version: '0.7.0-beta.1', phase: 'P6-0G-1A4-CANDIDATA' },
    compatibility: { minimumReaderVersion: '0.7.0-beta.1', maximumTestedReaderVersion: '0.7.0-beta.1', migrationRequired: false, sourceSchemaId: null, sourceSchemaVersion: null },
    integrity: { algorithm: 'SHA-256', manifestPath: 'manifest.sha256', projectPath: 'project.json', projectSha256: '' },
    privacy: { containsPersonalData, intendedUse: classification === 'SYNTHETIC' ? 'SYNTHETIC_TEST' : 'PRIVATE_LOCAL_WORK', publicReleaseAllowed: classification === 'SYNTHETIC', classification },
    capabilities: { required: ['CANONICAL_PROJECT','EXPLICIT_ACCEPTANCE','NO_DIRECT_WRITE'], optional: [] },
  };
  const audit = JSON.stringify({ schemaId: 'ghf_trace_event_1.0', schemaVersion: '1.0.0', eventId: `EVENT-${projectId}-CREATED`, projectId, timestamp: now, eventType: 'PROJECT_CREATED', actor: 'Usuario local', summary: 'Proyecto creado en BROWSER_PRIVATE_TEMPORAL.', relatedIds: [], beforeSha256: null, afterSha256: null }) + '\n';
  const traceIndex = { schemaId: 'ghf_traceability_index_1.0', schemaVersion: '1.0.0', projectId, eventCount: 1, generationCount: 0, acceptanceCount: 0, lastEventAt: now };
  return { envelope, project, additionalTextFiles: new Map([['traceability/audit.jsonl', audit], ['traceability/index.json', JSON.stringify(traceIndex, null, 2) + '\n']]) };
}
function makeId() { const random = crypto.getRandomValues(new Uint32Array(3)); return `LOCAL-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${[...random].map(value => value.toString(16).padStart(8,'0')).join('').slice(0,16).toUpperCase()}`; }

return {createEmptyProject};})();
const M_serializer=((C,G,Z)=>{const {BUILD,HARD_LIMITS}=C;const {cloneValue,jsonBytes,sha256Hex}=G;const {writeCanonicalZip}=Z;
const encoder = new TextEncoder();
async function serializeCanonical({ files = new Map(), envelope, project }) {
  const nextFiles = new Map(); for (const [path, bytes] of files) if (!['envelope.json','project.json','manifest.sha256'].includes(path)) nextFiles.set(path, bytes instanceof Uint8Array ? new Uint8Array(bytes) : encoder.encode(String(bytes)));
  const nextEnvelope = cloneValue(envelope), nextProject = cloneValue(project), now = new Date().toISOString();
  nextProject.identity.updatedAt = now; nextEnvelope.savedAt = now; nextEnvelope.projectId = nextProject.identity.projectId;
  nextEnvelope.application = { name: 'Gestor de Horarios Escolares', version: BUILD.applicationVersion, phase: BUILD.phase };
  const classification = String(nextProject?.metadata?.dataNature || nextEnvelope?.privacy?.classification || 'SYNTHETIC').toUpperCase();
  nextEnvelope.privacy = { ...(nextEnvelope.privacy || {}), classification, containsPersonalData: classification === 'REAL', intendedUse: classification === 'SYNTHETIC' ? 'SYNTHETIC_TEST' : 'PRIVATE_LOCAL_WORK', publicReleaseAllowed: classification === 'SYNTHETIC' };
  const projectBytes = jsonBytes(nextProject); const projectSha256 = await sha256Hex(projectBytes); nextEnvelope.integrity = { algorithm: 'SHA-256', manifestPath: 'manifest.sha256', projectPath: 'project.json', projectSha256 };
  nextFiles.set('project.json', projectBytes); nextFiles.set('envelope.json', jsonBytes(nextEnvelope));
  const lines = []; for (const path of [...nextFiles.keys()].sort((a,b) => a.localeCompare(b,'en'))) lines.push(`${await sha256Hex(nextFiles.get(path))}  ${path}`); nextFiles.set('manifest.sha256', encoder.encode(lines.join('\n') + '\n'));
  const bytes = writeCanonicalZip(nextFiles, HARD_LIMITS); return { bytes, envelope: nextEnvelope, project: nextProject, files: nextFiles, sha256: await sha256Hex(bytes), projectSha256 };
}

return {serializeCanonical};})(M_constants,M_ghf,M_zip);
const M_session=((E,G,S)=>{const {createEmptyProject}=E;const {cloneValue,readGhfProject,sha256Hex}=G;const {serializeCanonical}=S;
class ProjectSession {
  #active = null; #dirty = false; #copyState = 'NONE'; #objectUrls = new Set();
  get active() { return this.#active; } get dirty() { return this.#dirty; } get copyState() { return this.#copyState; }
  async open(buffer, options) { if (this.#active) throw new Error('PROJECT_ALREADY_ACTIVE'); this.#active = await readGhfProject(buffer, options); this.#dirty = false; this.#copyState = 'NONE'; return this.snapshot(); }
  async create(options) { if (this.#active) throw new Error('PROJECT_ALREADY_ACTIVE'); const built = createEmptyProject(options); const serialized = await serializeCanonical({ files: built.additionalTextFiles, envelope: built.envelope, project: built.project }); this.#active = await readGhfProject(serialized.bytes); this.#dirty = true; this.#copyState = 'COPIA_GENERADA'; return this.snapshot(); }
  updateGeneral(fields) { if (!this.#active) throw new Error('NO_ACTIVE_PROJECT'); const project = this.#active.project;
    const assign = (object, key, value) => { if (typeof value === 'string') object[key] = value.trim().slice(0, 500); };
    assign(project.identity,'title',fields.title); assign(project.identity,'description',fields.description); assign(project.center,'name',fields.centerName); assign(project.center,'centerType',fields.centerType); assign(project.center,'autonomousCommunity',fields.autonomousCommunity); assign(project.center,'locality',fields.locality); assign(project.center,'responsibleRole',fields.responsibleRole); assign(project.academicYear,'label',fields.academicYear);
    if (fields.classification) { project.metadata ??= {}; project.metadata.dataNature = fields.classification; project.metadata.privacyClassification = fields.classification; this.#active.classification = fields.classification; }
    this.#dirty = true; this.#copyState = 'NONE'; return this.snapshot();
  }
  async canonicalCopy() { if (!this.#active) throw new Error('NO_ACTIVE_PROJECT'); const result = await serializeCanonical(this.#active); const verified = await readGhfProject(result.bytes); if (JSON.stringify(verified.project) !== JSON.stringify(result.project)) throw new Error('ROUNDTRIP_PROJECT_MISMATCH'); this.#copyState = 'COPIA_GENERADA'; return result; }
  binaryCopy() { if (!this.#active?.sourceBytes) throw new Error('NO_SOURCE_BINARY'); return { bytes: new Uint8Array(this.#active.sourceBytes), sha256: this.#active.sourceSha256 }; }
  markDownloadRequested(kind = 'canonical') { this.#copyState = kind === 'binary' ? 'COPIA_BINARIA_SOLICITADA' : 'DESCARGA_SOLICITADA'; }
  declareSaved() { if (this.#copyState !== 'DESCARGA_SOLICITADA') throw new Error('CANONICAL_DOWNLOAD_NOT_REQUESTED'); this.#copyState = 'USUARIO_DECLARA_COPIA_GUARDADA'; this.#dirty = false; }
  registerObjectUrl(url) { this.#objectUrls.add(url); }
  releaseObjectUrl(url) { if (this.#objectUrls.delete(url)) URL.revokeObjectURL(url); }
  async close() { for (const url of this.#objectUrls) URL.revokeObjectURL(url); this.#objectUrls.clear(); if (this.#active?.sourceBytes) this.#active.sourceBytes.fill(0); if (this.#active?.files) for (const bytes of this.#active.files.values()) if (bytes?.fill) bytes.fill(0); this.#active = null; this.#dirty = false; this.#copyState = 'NONE'; await Promise.resolve(); }
  snapshot() { if (!this.#active) return { active: false, dirty: false, copyState: this.#copyState }; const p = this.#active.project; return { active: true, dirty: this.#dirty, copyState: this.#copyState, classification: this.#active.classification, sourceSha256: this.#active.sourceSha256, projectId: p.identity.projectId, title: p.identity.title, center: p.center?.name || '', academicYear: p.academicYear?.label || '', counts: { groups: p.groups?.length || 0, teachers: p.teachers?.length || 0, subjects: p.subjects?.length || 0, spaces: p.spaces?.length || 0, needs: p.teachingNeeds?.length || 0, sessions: p.schedule?.sessions?.length || 0 } }; }
}
async function equivalentProjectBytes(a, b) { return await sha256Hex(a) === await sha256Hex(b); }

return {ProjectSession,equivalentProjectBytes};})(M_empty,M_ghf,M_serializer);
((C,M,N,Z,S,G)=>{const {AUTHORIZED_CLASSIFICATIONS,BUILD,MODES}=C;const {createModeGate}=M;const {installNetworkGuard}=N;const {inventoryBrowserPersistence}=Z;const {ProjectSession}=S;const {sanitizeError}=G;

const gate = createModeGate(), network = installNetworkGuard(), session = new ProjectSession();
const $ = id => document.getElementById(id); const els = Object.fromEntries(['mode-form','mode-status','continue-mode','project-file','open-panel','workspace','status','summary','editor','download-original','download-canonical','declare-saved','close-project','new-project','apply-edit','classification','persistence','network-events','build-state'].map(id => [id,$(id)]));
els['build-state'].textContent = `${BUILD.id} · ${BUILD.authorization}`;
function setStatus(message, kind = 'info') { els.status.textContent = message; els.status.dataset.kind = kind; }
function renderMode() { const s = gate.snapshot(); els['mode-status'].textContent = s.committed ? `Modo fijado: ${MODES[s.committed].label}` : `Modo propuesto: ${MODES[s.selected].label}. Confírmalo antes de abrir datos.`; els['continue-mode'].disabled = !MODES[s.selected].implemented; els['open-panel'].hidden = !s.canOpenData; }
function renderProject() { const s = session.snapshot(); els.workspace.hidden = !s.active; if (!s.active) { els.summary.replaceChildren(); return; }
  const rows = [['Proyecto',s.title],['Identificador',s.projectId],['Clasificación',s.classification],['Centro',s.center],['Curso',s.academicYear],['SHA-256 de entrada',s.sourceSha256],['Estado',s.dirty?'MODIFICADO':'LIMPIO'],['Copia',s.copyState],['Grupos',s.counts.groups],['Docentes',s.counts.teachers],['Materias',s.counts.subjects],['Espacios',s.counts.spaces],['Necesidades',s.counts.needs],['Sesiones',s.counts.sessions]];
  const dl=document.createElement('dl'); for(const [term,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=String(value);dl.append(dt,dd)} els.summary.replaceChildren(dl);
  const p=session.active.project; const values={title:p.identity?.title||'',description:p.identity?.description||'',centerName:p.center?.name||'',centerType:p.center?.centerType||'',autonomousCommunity:p.center?.autonomousCommunity||'',locality:p.center?.locality||'',responsibleRole:p.center?.responsibleRole||'',academicYear:p.academicYear?.label||'',classification:s.classification}; for(const [name,value] of Object.entries(values)){const input=els.editor.elements.namedItem(name);if(input)input.value=value}
}
async function refreshDiagnostics(){const inv=await inventoryBrowserPersistence();els.persistence.textContent=JSON.stringify(inv);els['network-events'].textContent=String(network.events().length)}
function requestReplacement(action){if(!session.active)return true;if(!session.dirty)return confirm('Se cerrará el proyecto activo antes de continuar.');const answer=prompt('El proyecto tiene cambios. Escribe COPIA para descargar una copia, DESCARTAR para cerrarlo o CANCELAR.','CANCELAR');if(answer==='COPIA'){els['download-canonical'].click();return false}if(answer==='DESCARTAR')return confirm('Confirmar descarte explícito de los cambios.');return false}
async function closeActive(){await session.close();els['project-file'].value='';renderProject();setStatus('Proyecto cerrado. Las referencias y buffers controlados se han liberado best-effort.');await refreshDiagnostics()}
function download(bytes,name,type='application/octet-stream',kind='canonical'){const url=URL.createObjectURL(new Blob([bytes],{type}));session.registerObjectUrl(url);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();session.markDownloadRequested(kind);setTimeout(()=>session.releaseObjectUrl(url),1000);renderProject()}
function safeName(value){return String(value||'proyecto').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)||'proyecto'}
els['mode-form'].addEventListener('change',event=>{if(event.target.name==='mode'){gate.select(event.target.value);renderMode()}});
els['mode-form'].addEventListener('submit',event=>{event.preventDefault();const mode=gate.commit();if(mode==='PUBLIC_DEMO'){location.assign('index.html');return}network.activate();renderMode();setStatus('Frontera privada activa. Selecciona un .ghfproject local.');refreshDiagnostics()});
els['project-file'].addEventListener('change',async()=>{const file=els['project-file'].files?.[0];if(!file)return;try{if(session.active){if(!requestReplacement('open')){els['project-file'].value='';return}await session.close()}const bytes=new Uint8Array(await file.arrayBuffer());await session.open(bytes,{allowedClassifications:AUTHORIZED_CLASSIFICATIONS});renderProject();setStatus(`Proyecto validado y abierto localmente: ${file.name}`,'ok');await refreshDiagnostics()}catch(error){els['project-file'].value='';setStatus(`No se pudo abrir: ${sanitizeError(error)}`,'error')}});
els['download-original'].addEventListener('click',()=>{try{const copy=session.binaryCopy();download(copy.bytes,`${safeName(session.active.project.identity.title)}_COPIA_BINARIA.ghfproject`,'application/octet-stream','binary');setStatus(`Copia binaria solicitada. SHA-256: ${copy.sha256}`,'ok')}catch(error){setStatus(sanitizeError(error),'error')}});
els['download-canonical'].addEventListener('click',async()=>{try{const result=await session.canonicalCopy();download(result.bytes,`${safeName(result.project.identity.title)}_${new Date().toISOString().slice(0,10)}.ghfproject`);setStatus(`Copia canónica validada y descarga solicitada. SHA-256: ${result.sha256}`,'ok')}catch(error){setStatus(`Exportación bloqueada: ${sanitizeError(error)}`,'error')}});
els['declare-saved'].addEventListener('click',()=>{try{session.declareSaved();renderProject();setStatus('El usuario declara que la copia fue guardada. La aplicación no confirma la descarga automáticamente.','ok')}catch(error){setStatus(sanitizeError(error),'error')}});
els['close-project'].addEventListener('click',async()=>{if(session.dirty&&!confirm('Hay cambios no declarados como guardados. ¿Descartarlos y cerrar?'))return;await closeActive()});
els['new-project'].addEventListener('click',async()=>{try{if(session.active){if(!requestReplacement('new'))return;await session.close()}const classification=els.classification.value;await session.create({classification,title:'Proyecto nuevo'});renderProject();setStatus(`Proyecto vacío creado en memoria con clasificación ${classification}.`,'ok');await refreshDiagnostics()}catch(error){setStatus(sanitizeError(error),'error')}});
els['apply-edit'].addEventListener('click',event=>{event.preventDefault();try{const data=Object.fromEntries(new FormData(els.editor));if(data.classification==='REAL'&&session.active.classification!=='REAL'&&!confirm('REAL puede contener datos personales. Esta build solo ofrece edición parcial temporal y sigue pendiente de QA física. ¿Continuar?'))return;session.updateGeneral(data);renderProject();setStatus('Edición parcial aplicada en memoria. Genera una copia para conservarla.','ok')}catch(error){setStatus(sanitizeError(error),'error')}});
window.addEventListener('beforeunload',event=>{if(session.dirty){event.preventDefault();event.returnValue=''}});
window.__GHF_BROWSER_PRIVATE_TEST__=Object.freeze({gate,network,session,inventoryBrowserPersistence});renderMode();renderProject();refreshDiagnostics();

})(M_constants,M_mode,M_network,M_null,M_session,M_ghf);
