# Generador de Horarios Escolares v0.8.0

## Estado

Versión funcional centrada en explicación avanzada de bloqueos del motor.

Parte de la base v0.7.0 y mantiene:

- asistente de creación de centro;
- modelo lectivo / DC / servicios / no lectivo;
- carga docente y permanencia;
- editor visual seguro;
- pantalla completa;
- guardado local, copia anterior y copia de emergencia;
- exportaciones JSON, CSV, HTML e informes.

## Novedad principal

Cuando el horario queda parcial o una actividad no puede colocarse, la app ya no se limita a decir que quedan sesiones pendientes. Añade una explicación docente con:

- actividad afectada;
- número de sesiones pendientes;
- huecos analizados;
- huecos posibles;
- causas principales;
- qué revisar en la configuración.

Ejemplos de causas detectadas:

- docente no disponible;
- docente solapado;
- grupo o subgrupo ocupado;
- espacio ocupado;
- espacio no disponible;
- duración que no cabe en el día;
- día, tramo o hueco prohibido;
- actividad prohibida en última hora;
- más de una sesión por día;
- falta de docente responsable;
- falta de grupo cuando la actividad lo requiere;
- falta de espacio obligatorio;
- cobertura mínima insuficiente en servicios/DC.

## Dónde aparece

- Sección **Calcular horario**.
- Sección **Documentos y exportaciones**.
- Nuevo informe descargable: **Informe de bloqueos**.

## Decisión técnica

La explicación no sustituye al validador. El validador sigue decidiendo si una colocación es válida o no. La nueva capa explica los bloqueos en lenguaje docente para orientar la corrección.

## Alcance no cubierto todavía

La v0.8 no incorpora todavía:

- motor más potente;
- explicación comparativa de alternativas;
- sugerencias automáticas de modificación;
- caso sintético tipo Frián de alta complejidad;
- QA GitHub Pages y físico final.

## Base recomendada

La v0.8.0 sustituye a la v0.7.0 como base recomendada.
