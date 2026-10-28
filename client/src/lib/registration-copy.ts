import type { Language } from "./i18n";
import type { RegistrationCode } from "@shared/registration-validation";

type Copy = {
  nameHint: string; emailHint: string; passwordHint: string;
  loginAction: string; rateLimit: string;
  errors: Record<RegistrationCode, string>;
};
export const registrationCopy: Record<Language, Copy> = {
  es: {
    nameHint: "Escribe tu nombre todo junto, sin espacios (máximo 100 caracteres).",
    emailHint: "Usa un correo válido al que tengas acceso.",
    passwordHint: "Mínimo 6 caracteres y máximo 72 bytes; los acentos y emojis ocupan más de un byte.",
    loginAction: "Inicia sesión", rateLimit: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
    errors: {
      NAME_REQUIRED: "Escribe tu nombre.", NAME_INVALID: "Nombre incorrecto. Escríbelo sin espacios ni caracteres de control y con un máximo de 100 caracteres.",
      EMAIL_REQUIRED: "Escribe tu correo electrónico.", EMAIL_INVALID: "Introduce un correo electrónico válido.",
      EMAIL_REGISTERED: "Este correo ya está registrado. Inicia sesión.",
      PASSWORD_REQUIRED: "Escribe una contraseña.", PASSWORD_SHORT: "La contraseña debe tener al menos 6 caracteres.",
      PASSWORD_TOO_LONG: "La contraseña supera los 72 bytes. Usa menos caracteres; los acentos y emojis ocupan más.",
    },
  },
  en: {
    nameHint: "Enter your name without spaces (up to 100 characters).",
    emailHint: "Use a valid email address you can access.",
    passwordHint: "At least 6 characters and at most 72 bytes; accents and emoji use more than one byte.",
    loginAction: "Sign in", rateLimit: "Too many attempts. Wait a few minutes before trying again.",
    errors: {
      NAME_REQUIRED: "Enter your name.", NAME_INVALID: "Invalid name. Use no spaces or control characters and at most 100 characters.",
      EMAIL_REQUIRED: "Enter your email address.", EMAIL_INVALID: "Enter a valid email address.",
      EMAIL_REGISTERED: "This email is already registered. Sign in.",
      PASSWORD_REQUIRED: "Enter a password.", PASSWORD_SHORT: "Your password must have at least 6 characters.",
      PASSWORD_TOO_LONG: "Your password exceeds 72 bytes. Use fewer characters; accents and emoji use more bytes.",
    },
  },
  fr: {
    nameHint: "Saisissez votre prénom sans espaces (100 caractères maximum).",
    emailHint: "Utilisez une adresse e-mail valide à laquelle vous avez accès.",
    passwordHint: "Au moins 6 caractères et au maximum 72 octets ; les accents et emojis occupent plusieurs octets.",
    loginAction: "Se connecter", rateLimit: "Trop de tentatives. Attendez quelques minutes avant de réessayer.",
    errors: {
      NAME_REQUIRED: "Saisissez votre prénom.", NAME_INVALID: "Prénom incorrect. Utilisez au maximum 100 caractères, sans espaces ni caractères de contrôle.",
      EMAIL_REQUIRED: "Saisissez votre adresse e-mail.", EMAIL_INVALID: "Saisissez une adresse e-mail valide.",
      EMAIL_REGISTERED: "Cette adresse e-mail est déjà enregistrée. Connectez-vous.",
      PASSWORD_REQUIRED: "Saisissez un mot de passe.", PASSWORD_SHORT: "Le mot de passe doit contenir au moins 6 caractères.",
      PASSWORD_TOO_LONG: "Le mot de passe dépasse 72 octets. Utilisez moins de caractères ; les accents et emojis occupent plus d’octets.",
    },
  },
  sv: {
    nameHint: "Skriv ditt namn utan mellanslag (högst 100 tecken).",
    emailHint: "Använd en giltig e-postadress som du har tillgång till.",
    passwordHint: "Minst 6 tecken och högst 72 byte; accenter och emojier använder mer än en byte.",
    loginAction: "Logga in", rateLimit: "För många försök. Vänta några minuter innan du försöker igen.",
    errors: {
      NAME_REQUIRED: "Skriv ditt namn.", NAME_INVALID: "Ogiltigt namn. Använd högst 100 tecken utan mellanslag eller kontrolltecken.",
      EMAIL_REQUIRED: "Skriv din e-postadress.", EMAIL_INVALID: "Ange en giltig e-postadress.",
      EMAIL_REGISTERED: "E-postadressen är redan registrerad. Logga in.",
      PASSWORD_REQUIRED: "Skriv ett lösenord.", PASSWORD_SHORT: "Lösenordet måste innehålla minst 6 tecken.",
      PASSWORD_TOO_LONG: "Lösenordet överskrider 72 byte. Använd färre tecken; accenter och emojier använder fler byte.",
    },
  },
};
