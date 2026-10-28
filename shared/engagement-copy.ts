export type EngagementLocale = "en" | "es" | "fr" | "sv";
export const engagementCopy = {
  en: {
    requestTitle: "New connection request", requestBody: "{name} would like to connect with you. Open Connections to review the request.",
    matchTitle: "Connection confirmed", matchBody: "You both agreed to connect. You can now chat.",
    reminderTitle: "A little language practice?", reminderBody: "Continue learning {language}, or return to finish your activity. A few minutes is enough.",
    reminderLabel: "Language practice reminders", reminderDescription: "Optional: receive at most one reminder a day after you start studying. Turn it off here at any time.",
    reminderSaved: "Reminder preference saved", error: "Could not save. Please try again.",
    solidarityTitle: "Travel and help together",
    solidarityBody: "You can help a traveler here. If you would like to help in another way, or have not found someone to help, don't worry: we are exploring a solidarity trip with FallonYou travelers to support communities in need. No destination or dates have been confirmed yet.",
    solidarityQuestion: "Would you like to join this adventure? Tell us which country you would visit and how you would like to contribute during the trip.",
    country: "Country you would like to visit", support: "How would you like to help?", submit: "Send my idea", sent: "Your idea has been received. Thank you!", sending: "Sending...",
    notifications: "Notifications", readAll: "Mark all as read", empty: "No notifications yet", now: "now",
  },
  es: {
    requestTitle: "Nueva solicitud de conexión", requestBody: "{name} quiere conectar contigo. Abre Conexiones para revisar la solicitud.",
    matchTitle: "Conexión confirmada", matchBody: "Ambos habéis aceptado conectar. Ya podéis chatear.",
    reminderTitle: "¿Practicamos un poco el idioma?", reminderBody: "Sigue aprendiendo {language} o vuelve para terminar tu actividad. Basta con unos minutos.",
    reminderLabel: "Recordatorios para practicar idiomas", reminderDescription: "Opcional: recibe como máximo un aviso al día después de empezar a estudiar. Puedes desactivarlo aquí cuando quieras.",
    reminderSaved: "Preferencia de recordatorios guardada", error: "No se pudo guardar. Inténtalo de nuevo.",
    solidarityTitle: "Viajar y ayudar juntos",
    solidarityBody: "Aquí puedes ayudar a un viajero. Si tu idea es ayudar de otra forma o no encuentras a quién ayudar, no te preocupes: estamos explorando un viaje solidario con viajeros de FallonYou para apoyar a comunidades que lo necesitan. Todavía no hay destino ni fechas confirmados.",
    solidarityQuestion: "¿Te gustaría realizar esta aventura con nosotros? Cuéntanos a qué país irías y cómo te gustaría apoyar durante tu viaje.",
    country: "País al que te gustaría viajar", support: "¿Cómo te gustaría ayudar?", submit: "Enviar mi idea", sent: "Hemos recibido tu idea. ¡Gracias!", sending: "Enviando...",
    notifications: "Notificaciones", readAll: "Marcar todo como leído", empty: "Aún no hay notificaciones", now: "ahora",
  },
  fr: {
    requestTitle: "Nouvelle demande de connexion", requestBody: "{name} souhaite faire votre connaissance. Ouvrez Connexions pour consulter la demande.",
    matchTitle: "Connexion confirmée", matchBody: "Vous avez tous les deux accepté. Vous pouvez maintenant discuter.",
    reminderTitle: "Un peu de pratique linguistique ?", reminderBody: "Continuez à apprendre {language} ou revenez terminer votre activité. Quelques minutes suffisent.",
    reminderLabel: "Rappels pour pratiquer les langues", reminderDescription: "Facultatif : au maximum un rappel par jour après avoir commencé à étudier. Désactivez-le ici à tout moment.",
    reminderSaved: "Préférence de rappels enregistrée", error: "Enregistrement impossible. Réessayez.",
    solidarityTitle: "Voyager et aider ensemble",
    solidarityBody: "Vous pouvez aider un voyageur ici. Si vous souhaitez aider autrement ou ne trouvez personne à aider, nous explorons un voyage solidaire avec des voyageurs de FallonYou pour soutenir des communautés dans le besoin. Aucune destination ni date n'est encore confirmée.",
    solidarityQuestion: "Aimeriez-vous participer à cette aventure ? Dites-nous quel pays vous visiteriez et comment vous souhaiteriez contribuer pendant le voyage.",
    country: "Pays que vous aimeriez visiter", support: "Comment aimeriez-vous aider ?", submit: "Envoyer mon idée", sent: "Nous avons reçu votre idée. Merci !", sending: "Envoi...",
    notifications: "Notifications", readAll: "Tout marquer comme lu", empty: "Aucune notification pour le moment", now: "maintenant",
  },
  sv: {
    requestTitle: "Ny kontaktförfrågan", requestBody: "{name} vill ta kontakt med dig. Öppna Kontakter för att se förfrågan.",
    matchTitle: "Kontakt bekräftad", matchBody: "Ni har båda accepterat. Nu kan ni chatta.",
    reminderTitle: "Lite språkträning?", reminderBody: "Fortsätt lära dig {language} eller kom tillbaka och avsluta din aktivitet. Några minuter räcker.",
    reminderLabel: "Påminnelser om språkträning", reminderDescription: "Valfritt: högst en påminnelse per dag efter att du börjat studera. Stäng av den här när du vill.",
    reminderSaved: "Inställningen har sparats", error: "Det gick inte att spara. Försök igen.",
    solidarityTitle: "Res och hjälp tillsammans",
    solidarityBody: "Här kan du hjälpa en resenär. Om du vill hjälpa på ett annat sätt eller inte hittar någon att hjälpa utforskar vi en solidaritetsresa med FallonYou-resenärer för att stödja samhällen som behöver hjälp. Ingen destination eller tidpunkt är bekräftad ännu.",
    solidarityQuestion: "Vill du följa med på detta äventyr? Berätta vilket land du skulle besöka och hur du vill bidra under resan.",
    country: "Land du vill besöka", support: "Hur vill du hjälpa?", submit: "Skicka min idé", sent: "Vi har tagit emot din idé. Tack!", sending: "Skickar...",
    notifications: "Notiser", readAll: "Markera alla som lästa", empty: "Inga notiser ännu", now: "nu",
  },
};
export function engagementLocale(value: unknown): EngagementLocale {
  return value === "es" || value === "fr" || value === "sv" ? value : "en";
}