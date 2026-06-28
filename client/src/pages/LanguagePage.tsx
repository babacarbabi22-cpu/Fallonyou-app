import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Languages, BookOpen, Users, Volume2, ChevronDown, Check, Zap } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-danceme";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { LanguageQuiz } from "@/components/LanguageQuiz";
import { useTranslation } from "@/lib/i18n";

// ── Static data ──────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", flag: "🇬🇧", name: "English",    native: "English"    },
  { code: "es", flag: "🇪🇸", name: "Español",    native: "Español"    },
  { code: "fr", flag: "🇫🇷", name: "Français",   native: "Français"   },
  { code: "it", flag: "🇮🇹", name: "Italiano",   native: "Italiano"   },
  { code: "pt", flag: "🇧🇷", name: "Português",  native: "Português"  },
  { code: "de", flag: "🇩🇪", name: "Deutsch",    native: "Deutsch"    },
  { code: "ja", flag: "🇯🇵", name: "Japanese",   native: "日本語"       },
  { code: "zh", flag: "🇨🇳", name: "Chinese",    native: "中文"         },
  { code: "ar", flag: "🇸🇦", name: "Arabic",     native: "العربية"     },
  { code: "nl", flag: "🇳🇱", name: "Dutch",      native: "Nederlands"  },
];

const CATEGORIES = [
  { id: "greetings",   emoji: "👋", label: "Saludos"      },
  { id: "airport",     emoji: "✈️", label: "Aeropuerto"   },
  { id: "restaurant",  emoji: "🍽️", label: "Restaurante"  },
  { id: "transport",   emoji: "🚌", label: "Transporte"   },
  { id: "hotel",       emoji: "🏨", label: "Hotel"        },
  { id: "emergency",   emoji: "🆘", label: "Emergencias"  },
  { id: "social",      emoji: "🤝", label: "Conocer gente"},
];

type LangCode = "en" | "es" | "fr" | "it" | "pt" | "de" | "ja" | "zh" | "ar" | "nl";
type CatId = "greetings" | "airport" | "restaurant" | "transport" | "hotel" | "emergency" | "social";

interface Phrase { phrase: string; phonetic: string; translation: string; }

const PHRASES: Record<LangCode, Record<CatId, Phrase[]>> = {
  en: {
    greetings:  [
      { phrase: "Hello!", phonetic: "HEH-loh", translation: "¡Hola!" },
      { phrase: "Good morning!", phonetic: "gud MOR-ning", translation: "¡Buenos días!" },
      { phrase: "Good evening!", phonetic: "gud EE-vning", translation: "¡Buenas tardes/noches!" },
      { phrase: "How are you?", phonetic: "hau ar yuu", translation: "¿Cómo estás?" },
      { phrase: "Nice to meet you!", phonetic: "nais tu meet yuu", translation: "¡Encantado/a de conocerte!" },
      { phrase: "Goodbye!", phonetic: "gud-BAI", translation: "¡Adiós!" },
      { phrase: "See you later!", phonetic: "see yuu LAY-ter", translation: "¡Hasta luego!" },
      { phrase: "Thank you very much!", phonetic: "zank yuu VE-ri mach", translation: "¡Muchas gracias!" },
    ],
    airport: [
      { phrase: "Where is check-in?", phonetic: "wer iz CHEK-in", translation: "¿Dónde está el check-in?" },
      { phrase: "Which gate is my flight?", phonetic: "wich geit iz mai flait", translation: "¿En qué puerta está mi vuelo?" },
      { phrase: "My flight is delayed.", phonetic: "mai flait iz di-LEID", translation: "Mi vuelo tiene retraso." },
      { phrase: "I missed my flight.", phonetic: "ai mist mai flait", translation: "He perdido mi vuelo." },
      { phrase: "Where do I collect my bags?", phonetic: "wer duu ai ko-LEKT mai bagz", translation: "¿Dónde recojo mi equipaje?" },
      { phrase: "My luggage is lost.", phonetic: "mai LA-gaj iz lost", translation: "Mi equipaje se ha perdido." },
      { phrase: "Where is passport control?", phonetic: "wer iz PAS-port kon-TROL", translation: "¿Dónde está el control de pasaportes?" },
      { phrase: "Where is the currency exchange?", phonetic: "wer iz da KUR-en-si eks-CHEINJ", translation: "¿Dónde está el cambio de moneda?" },
      { phrase: "Is there a bus to the city center?", phonetic: "iz der a bas tu da SI-ti SEN-ter", translation: "¿Hay un autobús al centro?" },
      { phrase: "I need to declare this.", phonetic: "ai need tu di-KLER dis", translation: "Necesito declarar esto." },
      { phrase: "Is this flight on time?", phonetic: "iz dis flait on taim", translation: "¿Sale puntual este vuelo?" },
      { phrase: "Where can I charge my phone?", phonetic: "wer kan ai charj mai fohn", translation: "¿Dónde puedo cargar el móvil?" },
    ],
    restaurant: [
      { phrase: "A table for two, please.", phonetic: "a TAY-bul for tuu plees", translation: "Una mesa para dos, por favor." },
      { phrase: "Can I see the menu?", phonetic: "kan ai see da MEN-yuu", translation: "¿Puedo ver el menú?" },
      { phrase: "I'd like to order.", phonetic: "aid laik tu OR-der", translation: "Me gustaría pedir." },
      { phrase: "The bill, please.", phonetic: "da bil plees", translation: "La cuenta, por favor." },
      { phrase: "Is there a vegetarian option?", phonetic: "is der a vej-e-TE-ri-an OP-shon", translation: "¿Hay opción vegetariana?" },
      { phrase: "It's delicious!", phonetic: "its de-LISH-us", translation: "¡Está delicioso!" },
      { phrase: "No allergies.", phonetic: "noh A-ler-jeez", translation: "Sin alergias." },
      { phrase: "Water, please.", phonetic: "WA-ter plees", translation: "Agua, por favor." },
    ],
    transport: [
      { phrase: "Where is the train station?", phonetic: "wer iz da trein STAY-shon", translation: "¿Dónde está la estación de tren?" },
      { phrase: "How much is the ticket?", phonetic: "hau mach iz da TIK-et", translation: "¿Cuánto cuesta el billete?" },
      { phrase: "One ticket to…, please.", phonetic: "wan TIK-et tu... plees", translation: "Un billete a…, por favor." },
      { phrase: "Which bus goes to…?", phonetic: "wich bas gohz tu", translation: "¿Qué autobús va a…?" },
      { phrase: "Can you call me a taxi?", phonetic: "kan yuu kol mi a TAK-si", translation: "¿Puede llamarme un taxi?" },
      { phrase: "I'm lost.", phonetic: "aim lost", translation: "Estoy perdido/a." },
      { phrase: "How far is it?", phonetic: "hau far iz it", translation: "¿A qué distancia está?" },
      { phrase: "Turn left / right.", phonetic: "tern left / rait", translation: "Gira a la izquierda / derecha." },
    ],
    hotel: [
      { phrase: "I have a reservation.", phonetic: "ai hav a res-er-VAY-shon", translation: "Tengo una reserva." },
      { phrase: "Check-in, please.", phonetic: "CHEK-in plees", translation: "Check-in, por favor." },
      { phrase: "What time is check-out?", phonetic: "wat taim iz CHEK-aut", translation: "¿A qué hora es el check-out?" },
      { phrase: "Is breakfast included?", phonetic: "iz BREK-fast in-KLUU-did", translation: "¿Está incluido el desayuno?" },
      { phrase: "The room is not clean.", phonetic: "da ruum iz not kleen", translation: "La habitación no está limpia." },
      { phrase: "Can I get extra towels?", phonetic: "kan ai get EK-stra TAU-els", translation: "¿Me pueden dar más toallas?" },
      { phrase: "The WiFi password, please.", phonetic: "da WAI-fai PAS-word plees", translation: "La contraseña del WiFi, por favor." },
      { phrase: "I'd like a late check-out.", phonetic: "aid laik a leit CHEK-aut", translation: "Me gustaría un check-out tardío." },
    ],
    emergency: [
      { phrase: "Help!", phonetic: "help", translation: "¡Ayuda!" },
      { phrase: "Call the police!", phonetic: "kol da po-LEES", translation: "¡Llama a la policía!" },
      { phrase: "I need a doctor.", phonetic: "ai need a DOK-tor", translation: "Necesito un médico." },
      { phrase: "Where is the hospital?", phonetic: "wer iz da HOS-pi-tal", translation: "¿Dónde está el hospital?" },
      { phrase: "I've been robbed.", phonetic: "aiv bin robd", translation: "Me han robado." },
      { phrase: "I'm allergic to…", phonetic: "aim a-LER-jik tu", translation: "Soy alérgico/a a…" },
      { phrase: "Please call an ambulance.", phonetic: "plees kol an AM-byoo-lans", translation: "Por favor, llama a una ambulancia." },
      { phrase: "I'm lost.", phonetic: "aim lost", translation: "Estoy perdido/a." },
    ],
    social: [
      { phrase: "What's your name?", phonetic: "wats yor neim", translation: "¿Cómo te llamas?" },
      { phrase: "Where are you from?", phonetic: "wer ar yuu from", translation: "¿De dónde eres?" },
      { phrase: "Do you speak Spanish?", phonetic: "duu yuu speek SPAN-ish", translation: "¿Hablas español?" },
      { phrase: "Can we be friends?", phonetic: "kan wii bee frendz", translation: "¿Podemos ser amigos?" },
      { phrase: "I'm learning English.", phonetic: "aim LER-ning ING-glish", translation: "Estoy aprendiendo inglés." },
      { phrase: "What do you do?", phonetic: "wat duu yuu duu", translation: "¿A qué te dedicas?" },
      { phrase: "I love traveling!", phonetic: "ai lav TRAV-el-ing", translation: "¡Me encanta viajar!" },
      { phrase: "Let's keep in touch!", phonetic: "lets keep in tach", translation: "¡Mantengámonos en contacto!" },
    ],
  },
  fr: {
    greetings: [
      { phrase: "Bonjour!", phonetic: "bon-ZHUR", translation: "¡Buenos días!" },
      { phrase: "Bonsoir!", phonetic: "bon-SWAR", translation: "¡Buenas noches!" },
      { phrase: "Comment ça va?", phonetic: "ko-MAH sa VA", translation: "¿Cómo estás?" },
      { phrase: "Enchanté(e)!", phonetic: "an-shan-TAY", translation: "¡Encantado/a!" },
      { phrase: "Au revoir!", phonetic: "oh ruh-VWAR", translation: "¡Adiós!" },
      { phrase: "Merci beaucoup!", phonetic: "mer-SEE boh-KOO", translation: "¡Muchas gracias!" },
      { phrase: "S'il vous plaît.", phonetic: "seel voo PLAY", translation: "Por favor." },
      { phrase: "De rien.", phonetic: "duh RYAHN", translation: "De nada." },
    ],
    airport: [
      { phrase: "Où est l'enregistrement?", phonetic: "oo eh lan-re-jis-tre-MAN", translation: "¿Dónde está el check-in?" },
      { phrase: "Quelle est ma porte d'embarquement?", phonetic: "kel eh ma port dam-bar-ke-MAN", translation: "¿En qué puerta está mi vuelo?" },
      { phrase: "Mon vol est retardé.", phonetic: "mon vol eh re-tar-DAY", translation: "Mi vuelo tiene retraso." },
      { phrase: "J'ai raté mon vol.", phonetic: "zhay ra-TAY mon vol", translation: "He perdido mi vuelo." },
      { phrase: "Où est le retrait des bagages?", phonetic: "oo eh luh re-TREH day ba-GAZH", translation: "¿Dónde recojo mi equipaje?" },
      { phrase: "Ma valise est perdue.", phonetic: "ma va-LEEZ eh per-DÜ", translation: "Mi maleta se ha perdido." },
      { phrase: "Où est le contrôle des passeports?", phonetic: "oo eh luh kon-TROL day pas-POR", translation: "¿Dónde está el control de pasaportes?" },
      { phrase: "Où est le bureau de change?", phonetic: "oo eh luh bü-RO duh shanzh", translation: "¿Dónde está el cambio de moneda?" },
      { phrase: "Y a-t-il une navette pour le centre?", phonetic: "ya-til ün na-VET poor luh SAN-truh", translation: "¿Hay un shuttle al centro?" },
      { phrase: "Je dois déclarer ceci.", phonetic: "zhuh dwa day-kla-RAY suh-SEE", translation: "Necesito declarar esto." },
      { phrase: "Ce vol est à l'heure?", phonetic: "suh vol eh ta LEUR", translation: "¿Sale puntual este vuelo?" },
      { phrase: "Où puis-je charger mon téléphone?", phonetic: "oo pwee-zhuh shar-ZHAY mon tay-le-FON", translation: "¿Dónde puedo cargar el móvil?" },
    ],
    restaurant: [
      { phrase: "Une table pour deux, s'il vous plaît.", phonetic: "ün TAB-luh poor duh seel voo play", translation: "Una mesa para dos, por favor." },
      { phrase: "La carte, s'il vous plaît.", phonetic: "la kart seel voo play", translation: "La carta, por favor." },
      { phrase: "Je voudrais commander.", phonetic: "zhuh voo-DREH ko-mahn-DAY", translation: "Me gustaría pedir." },
      { phrase: "L'addition, s'il vous plaît.", phonetic: "la-dee-SYOH seel voo play", translation: "La cuenta, por favor." },
      { phrase: "C'est délicieux!", phonetic: "say day-lee-SYUH", translation: "¡Está delicioso!" },
      { phrase: "De l'eau, s'il vous plaît.", phonetic: "duh loh seel voo play", translation: "Agua, por favor." },
      { phrase: "Sans gluten?", phonetic: "sah gloo-TAHN", translation: "¿Sin gluten?" },
      { phrase: "Le service est compris?", phonetic: "luh ser-VEES eh kom-PREE", translation: "¿Está incluido el servicio?" },
    ],
    transport: [
      { phrase: "Où est la gare?", phonetic: "oo eh la gar", translation: "¿Dónde está la estación?" },
      { phrase: "Un billet pour…, s'il vous plaît.", phonetic: "uh bee-YEH poor seel voo play", translation: "Un billete a…, por favor." },
      { phrase: "Quel bus va à…?", phonetic: "kel büs va a", translation: "¿Qué autobús va a…?" },
      { phrase: "Je suis perdu(e).", phonetic: "zhuh swee per-DÜ", translation: "Estoy perdido/a." },
      { phrase: "Appelez-moi un taxi.", phonetic: "ap-LAY mwa uh tak-SEE", translation: "Llámeme un taxi." },
      { phrase: "C'est loin?", phonetic: "say LWAHN", translation: "¿Está lejos?" },
      { phrase: "Tournez à gauche / droite.", phonetic: "toor-NAY a gohsh / drwat", translation: "Gire a la izquierda / derecha." },
      { phrase: "Le prochain métro?", phonetic: "luh pro-SHAN may-TROH", translation: "¿El próximo metro?" },
    ],
    hotel: [
      { phrase: "J'ai une réservation.", phonetic: "zhay ün ray-zer-va-SYOH", translation: "Tengo una reserva." },
      { phrase: "À quelle heure est le check-out?", phonetic: "a kel ur eh luh CHEK-aut", translation: "¿A qué hora es el check-out?" },
      { phrase: "Le petit-déjeuner est inclus?", phonetic: "luh puh-tee day-ZHUH-nay eh tan-KLÜ", translation: "¿Está incluido el desayuno?" },
      { phrase: "Le mot de passe WiFi?", phonetic: "luh moh duh pas WI-fi", translation: "¿La contraseña del WiFi?" },
      { phrase: "La chambre n'est pas propre.", phonetic: "la SHAHM-bruh neh pa propr", translation: "La habitación no está limpia." },
      { phrase: "Des serviettes supplémentaires?", phonetic: "day ser-VYET sü-play-mahn-TER", translation: "¿Más toallas?" },
      { phrase: "Peut-on garder les bagages?", phonetic: "puh-TOH gar-DAY lay ba-GAZH", translation: "¿Pueden guardar el equipaje?" },
      { phrase: "Merci pour tout.", phonetic: "mer-SEE poor too", translation: "Gracias por todo." },
    ],
    emergency: [
      { phrase: "Au secours!", phonetic: "oh suh-KOOR", translation: "¡Ayuda!" },
      { phrase: "Appelez la police!", phonetic: "ap-LAY la po-LEES", translation: "¡Llame a la policía!" },
      { phrase: "J'ai besoin d'un médecin.", phonetic: "zhay buh-ZWAHN duh may-SAHN", translation: "Necesito un médico." },
      { phrase: "Où est l'hôpital?", phonetic: "oo eh lo-pee-TAL", translation: "¿Dónde está el hospital?" },
      { phrase: "On m'a volé.", phonetic: "oh ma vo-LAY", translation: "Me han robado." },
      { phrase: "Je suis allergique à…", phonetic: "zhuh swee a-ler-ZHEEK a", translation: "Soy alérgico/a a…" },
      { phrase: "Appelez une ambulance.", phonetic: "ap-LAY ün ahm-bü-LAHNS", translation: "Llame a una ambulancia." },
      { phrase: "Vite!", phonetic: "veet", translation: "¡Rápido!" },
    ],
    social: [
      { phrase: "Comment vous appelez-vous?", phonetic: "ko-MAH voo za-play-VOO", translation: "¿Cómo se llama?" },
      { phrase: "D'où venez-vous?", phonetic: "doo vuh-NAY voo", translation: "¿De dónde es?" },
      { phrase: "Parlez-vous espagnol?", phonetic: "par-LAY voo es-pa-NYOL", translation: "¿Habla español?" },
      { phrase: "J'apprends le français.", phonetic: "zhap-RAHN luh fran-SAY", translation: "Estoy aprendiendo francés." },
      { phrase: "J'adore voyager!", phonetic: "zha-DOR vwa-ya-ZHAY", translation: "¡Me encanta viajar!" },
      { phrase: "On reste en contact!", phonetic: "oh rest ah kon-TAKT", translation: "¡Mantengámonos en contacto!" },
      { phrase: "Vous faites quoi dans la vie?", phonetic: "voo fet kwa dah la vee", translation: "¿A qué se dedica?" },
      { phrase: "Enchanté(e) de vous connaître!", phonetic: "an-shan-TAY duh voo ko-NETR", translation: "¡Encantado/a de conocerle!" },
    ],
  },
  it: {
    greetings:  [
      { phrase: "Ciao!", phonetic: "CHAO", translation: "¡Hola! / ¡Adiós!" },
      { phrase: "Buongiorno!", phonetic: "bwon-JIOR-no", translation: "¡Buenos días!" },
      { phrase: "Buonasera!", phonetic: "bwona-SE-ra", translation: "¡Buenas tardes/noches!" },
      { phrase: "Come stai?", phonetic: "KO-me STAI", translation: "¿Cómo estás?" },
      { phrase: "Piacere!", phonetic: "pia-CHE-re", translation: "¡Encantado/a!" },
      { phrase: "Arrivederci!", phonetic: "a-ri-ve-DER-chi", translation: "¡Hasta la vista!" },
      { phrase: "Grazie mille!", phonetic: "GRA-tsie MIL-le", translation: "¡Muchas gracias!" },
      { phrase: "Per favore.", phonetic: "per fa-VO-re", translation: "Por favor." },
    ],
    airport: [
      { phrase: "Dove è il check-in?", phonetic: "DO-ve è il CHEK-in", translation: "¿Dónde está el check-in?" },
      { phrase: "Qual è il mio gate?", phonetic: "kwal è il MI-o geit", translation: "¿En qué puerta está mi vuelo?" },
      { phrase: "Il mio volo è in ritardo.", phonetic: "il MI-o VO-lo è in ri-TAR-do", translation: "Mi vuelo tiene retraso." },
      { phrase: "Ho perso il mio volo.", phonetic: "ò PER-so il MI-o VO-lo", translation: "He perdido mi vuelo." },
      { phrase: "Dove ritiro i bagagli?", phonetic: "DO-ve ri-TI-ro i ba-GA-li", translation: "¿Dónde recojo mi equipaje?" },
      { phrase: "Il mio bagaglio è perso.", phonetic: "il MI-o ba-GA-lio è PER-so", translation: "Mi equipaje se ha perdido." },
      { phrase: "Dov'è il controllo passaporti?", phonetic: "do-VÈ il kon-TROL-lo pas-sa-POR-ti", translation: "¿Dónde está el control de pasaportes?" },
      { phrase: "Dov'è il cambio valuta?", phonetic: "do-VÈ il KAM-bio va-LU-ta", translation: "¿Dónde está el cambio de moneda?" },
      { phrase: "C'è un bus per il centro?", phonetic: "chè un bus per il CHEN-tro", translation: "¿Hay un autobús al centro?" },
      { phrase: "Devo dichiarare questo.", phonetic: "DE-vo di-kia-RA-re KUES-to", translation: "Necesito declarar esto." },
      { phrase: "Il volo è puntuale?", phonetic: "il VO-lo è pun-TUA-le", translation: "¿Sale puntual el vuelo?" },
      { phrase: "Dove posso caricare il telefono?", phonetic: "DO-ve POS-so ka-ri-KA-re il te-LE-fo-no", translation: "¿Dónde puedo cargar el móvil?" },
    ],
    restaurant: [
      { phrase: "Un tavolo per due, per favore.", phonetic: "un TA-vo-lo per DU-e per fa-VO-re", translation: "Una mesa para dos, por favor." },
      { phrase: "Il menù, per favore.", phonetic: "il me-NÙ per fa-VO-re", translation: "El menú, por favor." },
      { phrase: "Vorrei ordinare.", phonetic: "vor-RAY or-di-NA-re", translation: "Me gustaría pedir." },
      { phrase: "Il conto, per favore.", phonetic: "il KON-to per fa-VO-re", translation: "La cuenta, por favor." },
      { phrase: "È delizioso!", phonetic: "è de-li-TSIO-so", translation: "¡Está delicioso!" },
      { phrase: "Acqua, per favore.", phonetic: "AK-kwa per fa-VO-re", translation: "Agua, por favor." },
      { phrase: "Sono vegetariano/a.", phonetic: "SO-no ve-ge-ta-RIA-no", translation: "Soy vegetariano/a." },
      { phrase: "Senza glutine?", phonetic: "SEN-tsa GLU-ti-ne", translation: "¿Sin gluten?" },
    ],
    transport: [
      { phrase: "Dov'è la stazione?", phonetic: "do-VÈ la sta-TSIO-ne", translation: "¿Dónde está la estación?" },
      { phrase: "Un biglietto per…, per favore.", phonetic: "un bi-LIET-to per... per fa-VO-re", translation: "Un billete a…, por favor." },
      { phrase: "Quale autobus va a…?", phonetic: "KWA-le AU-to-bus va a", translation: "¿Qué autobús va a…?" },
      { phrase: "Mi sono perso/a.", phonetic: "mi SO-no PER-so", translation: "Estoy perdido/a." },
      { phrase: "Può chiamarmi un taxi?", phonetic: "pwò kia-MAR-mi un TAK-si", translation: "¿Puede llamarme un taxi?" },
      { phrase: "È lontano?", phonetic: "è lon-TA-no", translation: "¿Está lejos?" },
      { phrase: "Giri a sinistra / destra.", phonetic: "JI-ri a si-NIS-tra / DES-tra", translation: "Gire a la izquierda / derecha." },
      { phrase: "Dove posso prendere il metro?", phonetic: "DO-ve POS-so PREN-de-re il ME-tro", translation: "¿Dónde puedo coger el metro?" },
    ],
    hotel: [
      { phrase: "Ho una prenotazione.", phonetic: "ò U-na pre-no-ta-TSIO-ne", translation: "Tengo una reserva." },
      { phrase: "A che ora è il check-out?", phonetic: "a ke O-ra è il CHEK-aut", translation: "¿A qué hora es el check-out?" },
      { phrase: "La colazione è inclusa?", phonetic: "la ko-la-TSIO-ne è in-KLU-sa", translation: "¿Está incluido el desayuno?" },
      { phrase: "La password del WiFi?", phonetic: "la PAS-word del WAI-fai", translation: "¿La contraseña del WiFi?" },
      { phrase: "La camera non è pulita.", phonetic: "la KA-me-ra non è pu-LI-ta", translation: "La habitación no está limpia." },
      { phrase: "Asciugamani extra, per favore.", phonetic: "a-shu-ga-MA-ni EKS-tra per fa-VO-re", translation: "Toallas extra, por favor." },
      { phrase: "Grazie per tutto.", phonetic: "GRA-tsie per TUT-to", translation: "Gracias por todo." },
      { phrase: "Posso avere la ricevuta?", phonetic: "POS-so a-VE-re la ri-che-VU-ta", translation: "¿Puedo tener el recibo?" },
    ],
    emergency: [
      { phrase: "Aiuto!", phonetic: "a-IU-to", translation: "¡Ayuda!" },
      { phrase: "Chiamate la polizia!", phonetic: "kia-MA-te la po-LI-tsia", translation: "¡Llamen a la policía!" },
      { phrase: "Ho bisogno di un medico.", phonetic: "ò bi-ZO-nyo di un ME-di-ko", translation: "Necesito un médico." },
      { phrase: "Dov'è l'ospedale?", phonetic: "do-VÈ los-pe-DA-le", translation: "¿Dónde está el hospital?" },
      { phrase: "Mi hanno derubato.", phonetic: "mi AN-no de-ru-BA-to", translation: "Me han robado." },
      { phrase: "Sono allergico/a a…", phonetic: "SO-no al-LER-ji-ko a", translation: "Soy alérgico/a a…" },
      { phrase: "Chiamate un'ambulanza!", phonetic: "kia-MA-te u-nam-bu-LAN-tsa", translation: "¡Llamen a una ambulancia!" },
      { phrase: "Presto!", phonetic: "PRES-to", translation: "¡Rápido!" },
    ],
    social: [
      { phrase: "Come ti chiami?", phonetic: "KO-me ti KIA-mi", translation: "¿Cómo te llamas?" },
      { phrase: "Di dove sei?", phonetic: "di DO-ve SEI", translation: "¿De dónde eres?" },
      { phrase: "Parli spagnolo?", phonetic: "PAR-li spa-NYO-lo", translation: "¿Hablas español?" },
      { phrase: "Sto imparando l'italiano.", phonetic: "sto im-pa-RAN-do li-ta-LIA-no", translation: "Estoy aprendiendo italiano." },
      { phrase: "Adoro viaggiare!", phonetic: "a-DO-ro via-JA-re", translation: "¡Me encanta viajar!" },
      { phrase: "Restiamo in contatto!", phonetic: "res-TIA-mo in kon-TAT-to", translation: "¡Mantengámonos en contacto!" },
      { phrase: "Che lavoro fai?", phonetic: "ke la-VO-ro FAI", translation: "¿A qué te dedicas?" },
      { phrase: "Piacere di conoscerti!", phonetic: "pia-CHE-re di ko-NO-sher-ti", translation: "¡Encantado/a de conocerte!" },
    ],
  },
  pt: {
    greetings: [
      { phrase: "Olá!", phonetic: "o-LÁ", translation: "¡Hola!" },
      { phrase: "Bom dia!", phonetic: "bom JIA", translation: "¡Buenos días!" },
      { phrase: "Boa tarde!", phonetic: "BO-a TAR-je", translation: "¡Buenas tardes!" },
      { phrase: "Como vai?", phonetic: "KO-mu vai", translation: "¿Cómo estás?" },
      { phrase: "Prazer em conhecê-lo/la!", phonetic: "pra-ZER em ko-nye-SÊ-lu", translation: "¡Encantado/a de conocerle!" },
      { phrase: "Tchau!", phonetic: "chau", translation: "¡Adiós!" },
      { phrase: "Muito obrigado/a!", phonetic: "MUI-tu o-bri-GA-du", translation: "¡Muchas gracias!" },
      { phrase: "Por favor.", phonetic: "por fa-VOR", translation: "Por favor." },
    ],
    airport: [
      { phrase: "Onde é o check-in?", phonetic: "ON-je é u CHEK-in", translation: "¿Dónde está el check-in?" },
      { phrase: "Qual é o meu portão?", phonetic: "kwal é u MEU por-TÃO", translation: "¿En qué puerta está mi vuelo?" },
      { phrase: "Meu voo está atrasado.", phonetic: "MEU VO-u es-TÁ a-tra-ZA-du", translation: "Mi vuelo tiene retraso." },
      { phrase: "Perdi meu voo.", phonetic: "PER-ji MEU VO-u", translation: "He perdido mi vuelo." },
      { phrase: "Onde retiro a bagagem?", phonetic: "ON-je he-TI-ru a ba-GA-zhem", translation: "¿Dónde recojo mi equipaje?" },
      { phrase: "Minha bagagem está perdida.", phonetic: "MI-nya ba-GA-zhem es-TÁ per-JI-da", translation: "Mi equipaje se ha perdido." },
      { phrase: "Onde fica o controle de passaportes?", phonetic: "ON-je FI-ka u kon-TRO-le de pa-sa-POR-tes", translation: "¿Dónde está el control de pasaportes?" },
      { phrase: "Onde fica o câmbio?", phonetic: "ON-je FI-ka u KAM-biu", translation: "¿Dónde está el cambio de moneda?" },
      { phrase: "Tem algum ônibus para o centro?", phonetic: "tem AL-gum O-ni-bus PA-ra u SEN-tru", translation: "¿Hay autobús al centro?" },
      { phrase: "Preciso declarar isto.", phonetic: "pre-SI-zu de-kla-RAR IS-tu", translation: "Necesito declarar esto." },
      { phrase: "Este voo está no horário?", phonetic: "ES-te VO-u es-TÁ nu o-RÁ-riu", translation: "¿Sale puntual este vuelo?" },
      { phrase: "Onde posso carregar o celular?", phonetic: "ON-je PO-su ka-he-GAR u se-lu-LAR", translation: "¿Dónde puedo cargar el móvil?" },
    ],
    restaurant: [
      { phrase: "Uma mesa para dois, por favor.", phonetic: "U-ma ME-za PA-ra dois por fa-VOR", translation: "Una mesa para dos, por favor." },
      { phrase: "O cardápio, por favor.", phonetic: "u kar-DÁ-piu por fa-VOR", translation: "El menú, por favor." },
      { phrase: "A conta, por favor.", phonetic: "a KON-ta por fa-VOR", translation: "La cuenta, por favor." },
      { phrase: "Está delicioso!", phonetic: "es-TÁ de-li-SIO-zu", translation: "¡Está delicioso!" },
      { phrase: "Água, por favor.", phonetic: "Á-gwa por fa-VOR", translation: "Agua, por favor." },
      { phrase: "Sou vegetariano/a.", phonetic: "so ve-je-ta-RIA-nu", translation: "Soy vegetariano/a." },
      { phrase: "Sem glúten?", phonetic: "sem GLU-ten", translation: "¿Sin gluten?" },
      { phrase: "O serviço está incluído?", phonetic: "u ser-VI-su es-TÁ in-klu-I-du", translation: "¿Está incluido el servicio?" },
    ],
    transport: [
      { phrase: "Onde fica a estação?", phonetic: "ON-je FI-ka a es-ta-SÃO", translation: "¿Dónde está la estación?" },
      { phrase: "Um bilhete para…, por favor.", phonetic: "um bi-LYE-te PA-ra por fa-VOR", translation: "Un billete a…, por favor." },
      { phrase: "Estou perdido/a.", phonetic: "es-TO per-JI-du", translation: "Estoy perdido/a." },
      { phrase: "Pode chamar um táxi?", phonetic: "PO-je sha-MAR um TÁK-si", translation: "¿Puede llamar un taxi?" },
      { phrase: "Fica longe?", phonetic: "FI-ka LON-je", translation: "¿Está lejos?" },
      { phrase: "Vire à esquerda / direita.", phonetic: "VI-re a es-KER-da / di-REI-ta", translation: "Gire a la izquierda / derecha." },
      { phrase: "Qual ônibus vai para…?", phonetic: "kwal O-ni-bus vai PA-ra", translation: "¿Qué autobús va a…?" },
      { phrase: "Onde posso pegar o metrô?", phonetic: "ON-je PO-su pe-GAR u me-TRÔ", translation: "¿Dónde puedo coger el metro?" },
    ],
    hotel: [
      { phrase: "Tenho uma reserva.", phonetic: "TEN-yu U-ma he-ZER-va", translation: "Tengo una reserva." },
      { phrase: "Café da manhã incluído?", phonetic: "ka-FE da ma-NYÃ in-klu-I-du", translation: "¿Desayuno incluido?" },
      { phrase: "A senha do WiFi?", phonetic: "a SE-nya du WAI-fai", translation: "¿La contraseña del WiFi?" },
      { phrase: "O quarto não está limpo.", phonetic: "u KWAR-tu não es-TÁ LIM-pu", translation: "La habitación no está limpia." },
      { phrase: "Toalhas extras, por favor.", phonetic: "to-A-lyas EKS-tras por fa-VOR", translation: "Toallas extra, por favor." },
      { phrase: "Obrigado/a por tudo.", phonetic: "o-bri-GA-du por TU-du", translation: "Gracias por todo." },
      { phrase: "Posso fazer o check-out mais tarde?", phonetic: "PO-su fa-ZER u CHEK-aut mais TAR-je", translation: "¿Puedo hacer el check-out más tarde?" },
      { phrase: "O quarto tem ar-condicionado?", phonetic: "u KWAR-tu tem ar kon-di-sio-NA-du", translation: "¿La habitación tiene aire acondicionado?" },
    ],
    emergency: [
      { phrase: "Socorro!", phonetic: "so-KO-hu", translation: "¡Ayuda!" },
      { phrase: "Chame a polícia!", phonetic: "SHA-me a po-LI-sia", translation: "¡Llame a la policía!" },
      { phrase: "Preciso de um médico.", phonetic: "pre-SI-zu de um ME-di-ku", translation: "Necesito un médico." },
      { phrase: "Onde fica o hospital?", phonetic: "ON-je FI-ka u os-pi-TAL", translation: "¿Dónde está el hospital?" },
      { phrase: "Fui roubado/a.", phonetic: "fui ho-BA-du", translation: "Me han robado." },
      { phrase: "Sou alérgico/a a…", phonetic: "so a-LER-ji-ku a", translation: "Soy alérgico/a a…" },
      { phrase: "Chame uma ambulância!", phonetic: "SHA-me U-ma am-bu-LÂN-sia", translation: "¡Llame a una ambulancia!" },
      { phrase: "Depressa!", phonetic: "de-PRE-sa", translation: "¡Rápido!" },
    ],
    social: [
      { phrase: "Como você se chama?", phonetic: "KO-mu vo-SE se SHA-ma", translation: "¿Cómo te llamas?" },
      { phrase: "De onde você é?", phonetic: "je ON-je vo-SE É", translation: "¿De dónde eres?" },
      { phrase: "Você fala espanhol?", phonetic: "vo-SE FA-la es-pa-NYOL", translation: "¿Hablas español?" },
      { phrase: "Estou aprendendo português.", phonetic: "es-TO a-pren-DEN-du por-tu-GES", translation: "Estoy aprendiendo portugués." },
      { phrase: "Adoro viajar!", phonetic: "a-DO-hu via-JAR", translation: "¡Me encanta viajar!" },
      { phrase: "Vamos nos manter em contato!", phonetic: "VA-mus nus man-TER em kon-TA-tu", translation: "¡Mantengámonos en contacto!" },
      { phrase: "O que você faz da vida?", phonetic: "u ke vo-SE faz da VI-da", translation: "¿A qué te dedicas?" },
      { phrase: "Prazer em te conhecer!", phonetic: "pra-ZER em te ko-nye-SER", translation: "¡Encantado/a de conocerte!" },
    ],
  },
  de: {
    greetings: [
      { phrase: "Hallo!", phonetic: "HA-lo", translation: "¡Hola!" },
      { phrase: "Guten Morgen!", phonetic: "GU-ten MOR-gen", translation: "¡Buenos días!" },
      { phrase: "Guten Abend!", phonetic: "GU-ten A-bent", translation: "¡Buenas noches!" },
      { phrase: "Wie geht's?", phonetic: "vee GEYTS", translation: "¿Cómo estás?" },
      { phrase: "Schön, Sie kennenzulernen!", phonetic: "shern zee KEN-nen-tsu-ler-nen", translation: "¡Encantado/a de conocerle!" },
      { phrase: "Auf Wiedersehen!", phonetic: "auf VEE-der-zey-en", translation: "¡Hasta la vista!" },
      { phrase: "Danke sehr!", phonetic: "DANG-ke zeyr", translation: "¡Muchas gracias!" },
      { phrase: "Bitte.", phonetic: "BIT-te", translation: "Por favor / De nada." },
    ],
    airport: [
      { phrase: "Wo ist der Check-in?", phonetic: "vo ist der CHEK-in", translation: "¿Dónde está el check-in?" },
      { phrase: "Welches Gate hat mein Flug?", phonetic: "VEL-shes geit hat main flug", translation: "¿En qué puerta está mi vuelo?" },
      { phrase: "Mein Flug hat Verspätung.", phonetic: "main flug hat fer-SHPEY-tung", translation: "Mi vuelo tiene retraso." },
      { phrase: "Ich habe meinen Flug verpasst.", phonetic: "ish HA-be MAI-nen flug fer-PAST", translation: "He perdido mi vuelo." },
      { phrase: "Wo hole ich mein Gepäck ab?", phonetic: "vo HO-le ish main ge-PEK ap", translation: "¿Dónde recojo mi equipaje?" },
      { phrase: "Mein Gepäck ist verloren.", phonetic: "main ge-PEK ist fer-LO-ren", translation: "Mi equipaje se ha perdido." },
      { phrase: "Wo ist die Passkontrolle?", phonetic: "vo ist dee PAS-kon-tro-le", translation: "¿Dónde está el control de pasaportes?" },
      { phrase: "Wo ist die Geldwechselstube?", phonetic: "vo ist dee GELT-vek-sel-shtu-be", translation: "¿Dónde está el cambio de moneda?" },
      { phrase: "Gibt es einen Bus ins Zentrum?", phonetic: "gibt es AI-nen bus ins TSEN-trum", translation: "¿Hay un autobús al centro?" },
      { phrase: "Ich muss das verzollen.", phonetic: "ish mus das fer-TSOL-len", translation: "Necesito declarar esto." },
      { phrase: "Ist der Flug pünktlich?", phonetic: "ist der flug PÜNKT-lish", translation: "¿Sale puntual el vuelo?" },
      { phrase: "Wo kann ich mein Handy laden?", phonetic: "vo kan ish main HAN-di LA-den", translation: "¿Dónde puedo cargar el móvil?" },
    ],
    restaurant: [
      { phrase: "Einen Tisch für zwei, bitte.", phonetic: "AI-nen tish führ tsvai BIT-te", translation: "Una mesa para dos, por favor." },
      { phrase: "Die Speisekarte, bitte.", phonetic: "dee SHPAI-ze-kar-te BIT-te", translation: "La carta, por favor." },
      { phrase: "Die Rechnung, bitte.", phonetic: "dee RECH-nung BIT-te", translation: "La cuenta, por favor." },
      { phrase: "Es ist köstlich!", phonetic: "es ist KERST-lish", translation: "¡Está delicioso!" },
      { phrase: "Wasser, bitte.", phonetic: "VAS-ser BIT-te", translation: "Agua, por favor." },
      { phrase: "Ich bin Vegetarier/in.", phonetic: "ish bin ve-ge-TA-ri-er", translation: "Soy vegetariano/a." },
      { phrase: "Glutenfrei?", phonetic: "GLU-ten-frai", translation: "¿Sin gluten?" },
      { phrase: "Ist das Service inbegriffen?", phonetic: "ist das SER-vis IN-be-grif-fen", translation: "¿Está incluido el servicio?" },
    ],
    transport: [
      { phrase: "Wo ist der Bahnhof?", phonetic: "vo ist der BAN-hof", translation: "¿Dónde está la estación?" },
      { phrase: "Eine Fahrkarte nach…, bitte.", phonetic: "AI-ne FAR-kar-te nakh BIT-te", translation: "Un billete a…, por favor." },
      { phrase: "Ich habe mich verlaufen.", phonetic: "ish HA-be mish fer-LAU-fen", translation: "Estoy perdido/a." },
      { phrase: "Können Sie mir ein Taxi rufen?", phonetic: "KER-nen zee mir ain TAK-si RU-fen", translation: "¿Puede llamarme un taxi?" },
      { phrase: "Ist es weit?", phonetic: "ist es vait", translation: "¿Está lejos?" },
      { phrase: "Links / Rechts abbiegen.", phonetic: "links / rechts AB-bee-gen", translation: "Gire a la izquierda / derecha." },
      { phrase: "Welcher Bus fährt nach…?", phonetic: "VEL-sher bus feyrt nakh", translation: "¿Qué autobús va a…?" },
      { phrase: "Die U-Bahn-Station?", phonetic: "dee OO-ban-shta-TSION", translation: "¿La estación de metro?" },
    ],
    hotel: [
      { phrase: "Ich habe eine Reservierung.", phonetic: "ish HA-be AI-ne re-zer-VEER-ung", translation: "Tengo una reserva." },
      { phrase: "Wann ist Check-out?", phonetic: "van ist CHEK-aut", translation: "¿Cuándo es el check-out?" },
      { phrase: "Ist Frühstück inbegriffen?", phonetic: "ist FRÜ-shtük IN-be-grif-fen", translation: "¿Está incluido el desayuno?" },
      { phrase: "Das WLAN-Passwort?", phonetic: "das VEY-lan PAS-vort", translation: "¿La contraseña del WiFi?" },
      { phrase: "Das Zimmer ist nicht sauber.", phonetic: "das TSIM-mer ist nisht ZAU-ber", translation: "La habitación no está limpia." },
      { phrase: "Handtücher, bitte.", phonetic: "HANT-tü-sher BIT-te", translation: "Toallas, por favor." },
      { phrase: "Danke für alles.", phonetic: "DANG-ke für A-les", translation: "Gracias por todo." },
      { phrase: "Kann ich später auschecken?", phonetic: "kan ish SHPEY-ter AUS-she-ken", translation: "¿Puedo hacer el check-out más tarde?" },
    ],
    emergency: [
      { phrase: "Hilfe!", phonetic: "HIL-fe", translation: "¡Ayuda!" },
      { phrase: "Rufen Sie die Polizei!", phonetic: "RU-fen zee dee po-li-TSAI", translation: "¡Llame a la policía!" },
      { phrase: "Ich brauche einen Arzt.", phonetic: "ish BRAU-khe AI-nen artst", translation: "Necesito un médico." },
      { phrase: "Wo ist das Krankenhaus?", phonetic: "vo ist das KRAN-ken-haus", translation: "¿Dónde está el hospital?" },
      { phrase: "Ich wurde bestohlen.", phonetic: "ish VUR-de be-SHTO-len", translation: "Me han robado." },
      { phrase: "Ich bin allergisch gegen…", phonetic: "ish bin a-LER-gish GEY-gen", translation: "Soy alérgico/a a…" },
      { phrase: "Rufen Sie einen Krankenwagen!", phonetic: "RU-fen zee AI-nen KRAN-ken-va-gen", translation: "¡Llame a una ambulancia!" },
      { phrase: "Schnell!", phonetic: "shnel", translation: "¡Rápido!" },
    ],
    social: [
      { phrase: "Wie heißen Sie?", phonetic: "vee HAI-sen zee", translation: "¿Cómo se llama?" },
      { phrase: "Woher kommen Sie?", phonetic: "vo-HEYR KO-men zee", translation: "¿De dónde es?" },
      { phrase: "Sprechen Sie Spanisch?", phonetic: "SHPRE-khen zee SHPA-nish", translation: "¿Habla español?" },
      { phrase: "Ich lerne Deutsch.", phonetic: "ish LER-ne doitch", translation: "Estoy aprendiendo alemán." },
      { phrase: "Ich liebe es zu reisen!", phonetic: "ish LEE-be es tsu RAI-zen", translation: "¡Me encanta viajar!" },
      { phrase: "Bleiben wir in Kontakt!", phonetic: "BLAI-ben veer in KON-takt", translation: "¡Mantengámonos en contacto!" },
      { phrase: "Was machen Sie beruflich?", phonetic: "vas MA-khen zee be-ROOF-lish", translation: "¿A qué se dedica?" },
      { phrase: "Schön, Sie kennenzulernen!", phonetic: "shern zee KEN-nen-tsu-ler-nen", translation: "¡Encantado/a de conocerle!" },
    ],
  },
  ja: {
    greetings: [
      { phrase: "こんにちは！", phonetic: "Kon-ni-CHI-wa", translation: "¡Hola!" },
      { phrase: "おはようございます！", phonetic: "O-ha-yō GO-zai-ma-su", translation: "¡Buenos días!" },
      { phrase: "こんばんは！", phonetic: "Kon-BAN-wa", translation: "¡Buenas noches!" },
      { phrase: "お元気ですか？", phonetic: "O-GEN-ki de-su ka", translation: "¿Cómo estás?" },
      { phrase: "はじめまして！", phonetic: "Ha-ji-ME-ma-shi-te", translation: "¡Encantado/a de conocerte!" },
      { phrase: "さようなら！", phonetic: "Sa-yō-NA-ra", translation: "¡Adiós!" },
      { phrase: "ありがとうございます！", phonetic: "A-ri-ga-TŌ GO-zai-ma-su", translation: "¡Muchas gracias!" },
      { phrase: "よろしくお願いします。", phonetic: "Yo-RO-shi-ku o-ne-gai shi-MA-su", translation: "Es un placer / Con tu ayuda." },
    ],
    airport: [
      { phrase: "チェックインはどこですか？", phonetic: "Chek-KU-in wa DO-ko de-su ka", translation: "¿Dónde está el check-in?" },
      { phrase: "私のゲートはどこですか？", phonetic: "wa-TA-shi no GĒ-to wa DO-ko de-su ka", translation: "¿En qué puerta está mi vuelo?" },
      { phrase: "フライトが遅延しています。", phonetic: "fu-RAI-to ga chi-EN shi-te i-MA-su", translation: "Mi vuelo tiene retraso." },
      { phrase: "フライトに乗り遅れました。", phonetic: "fu-RAI-to ni no-ri-O-ku-re-ma-shi-ta", translation: "He perdido mi vuelo." },
      { phrase: "手荷物はどこで受け取れますか？", phonetic: "te-NI-mo-tsu wa DO-ko de u-ke-TO-re-ma-su ka", translation: "¿Dónde recojo mi equipaje?" },
      { phrase: "荷物が紛失しました。", phonetic: "ni-MO-tsu ga fun-SHITSU shi-ma-shi-ta", translation: "Mi equipaje se ha perdido." },
      { phrase: "入国審査はどこですか？", phonetic: "NYŪ-ko-ku SHIN-sa wa DO-ko de-su ka", translation: "¿Dónde está el control de pasaportes?" },
      { phrase: "両替所はどこですか？", phonetic: "RYŌ-ga-e-jo wa DO-ko de-su ka", translation: "¿Dónde está el cambio de moneda?" },
      { phrase: "市内へのバスはありますか？", phonetic: "SHI-nai e no BA-su wa a-RI-ma-su ka", translation: "¿Hay un autobús al centro?" },
      { phrase: "これを申告する必要があります。", phonetic: "KO-re o SHIN-ko-ku su-ru hi-TSU-yō ga a-RI-ma-su", translation: "Necesito declarar esto." },
      { phrase: "このフライトは定刻通りですか？", phonetic: "KO-no fu-RAI-to wa TEI-ko-ku dō-ri de-su ka", translation: "¿Sale puntual este vuelo?" },
      { phrase: "携帯を充電できる場所はどこですか？", phonetic: "kei-TAI o jū-DEN de-ki-ru BA-sho wa DO-ko de-su ka", translation: "¿Dónde puedo cargar el móvil?" },
    ],
    restaurant: [
      { phrase: "二人分のテーブルをください。", phonetic: "Fu-ta-ri-BUN no TĒ-bu-ru o ku-DA-sai", translation: "Una mesa para dos, por favor." },
      { phrase: "メニューをください。", phonetic: "Me-NI-ū o ku-DA-sai", translation: "El menú, por favor." },
      { phrase: "注文してもいいですか？", phonetic: "Chū-MON shi-te mo ī de-su ka", translation: "¿Puedo pedir?" },
      { phrase: "お会計をお願いします。", phonetic: "O-kai-KEI o o-ne-GAI shi-MA-su", translation: "La cuenta, por favor." },
      { phrase: "おいしい！", phonetic: "O-i-SHĪ", translation: "¡Está delicioso!" },
      { phrase: "お水をください。", phonetic: "O-MI-zu o ku-DA-sai", translation: "Agua, por favor." },
      { phrase: "ベジタリアンです。", phonetic: "Be-ji-ta-RI-an de-su", translation: "Soy vegetariano/a." },
      { phrase: "グルテンフリーですか？", phonetic: "Gu-ru-TEN fu-RĪ de-su ka", translation: "¿Sin gluten?" },
    ],
    transport: [
      { phrase: "駅はどこですか？", phonetic: "E-KI wa DO-ko de-su ka", translation: "¿Dónde está la estación?" },
      { phrase: "〜まで切符を一枚ください。", phonetic: "~ ma-de KIP-pu o i-CHI-mai ku-DA-sai", translation: "Un billete a…, por favor." },
      { phrase: "道に迷いました。", phonetic: "Mi-chi ni ma-YOI-ma-shi-ta", translation: "Estoy perdido/a." },
      { phrase: "タクシーを呼んでもらえますか？", phonetic: "TAK-shi ō yon-DE mo-ra-e-MA-su ka", translation: "¿Puede llamar un taxi?" },
      { phrase: "遠いですか？", phonetic: "TŌ-i de-su ka", translation: "¿Está lejos?" },
      { phrase: "左 / 右に曲がってください。", phonetic: "Hi-DA-ri / mi-GI ni ma-GAT-te ku-DA-sai", translation: "Gire a la izquierda / derecha." },
      { phrase: "地下鉄の駅はどこ？", phonetic: "Chi-KA-te-tsu no E-KI wa DO-ko", translation: "¿Dónde está el metro?" },
      { phrase: "〜行きのバスはどれですか？", phonetic: "~ yu-KI no BA-su wa DO-re de-su ka", translation: "¿Qué autobús va a…?" },
    ],
    hotel: [
      { phrase: "予約があります。", phonetic: "YO-ya-ku ga a-RI-ma-su", translation: "Tengo una reserva." },
      { phrase: "チェックアウトは何時ですか？", phonetic: "Chek-KU-a-u-to wa NAN-ji de-su ka", translation: "¿A qué hora es el check-out?" },
      { phrase: "朝食は含まれていますか？", phonetic: "CHŌ-sho-ku wa fu-KU-ma-re-te i-MA-su ka", translation: "¿Está incluido el desayuno?" },
      { phrase: "WiFiのパスワードは？", phonetic: "WAI-fai no PAS-su-wā-do wa", translation: "¿La contraseña del WiFi?" },
      { phrase: "部屋が汚れています。", phonetic: "He-YA ga yo-GO-re-te i-MA-su", translation: "La habitación no está limpia." },
      { phrase: "タオルをもう少しください。", phonetic: "TA-o-ru o mō su-KO-shi ku-DA-sai", translation: "Toallas extra, por favor." },
      { phrase: "ありがとうございました。", phonetic: "A-ri-ga-TŌ GO-zai-ma-shi-ta", translation: "Muchas gracias." },
      { phrase: "レイトチェックアウトは可能ですか？", phonetic: "Rei-TO-chek-KU-a-u-to wa KA-nō de-su ka", translation: "¿Puedo hacer el check-out más tarde?" },
    ],
    emergency: [
      { phrase: "助けて！", phonetic: "Ta-SU-ke-te", translation: "¡Ayuda!" },
      { phrase: "警察を呼んでください！", phonetic: "KEI-sa-tsu o YON-de ku-DA-sai", translation: "¡Llame a la policía!" },
      { phrase: "医者が必要です。", phonetic: "I-sha ga hi-TSU-yō de-su", translation: "Necesito un médico." },
      { phrase: "病院はどこですか？", phonetic: "Byō-IN wa DO-ko de-su ka", translation: "¿Dónde está el hospital?" },
      { phrase: "盗まれました。", phonetic: "Nu-su-MA-re-ma-shi-ta", translation: "Me han robado." },
      { phrase: "〜にアレルギーがあります。", phonetic: "~ ni a-RE-ru-gī ga a-RI-ma-su", translation: "Soy alérgico/a a…" },
      { phrase: "救急車を呼んでください！", phonetic: "Kyū-KYŪ-sha o YON-de ku-DA-sai", translation: "¡Llame a una ambulancia!" },
      { phrase: "急いで！", phonetic: "I-SOI-de", translation: "¡Rápido!" },
    ],
    social: [
      { phrase: "お名前は？", phonetic: "O-NA-ma-e wa", translation: "¿Cómo se llama?" },
      { phrase: "どこから来ましたか？", phonetic: "DO-ko ka-RA ki-MA-shi-ta ka", translation: "¿De dónde eres?" },
      { phrase: "スペイン語が話せますか？", phonetic: "Su-PEI-n-go ga ha-NA-se-ma-su ka", translation: "¿Habla español?" },
      { phrase: "日本語を勉強しています。", phonetic: "Ni-HON-go o ben-KYŌ shi-te i-MA-su", translation: "Estoy aprendiendo japonés." },
      { phrase: "旅行が大好きです！", phonetic: "Ryo-KŌ ga DAI-su-ki de-su", translation: "¡Me encanta viajar!" },
      { phrase: "連絡を取り合いましょう！", phonetic: "REN-ra-ku o to-ri-AI-ma-shō", translation: "¡Mantengámonos en contacto!" },
      { phrase: "お仕事は何をされていますか？", phonetic: "O-shi-GO-to wa NA-ni o sa-RE-te i-MA-su ka", translation: "¿A qué se dedica?" },
      { phrase: "会えてよかったです！", phonetic: "A-e-te YO-kat-ta de-su", translation: "¡Encantado/a de conocerte!" },
    ],
  },
  zh: {
    greetings: [
      { phrase: "你好！", phonetic: "Nǐ hǎo", translation: "¡Hola!" },
      { phrase: "早上好！", phonetic: "Zǎoshang hǎo", translation: "¡Buenos días!" },
      { phrase: "晚上好！", phonetic: "Wǎnshang hǎo", translation: "¡Buenas noches!" },
      { phrase: "你好吗？", phonetic: "Nǐ hǎo ma", translation: "¿Cómo estás?" },
      { phrase: "很高兴认识你！", phonetic: "Hěn gāoxìng rènshi nǐ", translation: "¡Encantado/a de conocerte!" },
      { phrase: "再见！", phonetic: "Zàijiàn", translation: "¡Adiós!" },
      { phrase: "非常感谢！", phonetic: "Fēicháng gǎnxiè", translation: "¡Muchas gracias!" },
      { phrase: "请。", phonetic: "Qǐng", translation: "Por favor." },
    ],
    airport: [
      { phrase: "值机在哪里？", phonetic: "Zhí jī zài nǎlǐ", translation: "¿Dónde está el check-in?" },
      { phrase: "我的登机口在哪里？", phonetic: "Wǒ de dēng jī kǒu zài nǎlǐ", translation: "¿En qué puerta está mi vuelo?" },
      { phrase: "我的航班延误了。", phonetic: "Wǒ de hángbān yánwù le", translation: "Mi vuelo tiene retraso." },
      { phrase: "我错过了我的航班。", phonetic: "Wǒ cuòguòle wǒ de hángbān", translation: "He perdido mi vuelo." },
      { phrase: "在哪里取行李？", phonetic: "Zài nǎlǐ qǔ xínglǐ", translation: "¿Dónde recojo mi equipaje?" },
      { phrase: "我的行李丢了。", phonetic: "Wǒ de xínglǐ diū le", translation: "Mi equipaje se ha perdido." },
      { phrase: "护照检查在哪里？", phonetic: "Hùzhào jiǎnchá zài nǎlǐ", translation: "¿Dónde está el control de pasaportes?" },
      { phrase: "哪里有货币兑换？", phonetic: "Nǎlǐ yǒu huòbì duìhuàn", translation: "¿Dónde está el cambio de moneda?" },
      { phrase: "有去市中心的巴士吗？", phonetic: "Yǒu qù shì zhōngxīn de bāshì ma", translation: "¿Hay un autobús al centro?" },
      { phrase: "我需要申报这个。", phonetic: "Wǒ xūyào shēnbào zhège", translation: "Necesito declarar esto." },
      { phrase: "这个航班准时吗？", phonetic: "Zhège hángbān zhǔnshí ma", translation: "¿Sale puntual este vuelo?" },
      { phrase: "哪里可以给手机充电？", phonetic: "Nǎlǐ kěyǐ gěi shǒujī chōngdiàn", translation: "¿Dónde puedo cargar el móvil?" },
    ],
    restaurant: [
      { phrase: "两位的桌子，请。", phonetic: "Liǎng wèi de zhuōzi, qǐng", translation: "Una mesa para dos, por favor." },
      { phrase: "菜单，请。", phonetic: "Càidān, qǐng", translation: "El menú, por favor." },
      { phrase: "我要点菜。", phonetic: "Wǒ yào diǎn cài", translation: "Me gustaría pedir." },
      { phrase: "买单，请。", phonetic: "Mǎi dān, qǐng", translation: "La cuenta, por favor." },
      { phrase: "很好吃！", phonetic: "Hěn hào chī", translation: "¡Está delicioso!" },
      { phrase: "水，请。", phonetic: "Shuǐ, qǐng", translation: "Agua, por favor." },
      { phrase: "我是素食者。", phonetic: "Wǒ shì sùshí zhě", translation: "Soy vegetariano/a." },
      { phrase: "无麸质的吗？", phonetic: "Wú fū zhì de ma", translation: "¿Sin gluten?" },
    ],
    transport: [
      { phrase: "火车站在哪里？", phonetic: "Huǒchēzhàn zài nǎlǐ", translation: "¿Dónde está la estación de tren?" },
      { phrase: "一张去…的票，请。", phonetic: "Yī zhāng qù... de piào, qǐng", translation: "Un billete a…, por favor." },
      { phrase: "我迷路了。", phonetic: "Wǒ mílù le", translation: "Estoy perdido/a." },
      { phrase: "能帮我叫辆出租车吗？", phonetic: "Néng bāng wǒ jiào liàng chūzū chē ma", translation: "¿Puede llamar un taxi?" },
      { phrase: "远吗？", phonetic: "Yuǎn ma", translation: "¿Está lejos?" },
      { phrase: "向左 / 右拐。", phonetic: "Xiàng zuǒ / yòu guǎi", translation: "Gire a la izquierda / derecha." },
      { phrase: "哪路公共汽车去…？", phonetic: "Nǎ lù gōnggòng qìchē qù", translation: "¿Qué autobús va a…?" },
      { phrase: "地铁站在哪里？", phonetic: "Dìtiě zhàn zài nǎlǐ", translation: "¿Dónde está el metro?" },
    ],
    hotel: [
      { phrase: "我有预订。", phonetic: "Wǒ yǒu yùdìng", translation: "Tengo una reserva." },
      { phrase: "几点退房？", phonetic: "Jǐ diǎn tuìfáng", translation: "¿A qué hora es el check-out?" },
      { phrase: "早餐包含在内吗？", phonetic: "Zǎocān bāohán zàinèi ma", translation: "¿Está incluido el desayuno?" },
      { phrase: "WiFi密码是什么？", phonetic: "WiFi mìmǎ shì shénme", translation: "¿La contraseña del WiFi?" },
      { phrase: "房间不干净。", phonetic: "Fángjiān bù gānjìng", translation: "La habitación no está limpia." },
      { phrase: "请多给一些毛巾。", phonetic: "Qǐng duō gěi yīxiē máojīn", translation: "Toallas extra, por favor." },
      { phrase: "谢谢一切。", phonetic: "Xièxiè yīqiè", translation: "Gracias por todo." },
      { phrase: "可以晚些退房吗？", phonetic: "Kěyǐ wǎn xiē tuìfáng ma", translation: "¿Puedo hacer el check-out más tarde?" },
    ],
    emergency: [
      { phrase: "救命！", phonetic: "Jiù mìng", translation: "¡Ayuda!" },
      { phrase: "报警！", phonetic: "Bào jǐng", translation: "¡Llame a la policía!" },
      { phrase: "我需要医生。", phonetic: "Wǒ xūyào yīshēng", translation: "Necesito un médico." },
      { phrase: "医院在哪里？", phonetic: "Yīyuàn zài nǎlǐ", translation: "¿Dónde está el hospital?" },
      { phrase: "我被偷了。", phonetic: "Wǒ bèi tōu le", translation: "Me han robado." },
      { phrase: "我对…过敏。", phonetic: "Wǒ duì... guòmǐn", translation: "Soy alérgico/a a…" },
      { phrase: "叫救护车！", phonetic: "Jiào jiùhùchē", translation: "¡Llame a una ambulancia!" },
      { phrase: "快！", phonetic: "Kuài", translation: "¡Rápido!" },
    ],
    social: [
      { phrase: "你叫什么名字？", phonetic: "Nǐ jiào shénme míngzì", translation: "¿Cómo te llamas?" },
      { phrase: "你从哪里来？", phonetic: "Nǐ cóng nǎlǐ lái", translation: "¿De dónde eres?" },
      { phrase: "你会说西班牙语吗？", phonetic: "Nǐ huì shuō xībānyá yǔ ma", translation: "¿Hablas español?" },
      { phrase: "我在学中文。", phonetic: "Wǒ zài xué zhōngwén", translation: "Estoy aprendiendo chino." },
      { phrase: "我爱旅行！", phonetic: "Wǒ ài lǚxíng", translation: "¡Me encanta viajar!" },
      { phrase: "保持联系！", phonetic: "Bǎochí liánxì", translation: "¡Mantengámonos en contacto!" },
      { phrase: "你做什么工作？", phonetic: "Nǐ zuò shénme gōngzuò", translation: "¿A qué te dedicas?" },
      { phrase: "很高兴认识你！", phonetic: "Hěn gāoxìng rènshi nǐ", translation: "¡Encantado/a de conocerte!" },
    ],
  },
  ar: {
    greetings: [
      { phrase: "مرحبًا!", phonetic: "Mar-HA-ban", translation: "¡Hola!" },
      { phrase: "صباح الخير!", phonetic: "Sa-BAH al-KHAYR", translation: "¡Buenos días!" },
      { phrase: "مساء الخير!", phonetic: "Ma-SA al-KHAYR", translation: "¡Buenas tardes/noches!" },
      { phrase: "كيف حالك؟", phonetic: "KAY-fa ha-LUK", translation: "¿Cómo estás?" },
      { phrase: "يسعدني معرفتك!", phonetic: "Yus-ID-ni ma-RI-fa-tak", translation: "¡Encantado/a de conocerte!" },
      { phrase: "مع السلامة!", phonetic: "Ma-as-sa-LA-ma", translation: "¡Adiós!" },
      { phrase: "شكرًا جزيلًا!", phonetic: "SHUK-ran ja-ZI-lan", translation: "¡Muchas gracias!" },
      { phrase: "من فضلك.", phonetic: "Min FAD-lik", translation: "Por favor." },
    ],
    airport: [
      { phrase: "أين صالة تسجيل الوصول؟", phonetic: "AY-na SA-lat tas-JIL al-wu-SUL", translation: "¿Dónde está el check-in?" },
      { phrase: "ما هو رقم بوابتي؟", phonetic: "MA hu-wa RA-qam bu-WA-ba-ti", translation: "¿En qué puerta está mi vuelo?" },
      { phrase: "رحلتي متأخرة.", phonetic: "RAH-la-ti mu-ta-AK-khi-ra", translation: "Mi vuelo tiene retraso." },
      { phrase: "فاتتني رحلتي.", phonetic: "FA-tat-ni RAH-la-ti", translation: "He perdido mi vuelo." },
      { phrase: "أين أستلم حقائبي؟", phonetic: "AY-na as-TA-lim ha-QA-i-bi", translation: "¿Dónde recojo mi equipaje?" },
      { phrase: "حقيبتي ضائعة.", phonetic: "ha-QI-ba-ti DA-i-a", translation: "Mi equipaje se ha perdido." },
      { phrase: "أين مراقبة جوازات السفر؟", phonetic: "AY-na mu-RA-qa-bat ja-wa-ZAT as-SA-far", translation: "¿Dónde está el control de pasaportes?" },
      { phrase: "أين مكتب الصرافة؟", phonetic: "AY-na MAK-tab as-sa-RA-fa", translation: "¿Dónde está el cambio de moneda?" },
      { phrase: "هل يوجد حافلة إلى المدينة؟", phonetic: "Hal yu-JAD HA-fi-la i-LA al-ma-DI-na", translation: "¿Hay autobús al centro?" },
      { phrase: "أحتاج إلى الإفصاح عن هذا.", phonetic: "AH-ta-ju i-LA al-if-SAH an HA-da", translation: "Necesito declarar esto." },
      { phrase: "هل الرحلة في موعدها؟", phonetic: "Hal ar-RIH-la fi MAW-i-di-ha", translation: "¿Sale puntual este vuelo?" },
      { phrase: "أين يمكنني شحن هاتفي؟", phonetic: "AY-na yum-KI-nu-ni SHAHN HA-ti-fi", translation: "¿Dónde puedo cargar el móvil?" },
    ],
    restaurant: [
      { phrase: "طاولة لشخصين، من فضلك.", phonetic: "TA-wi-la li-SHAKH-sayn min FAD-lik", translation: "Una mesa para dos, por favor." },
      { phrase: "القائمة، من فضلك.", phonetic: "al-QA-i-ma min FAD-lik", translation: "El menú, por favor." },
      { phrase: "أريد أن أطلب.", phonetic: "U-riy-du an AT-lub", translation: "Me gustaría pedir." },
      { phrase: "الحساب، من فضلك.", phonetic: "al-HI-sab min FAD-lik", translation: "La cuenta, por favor." },
      { phrase: "إنه لذيذ جدًا!", phonetic: "In-na-hu la-DHIDH JID-dan", translation: "¡Está delicioso!" },
      { phrase: "ماء، من فضلك.", phonetic: "MA min FAD-lik", translation: "Agua, por favor." },
      { phrase: "أنا نباتي.", phonetic: "A-na na-BA-ti", translation: "Soy vegetariano/a." },
      { phrase: "خالٍ من الغلوتين؟", phonetic: "KHA-lin min al-glu-TIN", translation: "¿Sin gluten?" },
    ],
    transport: [
      { phrase: "أين المحطة؟", phonetic: "AY-na al-ma-HAT-ta", translation: "¿Dónde está la estación?" },
      { phrase: "تذكرة إلى… من فضلك.", phonetic: "taz-KI-ra i-LA... min FAD-lik", translation: "Un billete a…, por favor." },
      { phrase: "لقد ضللت الطريق.", phonetic: "la-QAD dal-LAL-tu al-ta-RIQ", translation: "Estoy perdido/a." },
      { phrase: "هل يمكنك استدعاء سيارة أجرة؟", phonetic: "Hal yum-KI-nu-ka is-ti-DA-a say-YA-ra AJ-ra", translation: "¿Puede llamar un taxi?" },
      { phrase: "هل هو بعيد؟", phonetic: "Hal hu-wa ba-ID", translation: "¿Está lejos?" },
      { phrase: "انعطف يساراً / يميناً.", phonetic: "in-AT-if ya-SA-ran / ya-MI-nan", translation: "Gire a la izquierda / derecha." },
      { phrase: "أي حافلة تذهب إلى…؟", phonetic: "AY-yu ha-FI-la tadh-HAB i-LA", translation: "¿Qué autobús va a…?" },
      { phrase: "أين محطة المترو؟", phonetic: "AY-na ma-HAT-tat al-MI-tro", translation: "¿Dónde está el metro?" },
    ],
    hotel: [
      { phrase: "لدي حجز.", phonetic: "la-DI-ya HA-jz", translation: "Tengo una reserva." },
      { phrase: "ما هو وقت تسجيل المغادرة؟", phonetic: "MA hu-wa WAQ-tu tas-JIL al-mu-GHA-da-ra", translation: "¿A qué hora es el check-out?" },
      { phrase: "هل الإفطار مشمول؟", phonetic: "Hal al-if-TAR mash-MUL", translation: "¿Está incluido el desayuno?" },
      { phrase: "ما هي كلمة مرور الواي فاي؟", phonetic: "MA hi-ya KA-li-mat mu-RUR al-wai-fai", translation: "¿La contraseña del WiFi?" },
      { phrase: "الغرفة غير نظيفة.", phonetic: "al-GHUR-fa GHAYR na-ZI-fa", translation: "La habitación no está limpia." },
      { phrase: "مناشف إضافية، من فضلك.", phonetic: "ma-NA-shif i-DA-fi-ya min FAD-lik", translation: "Toallas extra, por favor." },
      { phrase: "شكرًا على كل شيء.", phonetic: "SHUK-ran ala KUL-li shay", translation: "Gracias por todo." },
      { phrase: "هل يمكنني تأخير المغادرة؟", phonetic: "Hal yum-KI-nu-ni ta-KHIR al-mu-GHA-da-ra", translation: "¿Puedo hacer el check-out más tarde?" },
    ],
    emergency: [
      { phrase: "النجدة!", phonetic: "an-NAJ-da", translation: "¡Ayuda!" },
      { phrase: "اتصلوا بالشرطة!", phonetic: "it-TA-si-lu bil-SHUR-ta", translation: "¡Llamen a la policía!" },
      { phrase: "أحتاج إلى طبيب.", phonetic: "AH-ta-ju i-LA ta-BIB", translation: "Necesito un médico." },
      { phrase: "أين المستشفى؟", phonetic: "AY-na al-mus-TASH-fa", translation: "¿Dónde está el hospital?" },
      { phrase: "لقد سُرقت.", phonetic: "la-QAD su-RIQT", translation: "Me han robado." },
      { phrase: "أنا حساس لـ…", phonetic: "A-na ha-SAS li", translation: "Soy alérgico/a a…" },
      { phrase: "اتصلوا بالإسعاف!", phonetic: "it-TA-si-lu bil-is-AF", translation: "¡Llamen a una ambulancia!" },
      { phrase: "بسرعة!", phonetic: "bi-SUR-a", translation: "¡Rápido!" },
    ],
    social: [
      { phrase: "ما اسمك؟", phonetic: "MA is-MUK", translation: "¿Cómo te llamas?" },
      { phrase: "من أين أنت؟", phonetic: "MIN ay-na ANT", translation: "¿De dónde eres?" },
      { phrase: "هل تتحدث الإسبانية؟", phonetic: "Hal ta-ta-HAD-dath al-is-BA-ni-ya", translation: "¿Hablas español?" },
      { phrase: "أتعلم العربية.", phonetic: "a-TA-al-lam al-A-ra-bi-ya", translation: "Estoy aprendiendo árabe." },
      { phrase: "أحب السفر كثيرًا!", phonetic: "U-hib-bu as-SA-far ka-THI-ran", translation: "¡Me encanta viajar!" },
      { phrase: "لنبق على تواصل!", phonetic: "li-NAB-qa ala ta-WA-sul", translation: "¡Mantengámonos en contacto!" },
      { phrase: "ماذا تعمل؟", phonetic: "MA-dha ta-MAL", translation: "¿A qué te dedicas?" },
      { phrase: "يسعدني معرفتك!", phonetic: "Yus-ID-ni ma-RI-fa-tak", translation: "¡Encantado/a de conocerte!" },
    ],
  },
  nl: {
    greetings: [
      { phrase: "Hallo!", phonetic: "HA-lo", translation: "¡Hola!" },
      { phrase: "Goedemorgen!", phonetic: "goo-de-MOR-gen", translation: "¡Buenos días!" },
      { phrase: "Goedenavond!", phonetic: "goo-den-A-font", translation: "¡Buenas noches!" },
      { phrase: "Hoe gaat het?", phonetic: "hoo GAAT het", translation: "¿Cómo estás?" },
      { phrase: "Aangenaam kennis te maken!", phonetic: "AN-ge-naam KEN-nis te MA-ken", translation: "¡Encantado/a de conocerte!" },
      { phrase: "Tot ziens!", phonetic: "tot ZEENS", translation: "¡Hasta la vista!" },
      { phrase: "Heel erg bedankt!", phonetic: "heyl erg be-DANKT", translation: "¡Muchas gracias!" },
      { phrase: "Alsjeblieft.", phonetic: "ALS-ye-bleeft", translation: "Por favor." },
    ],
    airport: [
      { phrase: "Waar is de check-in?", phonetic: "vaar is de CHEK-in", translation: "¿Dónde está el check-in?" },
      { phrase: "Welke gate heeft mijn vlucht?", phonetic: "VEL-ke geit heyft main vlukht", translation: "¿En qué puerta está mi vuelo?" },
      { phrase: "Mijn vlucht heeft vertraging.", phonetic: "main vlukht heyft fer-TRA-ging", translation: "Mi vuelo tiene retraso." },
      { phrase: "Ik heb mijn vlucht gemist.", phonetic: "ik heb main vlukht ge-MIST", translation: "He perdido mi vuelo." },
      { phrase: "Waar kan ik mijn bagage ophalen?", phonetic: "vaar kan ik main ba-GA-zhe OP-ha-len", translation: "¿Dónde recojo mi equipaje?" },
      { phrase: "Mijn bagage is kwijt.", phonetic: "main ba-GA-zhe is kvait", translation: "Mi equipaje se ha perdido." },
      { phrase: "Waar is de paspoortcontrole?", phonetic: "vaar is de PAS-port-kon-TRO-le", translation: "¿Dónde está el control de pasaportes?" },
      { phrase: "Waar is het geldwisselkantoor?", phonetic: "vaar is het GELT-vis-el-kan-TOR", translation: "¿Dónde está el cambio de moneda?" },
      { phrase: "Is er een bus naar het centrum?", phonetic: "is er eyn bus naar het SEN-trum", translation: "¿Hay un autobús al centro?" },
      { phrase: "Ik moet dit aangeven.", phonetic: "ik muut dit AN-ge-ven", translation: "Necesito declarar esto." },
      { phrase: "Is deze vlucht op tijd?", phonetic: "is DE-ze vlukht op tait", translation: "¿Sale puntual este vuelo?" },
      { phrase: "Waar kan ik mijn telefoon opladen?", phonetic: "vaar kan ik main te-le-FOON OP-la-den", translation: "¿Dónde puedo cargar el móvil?" },
    ],
    restaurant: [
      { phrase: "Een tafel voor twee, alsjeblieft.", phonetic: "eyn TA-fel vor TVEY als-ye-BLEEFT", translation: "Una mesa para dos, por favor." },
      { phrase: "De menukaart, alsjeblieft.", phonetic: "de me-NU-kaart als-ye-BLEEFT", translation: "La carta, por favor." },
      { phrase: "De rekening, alsjeblieft.", phonetic: "de REY-ke-ning als-ye-BLEEFT", translation: "La cuenta, por favor." },
      { phrase: "Het is heerlijk!", phonetic: "het is HEYR-lik", translation: "¡Está delicioso!" },
      { phrase: "Water, alsjeblieft.", phonetic: "VA-ter als-ye-BLEEFT", translation: "Agua, por favor." },
      { phrase: "Ik ben vegetariër.", phonetic: "ik ben ve-ge-TA-ri-er", translation: "Soy vegetariano/a." },
      { phrase: "Glutenvrij?", phonetic: "GLU-ten-vrai", translation: "¿Sin gluten?" },
      { phrase: "Is de bediening inbegrepen?", phonetic: "is de be-DEE-ning IN-be-grey-pen", translation: "¿Está incluido el servicio?" },
    ],
    transport: [
      { phrase: "Waar is het station?", phonetic: "vaar is het sta-SION", translation: "¿Dónde está la estación?" },
      { phrase: "Eén kaartje naar…, alsjeblieft.", phonetic: "eyn KAART-ye naar als-ye-BLEEFT", translation: "Un billete a…, por favor." },
      { phrase: "Ik ben verdwaald.", phonetic: "ik ben ver-DVAALT", translation: "Estoy perdido/a." },
      { phrase: "Kunt u een taxi voor me bellen?", phonetic: "kunt ü eyn TAK-si vor me BEL-len", translation: "¿Puede llamar un taxi?" },
      { phrase: "Is het ver?", phonetic: "is het VER", translation: "¿Está lejos?" },
      { phrase: "Sla linksaf / rechtsaf.", phonetic: "sla LINKS-af / RECHTS-af", translation: "Gire a la izquierda / derecha." },
      { phrase: "Welke bus gaat naar…?", phonetic: "VEL-ke bus GAAT naar", translation: "¿Qué autobús va a…?" },
      { phrase: "Waar is de metrohalte?", phonetic: "vaar is de ME-tro-hal-te", translation: "¿Dónde está el metro?" },
    ],
    hotel: [
      { phrase: "Ik heb een reservering.", phonetic: "ik heb eyn re-ser-VEY-ring", translation: "Tengo una reserva." },
      { phrase: "Hoe laat is het uitchecken?", phonetic: "hoo laat is het UIT-che-ken", translation: "¿A qué hora es el check-out?" },
      { phrase: "Is het ontbijt inbegrepen?", phonetic: "is het ONT-bait IN-be-grey-pen", translation: "¿Está incluido el desayuno?" },
      { phrase: "Het WiFi-wachtwoord?", phonetic: "het WAI-fai WAKHT-voort", translation: "¿La contraseña del WiFi?" },
      { phrase: "De kamer is niet schoon.", phonetic: "de KA-mer is neet SKHOON", translation: "La habitación no está limpia." },
      { phrase: "Extra handdoeken, alsjeblieft.", phonetic: "EKS-tra HAN-doo-ken als-ye-BLEEFT", translation: "Toallas extra, por favor." },
      { phrase: "Bedankt voor alles.", phonetic: "be-DANKT vor A-les", translation: "Gracias por todo." },
      { phrase: "Kan ik later uitchecken?", phonetic: "kan ik LA-ter UIT-che-ken", translation: "¿Puedo hacer el check-out más tarde?" },
    ],
    emergency: [
      { phrase: "Help!", phonetic: "help", translation: "¡Ayuda!" },
      { phrase: "Bel de politie!", phonetic: "bel de po-LIT-sie", translation: "¡Llame a la policía!" },
      { phrase: "Ik heb een dokter nodig.", phonetic: "ik heb eyn DOK-ter NO-dikh", translation: "Necesito un médico." },
      { phrase: "Waar is het ziekenhuis?", phonetic: "vaar is het ZEE-ken-huis", translation: "¿Dónde está el hospital?" },
      { phrase: "Ik ben beroofd.", phonetic: "ik ben be-ROOFT", translation: "Me han robado." },
      { phrase: "Ik ben allergisch voor…", phonetic: "ik ben a-LER-gies vor", translation: "Soy alérgico/a a…" },
      { phrase: "Bel een ambulance!", phonetic: "bel eyn am-bu-LAN-se", translation: "¡Llame a una ambulancia!" },
      { phrase: "Snel!", phonetic: "snel", translation: "¡Rápido!" },
    ],
    social: [
      { phrase: "Hoe heet je?", phonetic: "hoo heyt ye", translation: "¿Cómo te llamas?" },
      { phrase: "Waar kom je vandaan?", phonetic: "vaar kom ye van-DAAN", translation: "¿De dónde eres?" },
      { phrase: "Spreek je Spaans?", phonetic: "spreyk ye SPAANS", translation: "¿Hablas español?" },
      { phrase: "Ik leer Nederlands.", phonetic: "ik leyr NEY-der-lants", translation: "Estoy aprendiendo holandés." },
      { phrase: "Ik hou van reizen!", phonetic: "ik hau van RAI-zen", translation: "¡Me encanta viajar!" },
      { phrase: "Laten we contact houden!", phonetic: "LA-ten ve KON-takt HAU-den", translation: "¡Mantengámonos en contacto!" },
      { phrase: "Wat doe je voor werk?", phonetic: "vat doo ye vor VERK", translation: "¿A qué te dedicas?" },
      { phrase: "Leuk je te ontmoeten!", phonetic: "leuk ye te ONT-moo-ten", translation: "¡Encantado/a de conocerte!" },
    ],
  },
  es: {
    greetings: [
      { phrase: "¡Hola!", phonetic: "O-la", translation: "Hello!" },
      { phrase: "¡Buenos días!", phonetic: "BWE-nos DI-as", translation: "Good morning!" },
      { phrase: "¡Buenas noches!", phonetic: "BWE-nas NO-ches", translation: "Good evening!" },
      { phrase: "¿Cómo estás?", phonetic: "KO-mo es-TAS", translation: "How are you?" },
      { phrase: "¡Encantado/a de conocerte!", phonetic: "en-kan-TA-do de ko-no-SER-te", translation: "Nice to meet you!" },
      { phrase: "¡Hasta luego!", phonetic: "AS-ta LWE-go", translation: "See you later!" },
      { phrase: "¡Muchas gracias!", phonetic: "MU-chas GRA-sias", translation: "Thank you very much!" },
      { phrase: "Por favor.", phonetic: "por fa-BOR", translation: "Please." },
    ],
    airport: [
      { phrase: "¿Dónde está el check-in?", phonetic: "DON-de es-TA el CHEK-in", translation: "Where is check-in?" },
      { phrase: "¿En qué puerta está mi vuelo?", phonetic: "en ke PWER-ta es-TA mi BWE-lo", translation: "Which gate is my flight?" },
      { phrase: "Mi vuelo tiene retraso.", phonetic: "mi BWE-lo TIE-ne re-TRA-so", translation: "My flight is delayed." },
      { phrase: "He perdido mi vuelo.", phonetic: "e per-DI-do mi BWE-lo", translation: "I missed my flight." },
      { phrase: "¿Dónde recojo mi equipaje?", phonetic: "DON-de re-KO-ho mi e-ki-PA-he", translation: "Where do I collect my bags?" },
      { phrase: "Mi equipaje se ha perdido.", phonetic: "mi e-ki-PA-he se a per-DI-do", translation: "My luggage is lost." },
      { phrase: "¿Dónde está el control de pasaportes?", phonetic: "DON-de es-TA el kon-TROL de pa-sa-POR-tes", translation: "Where is passport control?" },
      { phrase: "¿Dónde está el cambio de moneda?", phonetic: "DON-de es-TA el KAM-bio de mo-NE-da", translation: "Where is the currency exchange?" },
      { phrase: "¿Hay un autobús al centro?", phonetic: "ai un au-to-BUS al SEN-tro", translation: "Is there a bus to the city center?" },
      { phrase: "Necesito declarar esto.", phonetic: "ne-se-SI-to de-kla-RAR ES-to", translation: "I need to declare this." },
      { phrase: "¿Sale puntual este vuelo?", phonetic: "SA-le pun-TWAL ES-te BWE-lo", translation: "Is this flight on time?" },
      { phrase: "¿Dónde puedo cargar el móvil?", phonetic: "DON-de PWE-do kar-GAR el MO-bil", translation: "Where can I charge my phone?" },
    ],
    restaurant: [
      { phrase: "Una mesa para dos, por favor.", phonetic: "U-na ME-sa PA-ra dos por fa-BOR", translation: "A table for two, please." },
      { phrase: "La carta, por favor.", phonetic: "la KAR-ta por fa-BOR", translation: "The menu, please." },
      { phrase: "La cuenta, por favor.", phonetic: "la KWEN-ta por fa-BOR", translation: "The bill, please." },
      { phrase: "¡Está delicioso!", phonetic: "es-TA de-li-SIO-so", translation: "It's delicious!" },
      { phrase: "Agua, por favor.", phonetic: "A-gwa por fa-BOR", translation: "Water, please." },
      { phrase: "Soy vegetariano/a.", phonetic: "soy be-he-ta-RIA-no", translation: "I'm vegetarian." },
      { phrase: "¿Sin gluten?", phonetic: "sin GLU-ten", translation: "Gluten-free?" },
      { phrase: "¿Está incluido el servicio?", phonetic: "es-TA in-klu-I-do el ser-BI-sio", translation: "Is service included?" },
    ],
    transport: [
      { phrase: "¿Dónde está la estación?", phonetic: "DON-de es-TA la es-ta-SION", translation: "Where is the train station?" },
      { phrase: "Un billete a…, por favor.", phonetic: "un bi-LYE-te a... por fa-BOR", translation: "One ticket to…, please." },
      { phrase: "Estoy perdido/a.", phonetic: "es-TOY per-DI-do", translation: "I'm lost." },
      { phrase: "¿Puede llamarme un taxi?", phonetic: "PWE-de lya-MAR-me un TAK-si", translation: "Can you call me a taxi?" },
      { phrase: "¿Está lejos?", phonetic: "es-TA LE-hos", translation: "Is it far?" },
      { phrase: "Gire a la izquierda / derecha.", phonetic: "HI-re a la is-KIER-da / de-RE-cha", translation: "Turn left / right." },
      { phrase: "¿Qué autobús va a…?", phonetic: "ke au-to-BUS ba a", translation: "Which bus goes to…?" },
      { phrase: "¿Dónde está el metro?", phonetic: "DON-de es-TA el ME-tro", translation: "Where is the metro?" },
    ],
    hotel: [
      { phrase: "Tengo una reserva.", phonetic: "TEN-go U-na re-SER-ba", translation: "I have a reservation." },
      { phrase: "¿A qué hora es el check-out?", phonetic: "a ke O-ra es el CHEK-aut", translation: "What time is check-out?" },
      { phrase: "¿Está incluido el desayuno?", phonetic: "es-TA in-klu-I-do el de-sa-YU-no", translation: "Is breakfast included?" },
      { phrase: "La contraseña del WiFi.", phonetic: "la kon-tra-SE-nya del WAI-fai", translation: "The WiFi password." },
      { phrase: "La habitación no está limpia.", phonetic: "la a-bi-ta-SION no es-TA LIM-pia", translation: "The room is not clean." },
      { phrase: "Toallas extra, por favor.", phonetic: "to-A-lyas EKS-tra por fa-BOR", translation: "Extra towels, please." },
      { phrase: "Gracias por todo.", phonetic: "GRA-sias por TO-do", translation: "Thank you for everything." },
      { phrase: "¿Puedo hacer el check-out más tarde?", phonetic: "PWE-do a-SER el CHEK-aut mas TAR-de", translation: "Can I do a late check-out?" },
    ],
    emergency: [
      { phrase: "¡Ayuda!", phonetic: "a-YU-da", translation: "Help!" },
      { phrase: "¡Llama a la policía!", phonetic: "LYA-ma a la po-li-SI-a", translation: "Call the police!" },
      { phrase: "Necesito un médico.", phonetic: "ne-se-SI-to un ME-di-ko", translation: "I need a doctor." },
      { phrase: "¿Dónde está el hospital?", phonetic: "DON-de es-TA el os-pi-TAL", translation: "Where is the hospital?" },
      { phrase: "Me han robado.", phonetic: "me an ro-BA-do", translation: "I've been robbed." },
      { phrase: "Soy alérgico/a a…", phonetic: "soy a-LER-hi-ko a", translation: "I'm allergic to…" },
      { phrase: "Llama a una ambulancia.", phonetic: "LYA-ma a U-na am-bu-LAN-sia", translation: "Call an ambulance." },
      { phrase: "¡Rápido!", phonetic: "RA-pi-do", translation: "Quick!" },
    ],
    social: [
      { phrase: "¿Cómo te llamas?", phonetic: "KO-mo te LYA-mas", translation: "What's your name?" },
      { phrase: "¿De dónde eres?", phonetic: "de DON-de E-res", translation: "Where are you from?" },
      { phrase: "¿Hablas inglés?", phonetic: "A-blas in-GLES", translation: "Do you speak English?" },
      { phrase: "Estoy aprendiendo español.", phonetic: "es-TOY a-pren-DIEN-do es-pa-NYOL", translation: "I'm learning Spanish." },
      { phrase: "¡Me encanta viajar!", phonetic: "me en-KAN-ta bia-HAR", translation: "I love traveling!" },
      { phrase: "¡Mantengámonos en contacto!", phonetic: "man-ten-GA-mo-nos en kon-TAK-to", translation: "Let's keep in touch!" },
      { phrase: "¿A qué te dedicas?", phonetic: "a ke te de-DI-kas", translation: "What do you do?" },
      { phrase: "¡Encantado/a de conocerte!", phonetic: "en-kan-TA-do de ko-no-SER-te", translation: "Nice to meet you!" },
    ],
  },
};

// ── Daily lessons (deterministic by day of year) ─────────────────────────────

const DAILY_LESSONS: Record<LangCode, Array<{ word: string; translation: string; phonetic: string; emoji: string; example: string; exampleTrans: string; tip: string }>> = {
  en: [
    { word: "Wanderlust", emoji: "🌍", phonetic: "WAN-der-lust", translation: "Ansia de viajar", example: "I have wanderlust — I want to visit every continent.", exampleTrans: "Tengo ansias de viajar — quiero visitar cada continente.", tip: "Wanderlust is a German loanword widely used in English to describe the irresistible urge to travel." },
    { word: "Serendipity", emoji: "✨", phonetic: "ser-en-DIP-i-tee", translation: "Serendipia", example: "Finding that café was pure serendipity.", exampleTrans: "Encontrar ese café fue pura serendipia.", tip: "Coined by Horace Walpole in 1754 from a Persian fairy tale." },
    { word: "Itinerary", emoji: "📋", phonetic: "ai-TIN-er-ar-ee", translation: "Itinerario", example: "My travel itinerary includes Paris and Rome.", exampleTrans: "Mi itinerario de viaje incluye París y Roma.", tip: "Always handy when coordinating group travel!" },
    { word: "Layover", emoji: "✈️", phonetic: "LAY-oh-ver", translation: "Escala", example: "I have a 3-hour layover in Frankfurt.", exampleTrans: "Tengo una escala de 3 horas en Frankfurt.", tip: "A long layover can be an opportunity for a mini city tour!" },
    { word: "Hostel", emoji: "🏠", phonetic: "HOS-tel", translation: "Albergue / Hostal", example: "I stayed at a cheap hostel near the beach.", exampleTrans: "Me alojé en un hostal barato cerca de la playa.", tip: "Don't confuse 'hostel' (budget lodging) with 'hostile' (unfriendly)!" },
    { word: "Jet lag", emoji: "😴", phonetic: "JET lag", translation: "Jet lag", example: "I'm exhausted — the jet lag is hitting me hard.", exampleTrans: "Estoy agotado — el jet lag me está afectando mucho.", tip: "Stay hydrated and adjust to local time immediately to fight jet lag." },
    { word: "Backpacker", emoji: "🎒", phonetic: "BAK-pak-er", translation: "Mochilero", example: "She's been a backpacker for two years, living out of a 40L bag.", exampleTrans: "Lleva dos años de mochilera, viviendo con una bolsa de 40L.", tip: "Backpacking culture encourages meeting locals and embracing spontaneity." },
  ],
  es: [
    { word: "Madrugada", emoji: "🌙", phonetic: "ma-dru-GA-da", translation: "Early hours / wee hours", example: "Llegué a casa a la madrugada.", exampleTrans: "I got home in the early hours.", tip: "Spanish distinguishes 'medianoche' (midnight) from 'madrugada' (the hours between midnight and dawn)." },
    { word: "Sobremesa", emoji: "🍷", phonetic: "so-bre-ME-sa", translation: "After-dinner conversation", example: "La sobremesa duró más que la comida.", exampleTrans: "The after-dinner chat lasted longer than the meal itself.", tip: "Sobremesa is a beloved Spanish tradition — never rush away from the table!" },
    { word: "Trasnochar", emoji: "🌃", phonetic: "tras-no-CHAR", translation: "To stay up all night", example: "Tras la fiesta, trasnochamos hasta el amanecer.", exampleTrans: "After the party, we stayed up until dawn.", tip: "Spain's nightlife culture makes trasnochando quite common on weekends." },
    { word: "Estrenar", emoji: "🎉", phonetic: "es-tre-NAR", translation: "To use/wear something for the first time", example: "Hoy estreno mis zapatos nuevos.", exampleTrans: "Today I'm wearing my new shoes for the first time.", tip: "Estrenar has no direct English equivalent — it captures the excitement of using something brand new." },
    { word: "Madrugar", emoji: "🌅", phonetic: "ma-dru-GAR", translation: "To get up very early", example: "Hay que madrugar para coger ese vuelo.", exampleTrans: "We have to get up very early to catch that flight.", tip: "The saying goes: 'Al que madruga, Dios le ayuda' — 'The early bird catches the worm'." },
    { word: "Puente", emoji: "🌉", phonetic: "PWEN-te", translation: "Long weekend (lit. bridge)", example: "Nos vamos de viaje el puente de mayo.", exampleTrans: "We're going on a trip over the May long weekend.", tip: "In Spain, a 'puente' is when a holiday falls near a weekend, creating a long break." },
    { word: "Guiri", emoji: "🏖️", phonetic: "GI-ri", translation: "Foreign tourist (colloquial)", example: "La playa estaba llena de guiris en agosto.", exampleTrans: "The beach was full of foreign tourists in August.", tip: "Guiri is informal and usually affectionate — don't be offended if you hear it!" },
  ],
  fr: [
    { word: "Dépaysement", emoji: "🗺️", phonetic: "day-pay-ze-MAH", translation: "The feeling of being in a foreign place", example: "Voyager en Asie m'a donné un sentiment de dépaysement total.", exampleTrans: "Travelling in Asia gave me a total feeling of being in another world.", tip: "French excels at naming feelings — dépaysement captures both disorientation and the thrill of novelty." },
    { word: "Flâner", emoji: "🚶", phonetic: "fla-NAY", translation: "To stroll aimlessly", example: "J'adore flâner dans les rues de Paris.", exampleTrans: "I love strolling aimlessly through the streets of Paris.", tip: "A flâneur is someone who wanders the city as a form of artistic observation — very Parisian!" },
    { word: "Retrouvailles", emoji: "🤗", phonetic: "ruh-troo-VAI", translation: "The joy of reuniting with someone", example: "Ces retrouvailles après deux ans étaient émouvantes.", exampleTrans: "This reunion after two years was moving.", tip: "No single English word captures this — it's why French is the 'language of love'." },
    { word: "Bricolage", emoji: "🔧", phonetic: "bree-ko-LAZH", translation: "DIY / making do with available materials", example: "Il a construit la cabane en bricolage.", exampleTrans: "He built the cabin using DIY methods.", tip: "Bricolage has been adopted by English — you may recognize it from art theory!" },
    { word: "Savoir-faire", emoji: "🎩", phonetic: "sa-VWAR fair", translation: "Knack / know-how", example: "Elle a le savoir-faire pour gérer n'importe quelle situation.", exampleTrans: "She has the know-how to handle any situation.", tip: "Savoir-faire literally means 'knowing how to do' and implies elegance and social skill." },
    { word: "Ratatouille", emoji: "🍲", phonetic: "ra-ta-TWI", translation: "Vegetable stew from Nice", example: "La ratatouille niçoise est un plat emblématique du sud.", exampleTrans: "Niçoise ratatouille is an emblematic southern dish.", tip: "Despite the Pixar film, ratatouille is a humble Provençal peasant dish!" },
    { word: "Bouquiner", emoji: "📚", phonetic: "boo-kee-NAY", translation: "To browse / read books casually", example: "J'aime bouquiner dans les cafés.", exampleTrans: "I love casually reading in cafes.", tip: "From 'bouquin' (old book) — implies leisurely reading, not studying." },
  ],
  it: [
    { word: "Abbiocco", emoji: "😴", phonetic: "ab-BIO-ko", translation: "Post-meal drowsiness", example: "Dopo il pranzo ho un abbiocco terribile.", exampleTrans: "After lunch I get terrible drowsiness.", tip: "The abbiocco is taken seriously in Italy — that's why afternoon rest exists!" },
    { word: "Menefreghismo", emoji: "🤷", phonetic: "me-ne-fre-GIS-mo", translation: "The art of not caring", example: "Il suo menefreghismo mi stupisce.", exampleTrans: "His carefree attitude amazes me.", tip: "From 'me ne frego' (I don't care) — can be pejorative or admirable depending on context." },
    { word: "Gattara", emoji: "🐱", phonetic: "gat-TA-ra", translation: "Old woman who feeds stray cats", example: "La gattara del quartiere dà da mangiare a 20 gatti.", exampleTrans: "The neighbourhood cat lady feeds 20 cats.", tip: "Italy has a huge stray cat population, and gattare are celebrated local figures." },
    { word: "Sprezzatura", emoji: "🎭", phonetic: "spret-tsa-TU-ra", translation: "The art of making difficult things look effortless", example: "Indossa quel vestito con sprezzatura.", exampleTrans: "She wears that outfit with effortless grace.", tip: "Renaissance concept from Castiglione's 'The Book of the Courtier' (1528)." },
    { word: "Passeggiata", emoji: "🌆", phonetic: "pa-sed-JA-ta", translation: "The evening stroll", example: "Ogni sera facciamo la passeggiata sul lungomare.", exampleTrans: "Every evening we do the promenade by the sea.", tip: "La passeggiata is a social ritual — dress nicely, walk slowly, be seen." },
    { word: "Agriturismo", emoji: "🏡", phonetic: "a-gri-tu-RIS-mo", translation: "Farm-stay tourism", example: "Abbiamo prenotato un agriturismo in Toscana.", exampleTrans: "We booked a farm stay in Tuscany.", tip: "Agriturismi are regulated by law and must produce their own food — a truly authentic experience." },
    { word: "Dolce far niente", emoji: "☀️", phonetic: "DOL-che far NIEN-te", translation: "The sweetness of doing nothing", example: "In vacanza pratico il dolce far niente.", exampleTrans: "On holiday I practise the sweetness of doing nothing.", tip: "Italians consider rest a fine art — don't feel guilty about it!" },
  ],
  pt: [
    { word: "Saudade", emoji: "💙", phonetic: "sau-DA-de", translation: "Melancholic longing", example: "Tenho saudade do Brasil.", exampleTrans: "I feel a deep longing for Brazil.", tip: "Saudade is considered untranslatable — it describes longing for something you may never have again." },
    { word: "Desenrascanço", emoji: "🔧", phonetic: "de-zen-ras-KAN-su", translation: "The art of improvising a solution", example: "Com um pouco de desenrascanço, consertei o carro.", exampleTrans: "With a bit of improvisation, I fixed the car.", tip: "Portuguese (especially from Portugal) take pride in their creativity under pressure." },
    { word: "Cafuné", emoji: "💆", phonetic: "ka-fu-NÉ", translation: "Gently running fingers through someone's hair", example: "Ela fez cafuné no filho até ele dormir.", exampleTrans: "She gently stroked her child's hair until he fell asleep.", tip: "Cafuné is considered a uniquely affectionate Brazilian expression of love." },
    { word: "Madrugada", emoji: "🌌", phonetic: "ma-dru-GA-da", translation: "The small hours of the night", example: "Chegamos de madrugada.", exampleTrans: "We arrived in the small hours.", tip: "Shared with Spanish, madrugada is the mysterious and creative time between midnight and dawn." },
    { word: "Peito", emoji: "❤️", phonetic: "PEI-tu", translation: "Chest / heart / courage", example: "Ele tem peito para enfrentar qualquer obstáculo.", exampleTrans: "He has the heart to face any obstacle.", tip: "Peito is used metaphorically for both love and bravery in Brazilian Portuguese." },
  ],
  de: [
    { word: "Fernweh", emoji: "🌏", phonetic: "FERN-vey", translation: "Longing for distant places", example: "Ich habe Fernweh und möchte nach Japan reisen.", exampleTrans: "I'm longing for distant places and want to travel to Japan.", tip: "Fernweh (fern = distant, weh = ache) is the opposite of Heimweh (homesickness)." },
    { word: "Weltschmerz", emoji: "😔", phonetic: "VELT-shmerts", translation: "World-weariness / sadness about the state of the world", example: "Die Nachrichten bereiten mir manchmal Weltschmerz.", exampleTrans: "The news sometimes fills me with world-weariness.", tip: "Coined by Jean Paul in 1827 — widely used in English academic writing today." },
    { word: "Verschlimmbessern", emoji: "🔨", phonetic: "fer-SHLIM-bes-ern", translation: "To make something worse while trying to improve it", example: "Er hat das Auto verschlimmbessert.", exampleTrans: "He made the car worse while trying to fix it.", tip: "No English equivalent exists — a reminder that sometimes less is more." },
    { word: "Torschlusspanik", emoji: "⏰", phonetic: "TOR-shluss-pa-nik", translation: "Gate-closing panic / fear of running out of time", example: "Mit 30 hatte sie Torschlusspanik bekommen.", exampleTrans: "At 30 she had a panic about running out of time.", tip: "Literally 'gate-closing panic' — imagining the last gate closing on an opportunity." },
    { word: "Gemütlichkeit", emoji: "🕯️", phonetic: "ge-MÜT-lish-kait", translation: "Cosiness / warmth / conviviality", example: "Das Restaurant hatte eine tolle Gemütlichkeit.", exampleTrans: "The restaurant had a wonderful warmth and cosiness.", tip: "Similar to Danish hygge — both describe a feeling of warm, convivial comfort." },
    { word: "Wanderlust", emoji: "🥾", phonetic: "VAN-der-lust", translation: "Desire to travel and explore", example: "Mein Wanderlust treibt mich immer wieder in die Berge.", exampleTrans: "My wanderlust keeps taking me to the mountains.", tip: "Wanderlust entered English directly from German — one of the most recognized German loanwords." },
    { word: "Schadenfreude", emoji: "😈", phonetic: "SHA-den-froy-de", translation: "Pleasure derived from others' misfortune", example: "Er konnte seine Schadenfreude nicht verbergen.", exampleTrans: "He couldn't hide his pleasure at the other's misfortune.", tip: "Used directly in English — Homer Simpson famously mispronounced it as 'shame on freude'." },
  ],
  ja: [
    { word: "木漏れ日", emoji: "🌿", phonetic: "ko-mo-RE-bi", translation: "Sunlight filtering through leaves", example: "公園で木漏れ日を楽しんだ。", exampleTrans: "I enjoyed the sunlight filtering through the leaves in the park.", tip: "Komorebi is one of Japanese's most beautiful 'untranslatable' words." },
    { word: "侘び寂び", emoji: "🍂", phonetic: "wa-BI sa-BI", translation: "Beauty in imperfection and transience", example: "古い神社に侘び寂びの美しさを感じた。", exampleTrans: "I felt the wabi-sabi beauty of the old shrine.", tip: "Wabi-sabi is a core Japanese aesthetic principle — embracing impermanence and incompleteness." },
    { word: "木漏れ日", emoji: "☀️", phonetic: "ko-mo-RE-bi", translation: "Dappled light through trees", example: "森の中の木漏れ日がとても美しかった。", exampleTrans: "The dappled light in the forest was beautiful.", tip: "There is no single English word for this phenomenon." },
    { word: "積ん読", emoji: "📚", phonetic: "tsun-DO-ku", translation: "Buying books but not reading them", example: "棚に積ん読がたくさんある。", exampleTrans: "I have a lot of unread books piling up on my shelf.", tip: "Tsundoku combines tsumu (to pile) and doku (to read) — many readers worldwide relate!" },
    { word: "木枯らし", emoji: "🍃", phonetic: "ko-GA-ra-shi", translation: "Cold winter wind", example: "木枯らしが吹いてきた。", exampleTrans: "A cold winter wind started blowing.", tip: "Japanese has many words for different types of wind — showing the language's connection to nature." },
    { word: "物の哀れ", emoji: "🌸", phonetic: "mo-no no A-wa-re", translation: "Pathos of things / bittersweet awareness of impermanence", example: "桜の散る様子に物の哀れを感じる。", exampleTrans: "I feel mono no aware watching cherry blossoms fall.", tip: "Central concept in Japanese literature and aesthetics — especially associated with cherry blossoms." },
    { word: "縁側", emoji: "🌅", phonetic: "en-GA-wa", translation: "Veranda along the edge of a house", example: "縁側でお茶を飲んだ。", exampleTrans: "I drank tea on the veranda.", tip: "The engawa is a traditional transitional space between inside and outside in Japanese architecture." },
  ],
  zh: [
    { word: "缘分", emoji: "🔴", phonetic: "yuán fèn", translation: "Fate / destiny that brings people together", example: "我们相识是一种缘分。", exampleTrans: "Our meeting was fate.", tip: "Yuanfen is a Buddhist-influenced concept of the invisible thread connecting people destined to meet." },
    { word: "差不多", emoji: "🤏", phonetic: "chà bu duō", translation: "More or less / good enough", example: "这个差不多就行了。", exampleTrans: "This is more or less good enough.", tip: "Cha bu duo (literally 'lack not much') reflects a pragmatic Chinese philosophy of acceptable approximation." },
    { word: "面子", emoji: "🎭", phonetic: "miàn zi", translation: "Face / social reputation", example: "他很在乎面子。", exampleTrans: "He cares a lot about face/reputation.", tip: "Mianzi (face) is central to Chinese social dynamics — losing face publicly is to be avoided at all costs." },
    { word: "热闹", emoji: "🎉", phonetic: "rè nao", translation: "Lively, bustling atmosphere", example: "春节非常热闹！", exampleTrans: "Chinese New Year is incredibly lively!", tip: "Renao is actively sought — Chinese culture values communal liveliness over quiet solitude." },
    { word: "悠闲", emoji: "🍵", phonetic: "yōu xián", translation: "Leisurely / carefree", example: "退休后他过着悠闲的生活。", exampleTrans: "After retiring he leads a leisurely life.", tip: "Youxian embodies an ideal of peaceful, unhurried existence — the ultimate retirement goal in Chinese culture." },
  ],
  ar: [
    { word: "يقين", emoji: "✨", phonetic: "ya-QIN", translation: "Absolute certainty / conviction", example: "لدي يقين بأن الأمور ستتحسن.", exampleTrans: "I have certainty that things will improve.", tip: "Yaqeen is central in Islamic philosophy — certainty of faith that goes beyond doubt." },
    { word: "تعهد", emoji: "🤝", phonetic: "ta-AH-hud", translation: "Commitment / pledge", example: "أخذ تعهداً بإتمام المشروع.", exampleTrans: "He made a commitment to complete the project.", tip: "In Arab culture, verbal commitments carry great social weight." },
    { word: "شوق", emoji: "💫", phonetic: "shawq", translation: "Longing / yearning", example: "لدي شوق شديد لرؤيتك.", exampleTrans: "I have a deep longing to see you.", tip: "Shawq is frequently used in Arabic poetry to describe spiritual and romantic longing." },
    { word: "كرم", emoji: "🤲", phonetic: "ka-RAM", translation: "Generosity / hospitality", example: "تشتهر العرب بكرمهم.", exampleTrans: "Arabs are famous for their generosity.", tip: "Karam is one of the highest virtues in Arab culture — refusing hospitality can cause offense." },
    { word: "صبر", emoji: "⏳", phonetic: "SABR", translation: "Patience / endurance", example: "الصبر مفتاح الفرج.", exampleTrans: "Patience is the key to relief.", tip: "Sabr appears over 90 times in the Quran — it embodies active, dignified endurance rather than passive waiting." },
  ],
  nl: [
    { word: "Gezelligheid", emoji: "🕯️", phonetic: "ge-ZEL-likh-haid", translation: "Cosiness / conviviality", example: "Er was echte gezelligheid op het feest.", exampleTrans: "There was real cosiness at the party.", tip: "Gezelligheid is considered a Dutch cultural value — similar to Danish hygge." },
    { word: "Uitwaaien", emoji: "💨", phonetic: "UIT-vai-en", translation: "To go out in windy weather to clear your head", example: "Ik ga even uitwaaien op het strand.", exampleTrans: "I'm going to clear my head at the beach in the wind.", tip: "The Dutch have a word for this because the Netherlands is notoriously windy!" },
    { word: "Vrijmibo", emoji: "🍺", phonetic: "VRAI-mi-bo", translation: "Friday afternoon drinks at work", example: "Vrijmibo om vijf uur — iedereen welkom!", exampleTrans: "Friday drinks at five — everyone welcome!", tip: "Vrijmibo (vrijdagmiddag borrel) is a beloved Dutch workplace tradition." },
    { word: "Doe maar gewoon", emoji: "🙌", phonetic: "doo maar ge-VOON", translation: "Just act normal (cultural saying)", example: "Doe maar gewoon, dan doe je al gek genoeg.", exampleTrans: "Just act normal, that's crazy enough already.", tip: "This saying reflects Dutch egalitarianism — don't show off or act above your station." },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LanguagePage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { currentUser } = useCurrentUser();
  const t = useTranslation();

  const [tab, setTab] = useState<"phrases" | "lesson" | "natives">("phrases");
  const [selectedLang, setSelectedLang] = useState<LangCode>("en");
  const [selectedCat, setSelectedCat] = useState<CatId>("greetings");
  const [flipped, setFlipped] = useState<number | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  const { data: quizToday } = useQuery<{ completed: boolean; score?: number; total?: number }>({
    queryKey: ["/api/language/quiz/today", selectedLang],
    queryFn: () => fetch(`/api/language/quiz/today?lang=${selectedLang}`, { credentials: "include" }).then(r => r.json()),
  });
  const [speaksExpanded, setSpeaksExpanded] = useState(false);
  const [learningExpanded, setLearningExpanded] = useState(false);

  const { data: langPrefs, isLoading: prefsLoading } = useQuery<{ speaksLanguages: string[]; learningLanguages: string[] }>({
    queryKey: ["/api/profile/languages"],
  });

  const updateLangsMutation = useMutation({
    mutationFn: (data: { speaksLanguages: string[]; learningLanguages: string[] }) =>
      apiRequest("PATCH", "/api/profile/languages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/languages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/language/natives"] });
      toast({ title: "¡Guardado!", description: "Tus idiomas han sido actualizados." });
    },
  });

  const { data: natives = [], isLoading: nativesLoading } = useQuery<any[]>({
    queryKey: ["/api/language/natives", selectedLang],
    queryFn: () => fetch(`/api/language/natives?lang=${selectedLang}`, { credentials: "include" }).then(r => r.json()),
    enabled: tab === "natives",
  });

  const speaks: string[] = langPrefs?.speaksLanguages ?? [];
  const learning: string[] = langPrefs?.learningLanguages ?? [];

  const toggleSpeak = (code: string) => {
    const next = speaks.includes(code) ? speaks.filter(l => l !== code) : [...speaks, code];
    updateLangsMutation.mutate({ speaksLanguages: next, learningLanguages: learning });
  };
  const toggleLearn = (code: string) => {
    const next = learning.includes(code) ? learning.filter(l => l !== code) : [...learning, code];
    updateLangsMutation.mutate({ speaksLanguages: speaks, learningLanguages: next });
  };

  // Daily lesson: deterministic by day of year
  const getDailyLesson = (lang: LangCode) => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const lessons = DAILY_LESSONS[lang] ?? DAILY_LESSONS.en;
    return lessons[dayOfYear % lessons.length];
  };
  const lesson = getDailyLesson(selectedLang);

  const phrases = (PHRASES[selectedLang] ?? PHRASES.en)[selectedCat] ?? [];
  const langMeta = LANGUAGES.find(l => l.code === selectedLang)!;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Languages className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-bold">{t.languagePage.title}</h1>
          </div>
          <button
            onClick={() => setQuizOpen(true)}
            data-testid="btn-open-quiz"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              quizToday?.completed
                ? "bg-green-500/10 text-green-600 border border-green-500/30"
                : "bg-amber-500 text-white shadow-md hover:bg-amber-600"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {quizToday?.completed ? `✓ ${quizToday.score}/${quizToday.total}` : t.languagePage.quizButton}
          </button>
        </div>
        {/* Language selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 mt-3 scrollbar-hide">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setSelectedLang(l.code as LangCode); setFlipped(null); }}
              data-testid={`btn-lang-${l.code}`}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedLang === l.code
                  ? "bg-amber-500 text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              <span className="text-[10px]">{l.name}</span>
            </button>
          ))}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {[
            { id: "phrases" as const, icon: BookOpen, label: t.languagePage.phrasesTab },
            { id: "lesson"  as const, icon: Languages, label: t.languagePage.lessonTab },
            { id: "natives" as const, icon: Users, label: t.languagePage.nativesTab },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              data-testid={`tab-${id}`}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === id ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Frases ──────────────────────────────────────────────────────── */}
      {tab === "phrases" && (
        <div className="px-4 pt-4">
          {/* Category selector */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCat(cat.id as CatId); setFlipped(null); }}
                data-testid={`btn-cat-${cat.id}`}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  selectedCat === cat.id
                    ? "bg-amber-500/10 border-amber-500 text-amber-600"
                    : "border-border text-muted-foreground hover:border-amber-500/50"
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Phrase cards */}
          <div className="space-y-3">
            {phrases.map((p, i) => (
              <div
                key={i}
                onClick={() => setFlipped(flipped === i ? null : i)}
                data-testid={`phrase-card-${i}`}
                className="rounded-2xl border bg-card cursor-pointer hover:border-amber-500/40 transition-all select-none"
              >
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-base">{p.phrase}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{p.phonetic}</p>
                    </div>
                    <div className="flex gap-2 items-center mt-0.5">
                      <button
                        onClick={e => { e.stopPropagation(); const u = new SpeechSynthesisUtterance(p.phrase); u.lang = selectedLang === "zh" ? "zh-CN" : selectedLang === "ja" ? "ja-JP" : selectedLang === "ar" ? "ar-SA" : selectedLang === "pt" ? "pt-BR" : `${selectedLang}-${selectedLang.toUpperCase()}`; speechSynthesis.speak(u); }}
                        data-testid={`btn-speak-${i}`}
                        className="p-1.5 rounded-full hover:bg-amber-500/10 text-amber-500 transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${flipped === i ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                  {flipped === i && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-foreground font-medium">{p.translation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Lección del día ─────────────────────────────────────────────── */}
      {tab === "lesson" && (
        <div className="px-4 pt-4 space-y-4">
          {/* Word of the day */}
          <div className="rounded-2xl border bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Palabra del día</span>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
                {langMeta.flag} {langMeta.name}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-4xl">{lesson.emoji}</span>
              <div>
                <p className="text-2xl font-bold">{lesson.word}</p>
                <p className="text-sm text-muted-foreground font-mono">{lesson.phonetic}</p>
              </div>
              <button
                onClick={() => { const u = new SpeechSynthesisUtterance(lesson.word); u.lang = selectedLang === "zh" ? "zh-CN" : selectedLang === "ja" ? "ja-JP" : selectedLang === "ar" ? "ar-SA" : selectedLang === "pt" ? "pt-BR" : `${selectedLang}-${selectedLang.toUpperCase()}`; speechSynthesis.speak(u); }}
                className="ml-auto p-2 rounded-full bg-amber-500/10 text-amber-500"
                data-testid="btn-lesson-speak"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 bg-amber-500/10 rounded-xl px-3 py-2">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{lesson.translation}</p>
            </div>
          </div>

          {/* Example sentence */}
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ejemplo</p>
            <p className="text-sm font-medium">"{lesson.example}"</p>
            <p className="text-sm text-muted-foreground mt-1 italic">"{lesson.exampleTrans}"</p>
          </div>

          {/* Cultural tip */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">💡 Dato cultural</p>
            <p className="text-sm text-foreground">{lesson.tip}</p>
          </div>

          {/* Language settings */}
          <div className="rounded-2xl border bg-card p-4 space-y-4">
            <p className="text-sm font-semibold">Mis idiomas</p>

            <div>
              <button
                onClick={() => setSpeaksExpanded(!speaksExpanded)}
                className="flex w-full items-center justify-between text-xs text-muted-foreground"
                data-testid="btn-expand-speaks"
              >
                <span>Hablo ({speaks.length} seleccionados)</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${speaksExpanded ? "rotate-180" : ""}`} />
              </button>
              {speaksExpanded && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => toggleSpeak(l.code)}
                      data-testid={`btn-speaks-${l.code}`}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        speaks.includes(l.code)
                          ? "bg-green-500/10 border-green-500 text-green-600"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {speaks.includes(l.code) && <Check className="w-3 h-3" />}
                      {l.flag} {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => setLearningExpanded(!learningExpanded)}
                className="flex w-full items-center justify-between text-xs text-muted-foreground"
                data-testid="btn-expand-learning"
              >
                <span>Aprendo ({learning.length} seleccionados)</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${learningExpanded ? "rotate-180" : ""}`} />
              </button>
              {learningExpanded && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => toggleLearn(l.code)}
                      data-testid={`btn-learns-${l.code}`}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        learning.includes(l.code)
                          ? "bg-amber-500/10 border-amber-500 text-amber-600"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {learning.includes(l.code) && <Check className="w-3 h-3" />}
                      {l.flag} {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Nativos ─────────────────────────────────────────────────────── */}
      {tab === "natives" && (
        <div className="px-4 pt-4 space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-4">
            <p className="text-sm font-semibold mb-1">Conecta con hablantes nativos</p>
            <p className="text-xs text-muted-foreground">
              Estos usuarios hablan {langMeta.flag} {langMeta.name} de forma nativa. ¡Practica con ellos!
            </p>
          </div>

          {/* Language picker for natives */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setSelectedLang(l.code as LangCode)}
                data-testid={`btn-native-lang-${l.code}`}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-all ${
                  selectedLang === l.code ? "bg-amber-500 text-white border-amber-500" : "border-border text-muted-foreground"
                }`}
              >
                {l.flag} {l.name}
              </button>
            ))}
          </div>

          {nativesLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : natives.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">🔍</span>
              <p className="mt-3 font-medium">Ningún usuario ha indicado que habla {langMeta.name} todavía.</p>
              <p className="text-sm text-muted-foreground mt-1">Sé el primero en configurar tus idiomas para que otros te encuentren.</p>
              <Button className="mt-4 bg-amber-500 hover:bg-amber-600" onClick={() => setTab("lesson")} data-testid="btn-go-setup-langs">
                Configurar mis idiomas
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {natives.map((u: any) => (
                <div
                  key={u.id}
                  onClick={() => navigate(`/profile/${u.id}`)}
                  data-testid={`native-card-${u.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl border bg-card hover:border-amber-500/40 cursor-pointer transition-all"
                >
                  <div className="relative flex-shrink-0">
                    {u.profileImageUrl ? (
                      <img src={u.profileImageUrl} alt={u.firstName} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold text-lg">
                        {u.firstName?.[0] ?? "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{u.firstName}</p>
                    {u.city && <p className="text-xs text-muted-foreground">📍 {u.city}</p>}
                    {u.bio && <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.bio}</p>}
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(u.speaksLanguages ?? []).map((lc: string) => {
                        const meta = LANGUAGES.find(l => l.code === lc);
                        return meta ? <span key={lc} className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-full">{meta.flag} {meta.name}</span> : null;
                      })}
                      {(u.learningLanguages ?? []).map((lc: string) => {
                        const meta = LANGUAGES.find(l => l.code === lc);
                        return meta ? <span key={lc} className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">📖 {meta.name}</span> : null;
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA to configure own languages */}
          <div className="rounded-2xl border border-dashed border-amber-500/30 p-4 text-center">
            <p className="text-xs text-muted-foreground">¿Quieres que te encuentren otros usuarios?</p>
            <Button variant="outline" size="sm" className="mt-2 border-amber-500 text-amber-600" onClick={() => setTab("lesson")} data-testid="btn-config-langs">
              Actualizar mis idiomas
            </Button>
          </div>
        </div>
      )}

      <BottomNav />

      {quizOpen && (
        <LanguageQuiz
          lang={selectedLang}
          langName={langMeta.name}
          langFlag={langMeta.flag}
          onClose={() => setQuizOpen(false)}
        />
      )}
    </div>
  );
}
