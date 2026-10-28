# Cuentas, accesos y variables

**No rellenes este archivo con contraseñas, claves ni información privada dentro del repositorio.** Anota los accesos en tu gestor de contraseñas y usa esta lista para comprobar que puedes recuperarlos.

## Cuentas que debes controlar

- [ ] GitHub: acceso al repositorio y recuperación de la cuenta, sin depender únicamente del acceso desde Replit.
- [ ] Registrador de `fallonyou.app`: renovación, titularidad, facturación y recuperación.
- [ ] Proveedor DNS: copia de los registros, incluidos correo, verificación y servicios de las tiendas.
- [ ] Apple Developer y App Store Connect: rol de titular o administrador, certificados y recuperación.
- [ ] Google Play Console y Play App Signing: rol de titular/administrador y clave de subida.
- [ ] Codemagic: acceso al proyecto, firmas e integraciones; exportar las configuraciones privadas por un medio seguro.
- [ ] Resend y correo receptor del dominio.
- [ ] Firebase/Google Cloud para Android y APNs para Apple.
- [ ] Stripe y PayPal: identificar la cuenta comercial, acceso directo y método de recuperación.
- [ ] Proveedores de viajes que realmente utilices.
- [ ] Nuevo alojamiento y almacenamiento, cuando se elijan.

Una integración conectada desde Replit no demuestra que tengas acceso directo al proveedor ni que sus credenciales puedan reutilizarse fuera.

## Variables encontradas en el código

Solo se documentan **nombres y finalidad**, nunca valores. Consulta `variables.env.example` como plantilla vacía.

| Grupo | Variables | Observaciones |
|---|---|---|
| Servidor | `NODE_ENV`, `PORT` | Producción y puerto del servidor |
| Base de datos | `DATABASE_URL` | La conexión del nuevo servidor; distinguir desarrollo de producción |
| Sesiones y medios | `SESSION_SECRET` | También participa en firmas de medios. Cambiarlo puede invalidar sesiones y enlaces firmados; planificar el efecto |
| Almacenamiento | `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Las rutas no bastan: el cliente actual usa autenticación específica de Replit |
| Correo | `RESEND_API_KEY`, `ADMIN_ALERT_EMAIL` | Revisar remitentes y DNS sin romper el correo entrante |
| Apple Push | `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_ENVIRONMENT` | Preservar el archivo `.p8` de forma privada; verificar entorno sandbox/producción |
| Android Push | `FIREBASE_SERVICE_ACCOUNT_JSON` | Privado; no es lo mismo que la configuración cliente `google-services.json` |
| Configuración Android de compilación | `FIREBASE_ANDROID_CONFIG_JSON` | El script `script/prepare-android-push.mjs` la usa |
| Web Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | La clave privada no se publica |
| Pagos | `PREMIUM_PURCHASES_ENABLED`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Mantener compras desactivadas; Stripe necesita adaptar su obtención de credenciales |
| Viajes | `DUFFEL_ACCESS_TOKEN`, `AMADEUS_API_KEY`, `AMADEUS_API_SECRET`, `RATEHAWK_KEY_ID`, `RATEHAWK_API_KEY` | No habilitar ventas por disponer de una clave |
| Compilación móvil | `CM_KEYSTORE`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`, `CM_KEY_PASSWORD` | Configuración privada de Codemagic, no del servidor web |

También hay variables propias de Replit (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, `REPL_IDENTITY`, `WEB_REPL_RENEWAL`, `REPLIT_CONNECTORS_HOSTNAME`, `REPLIT_DEPLOYMENT`, y las del código antiguo de Replit Auth). **No hay que trasladarlas como si fueran credenciales portables**. Revisar y sustituir los puntos que dependen de ellas.

## Verificación realizada sin leer secretos

El gestor de secretos confirmó la presencia de nombres de APNs, Resend, PayPal, Duffel, sesión y configuración de almacenamiento. No se leyeron ni exportaron valores. No se certifica aquí su validez ni la presencia de los secretos privados guardados en Codemagic o en producción.

Para recuperar claves, utiliza las herramientas seguras de cada proveedor o genera sustitutas siguiendo su procedimiento. Nunca las pegues en un chat, documento público o incidencia de GitHub.
