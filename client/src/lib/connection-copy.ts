import type { Language } from "@/lib/i18n";

type ConnectionCopy = {
  connect: string;
  skip: string;
  requestSent: string;
  requestSentDescription: string;
  sentRequests: string;
  awaitingResponse: string;
  mutualExplanation: string;
  matchDescription: string;
  sendError: string;
  sendErrorDescription: string;
  dailyLimit: string;
  unavailable: string;
  loadError: string;
  requestsLoadError: string;
  incomingRequests: string;
  incomingRequestsLoadError: string;
  accept: string;
  accepting: string;
  acceptError: string;
  acceptedPending: string;
  accepted: string;
  sentTab: string;
  incomingTab: string;
  requestDate: string;
  block: string;
  report: string;
  safetyActions: string;
  blockTitle: string;
  blockDescription: string;
  reportTitle: string;
  reportDescription: string;
  reportDetails: string;
  confirmBlock: string;
  confirmReport: string;
  cancel: string;
  blockError: string;
  reportError: string;
  blockSuccess: string;
  reportSuccess: string;
  blockChatEffect: string;
  reportDetailsPlaceholder: string;
  matchesRequestDate: string;
  refresh: string;
  traveler: string;
};

export const connectionCopy: Record<Language, ConnectionCopy> = {
  es: {
    connect: "Conectar", skip: "Siguiente",
    requestSent: "Solicitud enviada",
    requestSentDescription: "Puedes verla en Conexiones, en «Solicitudes enviadas». Podréis chatear cuando la otra persona también conecte contigo.",
    sentRequests: "Solicitudes enviadas", awaitingResponse: "Pendiente de respuesta",
    mutualExplanation: "Una solicitud no es todavía una conexión. El chat se activa cuando ambos conectáis.",
    matchDescription: "Ya podéis empezar a chatear.",
    sendError: "No se pudo conectar", sendErrorDescription: "No se ha confirmado la solicitud. Inténtalo de nuevo.",
    dailyLimit: "Has alcanzado el límite diario de solicitudes.",
    unavailable: "No puedes conectar con esta cuenta.",
    loadError: "No se pudieron actualizar tus conexiones.",
    requestsLoadError: "No se pudieron cargar tus solicitudes enviadas.",
    incomingRequests: "Solicitudes recibidas", incomingRequestsLoadError: "No se pudieron cargar tus solicitudes recibidas.",
    accept: "Aceptar", accepting: "Aceptando…", acceptError: "No se pudo aceptar la solicitud. Inténtalo de nuevo.", acceptedPending: "Solicitud aceptada; esperando confirmación mutua.",
    accepted: "Conexión confirmada", sentTab: "Enviadas", incomingTab: "Recibidas", requestDate: "Enviada",
    block: "Bloquear", report: "Denunciar", safetyActions: "Opciones de seguridad",
    blockTitle: "¿Bloquear a {name}?", blockDescription: "Esta persona no podrá enviarte solicitudes ni contactar contigo. También desaparecerá de tus conexiones.",
    reportTitle: "Denunciar a {name}", reportDescription: "Revisaremos esta denuncia. No se enviará hasta que confirmes.",
    reportDetails: "Detalles (opcional)", confirmBlock: "Bloquear persona", confirmReport: "Enviar denuncia", cancel: "Cancelar",
    blockError: "No se pudo bloquear a esta persona. Inténtalo de nuevo.", reportError: "No se pudo enviar la denuncia. Inténtalo de nuevo.",
    blockSuccess: "Persona bloqueada", reportSuccess: "Denuncia enviada", blockChatEffect: "El bloqueo también elimina el acceso a esta conexión.",
    reportDetailsPlaceholder: "Cuéntanos qué ocurrió", matchesRequestDate: "Fecha de la solicitud",
    refresh: "Actualizar conexiones", traveler: "Viajero",
  },
  en: {
    connect: "Connect", skip: "Next",
    requestSent: "Request sent",
    requestSentDescription: "Find it in Connections under “Sent requests”. You can chat once the other person also connects with you.",
    sentRequests: "Sent requests", awaitingResponse: "Awaiting a response",
    mutualExplanation: "A request is not yet a connection. Chat becomes available when you both connect.",
    matchDescription: "You can start chatting now.",
    sendError: "Couldn't connect", sendErrorDescription: "Your request wasn't confirmed. Please try again.",
    dailyLimit: "You've reached the daily request limit.",
    unavailable: "You can't connect with this account.",
    loadError: "Couldn't refresh your connections.",
    requestsLoadError: "Couldn't load your sent requests.",
    incomingRequests: "Received requests", incomingRequestsLoadError: "Couldn't load your received requests.",
    accept: "Accept", accepting: "Accepting…", acceptError: "Couldn't accept this request. Please try again.", acceptedPending: "Request accepted; waiting for mutual confirmation.",
    accepted: "Connection confirmed", sentTab: "Sent", incomingTab: "Received", requestDate: "Sent",
    block: "Block", report: "Report", safetyActions: "Safety options",
    blockTitle: "Block {name}?", blockDescription: "This person won't be able to send you requests or contact you. They'll also be removed from your connections.",
    reportTitle: "Report {name}", reportDescription: "We'll review this report. It won't be sent until you confirm.",
    reportDetails: "Details (optional)", confirmBlock: "Block person", confirmReport: "Send report", cancel: "Cancel",
    blockError: "Couldn't block this person. Please try again.", reportError: "Couldn't send the report. Please try again.",
    blockSuccess: "Person blocked", reportSuccess: "Report sent", blockChatEffect: "Blocking also removes access to this connection.",
    reportDetailsPlaceholder: "Tell us what happened", matchesRequestDate: "Request date",
    refresh: "Refresh connections", traveler: "Traveler",
  },
  fr: {
    connect: "Se connecter", skip: "Suivant",
    requestSent: "Demande envoyée",
    requestSentDescription: "Retrouve-la dans Connexions, sous « Demandes envoyées ». Le chat sera disponible quand l'autre personne se connectera aussi avec toi.",
    sentRequests: "Demandes envoyées", awaitingResponse: "En attente de réponse",
    mutualExplanation: "Une demande n'est pas encore une connexion. Le chat devient disponible quand vous vous connectez tous les deux.",
    matchDescription: "Vous pouvez commencer à discuter.",
    sendError: "Connexion impossible", sendErrorDescription: "Ta demande n'a pas été confirmée. Réessaie.",
    dailyLimit: "Tu as atteint la limite quotidienne de demandes.",
    unavailable: "Tu ne peux pas te connecter avec ce compte.",
    loadError: "Impossible d'actualiser tes connexions.",
    requestsLoadError: "Impossible de charger tes demandes envoyées.",
    incomingRequests: "Demandes reçues", incomingRequestsLoadError: "Impossible de charger tes demandes reçues.",
    accept: "Accepter", accepting: "Acceptation…", acceptError: "Impossible d'accepter cette demande. Réessaie.", acceptedPending: "Demande acceptée ; en attente de confirmation mutuelle.",
    accepted: "Connexion confirmée", sentTab: "Envoyées", incomingTab: "Reçues", requestDate: "Envoyée",
    block: "Bloquer", report: "Signaler", safetyActions: "Options de sécurité",
    blockTitle: "Bloquer {name} ?", blockDescription: "Cette personne ne pourra plus t'envoyer de demandes ni te contacter. Elle sera aussi retirée de tes connexions.",
    reportTitle: "Signaler {name}", reportDescription: "Nous examinerons ce signalement. Il ne sera envoyé qu'après confirmation.",
    reportDetails: "Détails (facultatif)", confirmBlock: "Bloquer cette personne", confirmReport: "Envoyer le signalement", cancel: "Annuler",
    blockError: "Impossible de bloquer cette personne. Réessaie.", reportError: "Impossible d'envoyer le signalement. Réessaie.",
    blockSuccess: "Personne bloquée", reportSuccess: "Signalement envoyé", blockChatEffect: "Le blocage supprime aussi l'accès à cette connexion.",
    reportDetailsPlaceholder: "Explique ce qui s'est passé", matchesRequestDate: "Date de la demande",
    refresh: "Actualiser les connexions", traveler: "Voyageur",
  },
  sv: {
    connect: "Skapa kontakt", skip: "Nästa",
    requestSent: "Förfrågan skickad",
    requestSentDescription: "Du hittar den under Kontakter, i ”Skickade förfrågningar”. Ni kan chatta när den andra personen också skapar kontakt med dig.",
    sentRequests: "Skickade förfrågningar", awaitingResponse: "Väntar på svar",
    mutualExplanation: "En förfrågan är inte en bekräftad kontakt. Chatten blir tillgänglig när ni båda skapar kontakt.",
    matchDescription: "Nu kan ni börja chatta.",
    sendError: "Kunde inte skapa kontakt", sendErrorDescription: "Din förfrågan har inte bekräftats. Försök igen.",
    dailyLimit: "Du har nått dagens gräns för förfrågningar.",
    unavailable: "Du kan inte skapa kontakt med det här kontot.",
    loadError: "Det gick inte att uppdatera dina kontakter.",
    requestsLoadError: "Det gick inte att läsa in dina skickade förfrågningar.",
    incomingRequests: "Mottagna förfrågningar", incomingRequestsLoadError: "Det gick inte att läsa in mottagna förfrågningar.",
    accept: "Acceptera", accepting: "Accepterar…", acceptError: "Det gick inte att acceptera förfrågan. Försök igen.", acceptedPending: "Förfrågan accepterad; väntar på ömsesidig bekräftelse.",
    accepted: "Kontakt bekräftad", sentTab: "Skickade", incomingTab: "Mottagna", requestDate: "Skickad",
    block: "Blockera", report: "Anmäl", safetyActions: "Säkerhetsalternativ",
    blockTitle: "Blockera {name}?", blockDescription: "Personen kan inte skicka förfrågningar eller kontakta dig. Personen tas också bort från dina kontakter.",
    reportTitle: "Anmäl {name}", reportDescription: "Vi granskar anmälan. Den skickas inte förrän du bekräftar.",
    reportDetails: "Detaljer (valfritt)", confirmBlock: "Blockera person", confirmReport: "Skicka anmälan", cancel: "Avbryt",
    blockError: "Det gick inte att blockera personen. Försök igen.", reportError: "Det gick inte att skicka anmälan. Försök igen.",
    blockSuccess: "Person blockerad", reportSuccess: "Anmälan skickad", blockChatEffect: "Blockeringen tar också bort åtkomsten till kontakten.",
    reportDetailsPlaceholder: "Berätta vad som hände", matchesRequestDate: "Datum för förfrågan",
    refresh: "Uppdatera kontakter", traveler: "Resenär",
  },
};