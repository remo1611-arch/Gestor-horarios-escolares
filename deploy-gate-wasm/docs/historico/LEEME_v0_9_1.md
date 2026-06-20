# Generador de Horarios Escolares · v0.9.1

## Objeto de la fase

La v0.9.1 formaliza los tramos horarios reales antes de pasar a candidata RC.

La decisión funcional queda cerrada así:

- las guardias no son tramos;
- los tramos son franjas temporales: entrada, clase, recreo, salida, transporte, reunión, etc.;
- las guardias, recreos, entradas y salidas son actividades o servicios colocados dentro de esos tramos;
- la carga docente se informa tanto en sesiones/tramos como en minutos reales.

## Cambios principales

- Formato de proyecto actualizado a `1.6`.
- Versión de aplicación `0.9.1`.
- Cada tramo admite:
  - hora de inicio;
  - hora de fin;
  - duración en minutos;
  - tipo de tramo;
  - si admite clase;
  - si admite servicios de centro;
  - si computa como permanencia.
- Tipos de tramo:
  - Lectivo;
  - Entrada;
  - Recreo;
  - Salida;
  - Transporte;
  - Comida;
  - Reunión;
  - No disponible.
- La pantalla Datos permite editar inicio, fin, duración, tipo y permisos de cada tramo.
- La validación impide:
  - clase lectiva colocada en un tramo que no admite clase;
  - servicio colocado en un tramo que no admite servicios.
- La carga docente incorpora minutos:
  - lectivo en minutos;
  - DC en minutos;
  - servicios en minutos;
  - permanencia total en minutos.
- El centro exigente sintético incorpora horarios reales en entrada, recreo y salida.

## Estado

Base recomendada: `v0.9.1`.

Siguiente fase aconsejada: `v1.0-rc0`, centrada en GitHub Pages, QA físico, documentación y matriz de funciones soportadas/no soportadas.
