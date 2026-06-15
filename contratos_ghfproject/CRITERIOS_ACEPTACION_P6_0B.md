# CRITERIOS DE ACEPTACIÓN P6-0B

P6-0B se considera cerrada únicamente si:

1. Los cuatro JSON Schema son Draft 2020-12 válidos.
2. El fixture mínimo y el completo validan sin errores.
3. Los `.ghfproject` empaquetados son ZIP íntegros.
4. El manifiesto detecta alteraciones, ausencias y miembros extra.
5. Se validan unicidad e integridad referencial de entidades y sesiones.
6. `schedule.sessions[]` es la única autoridad de sesiones.
7. `directWriteAllowed=false` y los invariantes de aceptación están fijados por schema.
8. Los 54 bloques de P5-4.2 tienen mapeo explícito.
9. Los 43 registros pendientes tienen decisión individual.
10. Los nueve casos inválidos fallan en la capa y por la causa esperadas.
11. Los fixtures no contienen nombres o referencias nominales del escenario P5.
12. No se incluye código funcional ni el release P5-4.2.
13. No se inicia P6-0C.
14. Se mantiene `PUBLICACION_PUBLICA_NO_AUTORIZADA`.
