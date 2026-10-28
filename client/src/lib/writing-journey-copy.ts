import type { Language } from "@/lib/i18n";

export type WritingJourneyCopy = {
  title: string;
  intro: string;
  guideNote: string;
  levels: Record<"starter" | "builder" | "challenge", string>;
  levelDescriptions: Record<"starter" | "builder" | "challenge", string>;
  completed: string;
  inProgress: string;
  locked: string;
  premium: string;
  premiumDescription: string;
  openLevel: string;
  loading: string;
  loadError: string;
  retry: string;
  empty: string;
  continue: string;
  refresh: string;
  saving: string;
  saveError: string;
  savedDescription: string;
  wordInstructions: string;
  wordsInstructions: string;
  memoryInstructions: string;
  studyTitle: string;
  startMemory: string;
  hideMemory: string;
  guidedTab: string;
  categoryTab: string;
  categoryTitle: string;
  progressionHint: string;
};

export const writingJourneyCopy: Record<Language, WritingJourneyCopy> = {
  en: {
    title: "Guided writing",
    intro: "Build your writing confidence one short step at a time.",
    guideNote: "Guided practice only — this is not an official course or certification.",
    levels: { starter: "Starter", builder: "Builder", challenge: "Challenge" },
    levelDescriptions: {
      starter: "Free: complete one missing word.",
      builder: "Premium: complete several missing words in order.",
      challenge: "Premium: study longer sentences, then write them from memory.",
    },
    completed: "Completed",
    inProgress: "Ready to begin",
    locked: "Complete the previous level to unlock this one.",
    premium: "Premium",
    premiumDescription: "Progress to harder writing with Premium after completing the previous level. Purchases are currently unavailable.",
    openLevel: "Open level",
    loading: "Loading your writing journey…",
    loadError: "We couldn’t load your writing journey.",
    retry: "Try again",
    empty: "There are no exercises in this level yet.",
    continue: "Continue journey",
    refresh: "Refresh progress",
    saving: "Saving your completion…",
    saveError: "Your completion could not be saved. Check your connection and try again.",
    savedDescription: "You completed {n} guided exercises. This is practice, not an official course award.",
    wordInstructions: "Write the missing word in {language}.",
    wordsInstructions: "Write the missing words in their original order, separated by spaces.",
    memoryInstructions: "Study the phrase, then write it from memory.",
    studyTitle: "Study this phrase",
    startMemory: "Start from memory",
    hideMemory: "Hide phrase",
    guidedTab: "Guided journey",
    categoryTab: "Category practice",
    categoryTitle: "Choose a practice category",
    progressionHint: "Want a harder challenge? Follow the guided journey: one word free, then multiple words and longer sentences with Premium.",
  },
  es: {
    title: "Escritura guiada",
    intro: "Gana confianza al escribir paso a paso.",
    guideNote: "Práctica guiada únicamente: no es un curso oficial ni una certificación.",
    levels: { starter: "Inicial", builder: "Intermedio", challenge: "Desafío" },
    levelDescriptions: {
      starter: "Gratis: completa una palabra que falta.",
      builder: "Premium: completa varias palabras en orden.",
      challenge: "Premium: estudia frases más largas y escríbelas de memoria.",
    },
    completed: "Completado",
    inProgress: "Listo para empezar",
    locked: "Completa el nivel anterior para desbloquear este.",
    premium: "Premium",
    premiumDescription: "Avanza a escritura más difícil con Premium tras completar el nivel anterior. Las compras no están disponibles actualmente.",
    openLevel: "Abrir nivel",
    loading: "Cargando tu recorrido de escritura…",
    loadError: "No se pudo cargar tu recorrido de escritura.",
    retry: "Intentar de nuevo",
    empty: "Todavía no hay ejercicios en este nivel.",
    continue: "Continuar recorrido",
    refresh: "Actualizar progreso",
    saving: "Guardando tu finalización…",
    saveError: "No se pudo guardar tu finalización. Comprueba la conexión e inténtalo de nuevo.",
    savedDescription: "Completaste {n} ejercicios guiados. Es práctica, no una acreditación oficial.",
    wordInstructions: "Escribe la palabra que falta en {language}.",
    wordsInstructions: "Escribe las palabras que faltan en el orden original, separadas por espacios.",
    memoryInstructions: "Estudia la frase y luego escríbela de memoria.",
    studyTitle: "Estudia esta frase",
    startMemory: "Empezar de memoria",
    hideMemory: "Ocultar frase",
    guidedTab: "Recorrido guiado",
    categoryTab: "Práctica por categoría",
    categoryTitle: "Elige una categoría de práctica",
    progressionHint: "¿Buscas más dificultad? Sigue el recorrido guiado: una palabra gratis, después varias palabras y frases más largas con Premium.",
  },
  fr: {
    title: "Écriture guidée",
    intro: "Prends confiance à l’écrit, une étape à la fois.",
    guideNote: "Entraînement guidé uniquement : ce n’est ni un cours officiel ni une certification.",
    levels: { starter: "Débutant", builder: "Intermédiaire", challenge: "Défi" },
    levelDescriptions: {
      starter: "Gratuit : complète un mot manquant.",
      builder: "Premium : complète plusieurs mots dans l’ordre.",
      challenge: "Premium : étudie des phrases plus longues, puis écris-les de mémoire.",
    },
    completed: "Terminé",
    inProgress: "Prêt à commencer",
    locked: "Termine le niveau précédent pour déverrouiller celui-ci.",
    premium: "Premium",
    premiumDescription: "Progresse vers une écriture plus difficile avec Premium après le niveau précédent. Les achats sont actuellement indisponibles.",
    openLevel: "Ouvrir le niveau",
    loading: "Chargement de ton parcours d’écriture…",
    loadError: "Impossible de charger ton parcours d’écriture.",
    retry: "Réessayer",
    empty: "Il n’y a pas encore d’exercices dans ce niveau.",
    continue: "Continuer le parcours",
    refresh: "Actualiser la progression",
    saving: "Enregistrement de ta réussite…",
    saveError: "Impossible d’enregistrer ta réussite. Vérifie ta connexion et réessaie.",
    savedDescription: "Tu as terminé {n} exercices guidés. C’est un entraînement, pas une certification officielle.",
    wordInstructions: "Écris le mot manquant en {language}.",
    wordsInstructions: "Écris les mots manquants dans l’ordre d’origine, séparés par des espaces.",
    memoryInstructions: "Étudie la phrase, puis écris-la de mémoire.",
    studyTitle: "Étudie cette phrase",
    startMemory: "Commencer de mémoire",
    hideMemory: "Masquer la phrase",
    guidedTab: "Parcours guidé",
    categoryTab: "Entraînement par thème",
    categoryTitle: "Choisis un thème d’entraînement",
    progressionHint: "Envie de plus de difficulté ? Suis le parcours guidé : un mot gratuit, puis plusieurs mots et des phrases plus longues avec Premium.",
  },
  sv: {
    title: "Guidad skrivning",
    intro: "Bygg upp ditt skrivsjälvförtroende, ett kort steg i taget.",
    guideNote: "Endast guidad övning – detta är ingen officiell kurs eller certifiering.",
    levels: { starter: "Nybörjare", builder: "Fortsättning", challenge: "Utmaning" },
    levelDescriptions: {
      starter: "Gratis: fyll i ett ord som saknas.",
      builder: "Premium: fyll i flera ord i rätt ordning.",
      challenge: "Premium: studera längre meningar och skriv dem sedan ur minnet.",
    },
    completed: "Klar",
    inProgress: "Redo att börja",
    locked: "Slutför föregående nivå för att låsa upp den här.",
    premium: "Premium",
    premiumDescription: "Gå vidare till svårare skrivövningar med Premium efter föregående nivå. Köp är inte tillgängliga just nu.",
    openLevel: "Öppna nivån",
    loading: "Laddar din skrivresa…",
    loadError: "Det gick inte att ladda din skrivresa.",
    retry: "Försök igen",
    empty: "Det finns inga övningar på den här nivån ännu.",
    continue: "Fortsätt resan",
    refresh: "Uppdatera framsteg",
    saving: "Sparar att du är klar…",
    saveError: "Det gick inte att spara att du är klar. Kontrollera anslutningen och försök igen.",
    savedDescription: "Du klarade {n} guidade övningar. Det här är träning, inte en officiell kursutmärkelse.",
    wordInstructions: "Skriv det saknade ordet på {language}.",
    wordsInstructions: "Skriv de saknade orden i ursprunglig ordning, åtskilda av mellanslag.",
    memoryInstructions: "Studera frasen och skriv den sedan ur minnet.",
    studyTitle: "Studera den här frasen",
    startMemory: "Börja från minnet",
    hideMemory: "Dölj frasen",
    guidedTab: "Guidad resa",
    categoryTab: "Övning efter kategori",
    categoryTitle: "Välj en övningskategori",
    progressionHint: "Vill du ha en svårare utmaning? Följ skrivresan: ett ord gratis, sedan flera ord och längre meningar med Premium.",
  },
};
