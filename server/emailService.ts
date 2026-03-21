import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    ciphers: "SSLv3",
  },
});

export async function sendPhotoReminderEmail(to: string, firstName: string): Promise<boolean> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[Email] EMAIL_USER or EMAIL_PASS not configured");
    return false;
  }

  const name = firstName || "viajero";

  // Pick a random cheerful subject line
  const subjects = [
    "🌍 ¡${name}, hay gente esperando conocerte en FallonYou!",
    "✈️ ¡Tu próxima aventura empieza con una foto!",
    "🎉 ¡${name}, crea tu primera actividad y llénala de gente!",
    "🌟 Un pequeño paso para ti, una gran conexión para la comunidad",
  ];
  const subject = subjects[Math.floor(Math.random() * subjects.length)].replace("${name}", name);

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "FallonYou"}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f9f6f0;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f0;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header dorado con emojis festivos -->
          <tr>
            <td style="background:linear-gradient(135deg,#c9a227,#f0c040,#c9a227);padding:40px 32px 32px;text-align:center;">
              <p style="margin:0;font-size:40px;letter-spacing:6px;">✈️ 🌍 🎉</p>
              <h1 style="margin:14px 0 6px;color:#1a1a1a;font-size:28px;font-weight:800;letter-spacing:-0.5px;">FallonYou</h1>
              <p style="margin:0;color:#5a4000;font-size:14px;font-weight:600;letter-spacing:1px;">CONECTA · VIAJA · VIVE</p>
            </td>
          </tr>

          <!-- Saludo principal -->
          <tr>
            <td style="padding:36px 32px 0;">
              <h2 style="margin:0 0 16px;color:#111;font-size:22px;line-height:1.3;">¡Hola ${name}! 👋<br/>¡Nos alegramos de tenerte aquí!</h2>
              <p style="margin:0 0 14px;color:#555;font-size:16px;line-height:1.7;">
                Tu cuenta está lista y la comunidad de FallonYou te espera con los brazos abiertos. 
                Solo falta <strong>una foto tuya</strong> para que el resto de viajeros puedan conocerte y conectar contigo. 😊
              </p>
              <p style="margin:0 0 24px;color:#555;font-size:16px;line-height:1.7;">
                ¡Solo son 30 segundos y marca la diferencia!
              </p>
            </td>
          </tr>

          <!-- Sección actividades -->
          <tr>
            <td style="padding:0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbee;border:2px solid #f0c040;border-radius:14px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 8px;font-size:18px;">🎯 <strong style="color:#1a1a1a;">¿Tienes planes para este fin de semana?</strong></p>
                    <p style="margin:0;color:#555;font-size:15px;line-height:1.6;">
                      ¡Crea una actividad en FallonYou y llénala de gente! Una cena, un partido, una excursión, una visita cultural... 
                      lo que tú quieras. <strong>¡Todo el mundo puede unirse!</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ideas de actividades -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0 0 14px;color:#333;font-size:15px;font-weight:700;">💡 Ideas que funcionan muy bien:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="background:#f5f5f5;border-radius:10px;padding:12px 14px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;color:#333;">🍕 <strong>Cena de grupo</strong><br/><span style="color:#777;">Propón un restaurante y reúne gente</span></p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#f5f5f5;border-radius:10px;padding:12px 14px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;color:#333;">🏖️ <strong>Playa o ruta</strong><br/><span style="color:#777;">Organiza una salida al aire libre</span></p>
                  </td>
                </tr>
                <tr><td colspan="3" style="height:10px;"></td></tr>
                <tr>
                  <td width="48%" style="background:#f5f5f5;border-radius:10px;padding:12px 14px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;color:#333;">⚽ <strong>Deporte</strong><br/><span style="color:#777;">Fútbol, pádel, running... lo que sea</span></p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#f5f5f5;border-radius:10px;padding:12px 14px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;color:#333;">🎭 <strong>Cultura o fiesta</strong><br/><span style="color:#777;">Teatro, concierto, fiesta local...</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA principal -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://fallonyou.app/profile"
                       style="display:inline-block;background:linear-gradient(135deg,#c9a227,#f0c040);color:#1a1a1a;font-weight:800;font-size:17px;padding:16px 40px;border-radius:50px;text-decoration:none;box-shadow:0 4px 12px rgba(201,162,39,0.4);">
                      📸 Añadir mi foto y empezar →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA secundario -->
          <tr>
            <td style="padding:12px 32px 8px;text-align:center;">
              <a href="https://fallonyou.app/"
                 style="display:inline-block;color:#c9a227;font-weight:700;font-size:15px;text-decoration:none;">
                🌍 Ver actividades cerca de mí →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 36px;">
              <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;" />
              <p style="margin:0;color:#aaa;font-size:12px;text-align:center;line-height:1.7;">
                Te enviamos este email porque te registraste en FallonYou.<br/>
                Si ya tienes foto, ¡ignora este mensaje! 😄<br/>
                <a href="https://fallonyou.app" style="color:#c9a227;text-decoration:none;">fallonyou.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log(`[Email] Photo reminder sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err);
    return false;
  }
}

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log("[Email] SMTP connection verified ✓");
    return true;
  } catch (err) {
    console.error("[Email] SMTP connection failed:", err);
    return false;
  }
}
