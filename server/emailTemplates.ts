import { communicationLocale, type CommunicationLocale } from "@shared/communication-locale";
import { escapeEmailHtml } from "./emailText";
import { localizedReward } from "@shared/communication-notices";

type EmailKind = "passwordReset" | "verification" | "photoReminder" | "onboardingReminder" | "referral";
type EmailCopy = {
  traveler: string; greeting: string; slogan: string;
  reset: [string, string, string, string];
  verify: [string, string, string, string];
  photo: [string, string, string];
  onboarding: [string, string, string];
  referral: [string, string, string, string, string, string];
};
const copy: Record<CommunicationLocale, EmailCopy> = {
  en: {
    traveler: "traveler", greeting: "Hello", slogan: "CONNECT · TRAVEL · EXPLORE",
    reset: ["Reset your FallOnYou password", "We received a request to reset your password. This link expires in 1 hour.", "Create a new password", "If you did not request this change, you can safely ignore this email. Your password will not change."],
    verify: ["Confirm your FallOnYou email", "Confirm your email address to complete your account setup. This link expires in 24 hours.", "Confirm email address", "If you did not create this account, ignore this email."],
    photo: ["Add your first photo on FallOnYou", "Help other travelers recognize you. Add a profile photo and discover people and activities around you.", "Add a profile photo"],
    onboarding: ["Your FallOnYou profile is waiting", "Your account is ready, but your profile is still incomplete. Add a photo and a short introduction so other travelers can get to know you.", "Complete my profile"],
    referral: ["A new traveler joined through your invitation", "joined using your invitation code.", "Invited travelers", "Reward unlocked", "You are an official ambassador", "View my ambassador dashboard"],
  },
  es: {
    traveler: "viajero", greeting: "Hola", slogan: "CONECTA · VIAJA · EXPLORA",
    reset: ["Restablece tu contraseña de FallOnYou", "Recibimos una solicitud para restablecer tu contraseña. El enlace caduca en 1 hora.", "Crear una nueva contraseña", "Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña no cambiará."],
    verify: ["Confirma tu email de FallOnYou", "Confirma tu dirección de email para completar tu cuenta. El enlace caduca en 24 horas.", "Confirmar email", "Si no creaste esta cuenta, ignora este email."],
    photo: ["Añade tu primera foto en FallOnYou", "Ayuda a otros viajeros a reconocerte. Añade una foto de perfil y descubre personas y actividades cerca de ti.", "Añadir una foto de perfil"],
    onboarding: ["Tu perfil de FallOnYou te está esperando", "Tu cuenta está lista, pero tu perfil aún está incompleto. Añade una foto y una breve presentación para que otros viajeros puedan conocerte.", "Completar mi perfil"],
    referral: ["Un nuevo viajero se unió con tu invitación", "se unió usando tu código de invitación.", "Viajeros invitados", "Recompensa desbloqueada", "Eres embajador oficial", "Ver mi panel de embajador"],
  },
  fr: {
    traveler: "voyageur", greeting: "Bonjour", slogan: "RENCONTREZ · VOYAGEZ · EXPLOREZ",
    reset: ["Réinitialisez votre mot de passe FallOnYou", "Nous avons reçu une demande de réinitialisation de votre mot de passe. Ce lien expire dans 1 heure.", "Créer un nouveau mot de passe", "Si vous n'avez pas demandé ce changement, ignorez cet email. Votre mot de passe ne changera pas."],
    verify: ["Confirmez votre email FallOnYou", "Confirmez votre adresse email pour finaliser votre compte. Ce lien expire dans 24 heures.", "Confirmer mon email", "Si vous n'avez pas créé ce compte, ignorez cet email."],
    photo: ["Ajoutez votre première photo sur FallOnYou", "Aidez les autres voyageurs à vous reconnaître. Ajoutez une photo de profil et découvrez des personnes et des activités à proximité.", "Ajouter une photo de profil"],
    onboarding: ["Votre profil FallOnYou vous attend", "Votre compte est prêt, mais votre profil est incomplet. Ajoutez une photo et une courte présentation pour que les autres voyageurs puissent vous connaître.", "Compléter mon profil"],
    referral: ["Un nouveau voyageur a rejoint grâce à votre invitation", "a rejoint avec votre code d'invitation.", "Voyageurs invités", "Récompense débloquée", "Vous êtes ambassadeur officiel", "Voir mon espace ambassadeur"],
  },
  sv: {
    traveler: "resenär", greeting: "Hej", slogan: "TRÄFFAS · RES · UTFORSKA",
    reset: ["Återställ ditt FallOnYou-lösenord", "Vi har fått en begäran om att återställa ditt lösenord. Länken går ut om 1 timme.", "Skapa ett nytt lösenord", "Om du inte begärde ändringen kan du ignorera mejlet. Ditt lösenord ändras inte."],
    verify: ["Bekräfta din FallOnYou-mejl", "Bekräfta din mejladress för att slutföra ditt konto. Länken går ut om 24 timmar.", "Bekräfta mejladress", "Om du inte skapade kontot kan du ignorera mejlet."],
    photo: ["Lägg till ditt första foto på FallOnYou", "Hjälp andra resenärer att känna igen dig. Lägg till ett profilfoto och upptäck människor och aktiviteter i närheten.", "Lägg till profilfoto"],
    onboarding: ["Din FallOnYou-profil väntar", "Ditt konto är klart, men profilen är ofullständig. Lägg till ett foto och en kort presentation så att andra resenärer kan lära känna dig.", "Slutför min profil"],
    referral: ["En ny resenär gick med via din inbjudan", "gick med via din inbjudningskod.", "Inbjudna resenärer", "Belöning upplåst", "Du är officiell ambassadör", "Visa min ambassadörssida"],
  },
};

export function renderAutomaticEmail(kind: EmailKind, parameters: {
  firstName?: string; link?: string; refereeName?: string; newCount?: number; tierLabel?: string; isAmbassador?: boolean;
}, language: unknown = "en") {
  const locale = communicationLocale(language), c = copy[locale];
  const name = parameters.firstName || c.traveler;
  let subject: string, body: string, action: string, warning = "", link = parameters.link || "https://fallonyou.app/profile";
  if (kind === "passwordReset" || kind === "verification") {
    [subject, body, action, warning] = kind === "passwordReset" ? c.reset : c.verify;
    const target = new URL(link);
    target.searchParams.set("ui_lang", locale);
    link = target.href;
  } else if (kind === "photoReminder") {
    [subject, body, action] = c.photo;
  } else if (kind === "onboardingReminder") {
    [subject, body, action] = c.onboarding;
  } else {
    subject = parameters.isAmbassador ? c.referral[4] : c.referral[0];
    const reward = parameters.tierLabel ? localizedReward(parameters.tierLabel, locale) : "";
    body = `${parameters.refereeName || c.traveler} ${c.referral[1]} ${c.referral[2]}: ${parameters.newCount || 0}.${reward ? ` ${c.referral[3]}: ${reward}.` : ""}`;
    action = c.referral[5];
    link = "https://fallonyou.app/ambassadors";
  }
  const h = escapeEmailHtml;
  return {
    subject,
    text: `${c.greeting} ${name},\n\n${body}\n\n${action}: ${link}${warning ? `\n\n${warning}` : ""}\n\nFallOnYou`,
    html: `<!doctype html><html lang="${locale}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f9f6f0;font-family:Arial,sans-serif;color:#111">
<table role="presentation" style="width:100%;max-width:520px;margin:auto;background:#fff;border-radius:20px;overflow:hidden">
<tr><td style="padding:30px 24px;text-align:center;background:#f0c040"><h1 style="margin:0;color:#111">FallOnYou</h1><p style="font-size:12px;color:#403300">${h(c.slogan)}</p></td></tr>
<tr><td style="padding:28px 24px"><h2 style="color:#111">${h(c.greeting)} ${h(name)}</h2><h3 style="color:#111">${h(subject)}</h3>
<p style="line-height:1.7;color:#333">${h(body)}</p>
<p style="margin:28px 0"><a href="${h(link)}" style="display:inline-block;padding:14px 20px;background:#f0c040;color:#111;font-weight:bold;border-radius:12px;text-decoration:none">${h(action)}</a></p>
${warning ? `<p style="line-height:1.6;padding:16px;background:#fff8e1;color:#514100;border-radius:12px">${h(warning)}</p>` : ""}
<p style="font-size:12px;color:#555">© ${new Date().getFullYear()} FallOnYou · <a href="https://fallonyou.app" style="color:#765600">fallonyou.app</a></p></td></tr></table></body></html>`,
  };
}

