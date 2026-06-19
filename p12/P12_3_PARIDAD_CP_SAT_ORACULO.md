# P12-3 · Paridad con CP-SAT como oráculo técnico

P12-3 no amplía el motor web. Añade un arnés de comparación para ejecutar los mismos casos con:

1. motor web P12;
2. validador independiente;
3. CP-SAT/OR-Tools si está instalado;
4. informe de divergencia.

## Regla crítica

Si CP-SAT no está disponible, P12-3 debe marcar la comparación como `SKIPPED_CP_SAT_UNAVAILABLE`. Eso **no acredita paridad**. Solo acredita que el arnés está preparado y que el motor web no genera soluciones inválidas en los casos del corpus.

## Casos incluidos

- `P12_WEB_MINI`: caso simple P12-1.
- `P12_ORG41_LIGHT`: caso organizativo ligero P12-2.

## Fuera de alcance

- Frián real completo.
- Multitramos.
- Ciclos A/B.
- Multisedes y desplazamientos.
- Desdobles/simultaneidades complejas.
- XADE, documentos, XLSX y exportaciones.
