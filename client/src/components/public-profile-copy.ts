import type { Language } from "@/lib/i18n";

export const publicProfileCopy: Record<Language, {
  viewProfile: string;
  viewProfileFor: string;
  loading: string;
  sending: string;
  loadFailed: string;
  retry: string;
  connect: string;
  pending: string;
  connected: string;
  sendFailed: string;
  openMatches: string;
}> = {
  en: {
    viewProfile: "View profile", viewProfileFor: "View {name}'s profile",
    loading: "Loading traveler profile…", sending: "Sending request…", loadFailed: "This traveler profile couldn’t be loaded.", retry: "Try again", connect: "Connect",
    pending: "Request sent · awaiting response", connected: "Connected",
    sendFailed: "Your request wasn’t confirmed. Try again.", openMatches: "View connections",
  },
  es: {
    viewProfile: "Ver perfil", viewProfileFor: "Ver el perfil de {name}",
    loading: "Cargando perfil del viajero…", sending: "Enviando solicitud…", loadFailed: "No se pudo cargar este perfil.", retry: "Intentar de nuevo", connect: "Conectar",
    pending: "Solicitud enviada · pendiente de respuesta", connected: "Conectados",
    sendFailed: "No se confirmó tu solicitud. Inténtalo de nuevo.", openMatches: "Ver conexiones",
  },
  fr: {
    viewProfile: "Voir le profil", viewProfileFor: "Voir le profil de {name}",
    loading: "Chargement du profil…", sending: "Envoi de la demande…", loadFailed: "Impossible de charger ce profil.", retry: "Réessayer", connect: "Se connecter",
    pending: "Demande envoyée · en attente de réponse", connected: "Connectés",
    sendFailed: "Ta demande n’a pas été confirmée. Réessaie.", openMatches: "Voir les connexions",
  },
  sv: {
    viewProfile: "Visa profil", viewProfileFor: "Visa {name}s profil",
    loading: "Resenärens profil läses in…", sending: "Skickar förfrågan…", loadFailed: "Profilen kunde inte läsas in.", retry: "Försök igen", connect: "Skapa kontakt",
    pending: "Förfrågan skickad · väntar på svar", connected: "Anslutna",
    sendFailed: "Din förfrågan har inte bekräftats. Försök igen.", openMatches: "Visa kontakter",
  },
};