export const GENERATION_EXECUTION_CONTRACT_VERSION = 'generation-execution-contract-1.0';

export class GenerationRunner {
  constructor({ WorkerCtor = globalThis.Worker, workerUrl = new URL('./generation_worker.mjs', import.meta.url) } = {}) {
    if (!WorkerCtor) throw new Error('Este navegador no admite Web Worker.');
    this.WorkerCtor = WorkerCtor;
    this.workerUrl = workerUrl;
    this.worker = null;
    this.activeRequestId = '';
    this.rejectActive = null;
  }

  get running() { return Boolean(this.worker); }

  start(project, options = {}, { onProgress = ()=>{} } = {}) {
    if (this.worker) return Promise.reject(new Error('Ya hay una generación en curso.'));
    const requestId = String(options.requestId || globalThis.crypto?.randomUUID?.() || `request_${Date.now()}`);
    this.activeRequestId = requestId;
    const worker = new this.WorkerCtor(this.workerUrl, { type:'module' });
    this.worker = worker;
    return new Promise((resolve, reject) => {
      this.rejectActive = reject;
      worker.onmessage = (event) => {
        const message = event.data || {};
        if (message.type === 'PROGRESS') {
          onProgress(message.payload || {});
          return;
        }
        if (message.type === 'RESULT') {
          this.#disposeWorker();
          resolve(message.payload);
        }
      };
      worker.onerror = (event) => {
        const error = new Error(event?.message || 'El worker de generación terminó de forma inesperada.');
        this.#disposeWorker();
        reject(error);
      };
      worker.postMessage({ type:'START', project, options:{ ...options, requestId } });
    });
  }

  cancel() {
    if (!this.worker) return false;
    this.worker.postMessage({ type:'CANCEL', requestId:this.activeRequestId });
    return true;
  }

  terminate(reason = 'Ejecución terminada externamente.') {
    if (!this.worker) return false;
    const reject = this.rejectActive;
    this.#disposeWorker();
    reject?.(new Error(reason));
    return true;
  }

  #disposeWorker() {
    this.worker?.terminate?.();
    this.worker = null;
    this.activeRequestId = '';
    this.rejectActive = null;
  }
}

export function generationRunDownload(run) {
  return `${JSON.stringify(run, null, 2)}\n`;
}

export function generationStatusLabel(status) {
  return ({
    COMPLETED:'Completada', PARTIAL:'Completada con sesiones sin colocar', CANCELLED:'Cancelada',
    TIME_LIMIT_WITH_SOLUTION:'Límite temporal con propuesta parcial',
    TIME_LIMIT_WITHOUT_SOLUTION:'Límite temporal sin propuesta', ERROR:'Error controlado', RUNNING:'En ejecución',
    OPTIMAL:'Solución óptima', FEASIBLE:'Solución factible', INFEASIBLE:'Inviabilidad demostrada',
    UNKNOWN:'Sin conclusión', MODEL_INVALID:'Modelo avanzado inválido', UNAVAILABLE:'No disponible en esta versión web',
  })[status] || status || 'Sin estado';
}
