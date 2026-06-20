# LEEME v0.4.1 · Corrección de edición táctil

## Dictamen

La v0.4.0 cargaba correctamente, pero en Android una pulsación prolongada sobre una sesión del editor podía activar una ruta táctil distinta a la pulsación corta: selección, menú contextual o intento de arrastre HTML5. Eso podía romper la edición y obligar a recargar.

## Corrección aplicada

- Se detectan dispositivos táctiles mediante puntero grueso, `ontouchstart` y `navigator.maxTouchPoints`.
- En dispositivos táctiles, las sesiones se renderizan sin arrastre HTML5 activo.
- La pulsación prolongada y el menú contextual se cancelan dentro del editor visual.
- La edición móvil queda centrada en: toque corto sobre sesión + botón **Mover aquí**.
- El arrastre se conserva solo para ordenador con puntero no táctil.
- Se añade prueba automática `edicion_tactil.test.mjs`.

## Alcance

No se añaden funciones nuevas de horario. Es una microfase correctiva para estabilizar la edición en móvil/tablet.

## Uso recomendado en Android

1. Cargar ejemplo.
2. Calcular horario.
3. Entrar en **Revisar y ajustar**.
4. Tocar una sesión con pulsación corta.
5. Pulsar **Mover aquí** en un hueco permitido.
6. Evitar arrastrar en móvil: la app lo bloquea para prevenir caídas.

## Estado

`v0.4.1` sustituye a `v0.4.0` para pruebas en Android y tablet.
