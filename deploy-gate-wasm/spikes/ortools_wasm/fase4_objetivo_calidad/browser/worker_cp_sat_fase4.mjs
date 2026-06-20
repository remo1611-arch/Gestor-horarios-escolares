import { resolverHorarioCpSatFase4 } from '../src/motor_cp_sat_calidad.mjs';

self.onmessage = async (event) => {
  const payload = event.data || {};
  try {
    if (payload.tipo !== 'calcular') throw new Error('Mensaje no reconocido para worker CP-SAT Fase 4.');
    const resultado = await resolverHorarioCpSatFase4(payload.proyecto, payload.opciones || {});
    self.postMessage({ tipo: 'resultado', resultado });
  } catch (error) {
    self.postMessage({ tipo: 'error', error: { message: error?.message || String(error), stack: error?.stack || '' } });
  }
};
