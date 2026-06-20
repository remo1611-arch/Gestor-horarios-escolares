import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '../../../..');
const evidenciaDir = path.resolve(__dirname, '../evidencias');
fs.mkdirSync(evidenciaDir, { recursive: true });

const ejemplos = [
  'ejemplo_ies_sencillo.json',
  'ejemplo_ceip_sencillo.json',
  'ejemplo_cifp_talleres.json',
  'ejemplo_cpi_sencillo.json',
  'ejemplo_cee_sencillo.json',
  'ejemplo_centro_complejo_sintetico.json',
  'ejemplo_centro_exigente_sintetico.json',
];

function codigoEjemplo(archivo) {
  return `
import fs from 'fs';
import { generarHorario } from './assets/js/motor/generador_horario.js';
import { calcularCalidadHorario } from './assets/js/dominio/calidad_horario.js';
import { resolverHorarioCpSatFase4B } from './spikes/ortools_wasm/fase4b_objetivo_lexicografico/src/motor_cp_sat_lexicografico.mjs';
function fijarRandomDeterminista(seedInicial = 20260401) { let seed = seedInicial >>> 0; const anterior = Math.random; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 0x100000000; }; return () => { Math.random = anterior; }; }
const archivo=${JSON.stringify(archivo)};
const proyecto=JSON.parse(fs.readFileSync('ejemplos/'+archivo,'utf8'));
const restaurar=fijarRandomDeterminista();
const actual=generarHorario(proyecto,{limite_ms:6500,intentos:180,reparacion:true});
restaurar();
const fase4b=await resolverHorarioCpSatFase4B(proyecto,{maxTimeEtapa1Seconds:3,maxTimeEtapa2Seconds:0,maxCandidatosEtapa2:0,maxCandidatosGlobal:1200});
const calidadActual=calcularCalidadHorario({...proyecto,horario:actual.horario}).resumen;
const calidadFase4B=calcularCalidadHorario(fase4b.proyecto).resumen;
const gravesActual=actual.incidencias.filter(i=>i.nivel==='grave').length;
const gravesFase4B=fase4b.incidencias.filter(i=>i.nivel==='grave').length;
console.log(JSON.stringify({
 ejemplo: archivo,
 motorActual:{estado:actual.estado,colocadas:actual.metricas.colocadas,previstas:actual.metricas.previstas,pendientes:actual.metricas.pendientes,graves:gravesActual,calidad:calidadActual.nivel,penalizacion:calidadActual.puntuacion_penalizacion,huecosDocentes:calidadActual.huecos_docentes,huecosGrupos:calidadActual.huecos_grupos,ultimasDocentes:calidadActual.ultimas_horas_docente,ultimasGrupos:calidadActual.ultimas_horas_grupo},
 cpSatFase4B:{estado:fase4b.estado,solver:fase4b.metricas.estado_solver_texto,etapaElegida:fase4b.metricas.etapa_elegida,etapa1:fase4b.metricas.etapa1,etapa2:fase4b.metricas.etapa2,colocadas:fase4b.metricas.colocadas,previstas:fase4b.metricas.previstas,pendientes:fase4b.metricas.pendientes,graves:gravesFase4B,calidad:calidadFase4B.nivel,penalizacion:calidadFase4B.puntuacion_penalizacion,huecosDocentes:calidadFase4B.huecos_docentes,huecosGrupos:calidadFase4B.huecos_grupos,ultimasDocentes:calidadFase4B.ultimas_horas_docente,ultimasGrupos:calidadFase4B.ultimas_horas_grupo,tiempoMs:fase4b.metricas.tiempo_ms},
 comparacion:{noMenosColocadasQueActual:fase4b.metricas.colocadas>=actual.metricas.colocadas,penalizacionFase4BMenorOIgualActual:calidadFase4B.puntuacion_penalizacion<=calidadActual.puntuacion_penalizacion,deltaFase4BVsActual:calidadFase4B.puntuacion_penalizacion-calidadActual.puntuacion_penalizacion}
}));
`;
}

const resultados = [];
for (const archivo of ejemplos) {
  console.error(`[FASE4B] ${archivo}`);
  const ejecucion = spawnSync(process.execPath, ['--input-type=module', '-e', codigoEjemplo(archivo)], {
    cwd: raiz,
    encoding: 'utf8',
    timeout: 45000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (ejecucion.status !== 0) {
    resultados.push({ ejemplo: archivo, error: ejecucion.error?.message || ejecucion.stderr || ejecucion.stdout || `exit ${ejecucion.status}` });
  } else {
    resultados.push(JSON.parse(ejecucion.stdout));
  }
}

const bloqueos = [];
for (const r of resultados) {
  if (r.error) {
    bloqueos.push({ ejemplo: r.ejemplo, tipo: 'ERROR_EJECUCION_VALIDACION', detalle: String(r.error).slice(0, 500) });
    continue;
  }
  if (!r.comparacion.noMenosColocadasQueActual) bloqueos.push({ ejemplo: r.ejemplo, tipo: 'MENOS_SESIONES_QUE_MOTOR_ACTUAL' });
  if (!r.comparacion.penalizacionFase4BMenorOIgualActual) bloqueos.push({ ejemplo: r.ejemplo, tipo: 'CALIDAD_PEOR_QUE_MOTOR_ACTUAL', deltaPenalizacion: r.comparacion.deltaFase4BVsActual });
}

const evidencia = {
  fase: 'FASE_4B_VALIDACION_CRUZADA_OBJETIVO_LEXICOGRAFICO',
  status: bloqueos.length ? 'PASS_CON_BLOQUEOS_DE_SUSTITUCION' : 'PASS_SIN_BLOQUEOS_NODE',
  dictamen: bloqueos.length ? 'NO_AUTORIZA_SUSTITUCION_DEL_MOTOR' : 'ABRE_CANDIDATA_A_QA_NAVEGADOR_SIN_CONECTAR_INTERFAZ',
  resumen: {
    ejemplos: resultados.length,
    ejemplosSinErroresGravesFase4B: resultados.filter((r) => !r.error && r.cpSatFase4B.graves === 0).length,
    ejemplosNoMenosSesionesQueActual: resultados.filter((r) => !r.error && r.comparacion.noMenosColocadasQueActual).length,
    ejemplosCalidadNoPeorQueActual: resultados.filter((r) => !r.error && r.comparacion.penalizacionFase4BMenorOIgualActual).length,
    bloqueosSustitucion: bloqueos.length,
  },
  bloqueosSustitucion: bloqueos,
  resultados,
  advertencias: [
    'La validación cruzada se ejecuta en procesos Node independientes para evitar acumulación del runtime WASM.',
    'La etapa de calidad se mantiene limitada por seguridad operativa; los modelos grandes no autorizan sustitución.',
    'La Fase 4B no se conecta al botón Calcular horario.',
    'Aunque no hubiera bloqueos en Node, faltaría QA navegador físico, Android, tableta, PC y GitHub Pages.',
  ],
};
fs.writeFileSync(path.join(evidenciaDir, 'evidencia_fase4b_validacion_cruzada_ejemplos.json'), JSON.stringify(evidencia, null, 2));
console.log(JSON.stringify(evidencia, null, 2));
process.exit(0);
