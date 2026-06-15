# Contrato P6-0F.2 · saneamiento público y control de reidentificación

## Estado previsto

`P6-0F_2_CERRADA_CANDIDATA_GITHUB_NO_PUBLICADA`

## Objeto

Eliminar del paquete público cualquier rastro innecesario de procedencia, ubicación, identidad personal o archivo privado, manteniendo la base funcional `0.6.3` y la autoría pública deliberada.

## Autoría permitida

Se autoriza expresamente la presencia de:

- `Remo José Pereira González`, como titular de derechos y autor;
- `remo1611-arch`, como cuenta pública de mantenimiento.

Esta autorización no se extiende a nombres de centros, personas usuarias, docentes, alumnado, localidades de origen ni archivos privados.

## Invariantes funcionales

- no modificar las reglas del motor ni sus fórmulas;
- no crear una segunda ruta de cálculo;
- mantener `PUBLIC_DEMO` limitado a `SYNTHETIC`;
- mantener `LOCAL_PRIVATE` como vía para datos de producción;
- conservar los recuentos y casos funcionales usados por la QA;
- mantener vista previa, aceptación explícita y prohibición de escritura directa.

## Reglas de saneamiento

- los fixtures públicos deben declarar `SYNTHETIC`;
- los estados de procedencia de fixtures públicos deben ser `SYNTHETIC`;
- las fuentes de los fixtures deben ser nombres inequívocamente sintéticos;
- no se conservarán hashes, nombres ni rutas de fuentes privadas;
- las ubicaciones públicas serán marcadores sintéticos;
- no se admitirán nombres libres de personas en campos de tutoría o equivalentes;
- la denylist de términos privados permanecerá fuera del repositorio;
- la autoría permitida se trata mediante una allowlist explícita.

## Criterios de aceptación

- cero coincidencias con la denylist privada externa;
- cero ubicaciones o nombres personales no autorizados;
- cero referencias a fuentes privadas dentro de fixtures públicos;
- dos payloads incrustados en `index.html` declarados `SYNTHETIC`;
- todos sus `sourceStatus` normalizados a `SYNTHETIC`;
- fixtures `.ghfproject` válidos 15/15;
- caso del motor 502/502;
- manifiesto completo y reproducible;
- sintaxis Python sin incidencias y tres bloques JavaScript ejecutables válidos;
- QA automatizada sin regresiones;
- revisión manual en navegador real pendiente antes de activar GitHub Pages.
