import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trophy, X, CheckCircle2, XCircle, ChevronRight, Star, RotateCcw } from "lucide-react";

// ── Quiz question bank ────────────────────────────────────────────────────────
// Each question: { q, options, answer, lang }
// Deterministic pool of 30 per language, 5 chosen per day by seed

type Question = { q: string; options: string[]; answer: string };
type LangCode = "en" | "es" | "fr" | "it" | "pt" | "de" | "ja" | "zh" | "ar" | "nl";

const QUESTION_BANK: Record<LangCode, Question[]> = {
  en: [
    { q: "How do you say 'Thank you' in English?", options: ["Thank you", "Please", "Sorry", "Hello"], answer: "Thank you" },
    { q: "What does 'Goodbye' mean?", options: ["Hola", "Gracias", "Adiós", "Por favor"], answer: "Adiós" },
    { q: "Translate: 'Where is the hotel?'", options: ["¿Dónde está el hotel?", "¿Cuánto cuesta?", "¿Cómo te llamas?", "¿Qué hora es?"], answer: "¿Dónde está el hotel?" },
    { q: "What does 'I'm lost' mean in Spanish?", options: ["Estoy perdido/a", "Tengo hambre", "Estoy cansado/a", "Me duele la cabeza"], answer: "Estoy perdido/a" },
    { q: "How do you ask for 'The bill, please'?", options: ["The menu, please", "The bill, please", "A table, please", "Water, please"], answer: "The bill, please" },
    { q: "'Nice to meet you' translates to…", options: ["Buenas noches", "Encantado/a de conocerte", "Hasta luego", "De nada"], answer: "Encantado/a de conocerte" },
    { q: "What is a 'layover' in travel?", options: ["A type of hotel", "A stop between flights", "A travel insurance", "A boarding pass"], answer: "A stop between flights" },
    { q: "What does 'Help!' translate to in Spanish?", options: ["¡Fuego!", "¡Silencio!", "¡Ayuda!", "¡Espera!"], answer: "¡Ayuda!" },
    { q: "How do you say 'Turn left' in English?", options: ["Turn right", "Go straight", "Turn left", "Stop here"], answer: "Turn left" },
    { q: "Which word means 'passport' in English?", options: ["Luggage", "Passport", "Ticket", "Boarding"], answer: "Passport" },
    { q: "What does 'I have a reservation' mean?", options: ["Tengo una reserva", "No tengo dinero", "Quiero una mesa", "Soy vegetariano"], answer: "Tengo una reserva" },
    { q: "What is 'wanderlust'?", options: ["Fear of heights", "Desire to travel", "Travel sickness", "A type of map"], answer: "Desire to travel" },
    { q: "Translate: 'Call the police!'", options: ["¡Llama a la policía!", "¡Llama a un médico!", "¡Llama a mis amigos!", "¡Llama un taxi!"], answer: "¡Llama a la policía!" },
    { q: "What does 'jet lag' feel like?", options: ["Excitement", "Fatigue from time zones", "Fear of flying", "Motion sickness"], answer: "Fatigue from time zones" },
    { q: "How do you say 'Is breakfast included?'", options: ["Is dinner included?", "Is WiFi included?", "Is breakfast included?", "Is service included?"], answer: "Is breakfast included?" },
    { q: "What does 'backpacker' mean?", options: ["A luxury traveller", "A budget traveller with a backpack", "A travel agent", "A tour guide"], answer: "A budget traveller with a backpack" },
    { q: "Translate: 'I need a doctor'", options: ["Necesito un médico", "Necesito un taxi", "Necesito agua", "Necesito dinero"], answer: "Necesito un médico" },
    { q: "Which phrase is used at check-in?", options: ["I'd like to order", "I have a reservation", "The bill, please", "Turn right here"], answer: "I have a reservation" },
    { q: "'See you later' translates to…", options: ["Hasta luego", "Buenos días", "De nada", "Mucho gusto"], answer: "Hasta luego" },
    { q: "What does 'itinerary' mean?", options: ["A travel plan", "A type of luggage", "A visa requirement", "A hotel room"], answer: "A travel plan" },
    { q: "How do you politely ask for water?", options: ["Bring me water!", "Water, please.", "I want water.", "Get water."], answer: "Water, please." },
    { q: "What does 'hostel' mean?", options: ["A luxury hotel", "Budget shared accommodation", "A restaurant", "A campsite"], answer: "Budget shared accommodation" },
    { q: "'Where are you from?' translates to…", options: ["¿Cómo te llamas?", "¿De dónde eres?", "¿Cuántos años tienes?", "¿Qué haces?"], answer: "¿De dónde eres?" },
    { q: "What is 'serendipity'?", options: ["A lucky accidental discovery", "A type of ticket", "A travel app", "A visa type"], answer: "A lucky accidental discovery" },
    { q: "Translate: 'I've been robbed'", options: ["Me han robado", "Me he perdido", "Me he caído", "Me han ayudado"], answer: "Me han robado" },
    { q: "What does 'Do you speak Spanish?' mean?", options: ["¿Hablas español?", "¿Hablas inglés?", "¿Hablas francés?", "¿Entiendes?"], answer: "¿Hablas español?" },
    { q: "How do you say 'Good morning'?", options: ["Good night", "Good morning", "Good evening", "Good afternoon"], answer: "Good morning" },
    { q: "'Let's keep in touch' translates to…", options: ["Mantengámonos en contacto", "Vamos a bailar", "Nos vemos pronto", "Te llamo luego"], answer: "Mantengámonos en contacto" },
    { q: "What does 'I love travelling' translate to?", options: ["Me encanta viajar", "Odio viajar", "Quiero irme", "Estoy de vacaciones"], answer: "Me encanta viajar" },
    { q: "Which phrase is used in an emergency?", options: ["Is this seat free?", "Help!", "Where's the menu?", "Check please"], answer: "Help!" },
  ],
  es: [
    { q: "¿Cómo se dice 'hello' en inglés?", options: ["Hello", "Goodbye", "Please", "Sorry"], answer: "Hello" },
    { q: "¿Qué significa 'sobremesa'?", options: ["Un postre", "Charla después de comer", "La mesa del comedor", "Un mantel"], answer: "Charla después de comer" },
    { q: "¿Cómo se dice 'Thank you very much'?", options: ["You're welcome", "Thank you very much", "Please", "Excuse me"], answer: "Thank you very much" },
    { q: "¿Qué significa 'madrugar'?", options: ["Quedarse dormido", "Levantarse muy temprano", "Desvelarse", "Dormir la siesta"], answer: "Levantarse muy temprano" },
    { q: "¿Cómo se traduce 'La cuenta, por favor'?", options: ["The menu, please", "The bill, please", "Water, please", "A table, please"], answer: "The bill, please" },
    { q: "¿Qué es un 'puente' en España?", options: ["Un puente sobre un río", "Un fin de semana largo", "Un vuelo de conexión", "Un bono de transporte"], answer: "Un fin de semana largo" },
    { q: "¿Cómo se dice 'I'm lost' en español?", options: ["Tengo sed", "Estoy perdido/a", "Me duele el pie", "Tengo prisa"], answer: "Estoy perdido/a" },
    { q: "¿Qué significa 'guiri' en español coloquial?", options: ["Un vecino", "Un turista extranjero", "Un policía", "Un camarero"], answer: "Un turista extranjero" },
    { q: "¿Cómo se traduce 'Turn left'?", options: ["Gira a la derecha", "Sigue recto", "Gira a la izquierda", "Para aquí"], answer: "Gira a la izquierda" },
    { q: "¿Qué es 'wanderlust' en español?", options: ["Miedo a volar", "Ansia de viajar", "Cansancio de viaje", "Un tipo de maleta"], answer: "Ansia de viajar" },
    { q: "¿Cómo se dice '¡Ayuda!' en inglés?", options: ["Help!", "Stop!", "Wait!", "Run!"], answer: "Help!" },
    { q: "¿Qué significa 'estrenar' en inglés?", options: ["To repair", "To use for the first time", "To return", "To buy"], answer: "To use for the first time" },
    { q: "¿Cómo se traduce 'I need a doctor'?", options: ["Necesito dinero", "Necesito un médico", "Necesito un taxi", "Necesito ayuda"], answer: "Necesito un médico" },
    { q: "¿Qué frase usarías al llegar a un hotel?", options: ["La cuenta, por favor", "Tengo una reserva", "¿Dónde está el baño?", "Una mesa para dos"], answer: "Tengo una reserva" },
    { q: "¿Cómo se dice 'See you later'?", options: ["Buenos días", "Hasta luego", "Buenas noches", "De nada"], answer: "Hasta luego" },
    { q: "¿Qué significa 'jet lag'?", options: ["Equipaje de mano", "Desfase horario por vuelo", "Billete de avión", "Seguro de viaje"], answer: "Desfase horario por vuelo" },
    { q: "¿Cómo se traduce 'Where are you from?'?", options: ["¿Cómo te llamas?", "¿De dónde eres?", "¿Cuántos años tienes?", "¿Dónde vives?"], answer: "¿De dónde eres?" },
    { q: "¿Qué significa 'trasnochar'?", options: ["Dormir la siesta", "Quedarse despierto toda la noche", "Levantarse tarde", "Dormir mucho"], answer: "Quedarse despierto toda la noche" },
    { q: "¿Cómo se dice 'Is breakfast included?' en español?", options: ["¿Hay parking?", "¿Está incluido el desayuno?", "¿Hay WiFi?", "¿Hay piscina?"], answer: "¿Está incluido el desayuno?" },
    { q: "¿Qué frase usarías en una emergencia?", options: ["¿Dónde está el menú?", "¡Llama a la policía!", "¿Cuánto cuesta?", "Una mesa, por favor"], answer: "¡Llama a la policía!" },
  ],
  fr: [
    { q: "Comment dit-on 'Thank you' en français?", options: ["Merci", "S'il vous plaît", "Bonjour", "Au revoir"], answer: "Merci" },
    { q: "Que signifie 'dépaysement'?", options: ["La joie du retour", "Sentiment de dépaysage / être ailleurs", "Une maladie", "Un type de visa"], answer: "Sentiment de dépaysage / être ailleurs" },
    { q: "Comment traduit-on 'The bill, please'?", options: ["Le menu, s'il vous plaît", "L'addition, s'il vous plaît", "De l'eau, s'il vous plaît", "Une table, s'il vous plaît"], answer: "L'addition, s'il vous plaît" },
    { q: "Que signifie 'flâner'?", options: ["Courir vite", "Se promener sans but", "Faire du shopping", "Travailler tard"], answer: "Se promener sans but" },
    { q: "Comment dit-on 'I'm lost'?", options: ["Je suis fatigué", "Je suis perdu(e)", "J'ai faim", "Je suis pressé"], answer: "Je suis perdu(e)" },
    { q: "'Au secours!' signifie…", options: ["Bonne chance!", "Attention!", "Au secours! / Help!", "À bientôt!"], answer: "Au secours! / Help!" },
    { q: "Comment traduit-on 'I have a reservation'?", options: ["Je voudrais commander", "J'ai une réservation", "Je suis végétarien", "Je veux partir"], answer: "J'ai une réservation" },
    { q: "Que signifie 'savoir-faire'?", options: ["Savoir cuisiner", "Compétence naturelle / élégance", "Un plat français", "Une danse"], answer: "Compétence naturelle / élégance" },
    { q: "Comment dit-on 'Where is the station?'?", options: ["Où est l'hôtel?", "Où est la gare?", "Où est le restaurant?", "Où est l'aéroport?"], answer: "Où est la gare?" },
    { q: "'Retrouvailles' signifie…", options: ["Une dispute", "La joie de retrouver quelqu'un", "Un voyage en retour", "Une fête"], answer: "La joie de retrouver quelqu'un" },
    { q: "Comment dit-on 'Call the police!'?", options: ["Appelez une ambulance!", "Appelez la police!", "Appelez un médecin!", "Appelez un taxi!"], answer: "Appelez la police!" },
    { q: "Que signifie 'bouquiner'?", options: ["Faire du sport", "Lire des livres tranquillement", "Cuisiner", "Voyager"], answer: "Lire des livres tranquillement" },
    { q: "Comment traduit-on 'See you later'?", options: ["Bonjour", "Bonsoir", "À bientôt", "Merci"], answer: "À bientôt" },
    { q: "Comment dit-on 'Is breakfast included?'?", options: ["Le dîner est inclus?", "Le petit-déjeuner est inclus?", "Le déjeuner est inclus?", "Le service est inclus?"], answer: "Le petit-déjeuner est inclus?" },
    { q: "'S'il vous plaît' signifie…", options: ["Merci", "De rien", "S'il vous plaît / Please", "Excusez-moi"], answer: "S'il vous plaît / Please" },
  ],
  it: [
    { q: "Come si dice 'Thank you' in italiano?", options: ["Prego", "Grazie", "Ciao", "Per favore"], answer: "Grazie" },
    { q: "Che significa 'abbiocco'?", options: ["Una colazione", "Sonnolenza dopo pranzo", "Un dolce italiano", "Una pausa caffè"], answer: "Sonnolenza dopo pranzo" },
    { q: "Come si traduce 'The bill, please'?", options: ["Il menù, per favore", "Il conto, per favore", "L'acqua, per favore", "Una tavola, per favore"], answer: "Il conto, per favore" },
    { q: "Che significa 'passeggiata'?", options: ["Una corsa mattutina", "Una passeggiata serale", "Un pasto", "Un balletto"], answer: "Una passeggiata serale" },
    { q: "Come si dice 'I'm lost'?", options: ["Ho fame", "Mi sono perso/a", "Sono stanco/a", "Ho sete"], answer: "Mi sono perso/a" },
    { q: "'Aiuto!' significa…", options: ["Attenzione!", "Ciao!", "Aiuto! / Help!", "Bravo!"], answer: "Aiuto! / Help!" },
    { q: "Che significa 'sprezzatura'?", options: ["Un tipo di pizza", "L'arte di fare le cose con eleganza senza sforzo", "Una bevanda", "Un ballo"], answer: "L'arte di fare le cose con eleganza senza sforzo" },
    { q: "Come si dice 'I have a reservation'?", options: ["Vorrei ordinare", "Ho una prenotazione", "Sono vegetariano", "Voglio partire"], answer: "Ho una prenotazione" },
    { q: "Che significa 'dolce far niente'?", options: ["Un dessert italiano", "La dolcezza del non fare nulla", "Un ballo del sud", "Un tipo di gelato"], answer: "La dolcezza del non fare nulla" },
    { q: "Come si traduce 'See you later'?", options: ["Buongiorno", "A presto", "Buonanotte", "Grazie"], answer: "A presto" },
    { q: "Come si dice 'Call the police!'?", options: ["Chiamate un medico!", "Chiamate la polizia!", "Chiamate un taxi!", "Chiamate i pompieri!"], answer: "Chiamate la polizia!" },
    { q: "Che significa 'agriturismo'?", options: ["Un ristorante in città", "Vacanza in fattoria", "Un museo agricolo", "Un mercato"], answer: "Vacanza in fattoria" },
    { q: "Come si dice 'Is breakfast included?'?", options: ["La cena è inclusa?", "La colazione è inclusa?", "Il pranzo è incluso?", "Il WiFi è incluso?"], answer: "La colazione è inclusa?" },
    { q: "Come si traduce 'Where is the station?'?", options: ["Dov'è l'hotel?", "Dov'è la stazione?", "Dov'è il ristorante?", "Dov'è il bagno?"], answer: "Dov'è la stazione?" },
    { q: "'Per favore' significa…", options: ["Grazie", "Prego", "Per favore / Please", "Scusi"], answer: "Per favore / Please" },
  ],
  pt: [
    { q: "Como se diz 'Thank you' em português?", options: ["Por favor", "Obrigado/a", "Olá", "Tchau"], answer: "Obrigado/a" },
    { q: "O que significa 'saudade'?", options: ["Alegria intensa", "Saudade melancólica de algo amado", "Medo de viajar", "Uma dança brasileira"], answer: "Saudade melancólica de algo amado" },
    { q: "Como se traduz 'The bill, please'?", options: ["O cardápio, por favor", "A conta, por favor", "A água, por favor", "Uma mesa, por favor"], answer: "A conta, por favor" },
    { q: "O que significa 'cafuné'?", options: ["Um penteado", "Afagar o cabelo de alguém", "Uma dança", "Um beijo"], answer: "Afagar o cabelo de alguém" },
    { q: "Como se diz 'I'm lost'?", options: ["Estou com fome", "Estou perdido/a", "Estou cansado/a", "Estou com sede"], answer: "Estou perdido/a" },
    { q: "'Socorro!' significa…", options: ["Atenção!", "Boa sorte!", "Socorro! / Help!", "Até logo!"], answer: "Socorro! / Help!" },
    { q: "O que significa 'desenrascanço'?", options: ["Uma comida portuguesa", "Arte de improvisar uma solução", "Um tipo de dança", "Uma bebida"], answer: "Arte de improvisar uma solução" },
    { q: "Como se diz 'I have a reservation'?", options: ["Quero pedir", "Tenho uma reserva", "Sou vegetariano/a", "Quero partir"], answer: "Tenho uma reserva" },
    { q: "Como se traduz 'See you later'?", options: ["Bom dia", "Até logo", "Boa noite", "Obrigado"], answer: "Até logo" },
    { q: "Como se diz 'Is breakfast included?'?", options: ["O jantar está incluído?", "O café da manhã está incluído?", "O almoço está incluído?", "O WiFi está incluído?"], answer: "O café da manhã está incluído?" },
    { q: "'Por favor' significa…", options: ["Obrigado", "De nada", "Por favor / Please", "Desculpe"], answer: "Por favor / Please" },
    { q: "Como se diz 'Call the police!'?", options: ["Chame um médico!", "Chame a polícia!", "Chame um táxi!", "Chame uma ambulância!"], answer: "Chame a polícia!" },
    { q: "O que significa 'madrugada'?", options: ["O pôr do sol", "As horas entre meia-noite e o amanhecer", "A hora do almoço", "O início da tarde"], answer: "As horas entre meia-noite e o amanhecer" },
    { q: "Como se diz 'Where is the station?'?", options: ["Onde fica o hotel?", "Onde fica a estação?", "Onde fica o restaurante?", "Onde fica o banheiro?"], answer: "Onde fica a estação?" },
    { q: "O que significa 'peito' (metaforicamente)?", options: ["Uma parte do frango", "Coragem / coração", "Um instrumento musical", "Um tipo de roupa"], answer: "Coragem / coração" },
  ],
  de: [
    { q: "Wie sagt man 'Thank you' auf Deutsch?", options: ["Bitte", "Danke", "Hallo", "Tschüss"], answer: "Danke" },
    { q: "Was bedeutet 'Fernweh'?", options: ["Heimweh", "Sehnsucht nach fernen Orten", "Reiseübelkeit", "Angst vor dem Fliegen"], answer: "Sehnsucht nach fernen Orten" },
    { q: "Wie übersetzt man 'The bill, please'?", options: ["Die Speisekarte, bitte", "Die Rechnung, bitte", "Das Wasser, bitte", "Einen Tisch, bitte"], answer: "Die Rechnung, bitte" },
    { q: "Was bedeutet 'Schadenfreude'?", options: ["Traurigkeit", "Freude am Unglück anderer", "Übermäßige Freude", "Langeweile"], answer: "Freude am Unglück anderer" },
    { q: "Wie sagt man 'I'm lost'?", options: ["Ich bin müde", "Ich habe mich verlaufen", "Ich habe Hunger", "Ich bin krank"], answer: "Ich habe mich verlaufen" },
    { q: "'Hilfe!' bedeutet…", options: ["Vorsicht!", "Hallo!", "Hilfe! / Help!", "Stopp!"], answer: "Hilfe! / Help!" },
    { q: "Was bedeutet 'Gemütlichkeit'?", options: ["Ein deutsches Gericht", "Behaglichkeit / Gemütlichkeit", "Eine Sportart", "Ein Tanz"], answer: "Behaglichkeit / Gemütlichkeit" },
    { q: "Wie sagt man 'I have a reservation'?", options: ["Ich möchte bestellen", "Ich habe eine Reservierung", "Ich bin Vegetarier", "Ich möchte abreisen"], answer: "Ich habe eine Reservierung" },
    { q: "Was bedeutet 'Weltschmerz'?", options: ["Weltreise", "Schmerz über den Zustand der Welt", "Weltrekord", "Weltfrieden"], answer: "Schmerz über den Zustand der Welt" },
    { q: "Wie übersetzt man 'See you later'?", options: ["Guten Morgen", "Auf Wiedersehen", "Gute Nacht", "Danke"], answer: "Auf Wiedersehen" },
    { q: "Wie sagt man 'Call the police!'?", options: ["Rufen Sie einen Arzt!", "Rufen Sie die Polizei!", "Rufen Sie ein Taxi!", "Rufen Sie einen Krankenwagen!"], answer: "Rufen Sie die Polizei!" },
    { q: "Was bedeutet 'Torschlusspanik'?", options: ["Angst vor Türen", "Panik, dass die Zeit abläuft", "Angst vor Schlössern", "Panik in der Schule"], answer: "Panik, dass die Zeit abläuft" },
    { q: "Wie sagt man 'Is breakfast included?'?", options: ["Ist das Abendessen inbegriffen?", "Ist das Frühstück inbegriffen?", "Ist das Mittagessen inbegriffen?", "Ist das WLAN inbegriffen?"], answer: "Ist das Frühstück inbegriffen?" },
    { q: "Was bedeutet 'Wanderlust'?", options: ["Lust auf Wandern im Wald", "Drang, die Welt zu bereisen", "Wandern als Sport", "Eine Art Reiseversicherung"], answer: "Drang, die Welt zu bereisen" },
    { q: "'Bitte' kann bedeuten…", options: ["Nur Danke", "Nur Entschuldigung", "Bitte / You're welcome", "Nur Hallo"], answer: "Bitte / You're welcome" },
  ],
  ja: [
    { q: "日本語で 'Thank you' は？", options: ["すみません", "ありがとう", "こんにちは", "さようなら"], answer: "ありがとう" },
    { q: "'木漏れ日' の意味は？", options: ["月光", "葉の間から差し込む日光", "夕焼け", "朝霧"], answer: "葉の間から差し込む日光" },
    { q: "'お会計をお願いします' は英語で？", options: ["The menu, please", "The bill, please", "Water, please", "A table, please"], answer: "The bill, please" },
    { q: "'積ん読' の意味は？", options: ["読書が得意なこと", "本を買っても読まないこと", "図書館に行くこと", "本をプレゼントすること"], answer: "本を買っても読まないこと" },
    { q: "'助けて！' は英語で？", options: ["Stop!", "Help!", "Wait!", "Careful!"], answer: "Help!" },
    { q: "'侘び寂び' の意味は？", options: ["明るくにぎやかな美", "不完全さと無常の美", "豪華な装飾美", "自然の厳しさ"], answer: "不完全さと無常の美" },
    { q: "'予約があります' は英語で？", options: ["I'd like to order", "I have a reservation", "I am vegetarian", "I want to leave"], answer: "I have a reservation" },
    { q: "'また後で' は英語で？", options: ["Good morning", "See you later", "Good night", "Thank you"], answer: "See you later" },
    { q: "日本語で 'Where is the station?' は？", options: ["ホテルはどこですか？", "駅はどこですか？", "レストランはどこですか？", "空港はどこですか？"], answer: "駅はどこですか？" },
    { q: "'物の哀れ' の意味は？", options: ["自然の怒り", "無常への切ない感情", "大きな喜び", "強い怒り"], answer: "無常への切ない感情" },
    { q: "日本語で 'Help!' は？", options: ["止まれ！", "助けて！", "待って！", "急いで！"], answer: "助けて！" },
    { q: "'朝食は含まれていますか？' は英語で？", options: ["Is dinner included?", "Is breakfast included?", "Is lunch included?", "Is WiFi included?"], answer: "Is breakfast included?" },
    { q: "'はじめまして' の意味は？", options: ["Goodbye", "Nice to meet you", "Good morning", "Thank you"], answer: "Nice to meet you" },
    { q: "日本語で 'Call the police!' は？", options: ["救急車を呼んでください！", "警察を呼んでください！", "消防車を呼んでください！", "医者を呼んでください！"], answer: "警察を呼んでください！" },
    { q: "'縁側' の意味は？", options: ["日本庭園", "家の縁にある廊下・テラス", "伝統的な門", "屋根の飾り"], answer: "家の縁にある廊下・テラス" },
  ],
  zh: [
    { q: "中文怎么说 'Thank you'？", options: ["请", "谢谢", "你好", "再见"], answer: "谢谢" },
    { q: "'缘分' 的意思是？", options: ["金钱关系", "命中注定的相遇", "工作关系", "家庭关系"], answer: "命中注定的相遇" },
    { q: "'买单，请' 的英文是？", options: ["The menu, please", "The bill, please", "Water, please", "A table, please"], answer: "The bill, please" },
    { q: "'面子' 的意思是？", options: ["一种食物", "社会声誉/体面", "一种颜色", "一种游戏"], answer: "社会声誉/体面" },
    { q: "'救命！' 的英文是？", options: ["Stop!", "Help!", "Wait!", "Run!"], answer: "Help!" },
    { q: "'热闹' 的意思是？", options: ["安静的环境", "热烈喧闹的氛围", "寒冷的天气", "简单的生活"], answer: "热烈喧闹的氛围" },
    { q: "'我有预订' 的英文是？", options: ["I'd like to order", "I have a reservation", "I am vegetarian", "I want to leave"], answer: "I have a reservation" },
    { q: "'再见' 的英文是？", options: ["Hello", "Thank you", "Goodbye", "Please"], answer: "Goodbye" },
    { q: "中文怎么说 'Where is the station?'？", options: ["酒店在哪里？", "火车站在哪里？", "餐厅在哪里？", "机场在哪里？"], answer: "火车站在哪里？" },
    { q: "'悠闲' 的意思是？", options: ["非常忙碌", "悠然自在", "很紧张", "很愤怒"], answer: "悠然自在" },
    { q: "'报警！' 的英文是？", options: ["Call an ambulance!", "Call the police!", "Call a doctor!", "Call a taxi!"], answer: "Call the police!" },
    { q: "'早餐包含在内吗？' 的英文是？", options: ["Is dinner included?", "Is breakfast included?", "Is lunch included?", "Is WiFi included?"], answer: "Is breakfast included?" },
    { q: "'你好' 的英文是？", options: ["Goodbye", "Thank you", "Hello", "Please"], answer: "Hello" },
    { q: "'差不多' 的意思是？", options: ["完全正确", "差不多/大概可以", "完全错误", "非常好"], answer: "差不多/大概可以" },
    { q: "中文怎么说 'Help!'？", options: ["停！", "救命！", "等等！", "快跑！"], answer: "救命！" },
  ],
  ar: [
    { q: "كيف تقول 'Thank you' بالعربية؟", options: ["من فضلك", "شكراً", "مرحباً", "مع السلامة"], answer: "شكراً" },
    { q: "ما معنى 'يقين'؟", options: ["شك", "يقين تام / قناعة", "خوف", "أمل"], answer: "يقين تام / قناعة" },
    { q: "كيف تترجم 'The bill, please'؟", options: ["القائمة من فضلك", "الحساب من فضلك", "الماء من فضلك", "طاولة من فضلك"], answer: "الحساب من فضلك" },
    { q: "ما معنى 'كرم'؟", options: ["البخل", "الكرم والضيافة", "الغضب", "الحزن"], answer: "الكرم والضيافة" },
    { q: "كيف تقول 'I'm lost'؟", options: ["أنا جائع", "لقد ضللت الطريق", "أنا متعب", "أنا عطشان"], answer: "لقد ضللت الطريق" },
    { q: "'النجدة!' تعني…", options: ["مرحباً!", "وداعاً!", "النجدة! / Help!", "شكراً!"], answer: "النجدة! / Help!" },
    { q: "ما معنى 'صبر'؟", options: ["الغضب", "الصبر والتحمل", "السعادة", "الخوف"], answer: "الصبر والتحمل" },
    { q: "كيف تقول 'I have a reservation'؟", options: ["أريد أن أطلب", "لدي حجز", "أنا نباتي", "أريد المغادرة"], answer: "لدي حجز" },
    { q: "كيف تترجم 'See you later'؟", options: ["صباح الخير", "مع السلامة", "مساء الخير", "شكراً"], answer: "مع السلامة" },
    { q: "ما معنى 'شوق'؟", options: ["غضب شديد", "شوق وتوق", "فرح عارم", "خوف عميق"], answer: "شوق وتوق" },
    { q: "كيف تقول 'Call the police!'؟", options: ["اتصل بالطبيب!", "اتصل بالشرطة!", "اتصل بالإسعاف!", "اتصل بسيارة أجرة!"], answer: "اتصل بالشرطة!" },
    { q: "كيف تقول 'Is breakfast included?'؟", options: ["هل العشاء مشمول؟", "هل الإفطار مشمول؟", "هل الغداء مشمول؟", "هل الواي فاي مشمول؟"], answer: "هل الإفطار مشمول؟" },
    { q: "'مرحباً' تعني…", options: ["وداعاً", "Hello", "شكراً", "من فضلك"], answer: "Hello" },
    { q: "ما معنى 'تعهد'؟", options: ["رفض", "التزام وعهد", "شك", "خسارة"], answer: "التزام وعهد" },
    { q: "كيف تقول 'Help!'؟", options: ["قف!", "النجدة!", "انتظر!", "اهرب!"], answer: "النجدة!" },
  ],
  nl: [
    { q: "Hoe zeg je 'Thank you' in het Nederlands?", options: ["Alsjeblieft", "Bedankt", "Hallo", "Doei"], answer: "Bedankt" },
    { q: "Wat betekent 'gezelligheid'?", options: ["Eenzaamheid", "Gezelligheid / cosiness", "Drukte", "Rust"], answer: "Gezelligheid / cosiness" },
    { q: "Hoe vertaal je 'The bill, please'?", options: ["De menukaart, alsjeblieft", "De rekening, alsjeblieft", "Het water, alsjeblieft", "Een tafel, alsjeblieft"], answer: "De rekening, alsjeblieft" },
    { q: "Wat betekent 'uitwaaien'?", options: ["Binnen blijven", "Buiten in de wind een frisse neus halen", "Hard werken", "Snel lopen"], answer: "Buiten in de wind een frisse neus halen" },
    { q: "Hoe zeg je 'I'm lost'?", options: ["Ik heb honger", "Ik ben verdwaald", "Ik ben moe", "Ik heb dorst"], answer: "Ik ben verdwaald" },
    { q: "'Help!' betekent…", options: ["Stop!", "Help!", "Wacht!", "Snel!"], answer: "Help!" },
    { q: "Wat betekent 'doe maar gewoon'?", options: ["Doe alles anders", "Gedraag je normaal", "Doe het snel", "Doe het anders"], answer: "Gedraag je normaal" },
    { q: "Hoe zeg je 'I have a reservation'?", options: ["Ik wil bestellen", "Ik heb een reservering", "Ik ben vegetariër", "Ik wil vertrekken"], answer: "Ik heb een reservering" },
    { q: "Wat betekent 'vrijmibo'?", options: ["Maandag ochtend vergadering", "Vrijdagmiddag borrel", "Weekend activiteit", "Lunchpauze"], answer: "Vrijdagmiddag borrel" },
    { q: "Hoe zeg je 'See you later'?", options: ["Goedemorgen", "Tot ziens", "Goedenacht", "Dank je"], answer: "Tot ziens" },
    { q: "Hoe zeg je 'Call the police!'?", options: ["Bel een dokter!", "Bel de politie!", "Bel een taxi!", "Bel een ambulance!"], answer: "Bel de politie!" },
    { q: "Hoe vertaal je 'Is breakfast included?'?", options: ["Is het avondeten inbegrepen?", "Is het ontbijt inbegrepen?", "Is de lunch inbegrepen?", "Is WiFi inbegrepen?"], answer: "Is het ontbijt inbegrepen?" },
    { q: "'Hallo' betekent…", options: ["Goodbye", "Thank you", "Hello", "Please"], answer: "Hello" },
    { q: "Wat is een 'gezellig' gevoel?", options: ["Verdrietig en alleen", "Warm, aangenaam en gezellig", "Nerveus en gestrest", "Koud en onprettig"], answer: "Warm, aangenaam en gezellig" },
    { q: "Hoe zeg je 'Help!' in het Nederlands?", options: ["Stop!", "Help!", "Wacht!", "Ren!"], answer: "Help!" },
  ],
};

// Pick 5 questions deterministically by day + lang
function getDailyQuestions(lang: LangCode): Question[] {
  const bank = QUESTION_BANK[lang] ?? QUESTION_BANK.en;
  const day = Math.floor(Date.now() / 86400000);
  const seed = day * 31 + lang.charCodeAt(0);
  const indices: number[] = [];
  let s = seed;
  while (indices.length < 5) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const idx = Math.abs(s) % bank.length;
    if (!indices.includes(idx)) indices.push(idx);
  }
  return indices.map(i => bank[i]);
}

// ── Confetti component ────────────────────────────────────────────────────────
function Confetti() {
  const colors = ["#f59e0b","#fbbf24","#10b981","#3b82f6","#8b5cf6","#ef4444"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 60}%`,
            backgroundColor: colors[i % colors.length],
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${0.6 + Math.random() * 0.8}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface LanguageQuizProps {
  lang: LangCode;
  langName: string;
  langFlag: string;
  onClose: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────
export function LanguageQuiz({ lang, langName, langFlag, onClose }: LanguageQuizProps) {
  const { toast } = useToast();
  const questions = getDailyQuestions(lang);
  const TOTAL = questions.length;

  const [step, setStep] = useState<"quiz" | "result">("quiz");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const { data: todayResult } = useQuery<{ completed: boolean; score?: number; total?: number }>({
    queryKey: ["/api/language/quiz/today", lang],
    queryFn: () => fetch(`/api/language/quiz/today?lang=${lang}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: leaderboard = [] } = useQuery<any[]>({
    queryKey: ["/api/language/quiz/leaderboard", lang],
    queryFn: () => fetch(`/api/language/quiz/leaderboard?lang=${lang}`, { credentials: "include" }).then(r => r.json()),
    enabled: step === "result",
  });

  const saveMutation = useMutation({
    mutationFn: (data: { lang: string; score: number; total: number }) =>
      apiRequest("POST", "/api/language/quiz/result", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/language/quiz/today", lang] });
      queryClient.invalidateQueries({ queryKey: ["/api/language/quiz/leaderboard", lang] });
    },
  });

  const score = answers.filter(Boolean).length;
  const q = questions[current];

  const handleSelect = (option: string) => {
    if (showFeedback) return;
    setSelected(option);
    setShowFeedback(true);
    const correct = option === q.answer;
    setTimeout(() => {
      const newAnswers = [...answers, correct];
      if (current + 1 < TOTAL) {
        setCurrent(c => c + 1);
        setSelected(null);
        setShowFeedback(false);
      } else {
        const finalScore = newAnswers.filter(Boolean).length;
        setAnswers(newAnswers);
        saveMutation.mutate({ lang, score: finalScore, total: TOTAL });
        setStep("result");
      }
      if (current + 1 < TOTAL) setAnswers(newAnswers);
    }, 900);
  };

  const getEmoji = (s: number) => {
    if (s === 5) return "🏆";
    if (s >= 4) return "⭐";
    if (s >= 3) return "👍";
    if (s >= 2) return "📚";
    return "💪";
  };

  const getMessage = (s: number) => {
    if (s === 5) return "¡Perfecto! ¡Dominas este idioma!";
    if (s >= 4) return "¡Muy bien! Casi perfecto.";
    if (s >= 3) return "¡Buen trabajo! Sigue practicando.";
    if (s >= 2) return "Vas por buen camino. ¡Tú puedes!";
    return "¡No te rindas! Mañana lo harás mejor.";
  };

  // Already completed today
  if (todayResult?.completed && step !== "result") {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-card rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
          <div className="text-center py-4">
            <div className="text-5xl mb-3">{getEmoji(todayResult.score ?? 0)}</div>
            <h2 className="text-xl font-bold mb-1">Quiz completado hoy</h2>
            <p className="text-muted-foreground text-sm mb-4">
              {langFlag} {langName} — Tu puntuación: <span className="font-bold text-amber-500">{todayResult.score}/{todayResult.total}</span>
            </p>
            <p className="text-sm text-muted-foreground">Vuelve mañana para nuevas preguntas.</p>
            <Button className="mt-5 bg-amber-500 hover:bg-amber-600 w-full" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">

        {/* ── Result screen ── */}
        {step === "result" && (
          <div className="relative p-6">
            <Confetti />
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted z-10">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center py-2 relative z-10">
              <div className="text-6xl mb-2">{getEmoji(score)}</div>
              <h2 className="text-2xl font-bold mb-1">{score}/{TOTAL}</h2>
              <p className="text-muted-foreground mb-1">{langFlag} {langName}</p>
              <p className="font-medium text-sm mb-5">{getMessage(score)}</p>

              {/* Stars */}
              <div className="flex justify-center gap-1 mb-5">
                {Array.from({ length: TOTAL }).map((_, i) => (
                  <Star key={i} className={`w-6 h-6 ${i < score ? "fill-amber-400 text-amber-400" : "text-muted fill-muted"}`} />
                ))}
              </div>

              {/* Answers review */}
              <div className="space-y-2 text-left mb-5">
                {questions.map((q, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-xl text-xs ${answers[i] ? "bg-green-500/10" : "bg-red-500/10"}`}>
                    {answers[i]
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-medium">{q.q}</p>
                      {!answers[i] && <p className="text-green-600 mt-0.5">✓ {q.answer}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Leaderboard */}
              {leaderboard.length > 0 && (
                <div className="rounded-2xl border bg-muted/30 p-3 text-left mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" /> Top hoy — {langFlag} {langName}
                  </p>
                  {leaderboard.slice(0, 5).map((u: any, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <span className="text-xs font-bold w-5 text-muted-foreground">{i + 1}.</span>
                      {u.profileImageUrl
                        ? <img src={u.profileImageUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                        : <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-600">{u.firstName?.[0]}</div>}
                      <span className="text-xs flex-1">{u.firstName}</span>
                      <span className="text-xs font-bold text-amber-500">{u.score}/{u.total}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={onClose}>
                ¡Hasta mañana! <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Quiz screen ── */}
        {step === "quiz" && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{langFlag}</span>
                <span className="font-semibold text-sm">{langName}</span>
                <span className="text-xs text-muted-foreground">— Quiz diario</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1.5 mb-5">
              {questions.map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < current ? "bg-amber-500" : i === current ? "bg-amber-500/50" : "bg-muted"
                }`} />
              ))}
            </div>

            {/* Question */}
            <div className="mb-5">
              <p className="text-xs text-muted-foreground mb-1">Pregunta {current + 1} de {TOTAL}</p>
              <p className="text-base font-semibold leading-snug">{q.q}</p>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {q.options.map(option => {
                let style = "border-border hover:border-amber-500/50 hover:bg-amber-500/5";
                if (showFeedback) {
                  if (option === q.answer) style = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                  else if (option === selected) style = "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
                  else style = "border-border opacity-40";
                }
                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    data-testid={`quiz-option-${option.slice(0,10).replace(/\s/g,'')}`}
                    className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${style} flex items-center justify-between`}
                  >
                    <span>{option}</span>
                    {showFeedback && option === q.answer && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    {showFeedback && option === selected && option !== q.answer && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Score live */}
            <div className="mt-4 flex justify-center gap-1">
              {answers.map((a, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${a ? "bg-green-500" : "bg-red-400"}`} />
              ))}
              {Array.from({ length: TOTAL - answers.length }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-muted" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
