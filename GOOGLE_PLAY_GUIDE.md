# Guía Paso a Paso: Publicar FallonYou en Google Play Store

## Resumen de Costos
- **Google Play Developer Account:** $25 USD (pago único, de por vida)
- **Servicio de Build (opcional):** $0-29/mes según el servicio

---

## FASE 1: Preparación (Antes de empezar)

### Paso 1.1: Crear cuenta de Google Play Developer
1. Ve a: https://play.google.com/console
2. Inicia sesión con tu cuenta de Google
3. Paga los $25 USD de registro
4. Completa la verificación de identidad (puede tomar 24-48 horas)

### Paso 1.2: Preparar materiales gráficos
Necesitas crear estas imágenes:

| Material | Tamaño | Descripción |
|----------|--------|-------------|
| Icono de app | 512x512 px | Logo de FallonYou en PNG |
| Feature Graphic | 1024x500 px | Banner promocional |
| Screenshots teléfono | 1080x1920 px | 2-8 capturas de pantalla |
| Screenshots tablet (opcional) | 1920x1080 px | Para tablets |

**Tip:** Puedes crear estos en Canva.com gratis desde tu iPad.

### Paso 1.3: Escribir descripciones
Prepara estos textos:

**Título de la app (max 30 caracteres):**
```
FallonYou - Dating App
```

**Descripción corta (max 80 caracteres):**
```
Find meaningful connections. Swipe, match, and chat with people near you.
```

**Descripción larga (max 4000 caracteres):**
```
Welcome to FallonYou - the dating app designed for meaningful connections!

KEY FEATURES:
- Swipe to discover potential matches nearby
- Advanced filters by age, distance, and preferences  
- Secure messaging with your matches
- Detailed profiles with interests and hobbies
- Premium features: See who liked you, unlimited likes, Super Likes

SAFETY FIRST:
- Verified profiles
- Block and report features
- Safety Center with tips
- 18+ only

Find your perfect match today!
```

---

## FASE 2: Generar el archivo APK/AAB

### Opción A: Usando Codemagic (Recomendado - Gratis)

1. **Crear cuenta en Codemagic:**
   - Ve a: https://codemagic.io
   - Regístrate gratis

2. **Conectar tu proyecto:**
   - Codemagic puede conectarse a tu repositorio
   - Configura el build para Android

3. **Generar el AAB:**
   - Codemagic generará el archivo .aab automáticamente
   - Descarga el archivo cuando termine

### Opción B: Usando Expo EAS

1. **Instalar Expo CLI** (necesitas computadora o terminal web)
2. **Ejecutar:** `eas build --platform android`
3. **Descargar el AAB** cuando termine

### Opción C: Contratar en Fiverr
1. Ve a: https://fiverr.com
2. Busca: "convert web app to android apk"
3. Costo aproximado: $50-150 USD
4. Ellos te entregan el archivo listo

---

## FASE 3: Subir la App a Google Play

### Paso 3.1: Crear la ficha de la app
1. Entra a Google Play Console: https://play.google.com/console
2. Click en "Crear aplicación"
3. Completa:
   - Nombre: FallonYou
   - Idioma predeterminado: Español
   - Tipo: Aplicación
   - Gratis o de pago: Gratis (con compras in-app)

### Paso 3.2: Configurar la ficha de Play Store
En el menú lateral, ve a cada sección:

**a) Ficha de Play Store principal:**
- Sube el icono (512x512)
- Sube el Feature Graphic (1024x500)
- Sube screenshots (mínimo 2)
- Escribe título, descripción corta y larga

**b) Categoría:**
- Categoría: Social > Citas
- Etiquetas: Dating, Social, Chat

### Paso 3.3: Completar cuestionarios de contenido

**a) Política de privacidad:**
- URL: https://fallonyou.replit.app/legal
- (O crea una página web con el documento PRIVACY_POLICY.md)

**b) Clasificación del contenido:**
Responde el cuestionario. Para una app de citas:
- Violencia: No
- Contenido sexual: No (pero es app de citas)
- Drogas: No
- Lenguaje: No
- **Resultado esperado:** PEGI 18 / Mature 17+

**c) Cuestionario de seguridad de datos:**
Marca lo siguiente:

| Tipo de dato | Se recopila | Se comparte |
|--------------|-------------|-------------|
| Nombre | Sí | No |
| Email | Sí | No |
| Fecha nacimiento | Sí | No |
| Fotos | Sí | No |
| Ubicación aproximada | Sí | No |
| Mensajes | Sí | No |
| Historial de compras | Sí | No (solo Stripe) |

**d) Público objetivo:**
- Selecciona: Solo adultos (18+)
- Esto es OBLIGATORIO para apps de citas

### Paso 3.4: Configurar precios y distribución

**a) Países:**
- Selecciona los países donde quieres publicar
- Recomendado: Empezar con España, México, Argentina, Colombia

**b) Modelo de ingresos:**
- Tipo: Gratis con compras in-app
- Configura las suscripciones Premium en Google Play Billing

### Paso 3.5: Subir el AAB

1. Ve a "Producción" > "Versiones"
2. Click "Crear nueva versión"
3. Sube el archivo .aab que generaste
4. Escribe notas de la versión:
```
Versión 1.0.0
- Lanzamiento inicial
- Función de swipe y matching
- Chat en tiempo real
- Suscripción Premium disponible
```

### Paso 3.6: Enviar para revisión

1. Revisa que todo esté verde (completo)
2. Click "Enviar para revisión"
3. Espera 1-7 días para la revisión

---

## FASE 4: Después de la aprobación

### Si es APROBADA:
- Tu app estará disponible en Google Play
- Comparte el enlace con tus usuarios
- Monitorea las estadísticas en Play Console

### Si es RECHAZADA:
- Lee el motivo del rechazo
- Haz las correcciones necesarias
- Vuelve a enviar

**Razones comunes de rechazo para apps de citas:**
1. No verificar que usuarios son 18+
2. Política de privacidad incompleta
3. Screenshots con contenido inapropiado
4. No tener moderación de contenido

---

## Checklist Final

- [ ] Cuenta de Google Play Developer creada y verificada
- [ ] Icono 512x512 creado
- [ ] Feature Graphic 1024x500 creado
- [ ] Screenshots (mínimo 2) creados
- [ ] Descripción corta y larga escritas
- [ ] Archivo AAB generado
- [ ] Política de privacidad publicada en URL pública
- [ ] Cuestionario de contenido completado
- [ ] Público objetivo: Solo adultos 18+
- [ ] Países seleccionados
- [ ] App enviada para revisión

---

## Contacto y Soporte

Si tienes problemas con el proceso:
- Google Play Help: https://support.google.com/googleplay/android-developer
- Centro de políticas: https://play.google.com/about/developer-content-policy

---

**Tiempo estimado total:** 2-5 días (dependiendo de la verificación y revisión)
