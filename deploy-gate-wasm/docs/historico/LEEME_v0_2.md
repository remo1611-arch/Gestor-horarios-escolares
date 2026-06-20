# Primera versión completa · Generador de Horarios Escolares 0.1.0

## Estado

Primera versión funcional nueva, sin reutilización del código del proyecto anterior.

## Qué permite ya

- Crear un proyecto de horario escolar.
- Configurar centro, días y tramos.
- Añadir profesorado, grupos, espacios y actividades horarias.
- Definir disponibilidad de docentes y espacios.
- Calcular un horario en el navegador.
- Validar el horario con un validador independiente.
- Detectar solapamientos de grupo, docente y espacio.
- Detectar sesiones pendientes o sesiones de más.
- Mover sesiones manualmente si el movimiento no genera error grave.
- Fijar sesiones para que el cálculo posterior las respete.
- Guardar una copia en el navegador.
- Exportar e importar JSON.
- Exportar CSV por grupos, docentes y espacios.
- Exportar HTML imprimible.
- Exportar informe de validación.

## Qué centros puede representar

La estructura no está ligada a un IES. Usa la entidad general “actividad horaria”, por lo que puede representar:

- IES;
- CEIP;
- CPI;
- CIFP;
- CEE;
- otros centros con estructura propia.

La validez real dependerá de que el perfil organizativo de cada centro esté bien introducido.

## Limitaciones conscientes de 0.1.0

- No importa XLSX todavía.
- No gestiona ausencias diarias ni sustituciones.
- No genera documentación oficial avanzada.
- No tiene motor local avanzado externo.
- No es multiusuario.
- No almacena datos en servidor.
- No sustituye todavía a una herramienta comercial madura; establece una base limpia y ampliable.

## Criterio de seguridad

La aplicación puede devolver un horario parcial, pero no debe declarar correcto un horario con errores graves detectados.

## Ejecución local recomendada

En Windows, desde PowerShell dentro de la carpeta:

```powershell
powershell -ExecutionPolicy Bypass -File .\abrir_local_windows.ps1
```

También puede usarse:

```bash
python -m http.server 8969
```

y abrir:

```text
http://127.0.0.1:8969/
```

## Publicación en GitHub Pages

Subir todo el contenido de la carpeta al repositorio y activar GitHub Pages. La entrada es `index.html`.
