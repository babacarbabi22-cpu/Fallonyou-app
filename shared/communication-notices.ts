import { communicationLocale, type CommunicationLocale } from "./communication-locale";

type Notice = { title: string; body: string };
type ScheduledKind = "weekly" | "noPhoto" | "noEvent" | "incompleteProfile";
const scheduled: Record<CommunicationLocale, Record<ScheduledKind, [string, string][]>> = {
  en: {
    weekly: [
      ["What are your plans this week?", "Discover nearby activities or create your own. Meet other travelers on FallOnYou."],
      ["Travel together", "Join an activity or create a plan and invite other travelers."],
      ["A new week, new connections", "Explore dinners, sports and excursions. Find a plan that suits you."],
      ["Meet new people", "Create a plan or join an activity on FallOnYou."],
    ],
    noPhoto: [["Add a profile photo", "Help other travelers recognize you. Add your first photo."], ["Your profile is incomplete", "Add a profile photo and tell other travelers about yourself."]],
    noEvent: [["Create a plan", "Organize a dinner, an excursion or a sports activity."], ["Ideas for this week", "Create an activity and meet other travelers on FallOnYou."]],
    incompleteProfile: [["Complete your profile", "Add photos and a short introduction so other travelers can get to know you."], ["Your profile is almost ready", "Add a photo and a short introduction."], ["Introduce yourself", "A complete profile helps other travelers get to know you."], ["Meet fellow travelers", "Complete your profile to make it easier for others to find you."]],
  },
  es: {
    weekly: [["¿Qué planes tienes esta semana?", "Descubre actividades cerca de ti o crea la tuya. Conoce a otros viajeros en FallOnYou."], ["Viaja con compañía", "Únete a una actividad o crea un plan e invita a otros viajeros."], ["Nueva semana, nuevas conexiones", "Descubre cenas, deportes y excursiones. Encuentra un plan para ti."], ["Conoce gente nueva", "Crea un plan o únete a una actividad en FallOnYou."]],
    noPhoto: [["Añade una foto de perfil", "Ayuda a otros viajeros a reconocerte. Añade tu primera foto."], ["Tu perfil está incompleto", "Añade una foto de perfil y preséntate a otros viajeros."]],
    noEvent: [["Crea un plan", "Organiza una cena, una excursión o una actividad deportiva."], ["Ideas para esta semana", "Crea una actividad y conoce a otros viajeros en FallOnYou."]],
    incompleteProfile: [["Completa tu perfil", "Añade fotos y una breve presentación para que otros viajeros puedan conocerte."], ["Tu perfil casi está listo", "Añade una foto y una breve presentación."], ["Preséntate", "Un perfil completo ayuda a otros viajeros a conocerte."], ["Conoce a otros viajeros", "Completa tu perfil para que puedan encontrarte con más facilidad."]],
  },
  fr: {
    weekly: [["Quels sont vos projets cette semaine ?", "Découvrez des activités près de vous ou créez la vôtre. Rencontrez d'autres voyageurs sur FallOnYou."], ["Voyagez ensemble", "Rejoignez une activité ou créez un projet et invitez d'autres voyageurs."], ["Une nouvelle semaine, de nouvelles rencontres", "Découvrez des dîners, du sport et des excursions."], ["Rencontrez de nouvelles personnes", "Créez un projet ou rejoignez une activité sur FallOnYou."]],
    noPhoto: [["Ajoutez une photo de profil", "Aidez les autres voyageurs à vous reconnaître. Ajoutez votre première photo."], ["Votre profil est incomplet", "Ajoutez une photo et présentez-vous aux autres voyageurs."]],
    noEvent: [["Créez un projet", "Organisez un dîner, une excursion ou une activité sportive."], ["Des idées pour cette semaine", "Créez une activité et rencontrez d'autres voyageurs sur FallOnYou."]],
    incompleteProfile: [["Complétez votre profil", "Ajoutez des photos et une courte présentation."], ["Votre profil est presque prêt", "Ajoutez une photo et une courte présentation."], ["Présentez-vous", "Un profil complet aide les autres voyageurs à vous connaître."], ["Rencontrez d'autres voyageurs", "Complétez votre profil pour être plus facile à trouver."]],
  },
  sv: {
    weekly: [["Vad har du för planer denna vecka?", "Upptäck aktiviteter nära dig eller skapa en egen. Träffa andra resenärer på FallOnYou."], ["Res tillsammans", "Gå med i en aktivitet eller skapa en plan och bjud in andra resenärer."], ["Ny vecka, nya kontakter", "Upptäck middagar, sport och utflykter."], ["Träffa nya människor", "Skapa en plan eller gå med i en aktivitet på FallOnYou."]],
    noPhoto: [["Lägg till ett profilfoto", "Hjälp andra resenärer att känna igen dig. Lägg till ditt första foto."], ["Din profil är ofullständig", "Lägg till ett foto och presentera dig för andra resenärer."]],
    noEvent: [["Skapa en plan", "Ordna en middag, en utflykt eller en sportaktivitet."], ["Idéer för veckan", "Skapa en aktivitet och träffa andra resenärer på FallOnYou."]],
    incompleteProfile: [["Slutför din profil", "Lägg till foton och en kort presentation."], ["Din profil är nästan klar", "Lägg till ett foto och en kort presentation."], ["Presentera dig", "En komplett profil hjälper andra resenärer att lära känna dig."], ["Träffa andra resenärer", "Slutför profilen så att andra lättare kan hitta dig."]],
  },
};
export function scheduledNotice(kind: ScheduledKind, index: number, language: unknown): Notice & { url: string } {
  const options = scheduled[communicationLocale(language)][kind];
  const [title, body] = options[Math.abs(index) % options.length];
  return { title, body, url: kind === "noPhoto" || kind === "incompleteProfile" ? "/profile" : "/" };
}
export function eventReminderNotice(title: string, city: string, time: string, language: unknown): Notice {
  const locale = communicationLocale(language);
  const heading = { en: "Tomorrow", es: "Mañana", fr: "Demain", sv: "Imorgon" }[locale];
  const reminder = { en: "Remember your activity.", es: "Recuerda tu actividad.", fr: "Pensez à votre activité.", sv: "Kom ihåg din aktivitet." }[locale];
  return { title: `${heading}: ${title}`, body: `${city} · ${time} — ${reminder}` };
}

function text(locale: CommunicationLocale, values: [string, string, string, string]) {
  return values[["en", "es", "fr", "sv"].indexOf(locale)];
}

export function localizedReward(label: string, locale: CommunicationLocale): string {
  const labels: Record<string, [string, string, string, string]> = {
    "+10 likes/semana": ["+10 likes/week", "+10 likes/semana", "+10 likes/semaine", "+10 gillningar/vecka"],
    "1 semana Premium": ["1 week of Premium", "1 semana Premium", "1 semaine Premium", "1 vecka Premium"],
    "1 mes Premium": ["1 month of Premium", "1 mes Premium", "1 mois Premium", "1 månad Premium"],
    "3 meses Premium": ["3 months of Premium", "3 meses Premium", "3 mois Premium", "3 månader Premium"],
    "Embajador Oficial": ["Official ambassador", "Embajador oficial", "Ambassadeur officiel", "Officiell ambassadör"],
  };
  return labels[label] ? text(locale, labels[label]) : label;
}

// Match only system-authored legacy templates. Never translate an arbitrary
// body: chat previews, event titles, names and administrator-written text stay intact.
export function localizeAutomaticNotice<T extends Notice>(payload: T, language: unknown): T {
  const locale = communicationLocale(language);
  const title = payload.title, body = payload.body;
  let next: Notice | undefined;
  let match: RegExpMatchArray | null;
  const choose = (values: [string, string, string, string]) => text(locale, values);
  if ((match = title.match(/^✈️ Nuevo viajero en (.+)$/u))) {
    const name = body.match(/^(.+) acaba de llegar(?:\. ¡Abre FallonYou para conocerle!| a tu ciudad\. ¡Conéctate con él!)$/u)?.[1];
    if (name) next = { title: choose([`New traveler in ${match[1]}`, `Nuevo viajero en ${match[1]}`, `Nouveau voyageur à ${match[1]}`, `Ny resenär i ${match[1]}`]), body: choose([`${name} has just arrived. Open FallOnYou to connect.`, `${name} acaba de llegar. Abre FallOnYou para conectar.`, `${name} vient d'arriver. Ouvrez FallOnYou pour faire connaissance.`, `${name} har just anlänt. Öppna FallOnYou för att träffas.`]) };
  } else if (title.endsWith(" ✉️") && body === "📸 Te envió una foto") {
    next = { title, body: choose(["Sent you a photo", "Te envió una foto", "Vous a envoyé une photo", "Skickade ett foto till dig"]) };
  } else if (title === "New Match! ✈️" && (match = body.match(/^You and (.+) are a match! Start chatting now\.$/u))) {
    const name = match[1];
    next = { title: choose(["New connection", "Nueva conexión", "Nouvelle connexion", "Ny kontakt"]), body: choose([`You and ${name} are connected. Start chatting.`, `Tú y ${name} estáis conectados. Ya podéis conversar.`, `Vous et ${name} êtes connectés. Discutez ensemble.`, `Du och ${name} är anslutna. Börja chatta.`]) };
  } else if (title === "Super Like! ⭐" && (match = body.match(/^(.+) sent you a super like!$/u))) {
    next = { title: "Super Like", body: choose([`${match[1]} sent you a super like.`, `${match[1]} te envió un super like.`, `${match[1]} vous a envoyé un super like.`, `${match[1]} skickade en supergillning.`]) };
  } else if ((match = title.match(/^.+ Nueva actividad en (.+)$/u))) {
    const parts = body.match(/^(.+) creó "(.+)" — ¡únete!$/u);
    if (parts) next = { title: choose([`New activity in ${match[1]}`, `Nueva actividad en ${match[1]}`, `Nouvelle activité à ${match[1]}`, `Ny aktivitet i ${match[1]}`]), body: choose([`${parts[1]} created "${parts[2]}". Join in.`, `${parts[1]} creó "${parts[2]}". Únete.`, `${parts[1]} a créé "${parts[2]}". Participez.`, `${parts[1]} skapade "${parts[2]}". Gå med.`]) };
  } else if ((match = title.match(/^🎉 Nuevo participante en "(.+)"$/u))) {
    const name = body.match(/^(.+) se ha apuntado a tu actividad\.$/u)?.[1];
    if (name) next = { title: choose([`New participant in "${match[1]}"`, `Nuevo participante en "${match[1]}"`, `Nouveau participant à "${match[1]}"`, `Ny deltagare i "${match[1]}"`]), body: choose([`${name} joined your activity.`, `${name} se apuntó a tu actividad.`, `${name} a rejoint votre activité.`, `${name} gick med i din aktivitet.`]) };
  } else if ((match = title.match(/^💬 Nuevo comentario en "(.+)"$/u))) {
    next = { title: choose([`New comment on "${match[1]}"`, `Nuevo comentario en "${match[1]}"`, `Nouveau commentaire sur "${match[1]}"`, `Ny kommentar på "${match[1]}"`]), body };
  } else if (title === "👀 Alguien vio tu perfil" && ["Una persona ha visitado tu perfil hoy. ¡Abre FallonYou para verlo!", "Una persona ha visitado tu perfil hoy. ¡Toca para ver quién fue!"].includes(body)) {
    next = { title: choose(["Someone viewed your profile", "Alguien vio tu perfil", "Quelqu'un a consulté votre profil", "Någon tittade på din profil"]), body: choose(["Someone visited your profile today. Open FallOnYou for details.", "Alguien visitó tu perfil hoy. Abre FallOnYou para ver los detalles.", "Quelqu'un a consulté votre profil aujourd'hui. Ouvrez FallOnYou pour les détails.", "Någon besökte din profil idag. Öppna FallOnYou för detaljer."]) };
  } else if ((match = title.match(/^🤝 (.+) quiere ayudarte$/u))) {
    const city = body.match(/^Ha respondido a tu petición(?: de ayuda)? en (.+)$/u)?.[1];
    if (city) next = { title: choose([`${match[1]} wants to help`, `${match[1]} quiere ayudarte`, `${match[1]} souhaite vous aider`, `${match[1]} vill hjälpa dig`]), body: choose([`Responded to your help request in ${city}.`, `Respondió a tu petición de ayuda en ${city}.`, `A répondu à votre demande d'aide à ${city}.`, `Svarade på din hjälpförfrågan i ${city}.`]) };
  } else if ((match = title.match(/^🤝 (.+) puede ayudarte$/u))) {
    const amount = body.match(/^Se ha ofrecido a ayudarte a cambio de un mínimo de (.+)€ 💶$/u)?.[1];
    const free = body === "Se ha ofrecido a ayudarte sin pedir nada a cambio ❤️";
    if (free || amount) next = { title: choose([`${match[1]} offered to help`, `${match[1]} se ofreció a ayudarte`, `${match[1]} a proposé son aide`, `${match[1]} erbjöd hjälp`]), body: free ? choose(["Offered help without asking for payment.", "Ofreció ayuda sin pedir nada a cambio.", "A proposé son aide sans demander de paiement.", "Erbjöd hjälp utan att be om betalning."]) : choose([`Offered help for a minimum of €${amount}.`, `Ofreció ayuda por un mínimo de ${amount}€.`, `A proposé son aide pour un minimum de ${amount} €.`, `Erbjöd hjälp för minst ${amount} €.`]) };
  } else if (title === "🎉 ¡Nuevo invitado en FallonYou!" && (match = body.match(/^(.+) se ha unido usando tu código\. Llevas (\d+) invitado(?:s)?(.*)$/u))) {
    const reward = match[3].match(/^ — ¡(.+) desbloqueado! 🏆$/u)?.[1];
    const rewardText = reward ? localizedReward(reward, locale) : "";
    next = { title: choose(["A new traveler joined through your invitation", "Un nuevo viajero se unió con tu invitación", "Un nouveau voyageur a rejoint grâce à votre invitation", "En ny resenär gick med via din inbjudan"]), body: choose([`${match[1]} joined using your code. Invited travelers: ${match[2]}.`, `${match[1]} se unió con tu código. Viajeros invitados: ${match[2]}.`, `${match[1]} a rejoint avec votre code. Voyageurs invités : ${match[2]}.`, `${match[1]} gick med via din kod. Inbjudna resenärer: ${match[2]}.`]) + (rewardText ? ` ${rewardText}` : "") };
  } else if (title === "¡Solicitud de embajador enviada!" && body === "Revisaremos tu solicitud y te contactaremos pronto.") {
    next = { title: choose(["Ambassador application received", "Solicitud de embajador recibida", "Candidature d'ambassadeur reçue", "Ambassadörsansökan mottagen"]), body: choose(["We will review your application and contact you.", "Revisaremos tu solicitud y te contactaremos.", "Nous examinerons votre candidature et vous contacterons.", "Vi granskar din ansökan och kontaktar dig."]) };
  } else {
    const milestones: Record<string, string> = {
      "⭐ ¡1 semana Premium desbloqueada!": "1 semana Premium",
      "👑 ¡1 mes Premium desbloqueado!": "1 mes Premium",
      "🏆 ¡3 meses Premium desbloqueados!": "3 meses Premium",
      "🌟 ¡Embajador Oficial FallonYou!": "Embajador Oficial",
    };
    if (milestones[title]) next = { title: localizedReward(milestones[title], locale), body: choose(["Reward unlocked. See your ambassador dashboard for details.", "Recompensa desbloqueada. Consulta tu panel de embajador para ver los detalles.", "Récompense débloquée. Consultez votre espace ambassadeur.", "Belöning upplåst. Se din ambassadörssida för detaljer."]) };
  }
  return next ? { ...payload, ...next } : payload;
}
