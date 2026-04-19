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

export async function sendPasswordResetEmail(to: string, firstName: string, resetLink: string): Promise<boolean> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[Email] EMAIL_USER or EMAIL_PASS not configured");
    return false;
  }

  const name = firstName || "usuario";

  try {
    await transporter.sendMail({
      from: `"FallonYou" <${process.env.EMAIL_USER}>`,
      to,
      subject: "🔑 Restablece tu contraseña de FallonYou",
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f9f6f0;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f0;padding:32px 0;">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#c9a227,#f0c040,#c9a227);padding:36px 32px 28px;text-align:center;">
            <p style="margin:0;font-size:36px;">🔑</p>
            <h1 style="margin:12px 0 4px;color:#1a1a1a;font-size:26px;font-weight:800;">FallonYou</h1>
            <p style="margin:0;color:#5a4000;font-size:13px;font-weight:600;letter-spacing:1px;">RESTABLECER CONTRASEÑA</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 0;">
            <h2 style="margin:0 0 12px;color:#111;font-size:20px;">Hola ${name} 👋</h2>
            <p style="margin:0 0 16px;color:#555;font-size:16px;line-height:1.7;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta en FallonYou.
            </p>
            <p style="margin:0 0 24px;color:#555;font-size:16px;line-height:1.7;">
              Haz clic en el botón de abajo para crear una nueva contraseña. 
              <strong>Este enlace expira en 1 hora.</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 24px;text-align:center;">
            <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#c9a227,#f0c040);color:#1a1a1a;font-weight:800;font-size:17px;padding:16px 40px;border-radius:50px;text-decoration:none;box-shadow:0 4px 12px rgba(201,162,39,0.4);">
              🔑 Crear nueva contraseña →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 12px;">
            <div style="background:#fff8e1;border:1px solid #f0c040;border-radius:12px;padding:14px 18px;">
              <p style="margin:0;color:#7a5c00;font-size:13px;line-height:1.6;">
                ⚠️ Si no solicitaste este cambio, puedes ignorar este email de forma segura. Tu contraseña no cambiará.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 32px;">
            <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;"/>
            <p style="margin:0;color:#aaa;font-size:12px;text-align:center;line-height:1.7;">
              FallonYou · <a href="https://fallonyou.app" style="color:#c9a227;text-decoration:none;">fallonyou.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    console.log(`[Email] Password reset sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send reset email to ${to}:`, err);
    return false;
  }
}

// ─── Admin Alerts ──────────────────────────────────────────────────────────

type AdminAlertEvent =
  | { type: 'new_user';         data: { email: string; firstName?: string; lastName?: string } }
  | { type: 'new_report';       data: { reporterEmail: string; reportedEmail: string; reason: string; details?: string } }
  | { type: 'new_verification'; data: { userEmail: string; userName?: string } }
  | { type: 'new_premium';      data: { userEmail: string; userName?: string; customerId?: string } }
  | { type: 'premium_canceled'; data: { userEmail: string; userName?: string; customerId?: string } }
  | { type: 'user_banned';      data: { userEmail: string; userName?: string; reason?: string; adminEmail?: string } }
  | { type: 'user_unbanned';    data: { userEmail: string; userName?: string; adminEmail?: string } };

const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || process.env.EMAIL_USER;

const EVENT_META: Record<string, { emoji: string; color: string; title: string; badge: string }> = {
  new_user:         { emoji: '👤', color: '#2e7d32', title: 'Nuevo usuario registrado', badge: '#4caf50' },
  new_report:       { emoji: '🚨', color: '#b71c1c', title: 'Nueva denuncia recibida',  badge: '#ef5350' },
  new_verification: { emoji: '🪪', color: '#1565c0', title: 'Nueva solicitud de verificación', badge: '#42a5f5' },
  new_premium:      { emoji: '💎', color: '#c9a227', title: 'Nuevo suscriptor Premium', badge: '#ffd700' },
  premium_canceled: { emoji: '❌', color: '#6a1b9a', title: 'Suscripción cancelada',    badge: '#ba68c8' },
  user_banned:      { emoji: '🔨', color: '#e65100', title: 'Usuario baneado',           badge: '#ff7043' },
  user_unbanned:    { emoji: '✅', color: '#00695c', title: 'Usuario desbaneado',        badge: '#26a69a' },
};

function buildAdminRows(data: Record<string, string | undefined>): string {
  return Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `
      <tr>
        <td style="padding:8px 12px;color:#888;font-size:13px;font-weight:600;white-space:nowrap;">${k}</td>
        <td style="padding:8px 12px;color:#1a1a1a;font-size:13px;">${v}</td>
      </tr>`)
    .join('');
}

export async function sendAdminAlert(event: AdminAlertEvent): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !ADMIN_EMAIL) return;

  const meta = EVENT_META[event.type] ?? { emoji: 'ℹ️', color: '#555', title: event.type, badge: '#aaa' };
  const now = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

  let rows = '';
  if (event.type === 'new_user') {
    rows = buildAdminRows({ 'Email': event.data.email, 'Nombre': `${event.data.firstName || ''} ${event.data.lastName || ''}`.trim() || '—', 'Fecha': now });
  } else if (event.type === 'new_report') {
    rows = buildAdminRows({ 'Denunciante': event.data.reporterEmail, 'Denunciado': event.data.reportedEmail, 'Motivo': event.data.reason, 'Detalles': event.data.details || '—', 'Fecha': now });
  } else if (event.type === 'new_verification') {
    rows = buildAdminRows({ 'Usuario': event.data.userEmail, 'Nombre': event.data.userName || '—', 'Fecha': now });
  } else if (event.type === 'new_premium') {
    rows = buildAdminRows({ 'Email': event.data.userEmail, 'Nombre': event.data.userName || '—', 'Customer ID': event.data.customerId || '—', 'Fecha': now });
  } else if (event.type === 'premium_canceled') {
    rows = buildAdminRows({ 'Email': event.data.userEmail, 'Nombre': event.data.userName || '—', 'Customer ID': event.data.customerId || '—', 'Fecha': now });
  } else if (event.type === 'user_banned') {
    rows = buildAdminRows({ 'Usuario': event.data.userEmail, 'Nombre': event.data.userName || '—', 'Motivo': event.data.reason || '—', 'Admin': event.data.adminEmail || '—', 'Fecha': now });
  } else if (event.type === 'user_unbanned') {
    rows = buildAdminRows({ 'Usuario': event.data.userEmail, 'Nombre': event.data.userName || '—', 'Admin': event.data.adminEmail || '—', 'Fecha': now });
  }

  try {
    await transporter.sendMail({
      from: `"FallonYou Admin" <${process.env.EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `${meta.emoji} [FallonYou] ${meta.title} — ${now}`,
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:${meta.color};padding:24px 28px;display:flex;align-items:center;">
            <table><tr>
              <td style="font-size:36px;padding-right:14px;">${meta.emoji}</td>
              <td>
                <p style="margin:0;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;opacity:0.8;">FALLONYOU · PANEL ADMIN</p>
                <h1 style="margin:4px 0 0;color:#fff;font-size:20px;font-weight:900;">${meta.title}</h1>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Badge -->
        <tr>
          <td style="padding:20px 28px 4px;">
            <span style="display:inline-block;background:${meta.badge};color:#1a1a1a;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;letter-spacing:1px;">${event.type.replace(/_/g, ' ').toUpperCase()}</span>
          </td>
        </tr>

        <!-- Data table -->
        <tr>
          <td style="padding:12px 16px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #eee;">
              ${rows}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 28px 28px;">
            <a href="https://fallonyou.app/admin"
               style="display:inline-block;background:#1a1a1a;color:#fff;font-weight:700;font-size:13px;padding:12px 24px;border-radius:50px;text-decoration:none;">
              Abrir panel de administración →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;background:#f9f9f9;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:11px;">Alerta automática de FallonYou · <a href="https://fallonyou.app" style="color:#c9a227;text-decoration:none;">fallonyou.app</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`[AdminAlert] ${event.type} alert sent to ${ADMIN_EMAIL}`);
  } catch (err) {
    console.error(`[AdminAlert] Failed to send ${event.type}:`, err);
  }
}

export async function sendReferralEmail(
  to: string,
  firstName: string,
  opts: {
    refereeName: string;
    newCount: number;
    tierLabel?: string;
    isAmbassador?: boolean;
  }
): Promise<boolean> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[Email] EMAIL_USER or EMAIL_PASS not configured");
    return false;
  }

  const name = firstName || "viajero";
  const { refereeName, newCount, tierLabel, isAmbassador } = opts;

  const subject = isAmbassador
    ? `🌟 ¡${name}, eres Embajador Oficial de FallonYou!`
    : tierLabel
      ? `🏆 ¡${name}, has desbloqueado: ${tierLabel}!`
      : `🎉 ¡${name}, tienes un nuevo invitado en FallonYou!`;

  const headerEmoji = isAmbassador ? "🌟 🏆 ✈️" : tierLabel ? "🎁 ⭐ 🎉" : "🎉 ✈️ 👥";
  const headerColor = isAmbassador
    ? "linear-gradient(135deg,#b8860b,#ffd700,#b8860b)"
    : "linear-gradient(135deg,#c9a227,#f0c040,#c9a227)";

  const mainHeading = isAmbassador
    ? "¡Eres Embajador Oficial!"
    : tierLabel
      ? `¡${tierLabel} desbloqueado!`
      : "¡Nuevo invitado!";

  const mainBody = isAmbassador
    ? `<b>${refereeName}</b> se ha unido usando tu código y has alcanzado los <b>50 invitados</b>. ¡Enhorabuena! Eres Embajador Oficial de FallonYou. Nuestro equipo se pondrá en contacto contigo pronto para darte acceso a tus beneficios exclusivos.`
    : tierLabel
      ? `<b>${refereeName}</b> se ha unido usando tu código. Llevas <b>${newCount} invitados</b> y acabas de desbloquear <b>${tierLabel}</b>. ¡Sigue así!`
      : `<b>${refereeName}</b> acaba de registrarse en FallonYou usando tu enlace personal. Llevas <b>${newCount} invitado${newCount !== 1 ? "s" : ""}</b> en total. ¡Gracias por ayudarnos a crecer!`;

  try {
    await transporter.sendMail({
      from: `"FallonYou" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f9f6f0;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f0;padding:32px 0;">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

        <tr>
          <td style="background:${headerColor};padding:36px 32px 28px;text-align:center;">
            <p style="margin:0;font-size:38px;letter-spacing:6px;">${headerEmoji}</p>
            <h1 style="margin:12px 0 4px;color:#1a1a1a;font-size:26px;font-weight:900;letter-spacing:-0.5px;">FallonYou</h1>
            <p style="margin:0;color:#5a4000;font-size:13px;font-weight:700;letter-spacing:1.5px;">CONECTA · VIAJA · VIVE</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 36px 20px;">
            <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;font-weight:800;">${mainHeading}</h2>
            <p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.7;">
              ¡Hola, <b>${name}</b>! 👋<br/><br/>
              ${mainBody}
            </p>

            <!-- Counter badge -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#1a1a1a;border-radius:12px;padding:16px 28px;text-align:center;">
                  <p style="margin:0;color:#c9a227;font-size:36px;font-weight:900;">${newCount}</p>
                  <p style="margin:4px 0 0;color:#aaa;font-size:12px;font-weight:600;letter-spacing:1px;">INVITADO${newCount !== 1 ? "S" : ""} TOTALES</p>
                </td>
                ${tierLabel ? `<td style="padding-left:16px;">
                  <p style="margin:0;background:linear-gradient(135deg,#c9a227,#ffd700);color:#1a1a1a;font-size:13px;font-weight:800;padding:10px 18px;border-radius:20px;white-space:nowrap;">🎁 ${tierLabel}</p>
                </td>` : ""}
              </tr>
            </table>

            <a href="https://fallonyou.app/ambassadors"
               style="display:inline-block;background:linear-gradient(135deg,#c9a227,#f0c040);color:#1a1a1a;font-weight:800;font-size:14px;padding:14px 28px;border-radius:50px;text-decoration:none;letter-spacing:0.5px;">
              Ver mi panel de embajador →
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 36px 36px;">
            <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;"/>
            <p style="margin:0;color:#aaa;font-size:12px;text-align:center;line-height:1.7;">
              Recibes este email porque participas en el programa de embajadores de FallonYou.<br/>
              <a href="https://fallonyou.app" style="color:#c9a227;text-decoration:none;">fallonyou.app</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`[Email] Referral notification sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Referral email failed for ${to}:`, err);
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
