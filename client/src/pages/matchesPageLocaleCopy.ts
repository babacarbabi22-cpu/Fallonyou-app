import type { Language } from "@/lib/i18n";

interface RecommendationCopy {
  badge: string;
  title: string;
  description: string;
  cta: string;
  mailSubject?: string;
}

interface MatchesPageLocaleCopy {
  recommendations: {
    local: RecommendationCopy;
    plan: RecommendationCopy;
    partner: RecommendationCopy;
  };
  engagement: {
    createPlanWithConnections: string;
    createPlanFirst: string;
    planDescriptionWithConnections: string;
    planDescriptionFirst: string;
  };
  matchFallbacks: {
    travelerAlt: string;
    verifiedPhotoLabel: string;
    someone: string;
    icebreaker: string;
    helpButtonTitle: string;
    thisPerson: string;
  };
}

export const MATCHES_PAGE_LOCALE_COPY: Record<Language, MatchesPageLocaleCopy> = {
  es: {
    recommendations: {
      local: {
        badge: "✨ Premium",
        title: "Descubre las funciones Premium",
        description: "Consulta qué herramientas adicionales incluye Premium antes de elegir un plan.",
        cta: "Ver Premium",
      },
      plan: {
        badge: "💡 Sugerencia",
        title: "¿Quedáis en persona?",
        description: "Propón un plan a las personas que has conocido — cenar, tomar algo, hacer deporte... Aquí somos una comunidad.",
        cta: "Crear un plan",
      },
      partner: {
        badge: "🤝 ¿Tienes un negocio?",
        title: "Explora una colaboración con FallonYou",
        description: "Escríbenos para hablar de una posible colaboración. Cualquier acuerdo tendría que acordarse directamente.",
        cta: "fallonyouapp@hotmail.com",
        mailSubject: "Posible colaboración local con FallonYou",
      },
    },
    engagement: {
      createPlanWithConnections: "¿Quedáis en persona?",
      createPlanFirst: "Crea el primer plan",
      planDescriptionWithConnections: "Propón una actividad a tus conexiones de viaje y compartid un plan en persona.",
      planDescriptionFirst: "Organiza algo e invita a otras personas a apuntarse. ¡Somos todos amigos aquí!",
    },
    matchFallbacks: {
      travelerAlt: "Viajero",
      verifiedPhotoLabel: "Foto disponible solo para perfiles verificados",
      someone: "Alguien",
      icebreaker: "¡Di hola y rompe el hielo!",
      helpButtonTitle: "También puedo ayudarte",
      thisPerson: "esta persona",
    },
  },
  en: {
    recommendations: {
      local: {
        badge: "✨ Premium",
        title: "Explore Premium features",
        description: "See which additional tools are included with Premium before choosing a plan.",
        cta: "View Premium",
      },
      plan: {
        badge: "💡 Suggestion",
        title: "Meeting in person?",
        description: "Suggest a plan to people you have met — dinner, a drink, a sport... We're a community.",
        cta: "Create a plan",
      },
      partner: {
        badge: "🤝 Have a local business?",
        title: "Explore a partnership with FallonYou",
        description: "Email us to discuss a possible partnership. Any arrangement would need to be agreed directly.",
        cta: "fallonyouapp@hotmail.com",
        mailSubject: "Possible local partnership with FallonYou",
      },
    },
    engagement: {
      createPlanWithConnections: "Meeting in person?",
      createPlanFirst: "Create the first plan",
      planDescriptionWithConnections: "Suggest an activity to your travel connections and make a plan to meet in person.",
      planDescriptionFirst: "Organize something and invite others to join. We're all friends here!",
    },
    matchFallbacks: {
      travelerAlt: "Traveler",
      verifiedPhotoLabel: "Photo available only for verified profiles",
      someone: "Someone",
      icebreaker: "Say hello and break the ice!",
      helpButtonTitle: "I can help too",
      thisPerson: "this person",
    },
  },
  fr: {
    recommendations: {
      local: {
        badge: "✨ Premium",
        title: "Découvre les fonctions Premium",
        description: "Consulte les outils supplémentaires inclus dans Premium avant de choisir une formule.",
        cta: "Voir Premium",
      },
      plan: {
        badge: "💡 Suggestion",
        title: "Vous vous retrouvez en personne ?",
        description: "Propose un plan aux personnes rencontrées — dîner, verre, sport... Ici, on forme une communauté.",
        cta: "Créer un plan",
      },
      partner: {
        badge: "🤝 Tu as un commerce local ?",
        title: "Envisage un partenariat avec FallonYou",
        description: "Écris-nous pour discuter d'un éventuel partenariat. Tout accord devra être défini directement.",
        cta: "fallonyouapp@hotmail.com",
        mailSubject: "Éventuel partenariat local avec FallonYou",
      },
    },
    engagement: {
      createPlanWithConnections: "Vous vous retrouvez en personne ?",
      createPlanFirst: "Crée ton premier plan",
      planDescriptionWithConnections: "Propose une activité à tes contacts de voyage pour vous retrouver en personne.",
      planDescriptionFirst: "Organise quelque chose et invite d'autres personnes à participer. Ici, on est tous amis !",
    },
    matchFallbacks: {
      travelerAlt: "Voyageur",
      verifiedPhotoLabel: "Photo visible uniquement pour les profils vérifiés",
      someone: "Quelqu'un",
      icebreaker: "Dis bonjour pour briser la glace !",
      helpButtonTitle: "Je peux aussi aider",
      thisPerson: "cette personne",
    },
  },
  sv: {
    recommendations: {
      local: {
        badge: "✨ Premium",
        title: "Utforska Premium-funktioner",
        description: "Se vilka extra verktyg som ingår i Premium innan du väljer en plan.",
        cta: "Visa Premium",
      },
      plan: {
        badge: "💡 Förslag",
        title: "Ska ni träffas?",
        description: "Föreslå en plan för personer du har träffat — middag, en fika eller sport. Vi är en gemenskap.",
        cta: "Skapa en plan",
      },
      partner: {
        badge: "🤝 Har du ett lokalt företag?",
        title: "Utforska ett samarbete med FallonYou",
        description: "Mejla oss för att diskutera ett möjligt samarbete. Eventuella villkor behöver avtalas direkt.",
        cta: "fallonyouapp@hotmail.com",
        mailSubject: "Möjligt lokalt samarbete med FallonYou",
      },
    },
    engagement: {
      createPlanWithConnections: "Ska ni träffas?",
      createPlanFirst: "Skapa den första planen",
      planDescriptionWithConnections: "Föreslå en aktivitet för dina resekontakter och planera en träff.",
      planDescriptionFirst: "Ordna något och bjud in andra att delta. Vi är alla vänner här!",
    },
    matchFallbacks: {
      travelerAlt: "Resenär",
      verifiedPhotoLabel: "Foto visas endast för verifierade profiler",
      someone: "Någon",
      icebreaker: "Säg hej och bryt isen!",
      helpButtonTitle: "Jag kan också hjälpa till",
      thisPerson: "den här personen",
    },
  },
};