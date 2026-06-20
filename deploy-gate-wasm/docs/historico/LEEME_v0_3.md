# LEEME · Generador de Horarios Escolares 0.3.0

## Dictamen

Esta versión consolida la app antes de añadir nuevas funciones. El foco es evitar estados intermedios peligrosos: cálculo no cancelable, guardado ambiguo, pérdida de proyecto al importar o sustituir, y operaciones destructivas sin posibilidad de cancelación.

## Cambios principales frente a 0.2.0

- Cálculo cancelable desde la interfaz.
- Si se cancela el cálculo, el horario anterior se conserva.
- Estado visible de “cambios sin guardar”.
- Guardado local con copia actual y copia anterior.
- Recuperación de copia anterior desde Inicio.
- Escritura comprobada: si no puede guardar, devuelve error y recomienda exportar JSON.
- Confirmación antes de sustituir el proyecto con cambios sin guardar.
- Confirmación antes de borrar sesiones no fijadas.
- Confirmación antes de eliminar sesiones o elementos con sesiones vinculadas.
- Nueva prueba automática de persistencia/serialización.

## Qué se mantiene

- App estática para GitHub Pages y uso local.
- Formato JSON.
- Motor web prudente.
- Validador independiente.
- Editor visual por grupo, docente y espacio.
- Exportación JSON, CSV, HTML y TXT.
- Ejemplos sintéticos sin datos reales.

## Qué no se ha añadido deliberadamente

- No se añaden reglas complejas nuevas de Frián.
- No se añade XLSX.
- No se añade gestión diaria.
- No se añade motor local externo.

La razón es técnica: antes de crecer, la base debe ser segura para escritura, recuperación y cancelación.

## Prueba recomendada en Android/Termux

```bash
cd /sdcard/Download
unzip -o Generador_Horarios_Escolares_v0_3.zip -d Generador_Horarios_Escolares_v0_3
cd Generador_Horarios_Escolares_v0_3/Generador_Horarios_Escolares_v0_3
python -m http.server 8969
```

Abrir en Chrome:

```text
http://127.0.0.1:8969/
```

## Recorrido manual mínimo

1. Cargar ejemplo IES.
2. Guardar en navegador.
3. Calcular horario.
4. Cancelar un cálculo iniciado de nuevo.
5. Comprobar que el horario anterior se conserva.
6. Mover una sesión en Revisar y ajustar.
7. Guardar de nuevo.
8. Recuperar copia anterior.
9. Exportar JSON e informe de validación.
