# Auditoría UX pública · WEB RC1

Resultado: saneamiento aplicado sobre P12-6.1.

Correcciones aplicadas:

- La publicación pública carga por defecto el ejemplo web P12-5 si no hay proyecto activo.
- Si existe en caché un ejemplo sintético complejo no compatible, se conserva copia local y se sustituye por P12-5.
- La biblioteca pública queda reducida a ejemplos generables en navegador: P12-5, P12-2 y P12-1.
- Se retiran de la distribución pública los datos avanzados P11/A6 que inducían a intentar generar con motor externo.
- La generación ordinaria no consulta CP-SAT ni muestra "CP-SAT no disponible".
- El botón ordinario de generación solo se presenta como generación local en navegador.
- El mantenimiento avanzado queda fuera de la navegación ordinaria.
- Se actualiza la versión visible a 1.0.0-web-rc.1.

Pendiente honesto:

- QA físico real en Android, tableta y PC desde la URL de GitHub Pages.
- No acredita Frián real ni centros complejos fuera del alcance P12-5.
