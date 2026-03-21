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

  const name = firstName || "Viajero";

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "FallonYou"}" <${process.env.EMAIL_USER}>`,
      to,
      subject: "✈️ Añade tu foto y empieza a conectar en FallonYou",
      html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header dorado -->
          <tr>
            <td style="background:linear-gradient(135deg,#d4af37,#b8960c);padding:36px 32px;text-align:center;">
              <p style="margin:0;font-size:32px;">✈️</p>
              <h1 style="margin:12px 0 4px;color:#ffffff;font-size:24px;font-weight:700;">FallonYou</h1>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;">Conecta · Viaja · Vive</p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;color:#111;font-size:20px;">Hola ${name} 👋</h2>
              <p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.6;">
                Tu cuenta en FallonYou está lista, pero sin foto de perfil otros viajeros no pueden verte en el Discover ni en las actividades.
              </p>
              <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.6;">
                Añade una foto real tuya — solo tarda 30 segundos — y empieza a conectar con personas para tus próximos viajes y actividades.
              </p>

              <!-- Botón CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://fallonyou.app/profile"
                       style="display:inline-block;background:#d4af37;color:#000;font-weight:700;font-size:16px;padding:14px 36px;border-radius:50px;text-decoration:none;">
                      Añadir mi foto ahora →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Separador -->
              <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />

              <p style="margin:0;color:#888;font-size:13px;text-align:center;line-height:1.5;">
                ¿Ya tienes foto? Ignora este mensaje.<br/>
                FallonYou · <a href="https://fallonyou.app" style="color:#d4af37;text-decoration:none;">fallonyou.app</a>
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
