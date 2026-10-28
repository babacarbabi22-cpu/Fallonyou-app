# Copias privadas: datos y archivos

## Estado al entregar esta carpeta

**No se ha exportado la base de datos, no se han descargado archivos privados y no se ha realizado una restauración completa.** El paquete de código no contiene usuarios, conversaciones ni claves. Tampoco acredita que las copias automáticas de Replit puedan recuperarse si no hay acceso a Replit.

## 1. PostgreSQL de producción

Encarga una exportación consistente de **producción**, no de desarrollo. Utiliza las herramientas seguras de base de datos o una conexión de solo lectura autorizada y las utilidades oficiales de PostgreSQL:

- `pg_dump` en formato personalizado, con la versión compatible con el servidor.
- Incluir esquema, datos, secuencias y objetos necesarios. Documentar extensiones, roles y permisos que deban recrearse en el destino.
- Conservar sesiones según la política de privacidad; decidir si se invalidarán al trasladar el servicio.
- No confiar solo en los archivos de `migrations/`: pueden no representar por sí solos todo el estado real del esquema publicado.
- Confirmar fecha/hora, entorno, tamaño y SHA-256 del archivo.
- Restaurar con `pg_restore` en una base **nueva y aislada fuera de producción**, comprobar tablas, relaciones y recuentos sin difundir datos.

No se proporciona un comando con conexión incrustada. La conexión debe obtenerse de forma segura y nunca guardarse en GitHub ni en un historial de terminal. No ejecutar migraciones, `db:push` o restauraciones sobre producción para comprobar una copia.

## 2. Archivos en App Storage

La documentación oficial de Replit permite descargar objetos desde la herramienta App Storage. Para una copia completa y repetible, un desarrollador debe inventariar los buckets autorizados y descargar los objetos mediante un método admitido, sin depender de enlaces temporales.

Conservar de forma privada:

- Los bytes originales de fotos, vídeos, historias y otros archivos que correspondan al estado de la copia.
- La clave/ruta de cada objeto, tamaño, tipo MIME, checksum y metadatos necesarios.
- Permisos y reglas de acceso. **No convertir fotos privadas en archivos públicos** al cambiarlas de proveedor.
- Las relaciones entre rutas guardadas en PostgreSQL y los objetos.

Comprobar paginación, posibles límites y errores; verificar que no quedan objetos sin copiar. Si la app sigue recibiendo cambios, coordinar un corte final o una copia incremental para que base de datos y archivos representen un estado coherente. Aplicar también las eliminaciones: no recuperar cuentas borradas desde una copia antigua.

El cliente actual usa credenciales del servicio local de Replit. **Copiar su configuración no exporta el bucket ni da acceso fuera de Replit.**

## 3. `uploads/` y otros archivos privados locales

Revisar tanto el entorno publicado como el de desarrollo. Una carpeta vacía en este espacio de trabajo no prueba que producción esté vacía. Copiar solo por un canal privado y conservar permisos y correspondencias con la base de datos.

## 4. Firmas y secretos

- Guardar certificados y claves móviles en una bóveda privada cifrada.
- Conservar el keystore Android y su alias/contraseñas, o documentar el proceso oficial de recuperación de la clave de subida.
- Conservar las claves de APNs y los accesos de firma de Apple.
- Revisar cómo obtener credenciales de correo, pagos y notificaciones desde sus cuentas originales.
- Guardar las claves de cifrado de la copia separadas de los archivos cifrados.

## 5. Frecuencia sugerida, no configurada

- Código: después de cambios importantes.
- Base de datos: diariamente, según volumen y tolerancia a perder cambios.
- Archivos: copia incremental diaria, coordinada con la base de datos.
- Copia independiente completa: periódicamente y antes de una migración.
- Ensayo de restauración: periódicamente y después de cambios importantes.

No se ha instalado una tarea automática ni contratado almacenamiento. Define retención, cifrado, ubicación, acceso y borrado de copias según tus obligaciones de privacidad.

## Registro privado recomendado

Guarda **fuera de GitHub**: fecha, entorno, ubicación cifrada, tamaños, checksums, quién puede restaurar, última prueba de restauración y fecha prevista de la próxima copia. Una copia que nunca se ha restaurado no demuestra capacidad de recuperación.
