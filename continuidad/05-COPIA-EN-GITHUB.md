# Copia independiente en GitHub

El repositorio conectado era **público** al preparar esta carpeta. La copia de continuidad solo debe contener código y documentación sin secretos.

La rama de respaldo se llama `respaldo-continuidad-2026-10-28`. Es una fotografía independiente, no una actualización automática. No se utiliza para cambiar la web publicada ni para enviar una versión a las tiendas.

## Cómo guardarla en tu ordenador

1. Abre el repositorio directamente en GitHub con tu propia cuenta.
2. Selecciona la rama de respaldo, no necesariamente `main`.
3. En **Code → Download ZIP**, descarga la copia.
4. Guarda otra copia en una ubicación independiente bajo tu control.
5. Abre `continuidad/LEEME-PRIMERO.md`.

El ZIP generado por `crear_paquete.py` incluye además un inventario con checksums. La descarga estándar de GitHub no contiene las copias privadas de datos ni ese inventario generado, salvo que se añada expresamente.

## Al hacer cambios en el futuro

Actualizar el código en GitHub y volver a generar/descargar el paquete. Esta entrega no configura sincronización automática ni copias diarias.

Nunca subir archivos de usuarios, volcados de PostgreSQL, listas de probadores, claves privadas, certificados, `.env`, contraseñas ni credenciales de tiendas. El generador hace comprobaciones limitadas de patrones conocidos, pero no sustituye una revisión de privacidad y secretos antes de publicar.

La rama se prepara sin importar todo el historial anterior del proyecto: su objetivo es guardar una selección actual de archivos necesarios, no una copia indiscriminada de capturas, adjuntos o versiones antiguas.
