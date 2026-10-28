import type { Language } from "@/lib/i18n";

type ProfileSettingsCopy = {
  notificationsTitle: string;
  verifiedLabel: string;
  approvedDescription: string;
  pendingTitle: string;
  pendingDescription: string;
  rejectedTitle: string;
  retryDescription: string;
  verificationTitle: string;
  verificationInstructions: string;
  sentTitle: string;
  sentDescription: string;
  uploadError: string;
  previewAlt: string;
  uploading: string;
  submit: string;
  takeSelfie: string;
  retrySelfie: string;
};

export const profileSettingsCopy: Record<Language, ProfileSettingsCopy> = {
  en: {
    notificationsTitle: "Notifications",
    verifiedLabel: "Verified account",
    approvedDescription: "Your profile has the blue verification badge",
    pendingTitle: "Verification in progress",
    pendingDescription: "We review your selfie within 24–48 hours",
    rejectedTitle: "Verification rejected",
    retryDescription: "You can try again with a clearer photo.",
    verificationTitle: "Identity verification",
    verificationInstructions: "Upload a selfie while holding your national ID card or passport. A blue verification badge will appear on your profile.",
    sentTitle: "Selfie submitted",
    sentDescription: "We will review your request within 24–48 hours.",
    uploadError: "Could not submit your selfie. Please try again.",
    previewAlt: "Selfie preview",
    uploading: "Submitting...",
    submit: "Submit for verification",
    takeSelfie: "Take a selfie to verify",
    retrySelfie: "Upload a new selfie",
  },
  es: {
    notificationsTitle: "Notificaciones",
    verifiedLabel: "Cuenta verificada",
    approvedDescription: "Tu perfil tiene la insignia azul de verificación",
    pendingTitle: "Verificación en proceso",
    pendingDescription: "Revisamos tu selfie en 24–48 horas",
    rejectedTitle: "Verificación rechazada",
    retryDescription: "Puedes intentarlo de nuevo con una foto más clara.",
    verificationTitle: "Verificación de identidad",
    verificationInstructions: "Sube un selfie sosteniendo tu DNI o pasaporte. Aparecerá una insignia azul de verificación en tu perfil.",
    sentTitle: "Selfie enviado",
    sentDescription: "Revisaremos tu solicitud en 24–48 horas.",
    uploadError: "No se pudo enviar tu selfie. Inténtalo de nuevo.",
    previewAlt: "Vista previa del selfie",
    uploading: "Enviando...",
    submit: "Enviar para verificación",
    takeSelfie: "Tomar selfie para verificar",
    retrySelfie: "Subir nueva selfie",
  },
  fr: {
    notificationsTitle: "Notifications",
    verifiedLabel: "Compte vérifié",
    approvedDescription: "Ton profil porte le badge bleu de vérification",
    pendingTitle: "Vérification en cours",
    pendingDescription: "Nous examinons ton selfie sous 24 à 48 heures",
    rejectedTitle: "Vérification refusée",
    retryDescription: "Tu peux réessayer avec une photo plus nette.",
    verificationTitle: "Vérification d’identité",
    verificationInstructions: "Envoie un selfie en tenant ta carte d’identité ou ton passeport. Un badge bleu de vérification apparaîtra sur ton profil.",
    sentTitle: "Selfie envoyé",
    sentDescription: "Nous examinerons ta demande sous 24 à 48 heures.",
    uploadError: "Impossible d’envoyer ton selfie. Réessaie.",
    previewAlt: "Aperçu du selfie",
    uploading: "Envoi en cours...",
    submit: "Envoyer pour vérification",
    takeSelfie: "Prendre un selfie pour la vérification",
    retrySelfie: "Envoyer un nouveau selfie",
  },
  sv: {
    notificationsTitle: "Notiser",
    verifiedLabel: "Verifierat konto",
    approvedDescription: "Din profil har den blå verifieringssymbolen",
    pendingTitle: "Verifiering pågår",
    pendingDescription: "Vi granskar din selfie inom 24–48 timmar",
    rejectedTitle: "Verifieringen avslogs",
    retryDescription: "Du kan försöka igen med en tydligare bild.",
    verificationTitle: "Identitetsverifiering",
    verificationInstructions: "Ladda upp en selfie där du håller ditt nationella ID-kort eller pass. En blå verifieringssymbol visas på din profil.",
    sentTitle: "Selfien har skickats",
    sentDescription: "Vi granskar din begäran inom 24–48 timmar.",
    uploadError: "Det gick inte att skicka din selfie. Försök igen.",
    previewAlt: "Förhandsvisning av selfie",
    uploading: "Skickar...",
    submit: "Skicka för verifiering",
    takeSelfie: "Ta en selfie för verifiering",
    retrySelfie: "Ladda upp en ny selfie",
  },
};