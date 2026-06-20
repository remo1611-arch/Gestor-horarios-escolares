const NOMBRE_BASE = 'generador_horarios_escolares';
const VERSION_BASE = 1;
const ALMACEN_PROYECTOS = 'proyectos';
const CLAVE_ACTUAL = 'proyecto_actual';
const CLAVE_ANTERIOR = 'proyecto_anterior';
const CLAVE_LOCAL_ACTUAL = 'generador_horarios_proyecto_actual';
const CLAVE_LOCAL_ANTERIOR = 'generador_horarios_proyecto_anterior';
const CLAVE_ULTIMA_COPIA = 'generador_horarios_ultima_copia';
const CLAVE_EMERGENCIA = 'generador_horarios_copia_emergencia';
const CLAVE_EMERGENCIA_MOTIVO = 'generador_horarios_copia_emergencia_motivo';

export function prepararProyectoParaGuardar(proyecto) {
  const copia = JSON.parse(JSON.stringify({
    ...proyecto,
    metadatos: {
      ...(proyecto?.metadatos || {}),
      modificado: new Date().toISOString(),
      guardado_local: new Date().toISOString()
    }
  }));
  return copia;
}

export function validarProyectoSerializable(proyecto) {
  try {
    const texto = JSON.stringify(proyecto);
    JSON.parse(texto);
    return { correcto: true, bytes: new Blob([texto]).size, mensaje: 'Proyecto preparado para escritura.' };
  } catch (error) {
    return { correcto: false, bytes: 0, mensaje: `El proyecto no se puede convertir a JSON: ${error?.message || String(error)}` };
  }
}

function abrirBase() {
  return new Promise((resolver, rechazar) => {
    if (!('indexedDB' in window)) {
      rechazar(new Error('El navegador no permite guardar con almacenamiento avanzado.'));
      return;
    }
    const solicitud = indexedDB.open(NOMBRE_BASE, VERSION_BASE);
    solicitud.onupgradeneeded = () => {
      const base = solicitud.result;
      if (!base.objectStoreNames.contains(ALMACEN_PROYECTOS)) base.createObjectStore(ALMACEN_PROYECTOS);
    };
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error || new Error('No se pudo abrir el almacenamiento avanzado.'));
  });
}

async function guardarIndexedDB(proyecto) {
  const base = await abrirBase();
  return new Promise((resolver, rechazar) => {
    const tx = base.transaction(ALMACEN_PROYECTOS, 'readwrite');
    const almacen = tx.objectStore(ALMACEN_PROYECTOS);
    const lecturaActual = almacen.get(CLAVE_ACTUAL);
    lecturaActual.onsuccess = () => {
      if (lecturaActual.result) almacen.put(lecturaActual.result, CLAVE_ANTERIOR);
      almacen.put(proyecto, CLAVE_ACTUAL);
    };
    lecturaActual.onerror = () => rechazar(lecturaActual.error || new Error('No se pudo leer la copia anterior.'));
    tx.oncomplete = () => resolver(true);
    tx.onerror = () => rechazar(tx.error || new Error('No se pudo guardar el proyecto.'));
    tx.onabort = () => rechazar(tx.error || new Error('Se canceló la escritura del proyecto.'));
  });
}

async function leerIndexedDB(clave = CLAVE_ACTUAL) {
  const base = await abrirBase();
  return new Promise((resolver, rechazar) => {
    const tx = base.transaction(ALMACEN_PROYECTOS, 'readonly');
    const solicitud = tx.objectStore(ALMACEN_PROYECTOS).get(clave);
    solicitud.onsuccess = () => resolver(solicitud.result || null);
    solicitud.onerror = () => rechazar(solicitud.error || new Error('No se pudo leer la copia guardada.'));
  });
}

function guardarLocalStorage(proyecto) {
  if (!('localStorage' in window)) throw new Error('El navegador no permite guardar con almacenamiento básico.');
  const textoNuevo = JSON.stringify(proyecto);
  const textoActual = localStorage.getItem(CLAVE_LOCAL_ACTUAL);
  if (textoActual) localStorage.setItem(CLAVE_LOCAL_ANTERIOR, textoActual);
  localStorage.setItem(CLAVE_LOCAL_ACTUAL, textoNuevo);
  localStorage.setItem(CLAVE_ULTIMA_COPIA, new Date().toISOString());
  const comprobacion = localStorage.getItem(CLAVE_LOCAL_ACTUAL);
  if (comprobacion !== textoNuevo) throw new Error('La comprobación de escritura no coincide con el proyecto guardado.');
}

function leerLocalStorage(clave = CLAVE_LOCAL_ACTUAL) {
  if (!('localStorage' in window)) return null;
  const texto = localStorage.getItem(clave);
  if (!texto) return null;
  return JSON.parse(texto);
}


export function guardarCopiaEmergenciaLocal(proyecto, motivo = 'cambio') {
  try {
    if (!('localStorage' in window)) return { correcto: false, mensaje: 'El navegador no permite copia de emergencia.' };
    const copia = prepararProyectoParaGuardar({
      ...proyecto,
      metadatos: {
        ...(proyecto?.metadatos || {}),
        copia_emergencia: new Date().toISOString(),
        motivo_copia_emergencia: motivo
      }
    });
    const serializacion = validarProyectoSerializable(copia);
    if (!serializacion.correcto) return serializacion;
    localStorage.setItem(CLAVE_EMERGENCIA, JSON.stringify(copia));
    localStorage.setItem(CLAVE_EMERGENCIA_MOTIVO, motivo);
    return { correcto: true, mensaje: 'Copia de emergencia actualizada.' };
  } catch (error) {
    return { correcto: false, mensaje: `No se pudo actualizar la copia de emergencia: ${error?.message || String(error)}` };
  }
}

export function recuperarCopiaEmergenciaLocal() {
  try {
    if (!('localStorage' in window)) return { correcto: false, proyecto: null, mensaje: 'El navegador no permite leer la copia de emergencia.' };
    const texto = localStorage.getItem(CLAVE_EMERGENCIA);
    if (!texto) return { correcto: false, proyecto: null, mensaje: 'No hay copia de emergencia disponible.' };
    const proyecto = JSON.parse(texto);
    const motivo = localStorage.getItem(CLAVE_EMERGENCIA_MOTIVO) || 'sin motivo registrado';
    return { correcto: true, proyecto, mensaje: `Copia de emergencia recuperada (${motivo}).` };
  } catch (error) {
    return { correcto: false, proyecto: null, mensaje: `La copia de emergencia no se puede leer: ${error?.message || String(error)}` };
  }
}

export async function guardarProyectoLocal(proyecto) {
  const copia = prepararProyectoParaGuardar(proyecto);
  const serializacion = validarProyectoSerializable(copia);
  if (!serializacion.correcto) {
    return { correcto: false, mensaje: serializacion.mensaje };
  }

  const errores = [];
  try {
    await guardarIndexedDB(copia);
    try { localStorage.setItem(CLAVE_ULTIMA_COPIA, new Date().toISOString()); } catch (_) { /* no bloqueante */ }
    return { correcto: true, mensaje: 'Proyecto guardado en este navegador. Se conserva copia anterior.' };
  } catch (error) {
    errores.push(error?.message || String(error));
  }

  try {
    guardarLocalStorage(copia);
    return { correcto: true, mensaje: 'Proyecto guardado en almacenamiento básico. Se conserva copia anterior.' };
  } catch (error) {
    errores.push(error?.message || String(error));
    return { correcto: false, mensaje: `No se pudo guardar el proyecto. Exporte una copia JSON. Detalle: ${errores.join(' · ')}` };
  }
}

export async function recuperarProyectoLocal() {
  try {
    const proyecto = await leerIndexedDB(CLAVE_ACTUAL);
    if (proyecto) return { correcto: true, proyecto, mensaje: 'Proyecto recuperado.' };
  } catch (_) {
    // se intenta recuperación básica debajo
  }
  try {
    const proyecto = leerLocalStorage(CLAVE_LOCAL_ACTUAL);
    if (proyecto) return { correcto: true, proyecto, mensaje: 'Proyecto recuperado desde almacenamiento básico.' };
  } catch (error) {
    return { correcto: false, proyecto: null, mensaje: `La copia guardada no se puede leer: ${error?.message || String(error)}` };
  }
  return { correcto: false, proyecto: null, mensaje: 'No hay ninguna copia guardada en este navegador.' };
}

export async function recuperarCopiaAnteriorLocal() {
  try {
    const proyecto = await leerIndexedDB(CLAVE_ANTERIOR);
    if (proyecto) return { correcto: true, proyecto, mensaje: 'Copia anterior recuperada.' };
  } catch (_) {
    // se intenta recuperación básica debajo
  }
  try {
    const proyecto = leerLocalStorage(CLAVE_LOCAL_ANTERIOR);
    if (proyecto) return { correcto: true, proyecto, mensaje: 'Copia anterior recuperada desde almacenamiento básico.' };
  } catch (error) {
    return { correcto: false, proyecto: null, mensaje: `La copia anterior no se puede leer: ${error?.message || String(error)}` };
  }
  return { correcto: false, proyecto: null, mensaje: 'No hay copia anterior disponible.' };
}

export function descargarTexto(nombreArchivo, contenido, tipo = 'text/plain;charset=utf-8') {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function leerArchivoComoTexto(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result || ''));
    lector.onerror = () => rechazar(lector.error || new Error('No se pudo leer el archivo.'));
    lector.readAsText(archivo, 'utf-8');
  });
}
