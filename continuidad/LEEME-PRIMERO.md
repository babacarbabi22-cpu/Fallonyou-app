# FallonYou: carpeta de continuidad

Preparada el 28 de octubre de 2026. Este documento describe una copia puntual, no un respaldo automático.

## Qué puedes conservar

El código puede ejecutarse en otro proveedor con Node.js, PostgreSQL, HTTPS y almacenamiento de archivos. No es necesario rehacer toda la app. Sin embargo, **no está lista para trasladarla sin ajustes**: las fotos dependen de App Storage y Stripe obtiene sus credenciales mediante la conexión de Replit.

La web publicada verificada es **https://fallonyou.app**. La app móvil abre esa web. Si conservas el dominio y lo diriges al nuevo servidor correctamente, la app puede seguir usando la misma dirección. Esto debe probarse en iPhone y Android; no es una garantía de continuidad sin interrupciones.

## Lo que contiene este paquete

| Elemento | Estado |
|---|---|
| Código web, servidor, esquema y migraciones existentes | Incluido en el ZIP generado |
| Proyectos nativos iOS y Android, sin firmas ni compilados | Incluidos |
| Recursos gráficos que importa actualmente la web | Incluidos |
| Lista de servicios y variables necesarias, sin valores secretos | Incluida |
| Instrucciones de traslado y comprobación | Incluidas |
| Usuarios, mensajes, progresos y demás datos de producción | **No exportados** |
| Fotos, historias y archivos de los usuarios en App Storage | **No exportados** |
| Archivos privados en `uploads/` | **No exportados** |
| Contraseñas, claves, certificados y firmas de las tiendas | **No incluidos** |
| Control del dominio y acceso a cuentas externas | **Pendiente de confirmar por la titular** |
| Restauración completa en un servidor externo | **No realizada** |

**Por tanto, esto no es todavía una copia completa de la app con sus datos.** El ZIP permite conservar el software y esta guía; los datos y las credenciales requieren copias privadas independientes.

## Guarda dos cosas distintas

1. **Carpeta pública de instrucciones y código:** esta carpeta `continuidad/` y el código del proyecto pueden conservarse en GitHub. El repositorio conectado era público al revisarlo. No subas bases de datos, archivos privados ni claves.
2. **Copia privada cifrada:** base de datos de producción, archivos de usuarios, secretos y material de firma. Guárdala fuera de Replit y fuera de cualquier repositorio, incluso privado. Usa un gestor de contraseñas y almacenamiento cifrado bajo tu control.

## Cómo descargar o actualizar el paquete

Desde la raíz del proyecto:

```sh
python3 continuidad/crear_paquete.py
```

Genera un ZIP con el código y esta carpeta dentro de `generated-artifacts/continuidad/`, junto con su SHA-256 y un inventario de archivos. Esa salida está excluida de Git y de las publicaciones. El generador no consulta secretos, bases de datos ni servicios externos, y no incluye el historial de Git.

El generador incluye solo carpetas de código, configuración seleccionada y recursos referenciados por `@assets/`. No copia indiscriminadamente `attached_assets/`, porque contiene material de trabajo y capturas que podrían ser privados. Tampoco copia `public/testers.csv`, grabaciones de revisión, certificados, dependencias instaladas o compilaciones antiguas.

Si en el futuro se añaden recursos dinámicos o carpetas nuevas, revisa el generador y el inventario. Para reproducir la compilación se necesitan Internet y los paquetes del registro npm; no es un kit completamente desconectado de Internet.

## Orden recomendado

1. Lee `01-ESTADO-Y-DEPENDENCIAS.md`.
2. Completa `02-CUENTAS-Y-CLAVES.md` **en una copia privada**, nunca anotando claves en GitHub.
3. Obtén las copias privadas según `03-DATOS-Y-ARCHIVOS.md`.
4. Un desarrollador sigue `04-TRASLADO-Y-VERIFICACION.md` y ensaya una restauración.
5. Registra las fechas de las próximas copias en tu archivo privado.

No cambies DNS, no borres el servidor actual y no canceles servicios hasta que el nuevo entorno haya pasado las pruebas.
