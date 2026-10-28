import type { Language } from "@/lib/i18n";

type RecoveryErrorCode = "INVALID_EMAIL" | "INVALID_PASSWORD" | "PASSWORD_TOO_LONG" | "INVALID_RESET_LINK" | "RECOVERY_UNAVAILABLE";

export const resetPasswordCopy: Record<Language, {
  requestTitle: string;
  requestDescription: string;
  emailLabel: string;
  emailPlaceholder: string;
  requestButton: string;
  requestLoading: string;
  requestReceived: string;
  rateLimited: string;
  requestReceivedDetail: string;
  spamReminder: string;
  requestAnother: string;
  resetTitle: string;
  resetDescription: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmLabel: string;
  confirmPlaceholder: string;
  passwordLength: string;
  passwordTooLongNote: string;
  showPassword: string;
  hidePassword: string;
  resetButton: string;
  resetLoading: string;
  resetDone: string;
  resetDoneDetail: string;
  login: string;
  backToLogin: string;
  requestNewLink: string;
  malformedTitle: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordMismatch: string;
  errors: Record<RecoveryErrorCode, string>;
  networkError: string;
  unexpectedError: string;
  cooldown: (seconds: number) => string;
}> = {
  en: {
    requestTitle: "Forgot your password?",
    requestDescription: "Enter the email address you use for FallOnYou.",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    requestButton: "Request recovery link",
    requestLoading: "Submitting request…",
    requestReceived: "Request received",
    rateLimited: "Too many attempts. Please wait before trying again.",
    requestReceivedDetail: "If an eligible account exists, a recovery link may arrive in the next few minutes. This message does not confirm whether an account exists or guarantee delivery.",
    spamReminder: "Please check your spam folder too.",
    requestAnother: "Request another link",
    resetTitle: "Choose a new password",
    resetDescription: "Use at least 6 characters. Very long passwords may need to be shortened.",
    passwordLabel: "New password",
    passwordPlaceholder: "Enter a new password",
    confirmLabel: "Confirm new password",
    confirmPlaceholder: "Enter it again",
    passwordLength: "At least 6 characters.",
    passwordTooLongNote: "That password is too long. Try using fewer characters.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    resetButton: "Save new password",
    resetLoading: "Saving password…",
    resetDone: "Password updated",
    resetDoneDetail: "You can now sign in with your new password.",
    login: "Sign in",
    backToLogin: "Back to sign in",
    requestNewLink: "Request a new recovery link",
    malformedTitle: "This recovery link is invalid or incomplete.",
    emailRequired: "Enter your email address to continue.",
    emailInvalid: "Enter a valid email address and try again.",
    passwordRequired: "Enter a new password to continue.",
    passwordMismatch: "Those passwords do not match. Check both fields and try again.",
    errors: {
      INVALID_EMAIL: "We couldn't use that email address. Check it and try again.",
      INVALID_PASSWORD: "Choose a password with at least 6 characters.",
      PASSWORD_TOO_LONG: "That password is too long. Try using fewer characters.",
      INVALID_RESET_LINK: "This recovery link is invalid, expired, or already used. Request a new link to continue.",
      RECOVERY_UNAVAILABLE: "Password recovery is temporarily unavailable. Please try again.",
    },
    networkError: "We couldn't connect securely. Check your connection and try again.",
    unexpectedError: "We couldn't complete that request. Please try again.",
    cooldown: (seconds) => `Please wait ${seconds} ${seconds === 1 ? "second" : "seconds"} before trying again.`,
  },
  es: {
    requestTitle: "¿Olvidaste tu contraseña?",
    requestDescription: "Introduce el correo que usas en FallOnYou.",
    emailLabel: "Correo electrónico",
    emailPlaceholder: "tu@ejemplo.com",
    requestButton: "Solicitar enlace de recuperación",
    requestLoading: "Enviando solicitud…",
    requestReceived: "Solicitud recibida",
    rateLimited: "Demasiados intentos. Espera antes de volver a intentarlo.",
    requestReceivedDetail: "Si existe una cuenta que cumpla los requisitos, puede que recibas un enlace de recuperación en unos minutos. Este mensaje no confirma si existe una cuenta ni garantiza la entrega.",
    spamReminder: "Revisa también la carpeta de correo no deseado.",
    requestAnother: "Solicitar otro enlace",
    resetTitle: "Elige una contraseña nueva",
    resetDescription: "Usa al menos 6 caracteres. Si es muy larga, tendrás que acortarla.",
    passwordLabel: "Nueva contraseña",
    passwordPlaceholder: "Escribe una contraseña nueva",
    confirmLabel: "Confirmar contraseña nueva",
    confirmPlaceholder: "Escríbela de nuevo",
    passwordLength: "Al menos 6 caracteres.",
    passwordTooLongNote: "La contraseña es demasiado larga. Prueba con menos caracteres.",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    resetButton: "Guardar contraseña nueva",
    resetLoading: "Guardando contraseña…",
    resetDone: "Contraseña actualizada",
    resetDoneDetail: "Ya puedes iniciar sesión con tu nueva contraseña.",
    login: "Iniciar sesión",
    backToLogin: "Volver a iniciar sesión",
    requestNewLink: "Solicitar un nuevo enlace de recuperación",
    malformedTitle: "Este enlace de recuperación no es válido o está incompleto.",
    emailRequired: "Introduce tu correo electrónico para continuar.",
    emailInvalid: "Introduce un correo electrónico válido e inténtalo de nuevo.",
    passwordRequired: "Introduce una contraseña nueva para continuar.",
    passwordMismatch: "Las contraseñas no coinciden. Comprueba ambos campos e inténtalo de nuevo.",
    errors: {
      INVALID_EMAIL: "No se pudo usar ese correo. Compruébalo e inténtalo de nuevo.",
      INVALID_PASSWORD: "Elige una contraseña de al menos 6 caracteres.",
      PASSWORD_TOO_LONG: "La contraseña es demasiado larga. Prueba con menos caracteres.",
      INVALID_RESET_LINK: "El enlace no es válido, ha caducado o ya se utilizó. Solicita uno nuevo para continuar.",
      RECOVERY_UNAVAILABLE: "La recuperación de contraseña no está disponible temporalmente. Inténtalo de nuevo.",
    },
    networkError: "No se pudo establecer una conexión segura. Comprueba tu conexión e inténtalo de nuevo.",
    unexpectedError: "No se pudo completar la solicitud. Inténtalo de nuevo.",
    cooldown: (seconds) => `Espera ${seconds} ${seconds === 1 ? "segundo" : "segundos"} antes de volver a intentarlo.`,
  },
  fr: {
    requestTitle: "Mot de passe oublié ?",
    requestDescription: "Saisissez l’adresse e-mail utilisée sur FallOnYou.",
    emailLabel: "Adresse e-mail",
    emailPlaceholder: "vous@exemple.com",
    requestButton: "Demander un lien de récupération",
    requestLoading: "Envoi de la demande…",
    requestReceived: "Demande reçue",
    rateLimited: "Trop de tentatives. Veuillez patienter avant de réessayer.",
    requestReceivedDetail: "Si un compte éligible existe, un lien de récupération pourra vous parvenir dans quelques minutes. Ce message ne confirme pas l’existence d’un compte et ne garantit pas la livraison.",
    spamReminder: "Pensez également à vérifier vos courriers indésirables.",
    requestAnother: "Demander un autre lien",
    resetTitle: "Choisissez un nouveau mot de passe",
    resetDescription: "Utilisez au moins 6 caractères. Un mot de passe très long peut devoir être raccourci.",
    passwordLabel: "Nouveau mot de passe",
    passwordPlaceholder: "Saisissez un nouveau mot de passe",
    confirmLabel: "Confirmer le nouveau mot de passe",
    confirmPlaceholder: "Saisissez-le à nouveau",
    passwordLength: "Au moins 6 caractères.",
    passwordTooLongNote: "Ce mot de passe est trop long. Essayez avec moins de caractères.",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    resetButton: "Enregistrer le nouveau mot de passe",
    resetLoading: "Enregistrement…",
    resetDone: "Mot de passe mis à jour",
    resetDoneDetail: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
    login: "Se connecter",
    backToLogin: "Retour à la connexion",
    requestNewLink: "Demander un nouveau lien de récupération",
    malformedTitle: "Ce lien de récupération est invalide ou incomplet.",
    emailRequired: "Saisissez votre adresse e-mail pour continuer.",
    emailInvalid: "Saisissez une adresse e-mail valide et réessayez.",
    passwordRequired: "Saisissez un nouveau mot de passe pour continuer.",
    passwordMismatch: "Les mots de passe ne correspondent pas. Vérifiez les deux champs et réessayez.",
    errors: {
      INVALID_EMAIL: "Cette adresse e-mail n’a pas pu être utilisée. Vérifiez-la et réessayez.",
      INVALID_PASSWORD: "Choisissez un mot de passe d’au moins 6 caractères.",
      PASSWORD_TOO_LONG: "Ce mot de passe est trop long. Essayez avec moins de caractères.",
      INVALID_RESET_LINK: "Ce lien est invalide, expiré ou déjà utilisé. Demandez-en un nouveau pour continuer.",
      RECOVERY_UNAVAILABLE: "La récupération du mot de passe est temporairement indisponible. Réessayez.",
    },
    networkError: "Connexion sécurisée impossible. Vérifiez votre connexion et réessayez.",
    unexpectedError: "La demande n’a pas pu aboutir. Veuillez réessayer.",
    cooldown: (seconds) => `Veuillez patienter ${seconds} ${seconds === 1 ? "seconde" : "secondes"} avant de réessayer.`,
  },
  sv: {
    requestTitle: "Har du glömt lösenordet?",
    requestDescription: "Ange e-postadressen du använder på FallOnYou.",
    emailLabel: "E-postadress",
    emailPlaceholder: "du@exempel.se",
    requestButton: "Begär återställningslänk",
    requestLoading: "Skickar begäran…",
    requestReceived: "Begäran mottagen",
    rateLimited: "För många försök. Vänta innan du försöker igen.",
    requestReceivedDetail: "Om det finns ett behörigt konto kan en återställningslänk komma inom några minuter. Meddelandet bekräftar inte om ett konto finns och garanterar inte leverans.",
    spamReminder: "Kontrollera även skräpposten.",
    requestAnother: "Begär en ny länk",
    resetTitle: "Välj ett nytt lösenord",
    resetDescription: "Använd minst 6 tecken. Ett mycket långt lösenord kan behöva kortas.",
    passwordLabel: "Nytt lösenord",
    passwordPlaceholder: "Ange ett nytt lösenord",
    confirmLabel: "Bekräfta nytt lösenord",
    confirmPlaceholder: "Ange det igen",
    passwordLength: "Minst 6 tecken.",
    passwordTooLongNote: "Lösenordet är för långt. Försök med färre tecken.",
    showPassword: "Visa lösenord",
    hidePassword: "Dölj lösenord",
    resetButton: "Spara nytt lösenord",
    resetLoading: "Sparar lösenord…",
    resetDone: "Lösenordet har uppdaterats",
    resetDoneDetail: "Du kan nu logga in med ditt nya lösenord.",
    login: "Logga in",
    backToLogin: "Tillbaka till inloggning",
    requestNewLink: "Begär en ny återställningslänk",
    malformedTitle: "Återställningslänken är ogiltig eller ofullständig.",
    emailRequired: "Ange din e-postadress för att fortsätta.",
    emailInvalid: "Ange en giltig e-postadress och försök igen.",
    passwordRequired: "Ange ett nytt lösenord för att fortsätta.",
    passwordMismatch: "Lösenorden matchar inte. Kontrollera båda fälten och försök igen.",
    errors: {
      INVALID_EMAIL: "E-postadressen kunde inte användas. Kontrollera den och försök igen.",
      INVALID_PASSWORD: "Välj ett lösenord med minst 6 tecken.",
      PASSWORD_TOO_LONG: "Lösenordet är för långt. Försök med färre tecken.",
      INVALID_RESET_LINK: "Länken är ogiltig, har gått ut eller redan använts. Begär en ny länk för att fortsätta.",
      RECOVERY_UNAVAILABLE: "Lösenordsåterställning är tillfälligt otillgänglig. Försök igen.",
    },
    networkError: "Det gick inte att ansluta säkert. Kontrollera anslutningen och försök igen.",
    unexpectedError: "Begäran kunde inte genomföras. Försök igen.",
    cooldown: (seconds) => `Vänta ${seconds} ${seconds === 1 ? "sekund" : "sekunder"} innan du försöker igen.`,
  },
};

