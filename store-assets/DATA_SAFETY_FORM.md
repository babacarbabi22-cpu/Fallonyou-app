# FallonYou - Formulario de Seguridad de Datos (Google Play)

## Guía para completar el formulario de Google Play

Cuando Google Play te pregunte sobre los datos, responde exactamente así:

---

## Sección 1: Recopilación de Datos

### ¿Tu app recopila o comparte datos de usuario?
**Respuesta:** Sí

---

## Sección 2: Tipos de Datos Recopilados

### Ubicación
| Pregunta | Respuesta |
|----------|-----------|
| ¿Recopilas ubicación aproximada? | Sí |
| ¿Recopilas ubicación precisa? | No |
| ¿Es opcional u obligatoria? | Opcional |
| ¿Para qué se usa? | Funcionalidad de la app (mostrar usuarios cercanos) |
| ¿Se comparte con terceros? | No |

### Información Personal
| Dato | Se recopila | Obligatorio | Se comparte |
|------|-------------|-------------|-------------|
| Nombre | Sí | Sí | No |
| Email | Sí | Sí | No |
| Fecha de nacimiento | Sí | Sí | No |
| Género | Sí | Sí | No |
| Orientación sexual | Sí | Opcional | No |

**Propósito:** Funcionalidad de la app, Personalización

### Fotos y Videos
| Pregunta | Respuesta |
|----------|-----------|
| ¿Recopilas fotos? | Sí |
| ¿Recopilas videos? | No |
| ¿Es obligatorio? | Opcional |
| ¿Para qué se usa? | Funcionalidad de la app (perfil) |
| ¿Se comparte con terceros? | No |

### Mensajes
| Pregunta | Respuesta |
|----------|-----------|
| ¿Recopilas mensajes in-app? | Sí |
| ¿Es obligatorio? | Opcional |
| ¿Para qué se usa? | Funcionalidad de la app (chat) |
| ¿Se comparte con terceros? | No |

### Información Financiera
| Pregunta | Respuesta |
|----------|-----------|
| ¿Recopilas info de pago? | Sí (a través de Google Play Billing) |
| ¿Se procesa por terceros? | Sí (Stripe) |
| ¿Para qué se usa? | Suscripciones Premium |

### Identificadores de Dispositivo
| Pregunta | Respuesta |
|----------|-----------|
| ¿Recopilas ID de dispositivo? | Sí |
| ¿Es obligatorio? | Sí |
| ¿Para qué se usa? | Seguridad, prevención de fraude |
| ¿Se comparte con terceros? | No |

---

## Sección 3: Prácticas de Seguridad

### ¿Los datos están encriptados en tránsito?
**Respuesta:** Sí (HTTPS/TLS)

### ¿Los usuarios pueden solicitar eliminación de datos?
**Respuesta:** Sí

### ¿Cómo pueden eliminar sus datos?
**Respuesta:** 
- Eliminando su cuenta en la app
- Contactando a support@fallonyou.app

---

## Sección 4: Resumen Final

### Datos recopilados:
- [x] Información personal (nombre, email, edad, género)
- [x] Fotos
- [x] Ubicación aproximada
- [x] Mensajes
- [x] Información de pago (procesada por terceros)
- [x] Identificadores de dispositivo

### Datos compartidos con terceros:
- [x] Información de pago → Stripe (solo para procesar pagos)
- [ ] Ningún otro dato se comparte

### Propósitos:
- [x] Funcionalidad de la app
- [x] Personalización
- [x] Seguridad y prevención de fraude
- [ ] Publicidad (NO)
- [ ] Análisis (NO)

---

## Texto para la Sección de Privacidad

Cuando te pidan un resumen, usa esto:

```
FallonYou recopila información personal (nombre, email, edad, fotos) para crear perfiles de usuario y permitir el emparejamiento. Los mensajes se almacenan de forma segura para permitir la comunicación entre usuarios. La ubicación aproximada se usa para mostrar usuarios cercanos. Los pagos son procesados de forma segura por Stripe. No vendemos ni compartimos datos personales con terceros para publicidad. Los usuarios pueden eliminar su cuenta y todos sus datos en cualquier momento.
```

---

## Preguntas Frecuentes del Formulario

**P: ¿Tu app tiene anuncios?**
R: No

**P: ¿Compartes datos con anunciantes?**
R: No

**P: ¿Los datos se transfieren fuera de la UE?**
R: Sí (servidores en USA), pero cumplimos con GDPR

**P: ¿Hay moderación de contenido?**
R: Sí (sistema de reportes y bloqueo)

**P: ¿La app permite contenido generado por usuarios?**
R: Sí (fotos de perfil, mensajes)
