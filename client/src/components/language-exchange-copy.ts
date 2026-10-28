import type { Language } from "@/lib/i18n";

export const exchangeCopy: Record<Language, {
  tab: string;
  title: string;
  intro: string;
  offerTitle: string;
  offerHelp: string;
  offerHint: string;
  save: string;
  saved: string;
  saveError: string;
  choose: string;
  findTitle: string;
  findHint: string;
  help: string;
  learning: string;
  city: string;
  request: string;
  requested: string;
  pending: string;
  chat: string;
  incoming: string;
  outgoing: string;
  accept: string;
  decline: string;
  cancel: string;
  incomingHint: string;
  outgoingHint: string;
  noHelpers: string;
  noIncoming: string;
  noOutgoing: string;
  loadError: string;
  retry: string;
  closed: string;
  limited: string;
  forbidden: string;
  unauthenticated: string;
  genericError: string;
  independent: string;
  pendingFeedback: string;
  history: string;
  historyHint: string;
  accepted: string;
  declined: string;
  cancelled: string;
  dismiss: string;
  loading: string;
}> = {
  en: {
    tab: "Practice together", title: "Language exchange",
    intro: "Offer language help or find someone to practice with. You choose whether to offer help and which requests to accept.",
    offerTitle: "I can help you with…", offerHelp: "Choose the languages you’re happy to help others practice.",
    offerHint: "This is separate from the languages you speak on your profile. Nothing is added automatically.",
    save: "Save languages", saved: "Your offer is saved.", saveError: "Couldn’t save your choices.",
    choose: "Choose a language", findTitle: "People offering help", findHint: "Requests are voluntary. Chat becomes available only when the recipient accepts.",
    help: "Can help with", learning: "Practicing", city: "Based in", request: "Ask to practice", requested: "Request sent",
    pending: "Request pending", chat: "Open chat", incoming: "Requests for you", outgoing: "Your requests",
    accept: "Accept", decline: "Decline", cancel: "Cancel request",
    incomingHint: "Accept to open a chat together, or decline if now isn’t a good time.",
    outgoingHint: "Chat starts only after the other person accepts.",
    noHelpers: "No one has offered help in this language yet. Check back soon.",
    noIncoming: "No requests to review.", noOutgoing: "You haven’t sent any requests.",
    loadError: "We couldn’t load language exchange. Your saved choices are untouched.",
    retry: "Try again", closed: "This connection is no longer open. You can still browse other people.",
    limited: "You’ve reached the request limit. Please try again later.",
    forbidden: "You can’t perform that action for this request.",
    unauthenticated: "Please sign in again to use language exchange.",
    genericError: "Something went wrong. Please try again.",
    independent: "Your spoken-language profile is unchanged.", pendingFeedback: "Request is awaiting their response.",
    history: "Your language connections", historyHint: "Review responses and return to accepted chats.",
    accepted: "Accepted", declined: "Declined", cancelled: "Cancelled",
    dismiss: "Dismiss message", loading: "Loading language exchange",
  },
  es: {
    tab: "Practicar juntos", title: "Intercambio de idiomas",
    intro: "Ofrece ayuda con un idioma o encuentra a alguien con quien practicar. Tú decides si quieres ayudar y qué solicitudes aceptas.",
    offerTitle: "Puedo ayudar con…", offerHelp: "Elige los idiomas con los que te gustaría ayudar a otras personas.",
    offerHint: "Esto es independiente de los idiomas de tu perfil. No se añade nada automáticamente.",
    save: "Guardar idiomas", saved: "Tu oferta está guardada.", saveError: "No se pudieron guardar tus opciones.",
    choose: "Elige un idioma", findTitle: "Personas que ofrecen ayuda", findHint: "Las solicitudes son voluntarias. El chat solo se abre cuando la otra persona acepta.",
    help: "Puede ayudar con", learning: "Está practicando", city: "En", request: "Proponer práctica", requested: "Solicitud enviada",
    pending: "Solicitud pendiente", chat: "Abrir chat", incoming: "Solicitudes para ti", outgoing: "Tus solicitudes",
    accept: "Aceptar", decline: "Rechazar", cancel: "Cancelar solicitud",
    incomingHint: "Acepta para abrir un chat o rechaza si ahora no te viene bien.",
    outgoingHint: "El chat solo comienza cuando la otra persona acepta.",
    noHelpers: "Todavía nadie ofrece ayuda en este idioma. Vuelve pronto.",
    noIncoming: "No tienes solicitudes para revisar.", noOutgoing: "Aún no has enviado solicitudes.",
    loadError: "No se pudo cargar el intercambio. Tus opciones guardadas no se han modificado.",
    retry: "Reintentar", closed: "Esta conexión ya no está disponible. Puedes ver a otras personas.",
    limited: "Has alcanzado el límite de solicitudes. Inténtalo más tarde.",
    forbidden: "No puedes realizar esa acción para esta solicitud.",
    unauthenticated: "Vuelve a iniciar sesión para usar el intercambio de idiomas.",
    genericError: "Algo salió mal. Inténtalo de nuevo.",
    independent: "Tu perfil de idiomas hablados no cambia.", pendingFeedback: "La solicitud está pendiente de respuesta.",
    history: "Tus conexiones por idiomas", historyHint: "Consulta las respuestas y vuelve a los chats aceptados.",
    accepted: "Aceptada", declined: "Rechazada", cancelled: "Cancelada",
    dismiss: "Cerrar mensaje", loading: "Cargando intercambio de idiomas",
  },
  fr: {
    tab: "Pratiquer ensemble", title: "Échange linguistique",
    intro: "Proposez de l’aide linguistique ou trouvez quelqu’un pour pratiquer. Vous choisissez d’aider et les demandes à accepter.",
    offerTitle: "Je peux aider en…", offerHelp: "Choisissez les langues pour lesquelles vous souhaitez aider.",
    offerHint: "Ce choix est indépendant des langues de votre profil. Aucune inscription automatique.",
    save: "Enregistrer", saved: "Votre proposition est enregistrée.", saveError: "Impossible d’enregistrer vos choix.",
    choose: "Choisir une langue", findTitle: "Personnes proposant de l’aide", findHint: "Les demandes sont volontaires. La discussion s’ouvre uniquement après acceptation.",
    help: "Peut aider en", learning: "Pratique", city: "Ville", request: "Proposer de pratiquer", requested: "Demande envoyée",
    pending: "En attente", chat: "Ouvrir la discussion", incoming: "Demandes reçues", outgoing: "Vos demandes",
    accept: "Accepter", decline: "Refuser", cancel: "Annuler la demande",
    incomingHint: "Acceptez pour ouvrir une discussion, ou refusez si le moment ne convient pas.",
    outgoingHint: "La discussion commence uniquement après acceptation.",
    noHelpers: "Personne ne propose encore d’aide dans cette langue. Revenez bientôt.",
    noIncoming: "Aucune demande à examiner.", noOutgoing: "Vous n’avez envoyé aucune demande.",
    loadError: "Impossible de charger l’échange. Vos choix enregistrés sont conservés.",
    retry: "Réessayer", closed: "Cette connexion n’est plus disponible. Vous pouvez parcourir d’autres profils.",
    limited: "Vous avez atteint la limite de demandes. Réessayez plus tard.",
    forbidden: "Vous ne pouvez pas effectuer cette action pour cette demande.",
    unauthenticated: "Reconnectez-vous pour utiliser l’échange linguistique.",
    genericError: "Une erreur s’est produite. Réessayez.",
    independent: "Votre profil de langues parlées ne change pas.", pendingFeedback: "La demande attend sa réponse.",
    history: "Vos contacts linguistiques", historyHint: "Consultez les réponses et retrouvez les discussions acceptées.",
    accepted: "Acceptée", declined: "Refusée", cancelled: "Annulée",
    dismiss: "Fermer le message", loading: "Chargement de l’échange linguistique",
  },
  sv: {
    tab: "Öva tillsammans", title: "Språkutbyte",
    intro: "Erbjud språkhjälp eller hitta någon att öva med. Du väljer om du vill hjälpa och vilka förfrågningar du accepterar.",
    offerTitle: "Jag kan hjälpa till med…", offerHelp: "Välj språk som du gärna hjälper andra att öva.",
    offerHint: "Det här är separat från språken i din profil. Inget läggs till automatiskt.",
    save: "Spara språk", saved: "Ditt erbjudande är sparat.", saveError: "Det gick inte att spara dina val.",
    choose: "Välj språk", findTitle: "Personer som erbjuder hjälp", findHint: "Förfrågningar är frivilliga. Chatten öppnas först när mottagaren tackar ja.",
    help: "Kan hjälpa med", learning: "Övar", city: "Ort", request: "Fråga om övning", requested: "Förfrågan skickad",
    pending: "Väntar på svar", chat: "Öppna chatten", incoming: "Förfrågningar till dig", outgoing: "Dina förfrågningar",
    accept: "Acceptera", decline: "Avböj", cancel: "Avbryt förfrågan",
    incomingHint: "Acceptera för att öppna en chatt, eller avböj om det inte passar.",
    outgoingHint: "Chatten startar först när den andra personen accepterar.",
    noHelpers: "Ingen erbjuder hjälp på det här språket ännu. Titta in snart igen.",
    noIncoming: "Inga förfrågningar att granska.", noOutgoing: "Du har inte skickat några förfrågningar.",
    loadError: "Det gick inte att läsa in språkutbytet. Dina sparade val är oförändrade.",
    retry: "Försök igen", closed: "Den här kontakten är inte längre öppen. Du kan söka bland andra.",
    limited: "Du har nått gränsen för förfrågningar. Försök igen senare.",
    forbidden: "Du kan inte utföra den åtgärden för den här förfrågan.",
    unauthenticated: "Logga in igen för att använda språkutbytet.",
    genericError: "Något gick fel. Försök igen.",
    independent: "Din profil med talade språk ändras inte.", pendingFeedback: "Förfrågan väntar på svar.",
    history: "Dina språkkontakter", historyHint: "Se svar och återvänd till accepterade chattar.",
    accepted: "Accepterad", declined: "Avböjd", cancelled: "Avbruten",
    dismiss: "Stäng meddelandet", loading: "Laddar språkutbyte",
  },
};

export const exchangeLanguages = [
  { code: "en", label: "English" }, { code: "es", label: "Español" },
  { code: "fr", label: "Français" }, { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" }, { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" }, { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" }, { code: "nl", label: "Nederlands" },
  { code: "sv", label: "Svenska" },
];
