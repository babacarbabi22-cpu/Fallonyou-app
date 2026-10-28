# Estado técnico y dependencias

Revisión: 28 de octubre de 2026. Es una fotografía del espacio de trabajo, que puede diferir de la versión publicada.

## Base portable

- Cliente React + Vite + TypeScript.
- Servidor Node.js + Express.
- PostgreSQL con `pg` y Drizzle. El esquema de referencia está en `shared/schema.ts`; conservar también `migrations/`.
- Sesiones en PostgreSQL y acceso por correo/contraseña con bcrypt (`server/emailAuth.ts`, exportado desde `server/auth.ts`). Los archivos antiguos de Replit Auth no son el acceso principal actual; no hay que dar por hecho que todo depende del inicio de sesión de Replit.
- WebSocket para chat y coordinación entre instancias con PostgreSQL. El nuevo alojamiento debe admitir conexiones persistentes.
- Capacitor para iOS y Android; identificador configurado `app.fallonyou.twa`.

## Dependencias que sí necesitan atención

| Dependencia | Dónde se usa | Qué debe hacerse fuera de Replit |
|---|---|---|
| App Storage | `server/replit_integrations/object_storage/` | El cliente obtiene credenciales de un servicio local de Replit en el puerto 1106. Copiar el código no copia los archivos ni permite autenticarse desde otro servidor. Exportar objetos y adaptar el proveedor conservando privacidad, permisos y rutas. |
| Conexión de Stripe | `server/stripeClient.ts` | Obtiene credenciales mediante conectores de Replit. Sustituir el acceso al conector por credenciales de una cuenta Stripe controlada por la titular y revisar webhooks. No activar cobros durante el traslado. |
| Sincronización de Stripe | `server/index.ts`, `stripe-replit-sync` | Revisar dependencia y esquema `stripe`; no asumir que el servicio funcionará sin la conexión anterior. Las compras Premium están desactivadas y deben seguir así hasta una validación independiente. |
| Dominio y DNS | `fallonyou.app`, enlaces de correo y Capacitor | Confirmar registrador y acceso al DNS. Mantener el dominio reduce cambios en la app instalada, pero hay que validar HTTPS, cookies, enlaces y notificaciones. |
| Archivos locales privados | `uploads/` y rutas protegidas | Copia privada independiente y almacenamiento duradero; el disco efímero de un servidor no sirve como respaldo. |
| Programadores de avisos | `server/index.ts` y servicios de notificaciones | El alojamiento debe soportarlos; si hay varias instancias, evitar duplicados. No probar avisos con usuarios reales. |
| Compilación de móvil | `ios/`, `android/`, `codemagic.yaml` | Conservar las cuentas, certificados, keystore y configuración privada de Codemagic. Esos secretos no están en el ZIP. |

## Otros proveedores

- Resend: correo de verificación, recuperación y avisos; requiere cuenta, clave y DNS del dominio.
- APNs (Apple) y Firebase/FCM (Android): notificaciones nativas; cuentas y claves propias.
- Web Push: claves VAPID y permisos del navegador.
- PayPal: código y variables de integración existentes; comprobar uso real sin activar compras.
- Duffel y código de Amadeus/RateHawk: proveedores de viajes existentes. Los vuelos y las ventas no deben reactivarse como parte del respaldo; hoteles/paquetes requieren aprobación del proveedor.

Tener código o una variable no demuestra que una integración esté activa, autorizada o verificada.

## Archivos de compilación

```sh
npm ci
npm run check
npm run build
npm start
```

- Conservar `package-lock.json` y usar `npm ci`.
- Node.js 22 es una referencia práctica de partida (el flujo iOS lo utiliza); validar el alojamiento y no actualizar dependencias a la vez que se migra.
- `npm run build` crea `dist/public/` y `dist/index.cjs`.
- `npm start` inicia el servidor de producción. Puerto por defecto: 5000, configurable con `PORT`.
- Mantener las dependencias de ejecución necesarias: el archivo de servidor compilado no incorpora todos los paquetes.
- Los plugins de Vite de Replit están en el código, pero no implican que todo el servidor solo pueda alojarse en Replit.

Las instrucciones de compilación no equivalen a una prueba de acceso a datos, fotos o servicios fuera de Replit.
