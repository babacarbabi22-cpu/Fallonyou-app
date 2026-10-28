# Comprobaciones realizadas

El 28 de octubre de 2026 se comprobó:

- El ZIP se abre sin errores.
- Cada archivo del inventario tiene el SHA-256 indicado.
- Las reglas excluyen archivos `.env`, volcados, claves de firma, listas de probadores y archivos locales privados.
- El comprobador rechaza algunos patrones conocidos de credenciales literales. No es una auditoría exhaustiva de secretos o privacidad.
- Desde una carpeta temporal extraída del ZIP, pasan TypeScript (`npm run check`) y la compilación de producción (`npm run build`).
- Para ese ensayo se reutilizaron los paquetes ya instalados en el espacio de trabajo. **No se probó una instalación completamente nueva de npm en otro proveedor.**
- El generador puede volver a ejecutarse desde una carpeta extraída sin historial Git.

No se ha verificado:

- Restauración de PostgreSQL y objetos privados.
- Arranque funcional completo fuera de Replit.
- Titularidad y recuperación del dominio o de las cuentas externas.
- Firmas y distribución de nuevas versiones móviles desde otro servicio.
- Configuración de copias automáticas.

La web en producción no se ha modificado para preparar esta entrega.
