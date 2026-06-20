# LEEME · versión 0.3.1

## Estado

Versión correctiva de estabilidad del editor visual.

## Motivo

En Android/Chrome se detectó que la edición podía romper la pantalla y obligar a recargar. La causa probable es una combinación de:

- operaciones de edición sin contenedor de error;
- arrastre HTML5 no siempre estable en móvil;
- ausencia de copia de emergencia automática ante fallo de interfaz.

## Correcciones aplicadas

- Se añade protección general de operaciones de interfaz.
- Se añade captura de errores globales y promesas no controladas.
- Se evita asumir que `dataTransfer` existe durante el arrastre.
- Si una operación falla, la app muestra aviso y conserva el proyecto.
- Se crea copia de emergencia automática ante cambios sin guardar.
- Se permite recuperar la copia de emergencia desde Inicio.
- Se amplía la prueba de persistencia.

## Uso recomendado en móvil

En Android/tableta, use preferentemente:

1. seleccionar sesión;
2. pulsar **Mover aquí** en una celda permitida;
3. fijar/liberar si procede;
4. guardar en navegador;
5. exportar JSON periódicamente.

El arrastre queda disponible, pero no debe ser el método principal en móvil.

## Prueba manual obligatoria

1. Cargar ejemplo IES.
2. Calcular horario.
3. Entrar en **Revisar y ajustar**.
4. Seleccionar una sesión.
5. Mover con **Mover aquí**.
6. Fijar y liberar la sesión.
7. Deshacer y rehacer.
8. Eliminar una sesión.
9. Recuperar copia de emergencia.
10. Exportar JSON e informe de validación.

## Dictamen

La 0.3.1 corrige la fragilidad de edición detectada. Si todavía aparece un fallo, debe considerarse bloqueante y documentarse indicando la acción exacta que lo provoca.
