# Matriz de importación · v1.2.0

| Función | Estado | Observación |
|---|---:|---|
| Plantilla CSV docentes | Soportado | Nombre mínimo obligatorio. |
| Plantilla CSV grupos/subgrupos | Soportado | Permite grupo matriz y paralelo. |
| Plantilla CSV espacios/zonas | Soportado | Espacios y zonas se tratan igual en el modelo. |
| Plantilla CSV tramos | Soportado | Inicio, fin, duración, tipo, clase/servicios/permanencia. |
| Plantilla CSV actividades | Soportado | Vincula por nombre a grupo, docente y espacio. |
| Importación de docentes | Soportado | Alta o actualización por nombre. |
| Importación de grupos | Soportado | Alta o actualización por nombre. |
| Importación de espacios | Soportado | Alta o actualización por nombre. |
| Importación de tramos | Soportado | Sustituye tramos y vacía horario colocado. |
| Importación de actividades | Soportado | No crea dependencias inexistentes. |
| Importación XLSX directa | No soportado | Pendiente de fase posterior. |
| Importación desde XADE | No soportado | Fuera de alcance actual. |
| Validación de CSV antes de aplicar | Parcial | Detecta columnas y referencias básicas. |
| Deshacer importación | Parcial | Se recomienda exportar JSON antes; también queda copia de emergencia. |
