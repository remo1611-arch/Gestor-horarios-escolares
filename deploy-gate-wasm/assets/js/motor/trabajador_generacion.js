import { generarHorario } from './generador_horario.js';

self.onmessage = (evento) => {
  try {
    const { proyecto, opciones } = evento.data || {};
    const opcionesMotor = {
      ...(opciones || {}),
      onProgress: (progreso) => self.postMessage({ tipo: 'progreso', progreso })
    };
    const resultado = generarHorario(proyecto, opcionesMotor);
    self.postMessage({ tipo: 'resultado', correcto: true, resultado });
  } catch (error) {
    self.postMessage({ tipo: 'resultado', correcto: false, error: error?.message || String(error) });
  }
};
