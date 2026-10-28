import type { Language } from "@/lib/i18n";

type WritingPracticeCopy = {
  tab: string; title: string; instructions: string; missingWord: string; placeholder: string;
  check: string; correct: string; incorrect: string; marks: string; expected: string;
  retry: string; next: string; finish: string; listen: string; pronunciation: string; completed: string;
  completedDescription: string; restart: string; empty: string; progress: (current: number, total: number) => string;
};

export const writingPracticeCopy: Record<Language, WritingPracticeCopy> = {
  en: {
    tab: "Writing", title: "Practise writing", instructions: "Write the missing word in {language}. Pay attention to accents and character marks.",
    missingWord: "Missing word", placeholder: "Write your answer", check: "Check answer", correct: "Correct!",
    incorrect: "Not quite. Check the correct spelling and try again.", marks: "Almost! Check the accents or character marks.",
    expected: "Correct spelling", retry: "Try again", next: "Next exercise", finish: "See result", listen: "Listen to the phrase",
    pronunciation: "Pronunciation hint",
    completed: "Writing practice completed", completedDescription: "You wrote {n} words correctly. This practice does not change your lesson progress.",
    restart: "Practise again", empty: "No writing exercises are available for this language and category yet.",
    progress: (current, total) => `Exercise ${current} of ${total}`,
  },
  es: {
    tab: "Escritura", title: "Practica la escritura", instructions: "Escribe la palabra que falta en {language}. Presta atención a los acentos y signos de los caracteres.",
    missingWord: "Palabra que falta", placeholder: "Escribe tu respuesta", check: "Comprobar respuesta", correct: "¡Correcto!",
    incorrect: "Todavía no. Revisa cómo se escribe y vuelve a intentarlo.", marks: "¡Casi! Revisa los acentos o signos de los caracteres.",
    expected: "Escritura correcta", retry: "Volver a intentar", next: "Siguiente ejercicio", finish: "Ver resultado", listen: "Escuchar la frase",
    pronunciation: "Pista de pronunciación",
    completed: "Práctica de escritura completada", completedDescription: "Has escrito {n} palabras correctamente. Esta práctica no cambia tu progreso en las lecciones.",
    restart: "Practicar de nuevo", empty: "Todavía no hay ejercicios de escritura para este idioma y categoría.",
    progress: (current, total) => `Ejercicio ${current} de ${total}`,
  },
  fr: {
    tab: "Écriture", title: "Pratique l’écriture", instructions: "Écris le mot manquant en {language}. Fais attention aux accents et aux signes des caractères.",
    missingWord: "Mot manquant", placeholder: "Écris ta réponse", check: "Vérifier la réponse", correct: "Correct !",
    incorrect: "Pas encore. Vérifie l’orthographe et réessaie.", marks: "Presque ! Vérifie les accents ou les signes des caractères.",
    expected: "Orthographe correcte", retry: "Réessayer", next: "Exercice suivant", finish: "Voir le résultat", listen: "Écouter la phrase",
    pronunciation: "Indice de prononciation",
    completed: "Pratique d’écriture terminée", completedDescription: "Tu as écrit {n} mots correctement. Cet entraînement ne modifie pas ta progression dans les leçons.",
    restart: "S’entraîner à nouveau", empty: "Il n’y a pas encore d’exercices d’écriture pour cette langue et cette catégorie.",
    progress: (current, total) => `Exercice ${current} sur ${total}`,
  },
  sv: {
    tab: "Skriva", title: "Öva på att skriva", instructions: "Skriv det saknade ordet på {language}. Var noga med accenter och teckenmarkeringar.",
    missingWord: "Saknat ord", placeholder: "Skriv ditt svar", check: "Kontrollera svaret", correct: "Rätt!",
    incorrect: "Inte riktigt. Kontrollera stavningen och försök igen.", marks: "Nästan! Kontrollera accenter eller teckenmarkeringar.",
    expected: "Rätt stavning", retry: "Försök igen", next: "Nästa övning", finish: "Visa resultat", listen: "Lyssna på frasen",
    pronunciation: "Uttalshjälp",
    completed: "Skrivövningen är klar", completedDescription: "Du skrev {n} ord rätt. Övningen ändrar inte dina lektionsframsteg.",
    restart: "Öva igen", empty: "Det finns inga skrivövningar för det här språket och den här kategorin ännu.",
    progress: (current, total) => `Övning ${current} av ${total}`,
  },
};