# Traslado a otro proveedor: guía para un desarrollador

## Antes de empezar

No se está trasladando ni publicando la app con esta entrega. No cambiar DNS ni servicios de producción hasta completar un ensayo aislado. No asumir que tener el ZIP significa que los datos están protegidos.

1. Verificar el SHA-256 del ZIP e inventario.
2. Obtener las copias privadas de base de datos y archivos, y acceso independiente a las cuentas.
3. Elegir alojamiento Node.js con HTTPS, WebSockets, tareas programadas y acceso a PostgreSQL. Comprobar almacenamiento persistente o proveedor de objetos.
4. Crear un entorno aislado con datos ficticios; desactivar correos, pagos y avisos reales durante las pruebas.

## Preparar el software

Descomprimir el ZIP, entrar en `FallonYou/` e instalar usando el lockfile:

```sh
npm ci
npm run check
npm run build
```

Configurar las variables de forma segura con el nuevo proveedor. La plantilla está vacía y la app no tiene por qué cargar automáticamente un archivo `.env`; usar el gestor de secretos del alojamiento o un cargador explícito revisado.

```sh
npm start
```

El arranque requiere la base de datos y la configuración adecuada. Instalar y compilar no prueba la restauración funcional.

## Ajustes que deben hacerse

- Sustituir el mecanismo de credenciales de App Storage por uno compatible con el nuevo proveedor. Mantener autorización, propiedad, subida segura, streaming de vídeos y borrado.
- Sustituir la conexión de Stripe a Replit y revisar sus webhooks sin habilitar Premium ni cobros.
- Restaurar la base en un destino nuevo; revisar esquema `public`, esquema `stripe` si corresponde, sesiones, extensiones y permisos. No modificar la base publicada de Replit como parte de esta guía.
- Revisar referencias al dominio en correo, seguridad, enlaces y configuración de Capacitor. Mantener `fallonyou.app` si se dispone de control del dominio.
- Configurar proxy HTTPS, cookies seguras, política de origen, cabeceras y límites de peticiones. El servidor usa `trust proxy`; ajustarlo a la topología real.
- Configurar WebSockets y coordinación del chat. Evitar avisos programados duplicados si hay varias instancias.
- Validar Resend y DNS conservando la recepción del correo.
- Configurar APNs/FCM/Web Push por sus cuentas originales. No afirmar que funcionan sin probar entrega en dispositivos reales, con la app cerrada.

## Lista de aceptación

- [ ] Acceso y cierre de sesión; recuperación y eliminación de cuenta.
- [ ] Perfil, fotos privadas y acceso autorizado; no hay archivos ajenos visibles.
- [ ] Comunidad, conexiones, mensajes y entrega por WebSocket.
- [ ] Historias de foto/vídeo, streaming y expiración.
- [ ] Idiomas: progreso existente, ejercicios, sonidos opcionales y restricciones Premium.
- [ ] Correos de prueba solo a cuentas de prueba.
- [ ] Avisos y preferencias, sin restablecer elecciones del usuario.
- [ ] Vuelos/ventas y compras Premium continúan desactivados.
- [ ] iPhone y Android cargan la web, mantienen sesión y muestran correctamente el contenido.
- [ ] Subidas y borrados actualizan base de datos y almacenamiento de forma coherente.
- [ ] Las copias privadas se pueden restaurar y sus fechas/recuentos concuerdan.

## Cambio final

1. Reducir el tiempo de caché DNS con antelación si procede.
2. Coordinar una pausa de escrituras o copia incremental final de datos y objetos.
3. Revisar certificados HTTPS y rutas de correo/webhooks.
4. Cambiar DNS cuando el nuevo entorno esté validado.
5. Vigilar errores y mantener un plan de vuelta atrás **sin descartar nuevas escrituras**.
6. Conservar el entorno anterior durante una ventana acordada, sin dejar notificaciones duplicadas.

Si el dominio no cambia, puede no ser necesario subir una versión móvil solo para cambiar servidor, pero sí hay que revisar las configuraciones y probar. Si cambia la dirección configurada en Capacitor, habrá que recompilar y distribuir nuevas versiones según las reglas de las tiendas.

## Fuentes consultadas

- https://docs.replit.com/help/projects-and-files
- https://docs.replit.com/features/workspace-tools/git-interface
- https://docs.replit.com/features/data-and-storage/data-recovery
- https://docs.replit.com/features/data-and-storage/object-storage

Las capacidades y procedimientos de cada proveedor pueden cambiar; verificar su documentación antes de una migración.
