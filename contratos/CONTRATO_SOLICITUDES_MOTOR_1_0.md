# Contrato P5-2 · solicitudes y motor separado

## Identificación

- Fase: `P5-2-SOLICITUDES-MOTOR-0.5.2`
- Aplicación: `0.5.2`
- Solicitud: `ghf_generation_request_1.0`
- Respuesta: `ghf_generation_response_1.0`
- Entrada del motor: `ghf_solver_input_1.3`
- Salida del motor: `ghf_solver_output_1.3`

## Objetivo

Permitir que el editor P5-1 solicite generación completa, parcial o reparación a un proceso local separado y reciba exclusivamente una vista previa auditable.

## Invariantes

1. P5-1 permanece congelada dentro del paquete y no se modifica.
2. P5-2 usa claves de persistencia propias.
3. El navegador no ejecuta el solver ni escribe propuestas sobre las sesiones.
4. `directWriteAllowed` es siempre `false`.
5. Toda respuesta exige vista previa y aceptación explícita posterior.
6. `COMPLETE` considera el catálogo canónico completo.
7. `PARTIAL` y `REPAIR` requieren identificadores explícitos y preservan las asignaciones actuales no solicitadas.
8. Una salida heurística incompleta nunca se presenta como válida para aceptación.
9. OR-Tools es opcional: `AUTO` utiliza el híbrido si está instalado y, en caso contrario, el heurístico puro.
10. La indisponibilidad de OR-Tools queda declarada en la respuesta; no se oculta.
11. Los datos reales/provisionales no se ejecutan hasta disponer de una plantilla canónica aprobada.
12. La calidad es comparativa y no equivale a aprobación del horario.
13. La cancelación termina el proceso separado y produce estado `CANCELLED`.
14. Importar una respuesta solo la almacena y visualiza; no la aplica.

## Modos

- `COMPLETE`: construye una propuesta completa; conserva sesiones bloqueadas.
- `PARTIAL`: recalcula la selección y preserva las actividades ya colocadas restantes.
- `REPAIR`: variante local de `PARTIAL` orientada a pendientes o incidencias.

## Límites

P5-2 no contiene todavía el acto de aceptación. Ese paso corresponde a una fase posterior una vez validada la generación real.
