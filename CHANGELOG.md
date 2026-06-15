# Registro de cambios

## P6-0G-1A4 beta.1 · BROWSER_PRIVATE temporal y edición parcial

- entrada modular independiente del monolito;
- modo explícito antes de abrir datos;
- red de proyecto denegada y persistencia nula;
- parser ZIP endurecido con fflate 0.8.3 solo como DEFLATE;
- copia binaria, serialización canónica y reapertura;
- proyecto activo único, proyecto vacío y edición general parcial;
- compatibilidad experimental REAL/ANONYMIZED pendiente de QA física;
- la entrada estable permanece intacta.

## P6-0F.2 · saneamiento público y control de reidentificación · base funcional 0.6.3

- conservación explícita de la autoría pública;
- eliminación de ubicaciones, nombres libres y referencias a fuentes privadas;
- normalización semántica de fixtures públicos a `SYNTHETIC`;
- sustitución del fixture parcial heredado por `partialSyntheticFixture`;
- recalculado de hashes contractuales del caso público;
- auditoría semántica reforzada y QA específica de fixtures incrustados;
- actualización del contacto público de seguridad;
- corrección del cierre `</script>` incrustado en el generador documental y verificación de los tres bloques JavaScript ejecutables con `node --check`.

No se modifica el motor funcional ni los contratos de dominio.

## P6-0F.1 · revisión de publicación · base funcional 0.6.3

- saneamiento del paquete para GitHub;
- eliminación de artefactos Python compilados;
- corrección de reglas `.gitignore` para CSV contractuales;
- entrada estática estable `index.html`;
- auditor público sin nombres privados y denylist externa opcional;
- verificación completa de `MANIFEST_SHA256.txt`;
- CI con permisos mínimos, Actions fijadas por SHA y QA funcional ampliada;
- licencia restrictiva explícita;
- documentación de publicación, privacidad, seguridad y límites de despliegue.

No se modifica el motor funcional ni los contratos de dominio.
