# Guía: Generar APK/AAB con Codemagic (Gratis)

## ¿Qué es Codemagic?
Codemagic es un servicio online que genera archivos APK/AAB para Android sin necesidad de tener una computadora. Es gratis hasta 500 minutos de build al mes.

---

## Paso 1: Crear cuenta en Codemagic

1. Ve a: https://codemagic.io
2. Click en "Start building for free"
3. Regístrate con tu cuenta de GitHub, GitLab o Bitbucket
   - Si no tienes, crea una cuenta en github.com primero

---

## Paso 2: Subir tu código a GitHub

### Opción A: Desde Replit (más fácil)
1. En tu proyecto de Replit, ve a "Version Control"
2. Conecta con GitHub
3. Crea un nuevo repositorio
4. Tu código se subirá automáticamente

### Opción B: Manualmente
1. Crea un repositorio en github.com
2. Sube los archivos de tu proyecto

---

## Paso 3: Conectar proyecto en Codemagic

1. En Codemagic, click "Add application"
2. Selecciona tu repositorio de GitHub
3. Elige "Capacitor" como tipo de proyecto

---

## Paso 4: Configurar el Build

### Configuración básica:
```yaml
workflows:
  android-build:
    name: Android Production
    max_build_duration: 60
    instance_type: mac_mini_m1
    environment:
      node: 18
    scripts:
      - name: Install dependencies
        script: npm install
      - name: Build web
        script: npm run build
      - name: Sync Capacitor
        script: npx cap sync android
      - name: Build Android
        script: |
          cd android
          ./gradlew assembleRelease
    artifacts:
      - android/app/build/outputs/**/*.apk
      - android/app/build/outputs/**/*.aab
```

---

## Paso 5: Iniciar el Build

1. Click en "Start new build"
2. Selecciona la rama "main"
3. Espera 10-20 minutos
4. Descarga el archivo .aab cuando termine

---

## Paso 6: Firmar el APK (Importante)

Google Play requiere que el APK esté firmado. Codemagic puede hacerlo automáticamente:

1. En Codemagic, ve a "Code signing"
2. Crea un nuevo keystore:
   - Alias: fallonyou
   - Password: (elige una contraseña segura, guárdala)
3. Guarda el archivo .keystore en un lugar seguro

---

## Archivos que recibirás

| Archivo | Uso |
|---------|-----|
| app-release.aab | Para subir a Google Play (recomendado) |
| app-release.apk | Para instalar directamente en teléfonos |

---

## Alternativa: Usar Codemagic desde el móvil

1. Accede a codemagic.io desde Safari/Chrome
2. Inicia sesión
3. Selecciona tu proyecto
4. Click "Start build"
5. Espera y descarga

La interfaz web funciona en iPad y móviles.

---

## Solución de Problemas

### Error: "Capacitor Android platform not found"
Solución: Asegúrate de que el proyecto tiene la carpeta `android/`

### Error: "Build failed"
Solución: Revisa los logs del build para ver el error específico

### Error: "Keystore not found"
Solución: Configura el code signing en Codemagic

---

## Costo

- **Gratis:** 500 minutos/mes de build
- Cada build toma ~15-20 minutos
- Con 500 minutos puedes hacer ~25-30 builds al mes
- Suficiente para la mayoría de proyectos

---

## Contacto Codemagic
- Soporte: https://codemagic.io/contact
- Documentación: https://docs.codemagic.io
