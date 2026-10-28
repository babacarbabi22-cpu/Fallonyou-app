import type { Language } from "./i18n";

export const authPageCopy: Record<Language, {
  tagline: string;
  subtitle: string;
  legalToggle: string;
  legalCommitments: string;
  legalRules: {
    ownPhotosTitle: string;
    ownPhotosDescription: string;
    realAccountsTitle: string;
    realAccountsDescription: string;
    respectfulConductTitle: string;
    respectfulConductDescription: string;
    legalResponsibilityTitle: string;
    legalResponsibilityDescription: string;
  };
  sessionSecurity: string;
  forgotPassword: string;
  ageRequiredTitle: string;
  ageRequiredDescription: string;
  connectionFailure: string;
  restartingFailure: string;
  serverFailure: string;
  credentialsFailure: string;
  genericFailure: string;
  passwordLengthFailure: string;
  passwordShow: string;
  passwordHide: string;
  freeFooter: string;
}> = {
  es: {
    tagline: "Depende de ti",
    subtitle: "Conoce gente, únete a planes y viaja diferente",
    legalToggle: "Ver condiciones de uso",
    legalCommitments: "Compromisos al crear tu cuenta",
    legalRules: {
      ownPhotosTitle: "Solo tus propias fotos",
      ownPhotosDescription: "Debes subir únicamente fotos tuyas reales. Usar imágenes de otras personas sin su consentimiento constituye usurpación de identidad.",
      realAccountsTitle: "Sin cuentas falsas",
      realAccountsDescription: "Está prohibido crear perfiles con identidades inventadas, personajes ficticios o datos falsos. Cada cuenta debe representar a una persona real.",
      respectfulConductTitle: "Comportamiento respetuoso",
      respectfulConductDescription: "No se permite el acoso, el lenguaje ofensivo ni el contenido inapropiado. FallOnYou es un espacio seguro para todos.",
      legalResponsibilityTitle: "Responsabilidad legal",
      legalResponsibilityDescription: "El incumplimiento puede derivar en la suspensión de la cuenta y, en casos graves, en acciones legales conforme a la legislación vigente.",
    },
    sessionSecurity: "FallOnYou registra el email, la IP y el dispositivo de cada sesión con fines de seguridad y cumplimiento legal.",
    forgotPassword: "¿Olvidaste tu contraseña?",
    ageRequiredTitle: "Edad requerida",
    ageRequiredDescription: "Debes confirmar que tienes 18 años o más para registrarte.",
    connectionFailure: "No se pudo conectar con el servidor. Inténtalo de nuevo en unos segundos.",
    restartingFailure: "El servidor está reiniciando. Inténtalo de nuevo en unos segundos.",
    serverFailure: "El servidor tuvo un problema. Inténtalo de nuevo en unos segundos.",
    credentialsFailure: "Email o contraseña incorrectos.",
    genericFailure: "No se pudo completar la solicitud. Inténtalo de nuevo.",
    passwordShow: "Mostrar contraseña",
    passwordLengthFailure: "La contraseña es demasiado larga. Usa menos caracteres, especialmente acentos o emojis.",
    passwordHide: "Ocultar contraseña",
    freeFooter: "Gratis",
  },
  en: {
    tagline: "Your choice, your journey",
    subtitle: "Meet people, join plans, and travel differently",
    legalToggle: "View terms of use",
    legalCommitments: "Your commitments when creating an account",
    legalRules: {
      ownPhotosTitle: "Only your own photos",
      ownPhotosDescription: "Upload only genuine photos of yourself. Using images of other people without their consent constitutes identity impersonation.",
      realAccountsTitle: "No fake accounts",
      realAccountsDescription: "Profiles with invented identities, fictional characters, or false information are prohibited. Every account must represent a real person.",
      respectfulConductTitle: "Respectful conduct",
      respectfulConductDescription: "Harassment, offensive language, and inappropriate content are not allowed. FallOnYou is a safe space for everyone.",
      legalResponsibilityTitle: "Legal responsibility",
      legalResponsibilityDescription: "Violations may result in account suspension and, in serious cases, legal action under applicable law.",
    },
    sessionSecurity: "FallOnYou records the email address, IP address, and device for each session for security and legal compliance.",
    forgotPassword: "Forgot your password?",
    ageRequiredTitle: "Age required",
    ageRequiredDescription: "You must confirm that you are 18 or older to register.",
    connectionFailure: "Couldn't connect to the server. Please try again in a few seconds.",
    restartingFailure: "The server is restarting. Please try again in a few seconds.",
    serverFailure: "The server encountered a problem. Please try again in a few seconds.",
    credentialsFailure: "Incorrect email or password.",
    genericFailure: "We couldn't complete your request. Please try again.",
    passwordShow: "Show password",
    passwordLengthFailure: "This password is too long. Use fewer characters, especially accents or emoji.",
    passwordHide: "Hide password",
    freeFooter: "Free",
  },
  fr: {
    tagline: "À vous de choisir",
    subtitle: "Rencontrez des gens, rejoignez des activités et voyagez autrement",
    legalToggle: "Voir les conditions d'utilisation",
    legalCommitments: "Vos engagements lors de la création du compte",
    legalRules: {
      ownPhotosTitle: "Uniquement vos propres photos",
      ownPhotosDescription: "Vous devez uniquement publier de vraies photos de vous. Utiliser des images d'autres personnes sans leur consentement constitue une usurpation d'identité.",
      realAccountsTitle: "Aucun faux compte",
      realAccountsDescription: "Il est interdit de créer des profils avec des identités inventées, des personnages fictifs ou de fausses informations. Chaque compte doit représenter une personne réelle.",
      respectfulConductTitle: "Comportement respectueux",
      respectfulConductDescription: "Le harcèlement, les propos offensants et les contenus inappropriés sont interdits. FallOnYou est un espace sûr pour tout le monde.",
      legalResponsibilityTitle: "Responsabilité juridique",
      legalResponsibilityDescription: "Toute violation peut entraîner la suspension du compte et, dans les cas graves, des poursuites conformément à la législation en vigueur.",
    },
    sessionSecurity: "FallOnYou enregistre l'adresse e-mail, l'adresse IP et l'appareil de chaque session à des fins de sécurité et de conformité juridique.",
    forgotPassword: "Mot de passe oublié ?",
    ageRequiredTitle: "Âge requis",
    ageRequiredDescription: "Vous devez confirmer que vous avez 18 ans ou plus pour vous inscrire.",
    connectionFailure: "Impossible de se connecter au serveur. Réessayez dans quelques secondes.",
    restartingFailure: "Le serveur redémarre. Réessayez dans quelques secondes.",
    serverFailure: "Le serveur a rencontré un problème. Réessayez dans quelques secondes.",
    credentialsFailure: "Adresse e-mail ou mot de passe incorrect.",
    genericFailure: "Impossible de traiter votre demande. Veuillez réessayer.",
    passwordShow: "Afficher le mot de passe",
    passwordLengthFailure: "Ce mot de passe est trop long. Utilisez moins de caractères, notamment accentués ou des emojis.",
    passwordHide: "Masquer le mot de passe",
    freeFooter: "Gratuit",
  },
  sv: {
    tagline: "Du bestämmer",
    subtitle: "Träffa människor, gå med i planer och res på ett nytt sätt",
    legalToggle: "Visa användarvillkoren",
    legalCommitments: "Dina åtaganden när du skapar ett konto",
    legalRules: {
      ownPhotosTitle: "Endast dina egna foton",
      ownPhotosDescription: "Ladda endast upp äkta foton av dig själv. Att använda bilder på andra utan deras samtycke innebär identitetsintrång.",
      realAccountsTitle: "Inga falska konton",
      realAccountsDescription: "Profiler med påhittade identiteter, fiktiva personer eller falska uppgifter är förbjudna. Varje konto måste representera en verklig person.",
      respectfulConductTitle: "Respektfullt beteende",
      respectfulConductDescription: "Trakasserier, kränkande språk och olämpligt innehåll är inte tillåtet. FallOnYou är en trygg plats för alla.",
      legalResponsibilityTitle: "Juridiskt ansvar",
      legalResponsibilityDescription: "Överträdelser kan leda till att kontot stängs av och, i allvarliga fall, rättsliga åtgärder enligt gällande lagstiftning.",
    },
    sessionSecurity: "FallOnYou registrerar e-postadress, IP-adress och enhet för varje session av säkerhets- och regelefterlevnadsskäl.",
    forgotPassword: "Glömt ditt lösenord?",
    ageRequiredTitle: "Ålderskrav",
    ageRequiredDescription: "Du måste bekräfta att du är minst 18 år för att registrera dig.",
    connectionFailure: "Det gick inte att ansluta till servern. Försök igen om några sekunder.",
    restartingFailure: "Servern startar om. Försök igen om några sekunder.",
    serverFailure: "Ett problem uppstod på servern. Försök igen om några sekunder.",
    credentialsFailure: "Fel e-postadress eller lösenord.",
    genericFailure: "Begäran kunde inte genomföras. Försök igen.",
    passwordShow: "Visa lösenord",
    passwordLengthFailure: "Lösenordet är för långt. Använd färre tecken, särskilt accenter eller emojier.",
    passwordHide: "Dölj lösenord",
    freeFooter: "Gratis",
  },
};