import { APP_VERSION, SCHEMA_VERSION, deepClone, nowIso, sha256HexSync } from './core.mjs';
import { stableStringify } from './canonical_json.mjs';

export const STORAGE_CONTRACT_VERSION = 'storage-resilience-contract-1.0';
export const STORAGE_DB_VERSION = 2;
export const ERROR_LOG_LIMIT = 50;

const DB_NAME = 'ghe_clean_workspace';
const STORE = 'kv';
const DIAGNOSTICS_STORE = 'diagnostics';
const ACTIVE = 'active';
const LAST_GOOD = 'active:last-good';
const PENDING = 'active:pending';
const ERROR_LOG = 'errors';
const BACKUP_KEYS = ['backup:current', 'backup:prev1', 'backup:prev2', 'backup:prev3'];
const WORKSPACE_KEYS = [ACTIVE, LAST_GOOD, PENDING, ...BACKUP_KEYS];
let fallback = false;
let dbPromise = null;
let lastRecovery = { action: 'NONE', message: 'No fue necesaria ninguna recuperación.', at: '' };

function compareVersion(a, b) {
  const pa = String(a || '').split('.').map(Number);
  const pb = String(b || '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const av = Number.isFinite(pa[i]) ? pa[i] : 0;
    const bv = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (av !== bv) return av < bv ? -1 : 1;
  }
  return 0;
}

function checksumProject(project) {
  return sha256HexSync(stableStringify(project));
}

function stampProject(project) {
  const p = deepClone(project);
  if (!p?.meta || typeof p.meta !== 'object') throw new Error('El proyecto no contiene metadatos válidos.');
  p.meta.updatedAt = nowIso();
  return p;
}

function makeEnvelope(project, { stamp = true } = {}) {
  const p = stamp ? stampProject(project) : deepClone(project);
  return {
    contractVersion: STORAGE_CONTRACT_VERSION,
    appVersion: APP_VERSION,
    schemaVersion: String(p?.meta?.schemaVersion || SCHEMA_VERSION),
    savedAt: nowIso(),
    checksum: checksumProject(p),
    project: p,
  };
}

function decodeProjectRecord(record) {
  if (!record) return { valid: false, reason: 'MISSING', project: null, envelope: null, legacy: false };
  if (record?.meta && typeof record.meta === 'object') {
    return { valid: true, reason: 'LEGACY', project: deepClone(record), envelope: null, legacy: true, savedAt: record.meta.updatedAt || '' };
  }
  if (!record || record.contractVersion !== STORAGE_CONTRACT_VERSION || !record.project?.meta) {
    return { valid: false, reason: 'CONTRACT', project: null, envelope: null, legacy: false };
  }
  if (compareVersion(record.schemaVersion, SCHEMA_VERSION) > 0) {
    return { valid: false, reason: 'FUTURE_SCHEMA', project: null, envelope: deepClone(record), legacy: false };
  }
  const actual = checksumProject(record.project);
  if (actual !== record.checksum) {
    return { valid: false, reason: 'CHECKSUM', project: null, envelope: deepClone(record), legacy: false };
  }
  return {
    valid: true,
    reason: 'OK',
    project: deepClone(record.project),
    envelope: deepClone(record),
    legacy: false,
    savedAt: record.savedAt || '',
  };
}

function makeBackupRecord(project, label) {
  const p = deepClone(project);
  return {
    contractVersion: STORAGE_CONTRACT_VERSION,
    createdAt: nowIso(),
    label: String(label || 'Copia local').slice(0, 120),
    checksum: checksumProject(p),
    project: p,
  };
}

function decodeBackupRecord(record) {
  if (!record?.project) return { valid: false, record: null };
  if (!record.checksum) return { valid: true, record: deepClone(record), legacy: true };
  const valid = checksumProject(record.project) === record.checksum;
  return { valid, record: valid ? deepClone(record) : null, legacy: false };
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      fallback = true;
      resolve(null);
      return;
    }
    let settled = false;
    const req = indexedDB.open(DB_NAME, STORAGE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(DIAGNOSTICS_STORE)) db.createObjectStore(DIAGNOSTICS_STORE);
    };
    req.onsuccess = () => {
      settled = true;
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => {
      if (settled) return;
      settled = true;
      if (req.error?.name === 'VersionError') {
        dbPromise = null;
        reject(new Error('La base local pertenece a una versión posterior de la aplicación. Abre la versión más reciente antes de continuar.'));
        return;
      }
      fallback = true;
      resolve(null);
    };
    req.onblocked = () => {
      if (!settled) {
        settled = true;
        dbPromise = null;
        reject(new Error('La actualización de IndexedDB está bloqueada por otra pestaña. Cierra las demás pestañas de la aplicación y vuelve a abrirla.'));
      }
    };
  });
  return dbPromise;
}

function localKey(key) { return `ghe:${key}`; }
function localGet(key) {
  try {
    const raw = localStorage.getItem(localKey(key));
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}
function localSet(key, value) { localStorage.setItem(localKey(key), JSON.stringify(value)); }
function localDelete(key) { localStorage.removeItem(localKey(key)); }

async function idbGet(key, storeName = STORE) {
  const db = await openDb();
  if (!db) return localGet(storeName === STORE ? key : `diag:${key}`);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error || new Error('No se pudo leer IndexedDB.'));
  });
}

async function idbSet(key, value, storeName = STORE) {
  const db = await openDb();
  if (!db) return localSet(storeName === STORE ? key : `diag:${key}`, value);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('No se pudo escribir en IndexedDB.'));
    tx.onabort = () => reject(tx.error || new Error('La escritura en IndexedDB fue cancelada.'));
  });
}

async function idbDelete(key, storeName = STORE) {
  const db = await openDb();
  if (!db) {
    localDelete(storeName === STORE ? key : `diag:${key}`);
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('No se pudo borrar el dato local.'));
  });
}

async function stagePending(envelope) {
  await idbSet(PENDING, envelope);
}

function localAtomicCommit({ envelope, backup = null, replaceActive = true, captureCurrent = true }) {
  const before = new Map(WORKSPACE_KEYS.map(key => [key, localStorage.getItem(localKey(key))]));
  try {
    const currentRaw = localGet(ACTIVE);
    if (backup) rotateLocalBackups(backup);
    if (replaceActive) {
      if (currentRaw && captureCurrent) localSet(LAST_GOOD, currentRaw);
      localSet(ACTIVE, envelope);
    }
    localDelete(PENDING);
  } catch (error) {
    for (const [key, raw] of before) {
      if (raw == null) localStorage.removeItem(localKey(key));
      else localStorage.setItem(localKey(key), raw);
    }
    throw error;
  }
}

function rotateLocalBackups(backup) {
  const current = localGet('backup:current');
  const p1 = localGet('backup:prev1');
  const p2 = localGet('backup:prev2');
  if (p2) localSet('backup:prev3', p2); else localDelete('backup:prev3');
  if (p1) localSet('backup:prev2', p1); else localDelete('backup:prev2');
  if (current) localSet('backup:prev1', current); else localDelete('backup:prev1');
  localSet('backup:current', backup);
}

async function idbAtomicCommit(db, { envelope, backup = null, replaceActive = true, captureCurrent = true }) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const keys = backup ? ['backup:current', 'backup:prev1', 'backup:prev2', ACTIVE] : [ACTIVE];
    const state = {};
    let pending = keys.length;
    let applied = false;
    const fail = () => reject(tx.error || new Error('No se pudo completar la escritura segura.'));
    tx.onerror = fail;
    tx.onabort = fail;
    tx.oncomplete = () => resolve();
    const apply = () => {
      if (applied) return;
      applied = true;
      try {
        if (backup) {
          if (state['backup:prev2']) store.put(state['backup:prev2'], 'backup:prev3'); else store.delete('backup:prev3');
          if (state['backup:prev1']) store.put(state['backup:prev1'], 'backup:prev2'); else store.delete('backup:prev2');
          if (state['backup:current']) store.put(state['backup:current'], 'backup:prev1'); else store.delete('backup:prev1');
          store.put(backup, 'backup:current');
        }
        if (replaceActive) {
          if (state[ACTIVE] && captureCurrent) store.put(state[ACTIVE], LAST_GOOD);
          store.put(envelope, ACTIVE);
        }
        store.delete(PENDING);
      } catch (error) {
        try { tx.abort(); } catch {}
        reject(error);
      }
    };
    for (const key of keys) {
      const req = store.get(key);
      req.onsuccess = () => {
        state[key] = req.result ?? null;
        pending -= 1;
        if (pending === 0) apply();
      };
      req.onerror = () => { try { tx.abort(); } catch {} };
    }
  });
}

async function commitPending(envelope, { backup = null, captureCurrent = true } = {}) {
  const db = await openDb();
  if (!db) {
    localAtomicCommit({ envelope, backup, replaceActive: true, captureCurrent });
    return;
  }
  await idbAtomicCommit(db, { envelope, backup, replaceActive: true, captureCurrent });
}

async function promoteRecord(record, action, message) {
  const decoded = decodeProjectRecord(record);
  if (!decoded.valid) return null;
  const envelope = decoded.envelope || makeEnvelope(decoded.project, { stamp: false });
  const recoveryBackup = record?.recoveryBackup || null;
  await stagePending(record?.project ? record : envelope);
  await commitPending(envelope, { backup: recoveryBackup, captureCurrent: action !== 'RECOVERED_LAST_GOOD' });
  lastRecovery = { action, message, at: nowIso() };
  return deepClone(decoded.project);
}

export async function loadActive() {
  const [activeRaw, pendingRaw, lastGoodRaw] = await Promise.all([
    idbGet(ACTIVE), idbGet(PENDING), idbGet(LAST_GOOD),
  ]);
  const active = decodeProjectRecord(activeRaw);
  const pending = decodeProjectRecord(pendingRaw);
  const lastGood = decodeProjectRecord(lastGoodRaw);

  if (pending.valid && (!active.valid || String(pending.savedAt || '') >= String(active.savedAt || ''))) {
    return promoteRecord(pendingRaw, 'RECOVERED_PENDING', 'Se recuperó una escritura interrumpida antes de confirmarse.');
  }
  if (active.valid) {
    if (active.legacy) {
      lastRecovery = { action: 'LEGACY_LOADED', message: 'Se cargó un almacenamiento anterior; se actualizará al próximo guardado.', at: nowIso() };
    } else {
      lastRecovery = { action: 'NONE', message: 'El proyecto activo superó la verificación de integridad.', at: nowIso() };
    }
    if (pendingRaw) await idbDelete(PENDING);
    return deepClone(active.project);
  }
  if (lastGood.valid) {
    return promoteRecord(lastGoodRaw, 'RECOVERED_LAST_GOOD', 'El proyecto activo no era válido y se recuperó la última copia íntegra.');
  }
  if (pendingRaw || activeRaw || lastGoodRaw) {
    lastRecovery = { action: 'UNRECOVERABLE', message: 'No se encontró una copia local íntegra recuperable.', at: nowIso() };
  }
  return null;
}

export async function saveActive(project) {
  const envelope = makeEnvelope(project);
  await stagePending(envelope);
  await commitPending(envelope);
  lastRecovery = { action: 'SAVED', message: 'Guardado transaccional completado.', at: nowIso() };
  return deepClone(envelope.project);
}

/** Deja una escritura completa en estado pendiente para comprobar recuperación tras cierre forzado. */
export async function prepareRecoveryCandidate(project) {
  const envelope = makeEnvelope(project);
  await stagePending(envelope);
  return { savedAt: envelope.savedAt, checksum: envelope.checksum, schemaVersion: envelope.schemaVersion };
}

export async function recoverWorkspace() {
  const project = await loadActive();
  return { project, recovery: getLastRecovery() };
}

export async function clearActive() {
  await Promise.all([idbDelete(ACTIVE), idbDelete(PENDING), idbDelete(LAST_GOOD)]);
  lastRecovery = { action: 'CLEARED', message: 'Se eliminó el proyecto activo y su diario de recuperación.', at: nowIso() };
}

export async function createBackup(project, label = 'Copia manual') {
  const record = makeBackupRecord(project, label);
  const db = await openDb();
  if (!db) {
    const before = new Map(BACKUP_KEYS.map(key => [key, localStorage.getItem(localKey(key))]));
    try { rotateLocalBackups(record); }
    catch (error) {
      for (const [key, raw] of before) raw == null ? localDelete(key) : localStorage.setItem(localKey(key), raw);
      throw error;
    }
    return deepClone(record);
  }
  await idbAtomicCommit(db, { envelope: null, backup: record, replaceActive: false });
  return deepClone(record);
}

export async function listBackups() {
  const out = [];
  for (const slot of ['current', 'prev1', 'prev2', 'prev3']) {
    const raw = await idbGet(`backup:${slot}`);
    const decoded = decodeBackupRecord(raw);
    if (raw) out.push({ slot, integrity: decoded.valid ? 'VERIFIED' : 'INVALID', ...(decoded.record || { createdAt: '', label: 'Copia dañada', project: null }) });
  }
  return out;
}

export async function readBackup(slot) {
  if (!['current', 'prev1', 'prev2', 'prev3'].includes(slot)) throw new Error('La ranura de copia no es válida.');
  const decoded = decodeBackupRecord(await idbGet(`backup:${slot}`));
  if (!decoded.valid || !decoded.record) throw new Error('La copia seleccionada no existe o no supera la verificación de integridad.');
  return deepClone(decoded.record);
}

export async function replaceActiveWithBackup(currentProject, nextProject, label = 'Copia previa a sustitución') {
  if (!nextProject?.meta || typeof nextProject.meta !== 'object') throw new Error('El proyecto nuevo no contiene metadatos válidos.');
  const envelope = makeEnvelope(nextProject, { stamp: false });
  const backup = currentProject ? makeBackupRecord(currentProject, label) : null;
  await stagePending({ ...envelope, recoveryBackup: backup });
  await commitPending(envelope, { backup });
  lastRecovery = { action: 'REPLACED', message: 'Sustitución y copia previa confirmadas de forma transaccional.', at: nowIso() };
  return deepClone(envelope.project);
}

function sanitizeMessage(input) {
  return String(input || 'Error no especificado')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo]')
    .replace(/(?:file|https?):\/\/\S+/gi, '[ruta]')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 240);
}

export async function recordLocalError(error, context = 'runtime') {
  const allowedContexts = new Set(['runtime', 'startup', 'storage', 'service-worker', 'render', 'save', 'import', 'document', 'generation']);
  const storedRows = await idbGet(ERROR_LOG, DIAGNOSTICS_STORE);
  const rows = Array.isArray(storedRows) ? storedRows : [];
  const item = {
    at: nowIso(),
    context: allowedContexts.has(context) ? context : 'runtime',
    name: sanitizeMessage(error?.name || 'Error').slice(0, 60),
    message: sanitizeMessage(error?.message || error),
    appVersion: APP_VERSION,
    online: typeof navigator === 'undefined' ? null : Boolean(navigator.onLine),
  };
  const next = [...rows, item].slice(-ERROR_LOG_LIMIT);
  await idbSet(ERROR_LOG, next, DIAGNOSTICS_STORE);
  return deepClone(item);
}

export async function listLocalErrors() {
  const rows = await idbGet(ERROR_LOG, DIAGNOSTICS_STORE);
  return Array.isArray(rows) ? deepClone(rows) : [];
}

export async function clearLocalErrors() { await idbDelete(ERROR_LOG, DIAGNOSTICS_STORE); }

export async function getStorageStatus() {
  const db = await openDb();
  const [active, pending, lastGood, backups, errors] = await Promise.all([
    idbGet(ACTIVE), idbGet(PENDING), idbGet(LAST_GOOD), listBackups(), listLocalErrors(),
  ]);
  let estimate = null;
  try {
    if (globalThis.navigator?.storage?.estimate) {
      const value = await navigator.storage.estimate();
      estimate = { usage: Number(value.usage || 0), quota: Number(value.quota || 0) };
    }
  } catch {}
  return {
    contractVersion: STORAGE_CONTRACT_VERSION,
    dbVersion: STORAGE_DB_VERSION,
    mode: db ? 'INDEXED_DB' : 'LOCAL_STORAGE_FALLBACK',
    activeIntegrity: decodeProjectRecord(active).valid ? 'VERIFIED' : active ? 'INVALID' : 'EMPTY',
    pendingIntegrity: decodeProjectRecord(pending).valid ? 'VERIFIED' : pending ? 'INVALID' : 'EMPTY',
    lastGoodIntegrity: decodeProjectRecord(lastGood).valid ? 'VERIFIED' : lastGood ? 'INVALID' : 'EMPTY',
    backups: backups.map(row => ({ slot: row.slot, integrity: row.integrity, createdAt: row.createdAt })),
    errorCount: errors.length,
    estimate,
    recovery: getLastRecovery(),
  };
}

export function getLastRecovery() { return deepClone(lastRecovery); }
export function storageMode() { return fallback ? 'Almacenamiento de reserva' : 'IndexedDB local'; }

/** Prueba aislada de lectura, escritura y recuperación. Nunca usa las claves del proyecto activo. */
export async function runStorageSelfTest(sampleProject = null) {
  const prefix = `qa:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const keys = { active: `${prefix}:active`, pending: `${prefix}:pending`, lastGood: `${prefix}:last-good` };
  const base = sampleProject?.meta ? deepClone(sampleProject) : { meta: { schemaVersion: SCHEMA_VERSION, updatedAt: nowIso() }, qaValue: 1 };
  const next = deepClone(base);
  next.meta = { ...next.meta, updatedAt: nowIso() };
  next.__qaMarker = 'RECOVERY_CANDIDATE';
  const first = makeEnvelope(base, { stamp: false });
  const candidate = makeEnvelope(next, { stamp: false });
  try {
    await idbSet(keys.active, first);
    const read = decodeProjectRecord(await idbGet(keys.active));
    if (!read.valid) throw new Error('La lectura posterior a escritura no superó la integridad.');
    await idbSet(keys.pending, candidate);
    const pending = decodeProjectRecord(await idbGet(keys.pending));
    if (!pending.valid) throw new Error('El candidato pendiente no superó la integridad.');
    await idbSet(keys.lastGood, await idbGet(keys.active));
    await idbSet(keys.active, await idbGet(keys.pending));
    await idbDelete(keys.pending);
    const recovered = decodeProjectRecord(await idbGet(keys.active));
    if (!recovered.valid || recovered.project.__qaMarker !== 'RECOVERY_CANDIDATE') throw new Error('No se completó la recuperación aislada.');
    return {
      ok: true,
      mode: (await openDb()) ? 'INDEXED_DB' : 'LOCAL_STORAGE_FALLBACK',
      contractVersion: STORAGE_CONTRACT_VERSION,
      checksumVerified: true,
      interruptedWriteRecovered: true,
      sampleBytes: stableStringify(candidate).length,
    };
  } finally {
    await Promise.all(Object.values(keys).map(key => idbDelete(key)));
  }
}
