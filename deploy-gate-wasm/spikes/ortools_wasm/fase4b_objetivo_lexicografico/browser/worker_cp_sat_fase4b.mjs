import { resolverHorarioCpSatFase4B } from '../src/motor_cp_sat_lexicografico.mjs';

self.onmessage = async (event) => {
  const { proyecto, opciones } = event.data || {};
  try {
    const resultado = await resolverHorarioCpSatFase4B(proyecto, opciones || {});
    self.postMessage({ ok: true, resultado });
  } catch (error) {
    self.postMessage({ ok: false, error: error?.message || String(error), stack: error?.stack || '' });
  }
};
