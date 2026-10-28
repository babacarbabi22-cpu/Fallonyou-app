import type { Language } from "@/lib/i18n";

export type LanguageCategoryId =
  | "greetings"
  | "airport"
  | "restaurant"
  | "transport"
  | "hotel"
  | "emergency"
  | "social";

export type ProfileHelpCategoryId =
  | "idiomas"
  | "alojamiento"
  | "guia_local"
  | "trabajo"
  | "estudios"
  | "tecnologia"
  | "restaurantes"
  | "integracion"
  | "donaciones"
  | "transporte"
  | "salud"
  | "finanzas";

export type ProfileBadgeId =
  | "explorador"
  | "organizador"
  | "social"
  | "favorito"
  | "racha7"
  | "racha30"
  | "viajero"
  | "veterano"
  | "premium"
  | "embajador";

type LevelCopy = {
  title: string;
  description: string;
  lessons: Record<string, string>;
};

export const languagePageCopy: Record<Language, {
  categories: Record<LanguageCategoryId, string>;
  levels: Record<"a1" | "a2" | "b1" | "b2plus" | "c1" | "c2", LevelCopy>;
  lessonProgress: (done: number, total: number) => string;
  goToLevel: (level: string) => string;
  saveProgressError: { title: string; description: string };
  preferencesSaved: { title: string; description: string };
  courseLoading: string;
  courseLoadError: string;
  courseUnavailable: string;
  courseRetry: string;
  courseContentUnavailable: string;
}> = {
  es: {
    categories: {
      greetings: "Saludos", airport: "Aeropuerto", restaurant: "Restaurante",
      transport: "Transporte", hotel: "Hotel", emergency: "Emergencias", social: "Conocer gente",
    },
    levels: {
      a1: { title: "Principiante", description: "Saludos, restaurante y socializar", lessons: { "a1-greetings": "Saludos básicos", "a1-restaurant": "Restaurante", "a1-social": "Conocer gente" } },
      a2: { title: "Básico", description: "Aeropuerto, transporte y hotel", lessons: { "a2-airport": "En el aeropuerto", "a2-transport": "Transporte", "a2-hotel": "Hotel" } },
      b1: { title: "Intermedio", description: "Emergencias, números y compras", lessons: { "b1-emergency": "Emergencias", "b1-numbers": "Números y precios", "b1-shopping": "Ir de compras" } },
      b2plus: { title: "Avanzado", description: "Salud, negocios y cultura local", lessons: { "b2-health": "Salud y farmacia", "b2-business": "Negocios", "b2-culture": "Cultura local" } },
      c1: { title: "Dominio avanzado", description: "Negociación, pensamiento crítico y resolución de conflictos", lessons: { "c1-negotiation": "Negociar con matices", "c1-opinions": "Opiniones y cultura", "c1-resolution": "Resolver desacuerdos" } },
      c2: { title: "Dominio experto", description: "Matices, debate y mediación en contextos complejos", lessons: { "c2-nuance": "Matices y registro", "c2-debate": "Debate con precisión", "c2-mediation": "Mediación y consenso" } },
    },
    lessonProgress: (done, total) => `${done}/${total} lecciones`,
    goToLevel: level => `Ir a ${level} →`,
    saveProgressError: { title: "Error", description: "No se pudo guardar el progreso." },
    preferencesSaved: { title: "¡Guardado!", description: "Tus idiomas han sido actualizados." },
    courseLoading: "Comprobando el acceso al curso…", courseLoadError: "No se pudo comprobar el acceso al curso.", courseUnavailable: "El estado del curso no está disponible. No se ha bloqueado tu acceso.", courseRetry: "Volver a comprobar", courseContentUnavailable: "El contenido de esta lección no está disponible en este idioma.",
  },
  en: {
    categories: {
      greetings: "Greetings", airport: "Airport", restaurant: "Restaurant",
      transport: "Transport", hotel: "Hotel", emergency: "Emergencies", social: "Meeting people",
    },
    levels: {
      a1: { title: "Beginner", description: "Greetings, restaurants and socialising", lessons: { "a1-greetings": "Basic greetings", "a1-restaurant": "At the restaurant", "a1-social": "Meeting people" } },
      a2: { title: "Elementary", description: "Airport, transport and hotel", lessons: { "a2-airport": "At the airport", "a2-transport": "Transport", "a2-hotel": "At the hotel" } },
      b1: { title: "Intermediate", description: "Emergencies, numbers and shopping", lessons: { "b1-emergency": "Emergencies", "b1-numbers": "Numbers and prices", "b1-shopping": "Shopping" } },
      b2plus: { title: "Advanced", description: "Health, business and local culture", lessons: { "b2-health": "Health and pharmacy", "b2-business": "Business", "b2-culture": "Local culture" } },
      c1: { title: "Advanced proficiency", description: "Negotiation, critical perspectives and conflict resolution", lessons: { "c1-negotiation": "Negotiating with nuance", "c1-opinions": "Opinions and culture", "c1-resolution": "Resolving disagreement" } },
      c2: { title: "Expert proficiency", description: "Nuance, debate and mediation in complex contexts", lessons: { "c2-nuance": "Nuance and register", "c2-debate": "Debating with precision", "c2-mediation": "Mediation and consensus" } },
    },
    lessonProgress: (done, total) => `${done}/${total} lessons`,
    goToLevel: level => `Go to level ${level} →`,
    saveProgressError: { title: "Error", description: "Could not save your progress." },
    preferencesSaved: { title: "Saved!", description: "Your languages have been updated." },
    courseLoading: "Checking course access…", courseLoadError: "Couldn't check course access.", courseUnavailable: "Course status is unavailable. Your access has not been locked.", courseRetry: "Check again", courseContentUnavailable: "This lesson's content is unavailable in this language.",
  },
  fr: {
    categories: {
      greetings: "Salutations", airport: "Aéroport", restaurant: "Restaurant",
      transport: "Transport", hotel: "Hôtel", emergency: "Urgences", social: "Faire connaissance",
    },
    levels: {
      a1: { title: "Débutant", description: "Salutations, restaurant et rencontres", lessons: { "a1-greetings": "Salutations de base", "a1-restaurant": "Au restaurant", "a1-social": "Faire connaissance" } },
      a2: { title: "Élémentaire", description: "Aéroport, transport et hôtel", lessons: { "a2-airport": "À l'aéroport", "a2-transport": "Transport", "a2-hotel": "À l'hôtel" } },
      b1: { title: "Intermédiaire", description: "Urgences, chiffres et achats", lessons: { "b1-emergency": "Urgences", "b1-numbers": "Nombres et prix", "b1-shopping": "Faire les magasins" } },
      b2plus: { title: "Avancé", description: "Santé, affaires et culture locale", lessons: { "b2-health": "Santé et pharmacie", "b2-business": "Affaires", "b2-culture": "Culture locale" } },
      c1: { title: "Maîtrise avancée", description: "Négociation, réflexion critique et résolution des conflits", lessons: { "c1-negotiation": "Négocier avec nuance", "c1-opinions": "Opinions et culture", "c1-resolution": "Résoudre les désaccords" } },
      c2: { title: "Maîtrise experte", description: "Nuance, débat et médiation en contexte complexe", lessons: { "c2-nuance": "Nuance et registre", "c2-debate": "Débattre avec précision", "c2-mediation": "Médiation et consensus" } },
    },
    lessonProgress: (done, total) => `${done}/${total} leçons`,
    goToLevel: level => `Passer au niveau ${level} →`,
    saveProgressError: { title: "Erreur", description: "Impossible d'enregistrer la progression." },
    preferencesSaved: { title: "Enregistré !", description: "Tes langues ont été mises à jour." },
    courseLoading: "Vérification de l'accès au cours…", courseLoadError: "Impossible de vérifier l'accès au cours.", courseUnavailable: "L'état du cours est indisponible. L'accès n'a pas été bloqué.", courseRetry: "Vérifier à nouveau", courseContentUnavailable: "Le contenu de cette leçon n'est pas disponible dans cette langue.",
  },
  sv: {
    categories: {
      greetings: "Hälsningar", airport: "Flygplats", restaurant: "Restaurang",
      transport: "Transport", hotel: "Hotell", emergency: "Nödsituationer", social: "Träffa människor",
    },
    levels: {
      a1: { title: "Nybörjare", description: "Hälsningar, restaurang och umgänge", lessons: { "a1-greetings": "Enkla hälsningar", "a1-restaurant": "På restaurangen", "a1-social": "Träffa människor" } },
      a2: { title: "Grundläggande", description: "Flygplats, transport och hotell", lessons: { "a2-airport": "På flygplatsen", "a2-transport": "Transport", "a2-hotel": "På hotellet" } },
      b1: { title: "Medel", description: "Nödsituationer, siffror och shopping", lessons: { "b1-emergency": "Nödsituationer", "b1-numbers": "Siffror och priser", "b1-shopping": "Shopping" } },
      b2plus: { title: "Avancerad", description: "Hälsa, affärer och lokal kultur", lessons: { "b2-health": "Hälsa och apotek", "b2-business": "Affärer", "b2-culture": "Lokal kultur" } },
      c1: { title: "Avancerad språkfärdighet", description: "Förhandling, kritiska perspektiv och konfliktlösning", lessons: { "c1-negotiation": "Förhandla med nyanser", "c1-opinions": "Åsikter och kultur", "c1-resolution": "Lösa meningsskiljaktigheter" } },
      c2: { title: "Fördjupad språkfärdighet", description: "Nyanser, debatt och medling i komplexa sammanhang", lessons: { "c2-nuance": "Nyans och stilnivå", "c2-debate": "Debattera precist", "c2-mediation": "Medling och samsyn" } },
    },
    lessonProgress: (done, total) => `${done}/${total} lektioner`,
    goToLevel: level => `Gå till nivå ${level} →`,
    saveProgressError: { title: "Fel", description: "Det gick inte att spara dina framsteg." },
    preferencesSaved: { title: "Sparat!", description: "Dina språk har uppdaterats." },
    courseLoading: "Kontrollerar kursåtkomst…", courseLoadError: "Det gick inte att kontrollera kursåtkomsten.", courseUnavailable: "Kursens status är inte tillgänglig. Åtkomsten har inte låsts.", courseRetry: "Kontrollera igen", courseContentUnavailable: "Lektionsinnehållet är inte tillgängligt på det här språket.",
  },
};

export const profilePageCopy: Record<Language, {
  loading: string;
  loadError: string;
  unavailable: string;
  retry: string;
  you: string;
  profilePhotoAlt: string;
  photoAlt: string;
  bioCompletion: string;
  showAge: string;
  showAgeDescription: string;
  saveError: string;
  photoError: string;
  requiredPhotoTitle: string;
  requiredPhotoDescription: string;
  viewProfile: string;
  bioPlaceholder: string;
  helpCategories: Record<ProfileHelpCategoryId, string>;
  notificationPreferences: string;
  notificationDescription: string;
  notifications: Record<"profileViews" | "newTravelers" | "matches" | "messages" | "events", { label: string; description: string }>;
  premiumOnly: string;
  upgrade: string;
  disable: string;
  enable: string;
  ambassadorTitle: string;
  ambassadorDescription: string;
  installTitle: string;
  installDescription: string;
  installTagline: string;
  installFree: string;
  iosHeading: string;
  iosSteps: string[];
  iosNote: string;
  androidHeading: string;
  androidSteps: string[];
  androidNote: string;
  premiumManage: string;
  premiumJoin: string;
  premiumManageDescription: string;
  premiumBenefits: string;
  adminTitle: string;
  adminUsers: string;
  deleteAccount: string;
  badgesLoading: string;
  badgesEmpty: string;
  badgesError: string;
  badgeUnknown: { label: string; description: string };
  badges: Record<ProfileBadgeId, { label: string; description: string }>;
}> = {
  es: {
    loading: "Cargando perfil…", loadError: "No se pudo cargar el perfil.", unavailable: "El perfil no está disponible.", retry: "Reintentar",
    you: "Tú", profilePhotoAlt: "Perfil", photoAlt: "Foto", bioCompletion: "Biografía",
    showAge: "Mostrar mi edad", showAgeDescription: "Tu edad seguirá siendo privada salvo que actives esta opción. Debes confirmar que eres mayor de edad.",
    saveError: "No se pudo guardar el perfil. Inténtalo de nuevo.", photoError: "No se pudo establecer la foto.",
    requiredPhotoTitle: "Foto obligatoria", requiredPhotoDescription: "Debes tener al menos una foto en tu perfil.",
    viewProfile: "Ver mi perfil", bioPlaceholder: "Cuéntanos algo sobre ti...",
    helpCategories: { idiomas: "🌍 Idiomas", alojamiento: "🏠 Alojamiento", guia_local: "🗺️ Guía local", trabajo: "💼 Trabajo/CV", estudios: "📚 Estudios", tecnologia: "🧑‍💻 Tecnología", restaurantes: "🍽️ Restaurantes", integracion: "🤝 Integración", donaciones: "🎁 Donaciones", transporte: "🚗 Transporte", salud: "🏥 Salud", finanzas: "💰 Finanzas" },
    notificationPreferences: "Preferencias de notificación", notificationDescription: "Elige qué alertas quieres recibir",
    notifications: {
      profileViews: { label: "Alguien ve mi perfil", description: "Aviso cuando visitan tu perfil" },
      newTravelers: { label: "Nuevo viajero en mi ciudad", description: "Alerta cuando alguien llega a tu ciudad" },
      matches: { label: "Nuevas conexiones", description: "Cuando alguien conecta contigo" },
      messages: { label: "Mensajes", description: "Nuevos mensajes de tus conexiones" },
      events: { label: "Actividades", description: "Nuevas actividades o recordatorios" },
    },
    premiumOnly: "Solo disponible en Premium", upgrade: "Mejorar", disable: "Desactivar", enable: "Activar",
    ambassadorTitle: "Programa de Embajadores", ambassadorDescription: "Invita amigos y gana recompensas Premium",
    installTitle: "Descarga la app", installDescription: "Tenla siempre a mano en tu móvil", installTagline: "Actividades · Viajes · Conexiones", installFree: "Gratis · Sin tienda de apps",
    iosHeading: "Cómo instalar en iPhone", iosSteps: ["Pulsa Compartir en la barra inferior de Safari", "Desliza y toca «Añadir a pantalla de inicio»", "Pulsa «Añadir»; el icono aparecerá en tu pantalla de inicio"], iosNote: "Solo funciona desde Safari en iPhone o iPad",
    androidHeading: "Cómo instalar en Android", androidSteps: ["Abre el menú ⋮ en la esquina superior de Chrome", "Selecciona «Añadir a pantalla de inicio» o «Instalar app»", "Pulsa «Instalar»; el icono aparecerá en tu móvil"], androidNote: "Funciona en Chrome, Edge y la mayoría de navegadores Android",
    premiumManage: "Gestionar Premium", premiumJoin: "Hazte Premium", premiumManageDescription: "Gestiona tu suscripción y beneficios", premiumBenefits: "Me gusta ilimitados · Descubre quién te visita · Sin límites",
    adminTitle: "Panel de administración", adminUsers: "Gestionar usuarios", deleteAccount: "Eliminar mi cuenta",
    badgesLoading: "Cargando logros…", badgesEmpty: "Aún no has conseguido insignias. Sigue participando para desbloquearlas.", badgesError: "No se pudieron cargar tus logros.",
    badgeUnknown: { label: "Logro", description: "Insignia de logro" },
    badges: {
      explorador: { label: "Explorador", description: "Únete a tu primer plan" }, organizador: { label: "Organizador", description: "Crea tu primer plan" },
      social: { label: "Conectado", description: "Consigue 3 conexiones" }, favorito: { label: "Favorito", description: "Que 10 personas vean tu perfil" },
      racha7: { label: "En racha", description: "7 días seguidos activo" }, racha30: { label: "Constante", description: "30 días seguidos activo" },
      viajero: { label: "Viajero", description: "Activa el modo viajero" }, veterano: { label: "Veterano", description: "Lleva 30 días en FallonYou" },
      premium: { label: "Premium", description: "Miembro Premium" }, embajador: { label: "Embajador", description: "Embajador oficial" },
    },
  },
  en: {
    loading: "Loading profile…", loadError: "Couldn't load your profile.", unavailable: "This profile is unavailable.", retry: "Try again",
    you: "You", profilePhotoAlt: "Profile", photoAlt: "Photo", bioCompletion: "Bio",
    showAge: "Show my age", showAgeDescription: "Your age stays private unless you turn this on. You must still confirm that you are an adult.",
    saveError: "Couldn't save your profile. Please try again.", photoError: "Couldn't set the profile photo.",
    requiredPhotoTitle: "Photo required", requiredPhotoDescription: "Your profile must have at least one photo.",
    viewProfile: "View my profile", bioPlaceholder: "Tell us a little about yourself...",
    helpCategories: { idiomas: "🌍 Languages", alojamiento: "🏠 Accommodation", guia_local: "🗺️ Local guide", trabajo: "💼 Work/CV", estudios: "📚 Education", tecnologia: "🧑‍💻 Technology", restaurantes: "🍽️ Restaurants", integracion: "🤝 Integration", donaciones: "🎁 Donations", transporte: "🚗 Transport", salud: "🏥 Health", finanzas: "💰 Finance" },
    notificationPreferences: "Notification preferences", notificationDescription: "Choose which alerts you'd like to receive",
    notifications: {
      profileViews: { label: "Someone views my profile", description: "Alert when someone visits your profile" },
      newTravelers: { label: "A new traveler in my city", description: "Alert when someone arrives in your city" },
      matches: { label: "New connections", description: "When someone connects with you" },
      messages: { label: "Messages", description: "New messages from your connections" },
      events: { label: "Activities", description: "New activities or reminders" },
    },
    premiumOnly: "Available with Premium only", upgrade: "Upgrade", disable: "Disable", enable: "Enable",
    ambassadorTitle: "Ambassador programme", ambassadorDescription: "Invite friends and earn Premium rewards",
    installTitle: "Install the app", installDescription: "Keep it close at hand on your phone", installTagline: "Activities · Travel · Connections", installFree: "Free · No app store needed",
    iosHeading: "Install on iPhone", iosSteps: ["Tap Share in Safari's bottom toolbar", "Scroll and tap “Add to Home Screen”", "Tap “Add”; the icon will appear on your home screen"], iosNote: "Only works in Safari on iPhone or iPad",
    androidHeading: "Install on Android", androidSteps: ["Open the ⋮ menu in the top corner of Chrome", "Choose “Add to Home screen” or “Install app”", "Tap “Install”; the icon will appear on your phone"], androidNote: "Works in Chrome, Edge and most Android browsers",
    premiumManage: "Manage Premium", premiumJoin: "Get Premium", premiumManageDescription: "Manage your subscription and benefits", premiumBenefits: "Unlimited likes · See who visits you · No limits",
    adminTitle: "Admin panel", adminUsers: "Manage users", deleteAccount: "Delete my account",
    badgesLoading: "Loading achievements…", badgesEmpty: "No badges yet. Keep taking part to unlock achievements.", badgesError: "Couldn't load your achievements.",
    badgeUnknown: { label: "Achievement", description: "Achievement badge" },
    badges: {
      explorador: { label: "Explorer", description: "Join your first plan" }, organizador: { label: "Organizer", description: "Create your first plan" },
      social: { label: "Connected", description: "Get 3 connections" }, favorito: { label: "Popular", description: "Have 10 people view your profile" },
      racha7: { label: "On a streak", description: "Be active 7 days in a row" }, racha30: { label: "Consistent", description: "Be active 30 days in a row" },
      viajero: { label: "Traveler", description: "Turn on traveler mode" }, veterano: { label: "Veteran", description: "Spend 30 days on FallonYou" },
      premium: { label: "Premium", description: "Premium member" }, embajador: { label: "Ambassador", description: "Official ambassador" },
    },
  },
  fr: {
    loading: "Chargement du profil…", loadError: "Impossible de charger ton profil.", unavailable: "Ce profil n'est pas disponible.", retry: "Réessayer",
    you: "Toi", profilePhotoAlt: "Profil", photoAlt: "Photo", bioCompletion: "Bio",
    showAge: "Afficher mon âge", showAgeDescription: "Ton âge reste privé sauf si tu actives cette option. Tu dois toujours confirmer que tu es majeur·e.",
    saveError: "Impossible d'enregistrer ton profil. Réessaie.", photoError: "Impossible de définir la photo de profil.",
    requiredPhotoTitle: "Photo obligatoire", requiredPhotoDescription: "Ton profil doit contenir au moins une photo.",
    viewProfile: "Voir mon profil", bioPlaceholder: "Parle-nous un peu de toi...",
    helpCategories: { idiomas: "🌍 Langues", alojamiento: "🏠 Hébergement", guia_local: "🗺️ Guide local", trabajo: "💼 Travail/CV", estudios: "📚 Études", tecnologia: "🧑‍💻 Technologie", restaurantes: "🍽️ Restaurants", integracion: "🤝 Intégration", donaciones: "🎁 Dons", transporte: "🚗 Transport", salud: "🏥 Santé", finanzas: "💰 Finances" },
    notificationPreferences: "Préférences de notification", notificationDescription: "Choisis les alertes que tu souhaites recevoir",
    notifications: {
      profileViews: { label: "Quelqu'un consulte mon profil", description: "Alerte lors d'une visite de ton profil" },
      newTravelers: { label: "Nouveau voyageur dans ma ville", description: "Alerte quand quelqu'un arrive dans ta ville" },
      matches: { label: "Nouvelles connexions", description: "Quand quelqu'un entre en contact avec toi" },
      messages: { label: "Messages", description: "Nouveaux messages de tes contacts" },
      events: { label: "Activités", description: "Nouvelles activités ou rappels" },
    },
    premiumOnly: "Disponible uniquement avec Premium", upgrade: "Passer à Premium", disable: "Désactiver", enable: "Activer",
    ambassadorTitle: "Programme ambassadeur", ambassadorDescription: "Invite tes amis et gagne des avantages Premium",
    installTitle: "Installer l'application", installDescription: "Garde-la toujours à portée de main", installTagline: "Activités · Voyages · Rencontres", installFree: "Gratuit · Sans boutique d'applications",
    iosHeading: "Installer sur iPhone", iosSteps: ["Appuie sur Partager dans la barre inférieure de Safari", "Fais défiler puis appuie sur « Sur l’écran d’accueil »", "Appuie sur « Ajouter » ; l’icône apparaîtra sur l’écran d’accueil"], iosNote: "Fonctionne uniquement dans Safari sur iPhone ou iPad",
    androidHeading: "Installer sur Android", androidSteps: ["Ouvre le menu ⋮ dans le coin supérieur de Chrome", "Choisis « Ajouter à l’écran d’accueil » ou « Installer l’application »", "Appuie sur « Installer » ; l’icône apparaîtra sur ton téléphone"], androidNote: "Fonctionne avec Chrome, Edge et la plupart des navigateurs Android",
    premiumManage: "Gérer Premium", premiumJoin: "Passer à Premium", premiumManageDescription: "Gère ton abonnement et tes avantages", premiumBenefits: "Likes illimités · Découvre qui visite ton profil · Sans limites",
    adminTitle: "Panneau d'administration", adminUsers: "Gérer les utilisateurs", deleteAccount: "Supprimer mon compte",
    badgesLoading: "Chargement des réussites…", badgesEmpty: "Tu n'as pas encore de badge. Participe pour en débloquer.", badgesError: "Impossible de charger tes réussites.",
    badgeUnknown: { label: "Réussite", description: "Badge de réussite" },
    badges: {
      explorador: { label: "Explorateur", description: "Rejoins ton premier plan" }, organizador: { label: "Organisateur", description: "Crée ton premier plan" },
      social: { label: "Connecté", description: "Obtiens 3 connexions" }, favorito: { label: "Populaire", description: "10 personnes consultent ton profil" },
      racha7: { label: "En série", description: "Sois actif 7 jours de suite" }, racha30: { label: "Régulier", description: "Sois actif 30 jours de suite" },
      viajero: { label: "Voyageur", description: "Active le mode voyageur" }, veterano: { label: "Vétéran", description: "Passe 30 jours sur FallonYou" },
      premium: { label: "Premium", description: "Membre Premium" }, embajador: { label: "Ambassadeur", description: "Ambassadeur officiel" },
    },
  },
  sv: {
    loading: "Läser in profilen…", loadError: "Det gick inte att läsa in din profil.", unavailable: "Profilen är inte tillgänglig.", retry: "Försök igen",
    you: "Du", profilePhotoAlt: "Profil", photoAlt: "Foto", bioCompletion: "Biografi",
    showAge: "Visa min ålder", showAgeDescription: "Din ålder är privat om du inte aktiverar det här. Du måste fortfarande bekräfta att du är myndig.",
    saveError: "Det gick inte att spara profilen. Försök igen.", photoError: "Det gick inte att välja profilbilden.",
    requiredPhotoTitle: "Foto krävs", requiredPhotoDescription: "Din profil måste ha minst ett foto.",
    viewProfile: "Visa min profil", bioPlaceholder: "Berätta lite om dig själv...",
    helpCategories: { idiomas: "🌍 Språk", alojamiento: "🏠 Boende", guia_local: "🗺️ Lokal guide", trabajo: "💼 Jobb/CV", estudios: "📚 Studier", tecnologia: "🧑‍💻 Teknik", restaurantes: "🍽️ Restauranger", integracion: "🤝 Integration", donaciones: "🎁 Donationer", transporte: "🚗 Transport", salud: "🏥 Hälsa", finanzas: "💰 Ekonomi" },
    notificationPreferences: "Aviseringsinställningar", notificationDescription: "Välj vilka aviseringar du vill få",
    notifications: {
      profileViews: { label: "Någon tittar på min profil", description: "Avisering när någon besöker din profil" },
      newTravelers: { label: "En ny resenär i min stad", description: "Avisering när någon kommer till din stad" },
      matches: { label: "Nya kontakter", description: "När någon får kontakt med dig" },
      messages: { label: "Meddelanden", description: "Nya meddelanden från dina kontakter" },
      events: { label: "Aktiviteter", description: "Nya aktiviteter eller påminnelser" },
    },
    premiumOnly: "Endast tillgängligt med Premium", upgrade: "Uppgradera", disable: "Inaktivera", enable: "Aktivera",
    ambassadorTitle: "Ambassadörsprogram", ambassadorDescription: "Bjud in vänner och få Premium-belöningar",
    installTitle: "Installera appen", installDescription: "Ha den nära till hands i mobilen", installTagline: "Aktiviteter · Resor · Kontakter", installFree: "Gratis · Ingen appbutik behövs",
    iosHeading: "Installera på iPhone", iosSteps: ["Tryck på Dela i Safaris nedre verktygsfält", "Rulla ned och tryck på ”Lägg till på hemskärmen”", "Tryck på ”Lägg till”; ikonen visas på hemskärmen"], iosNote: "Fungerar endast i Safari på iPhone eller iPad",
    androidHeading: "Installera på Android", androidSteps: ["Öppna menyn ⋮ i Chromes övre hörn", "Välj ”Lägg till på startskärmen” eller ”Installera appen”", "Tryck på ”Installera”; ikonen visas i mobilen"], androidNote: "Fungerar i Chrome, Edge och de flesta Android-webbläsare",
    premiumManage: "Hantera Premium", premiumJoin: "Skaffa Premium", premiumManageDescription: "Hantera din prenumeration och dina förmåner", premiumBenefits: "Obegränsade gillningar · Se profilbesökare · Inga gränser",
    adminTitle: "Administratörspanel", adminUsers: "Hantera användare", deleteAccount: "Ta bort mitt konto",
    badgesLoading: "Läser in prestationer…", badgesEmpty: "Du har inga märken ännu. Delta i aktiviteter för att låsa upp dem.", badgesError: "Det gick inte att läsa in dina prestationer.",
    badgeUnknown: { label: "Prestation", description: "Prestationsemblem" },
    badges: {
      explorador: { label: "Utforskare", description: "Gå med i din första plan" }, organizador: { label: "Arrangör", description: "Skapa din första plan" },
      social: { label: "Ansluten", description: "Få 3 kontakter" }, favorito: { label: "Populär", description: "Låt 10 personer besöka din profil" },
      racha7: { label: "Svits", description: "Var aktiv 7 dagar i rad" }, racha30: { label: "Uthållig", description: "Var aktiv 30 dagar i rad" },
      viajero: { label: "Resenär", description: "Aktivera resenärsläget" }, veterano: { label: "Veteran", description: "Var på FallonYou i 30 dagar" },
      premium: { label: "Premium", description: "Premium-medlem" }, embajador: { label: "Ambassadör", description: "Officiell ambassadör" },
    },
  },
};