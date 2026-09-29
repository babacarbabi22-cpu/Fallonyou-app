# FallonYou en App Store — preparación y pasos pendientes

El proyecto iOS de Capacitor está en `ios/App`. El flujo `ios-workflow` de
`codemagic.yaml` compila en un Mac de Codemagic, firma el archivo IPA y lo sube
a **App Store Connect**, pero **no lo envía automáticamente a revisión**.
Configura primero la cuenta y la firma, ejecuta el flujo para obtener el IPA
y **después** comprueba su funcionamiento en un iPhone mediante TestFlight,
antes de solicitar la revisión pública.

## Configuración que debe hacer el titular de la cuenta

1. Tener una cuenta activa en el [Apple Developer Program](https://developer.apple.com/programs/enroll/)
   y acceso a [App Store Connect](https://appstoreconnect.apple.com/).
2. Confirmar o registrar el identificador de la app `app.fallonyou.twa` en la
   cuenta de Apple. Si ya existe otro identificador para FallonYou, ajustar
   **antes de la primera subida** el bundle ID tanto en el proyecto Xcode
   como en `codemagic.yaml`. Un bundle ID publicado no se cambia después.
3. Conectar el repositorio a Codemagic y crear allí una integración **App Store
   Connect** llamada `fallonyou-app-store-connect`, con permisos apropiados
   para la subida. Configurar los certificados de distribución y perfiles de
   aprovisionamiento para el bundle ID. Hacerlo en la interfaz de Codemagic,
   nunca pegando claves privadas ni archivos de firma en el repositorio o el chat.
4. Crear el registro de FallonYou en App Store Connect con ese mismo bundle ID.
   Lanzar `ios-workflow` manualmente para obtener el primer IPA y revisar el
   resultado del procesamiento en App Store Connect.

## Antes de enviar a revisión

- **Probar en un iPhone real con TestFlight:** registro, acceso, cierre de sesión,
  sesión tras cerrar y abrir la app, recuperación de contraseña, fotos y cámara,
  chat, enlaces legales, borrado de cuenta, navegación y funcionamiento con mala
  conexión. No se puede verificar Xcode, la firma ni TestFlight en este
  entorno Linux.
- **Alcance inicial:** el proyecto Xcode se ha configurado solo para iPhone.
  Preparar capturas reales de iPhone, no de iPad. Si se decide admitir iPad,
  habilitarlo explícitamente y probar también esa interfaz y sus capturas.
- **Validar la arquitectura:** la app iOS carga `https://fallonyou.app` con
  `server.url` para conservar las sesiones y las llamadas `/api` actuales.
  Depende de la web y de la conexión; no es una app offline. Apple puede
  cuestionar una app que solo envuelva una web según su criterio de
  [funcionalidad mínima](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality).
  Si lo exige, habrá que empaquetar la interfaz y adaptar API, cookies y
  enlaces antes de enviar a revisión. No declarar esta versión lista para
  publicación hasta probar el IPA real.
- **Pagos:** las compras de Premium y el checkout externo siguen desactivados.
  No anunciar precios, pruebas gratuitas ni compras dentro de la ficha de
  Apple hasta implementar un método que cumpla las reglas de la App Store
  para servicios digitales.
- **Ficha de App Store:** preparar descripción fiel a las funciones actuales,
  categoría, clasificación por edad, URL pública de política de privacidad,
  URL de soporte, capturas reales de iPhone de los tamaños solicitados y
  declaraciones de datos recopilados/compartidos. Revisar que las afirmaciones
  sobre verificación de identidad y moderación coincidan con lo que hace la app.
- **Revisión:** si Apple necesita entrar, facilitar una cuenta de prueba desde
  el campo seguro de información para revisión de App Store Connect, no en
  código ni mensajes. Comprobar que el flujo de eliminación de cuenta funciona.
- **Notificaciones:** la web usa Web Push; todavía no hay APNs nativo
  configurado para esta app iOS. No prometer notificaciones nativas antes de
  implementarlas y probarlas.

Documentación: [subir builds a App Store Connect](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/),
[publicación desde Codemagic](https://docs.codemagic.io/yaml-publishing/app-store-connect/).