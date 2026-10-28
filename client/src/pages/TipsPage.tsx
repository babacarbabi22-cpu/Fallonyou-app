import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Lightbulb, MapPin, Shield, Globe, Zap, ChevronDown, ChevronUp, Users, ExternalLink, Backpack, Crown, Lock, X, Phone, Plane, AlertTriangle, Hotel, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { TIPS_PAGE_LOCALE_COPY } from "./tipsPageLocaleCopy";
import { PLACE_REVIEW_COPY } from "@/shared/place-review-copy";

// ── A: Daily travel tips (deterministic by day of year) ──────────────────────
const DAILY_TIP_EMOJIS = [
  "🌍", "📸", "🔋", "💊", "💸", "🎒", "🕐", "🌐", "🏨", "🚰",
  "🌤️", "🍽️", "📞", "🎒", "🤝", "🔒", "🌿", "🚌", "📋", "🌅",
  "💬", "🎫", "🏦", "📱", "🧴", "🗺️", "🧳", "🌙", "📚", "🎵",
];

function getDailyTip() {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const index = dayOfYear % DAILY_TIP_EMOJIS.length;
  return { emoji: DAILY_TIP_EMOJIS[index], index };
}

// ── C: Safety tips ───────────────────────────────────────────────────────────
const SAFETY_TIPS = [
  {
    emoji: "📍",
    title: "Queda siempre en lugar público",
    content: "Para los primeros encuentros, elige siempre cafeterías, parques o zonas concurridas. Nunca en domicilios particulares hasta que tengas confianza real.",
  },
  {
    emoji: "📣",
    title: "Avisa a alguien de confianza",
    content: "Antes de quedar con alguien nuevo, dile a un amigo o familiar dónde vas, con quién y a qué hora piensas volver. Un mensaje es suficiente.",
  },
  {
    emoji: "🚗",
    title: "Ve por tu cuenta al lugar",
    content: "No aceptes que te recojan en el primer encuentro. Ve por tus propios medios para poder marcharte cuando quieras sin depender de nadie.",
  },
  {
    emoji: "🔎",
    title: "Verifica el perfil antes",
    content: "Antes de quedar, revisa que el perfil tenga fotos reales, bio completa y tiempo en la app. Los perfiles vacíos o recientes son señal de alerta.",
  },
  {
    emoji: "📵",
    title: "Comparte tu ubicación en tiempo real",
    content: "Activa la ubicación compartida en tiempo real con alguien de confianza durante el encuentro. Google Maps y WhatsApp permiten hacerlo fácilmente.",
  },
  {
    emoji: "🚩",
    title: "Confía en tu instinto",
    content: "Si algo no te parece bien, no tienes que quedarte. Puedes irte con cualquier excusa o sin dar ninguna. Tu comodidad es lo primero.",
  },
];

// ── D: Useful phrases ────────────────────────────────────────────────────────
const PHRASES: Record<string, { label: string; flag: string; items: { emoji: string; phrase: string; meaning: string }[] }> = {
  en: {
    label: "English",
    flag: "🇬🇧",
    items: [
      { emoji: "👋", phrase: "Hello! How are you?", meaning: "Hola, ¿cómo estás?" },
      { emoji: "🙏", phrase: "Thank you very much", meaning: "Muchas gracias" },
      { emoji: "❓", phrase: "Where is...?", meaning: "¿Dónde está...?" },
      { emoji: "💰", phrase: "How much does it cost?", meaning: "¿Cuánto cuesta?" },
      { emoji: "🏥", phrase: "I need a doctor", meaning: "Necesito un médico" },
      { emoji: "🚿", phrase: "Where is the bathroom?", meaning: "¿Dónde está el baño?" },
      { emoji: "🍽️", phrase: "A table for two, please", meaning: "Una mesa para dos, por favor" },
      { emoji: "🚕", phrase: "Take me to this address", meaning: "Llévame a esta dirección" },
      { emoji: "✈️", phrase: "I'm a traveler from Spain", meaning: "Soy viajero/a de España" },
      { emoji: "😊", phrase: "Nice to meet you!", meaning: "¡Encantado/a de conocerte!" },
    ],
  },
  fr: {
    label: "Français",
    flag: "🇫🇷",
    items: [
      { emoji: "👋", phrase: "Bonjour ! Comment allez-vous ?", meaning: "Hola, ¿cómo estás?" },
      { emoji: "🙏", phrase: "Merci beaucoup", meaning: "Muchas gracias" },
      { emoji: "❓", phrase: "Où se trouve... ?", meaning: "¿Dónde está...?" },
      { emoji: "💰", phrase: "Combien ça coûte ?", meaning: "¿Cuánto cuesta?" },
      { emoji: "🏥", phrase: "J'ai besoin d'un médecin", meaning: "Necesito un médico" },
      { emoji: "🚿", phrase: "Où sont les toilettes ?", meaning: "¿Dónde está el baño?" },
      { emoji: "🍽️", phrase: "Une table pour deux, s'il vous plaît", meaning: "Una mesa para dos, por favor" },
      { emoji: "🚕", phrase: "Emmenez-moi à cette adresse", meaning: "Llévame a esta dirección" },
      { emoji: "✈️", phrase: "Je suis voyageur depuis l'Espagne", meaning: "Soy viajero/a de España" },
      { emoji: "😊", phrase: "Enchanté(e) de vous rencontrer !", meaning: "¡Encantado/a de conocerte!" },
    ],
  },
  de: {
    label: "Deutsch",
    flag: "🇩🇪",
    items: [
      { emoji: "👋", phrase: "Hallo! Wie geht es Ihnen?", meaning: "Hola, ¿cómo estás?" },
      { emoji: "🙏", phrase: "Vielen Dank", meaning: "Muchas gracias" },
      { emoji: "❓", phrase: "Wo ist...?", meaning: "¿Dónde está...?" },
      { emoji: "💰", phrase: "Wie viel kostet das?", meaning: "¿Cuánto cuesta?" },
      { emoji: "🏥", phrase: "Ich brauche einen Arzt", meaning: "Necesito un médico" },
      { emoji: "🚿", phrase: "Wo ist die Toilette?", meaning: "¿Dónde está el baño?" },
      { emoji: "🍽️", phrase: "Einen Tisch für zwei, bitte", meaning: "Una mesa para dos, por favor" },
      { emoji: "🚕", phrase: "Fahren Sie mich zu dieser Adresse", meaning: "Llévame a esta dirección" },
      { emoji: "✈️", phrase: "Ich bin Reisender aus Spanien", meaning: "Soy viajero/a de España" },
      { emoji: "😊", phrase: "Schön, Sie kennenzulernen!", meaning: "¡Encantado/a de conocerte!" },
    ],
  },
  it: {
    label: "Italiano",
    flag: "🇮🇹",
    items: [
      { emoji: "👋", phrase: "Ciao! Come stai?", meaning: "Hola, ¿cómo estás?" },
      { emoji: "🙏", phrase: "Grazie mille", meaning: "Muchas gracias" },
      { emoji: "❓", phrase: "Dov'è...?", meaning: "¿Dónde está...?" },
      { emoji: "💰", phrase: "Quanto costa?", meaning: "¿Cuánto cuesta?" },
      { emoji: "🏥", phrase: "Ho bisogno di un medico", meaning: "Necesito un médico" },
      { emoji: "🚿", phrase: "Dov'è il bagno?", meaning: "¿Dónde está el baño?" },
      { emoji: "🍽️", phrase: "Un tavolo per due, per favore", meaning: "Una mesa para dos, por favor" },
      { emoji: "🚕", phrase: "Portami a questo indirizzo", meaning: "Llévame a esta dirección" },
      { emoji: "✈️", phrase: "Sono un viaggiatore dalla Spagna", meaning: "Soy viajero/a de España" },
      { emoji: "😊", phrase: "Piacere di conoscerti!", meaning: "¡Encantado/a de conocerte!" },
    ],
  },
  pt: {
    label: "Português",
    flag: "🇧🇷",
    items: [
      { emoji: "👋", phrase: "Olá! Como vai você?", meaning: "Hola, ¿cómo estás?" },
      { emoji: "🙏", phrase: "Muito obrigado/a", meaning: "Muchas gracias" },
      { emoji: "❓", phrase: "Onde fica...?", meaning: "¿Dónde está...?" },
      { emoji: "💰", phrase: "Quanto custa?", meaning: "¿Cuánto cuesta?" },
      { emoji: "🏥", phrase: "Preciso de um médico", meaning: "Necesito un médico" },
      { emoji: "🚿", phrase: "Onde fica o banheiro?", meaning: "¿Dónde está el baño?" },
      { emoji: "🍽️", phrase: "Uma mesa para dois, por favor", meaning: "Una mesa para dos, por favor" },
      { emoji: "🚕", phrase: "Me leve a este endereço", meaning: "Llévame a esta dirección" },
      { emoji: "✈️", phrase: "Sou viajante da Espanha", meaning: "Soy viajero/a de España" },
      { emoji: "😊", phrase: "Prazer em conhecê-lo/a!", meaning: "¡Encantado/a de conocerte!" },
    ],
  },
};

// ── E: Weekly challenge travel tip ───────────────────────────────────────────
const WEEKLY_CHALLENGES = [
  { emoji: "📸" },
  { emoji: "🗺️" },
  { emoji: "🎉" },
  { emoji: "⚡" },
  { emoji: "🌍" },
  { emoji: "✍️" },
  { emoji: "🤝" },
  { emoji: "🌅" },
];

function getWeeklyChallenge() {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return WEEKLY_CHALLENGES[weekNum % WEEKLY_CHALLENGES.length];
}

// ── F: Travel resources ──────────────────────────────────────────────────────
const TRAVEL_RESOURCES = [
  {
    emoji: "🏠",
    name: "Airbnb",
    desc: "Alojamiento único con ambiente local en todo el mundo",
    url: "https://www.airbnb.com",
    color: "#FF5A5F",
  },
  {
    emoji: "🏨",
    name: "Booking.com",
    desc: "Hoteles, apartamentos y hostels con cancelación gratuita",
    url: "https://www.booking.com",
    color: "#003580",
  },
  {
    emoji: "✈️",
    name: "Skyscanner",
    desc: "Compara vuelos baratos de todas las aerolíneas",
    url: "https://www.skyscanner.com",
    color: "#0770E3",
  },
  {
    emoji: "🚆",
    name: "Omio",
    desc: "Trenes, autobuses y ferrys en Europa desde un solo lugar",
    url: "https://www.omio.com",
    color: "#00C8A0",
  },
  {
    emoji: "🎒",
    name: "Hostelworld",
    desc: "Hostels en todo el mundo — perfecto para conocer viajeros",
    url: "https://www.hostelworld.com",
    color: "#F26522",
  },
  {
    emoji: "⭐",
    name: "TripAdvisor",
    desc: "Restaurantes, actividades y atracciones con reseñas reales",
    url: "https://www.tripadvisor.com",
    color: "#00AA6C",
  },
  {
    emoji: "💱",
    name: "XE Currency",
    desc: "Tipo de cambio en tiempo real para cualquier divisa",
    url: "https://www.xe.com",
    color: "#1A56DB",
  },
  {
    emoji: "🌐",
    name: "Google Translate",
    desc: "Traducciones instantáneas incluso con la cámara del móvil",
    url: "https://translate.google.com",
    color: "#4285F4",
  },
  {
    emoji: "🗺️",
    name: "Maps.me",
    desc: "Mapas offline detallados que funcionan sin internet",
    url: "https://maps.me",
    color: "#FF6600",
  },
];

// ── G: Emergency numbers ─────────────────────────────────────────────────────
const UNIVERSAL_NUMBERS = [
  { flag: "🌍", label: "Europa (112)", number: "112", desc: "Emergencias en toda la UE — policía, ambulancia, bomberos" },
  { flag: "🇺🇸", label: "EE.UU. / Canadá", number: "911", desc: "Emergencias en Estados Unidos y Canadá" },
  { flag: "🆘", label: "Información consular", number: "Embajada", desc: "Busca el número de tu embajada antes de viajar" },
];

const COUNTRY_NUMBERS = [
  { flag: "🇬🇧", country: "Reino Unido", emergency: "999", police: "101", ambulance: "999" },
  { flag: "🇫🇷", country: "Francia", emergency: "112", police: "17", ambulance: "15" },
  { flag: "🇩🇪", country: "Alemania", emergency: "112", police: "110", ambulance: "112" },
  { flag: "🇮🇹", country: "Italia", emergency: "112", police: "113", ambulance: "118" },
  { flag: "🇵🇹", country: "Portugal", emergency: "112", police: "112", ambulance: "112" },
  { flag: "🇳🇱", country: "Países Bajos", emergency: "112", police: "0900-8844", ambulance: "112" },
  { flag: "🇧🇪", country: "Bélgica", emergency: "112", police: "101", ambulance: "100" },
  { flag: "🇨🇭", country: "Suiza", emergency: "117", police: "117", ambulance: "144" },
  { flag: "🇲🇽", country: "México", emergency: "911", police: "911", ambulance: "911" },
  { flag: "🇦🇷", country: "Argentina", emergency: "911", police: "101", ambulance: "107" },
  { flag: "🇧🇷", country: "Brasil", emergency: "190", police: "190", ambulance: "192" },
  { flag: "🇲🇦", country: "Marruecos", emergency: "15", police: "19", ambulance: "15" },
  { flag: "🇹🇷", country: "Turquía", emergency: "112", police: "155", ambulance: "112" },
  { flag: "🇬🇷", country: "Grecia", emergency: "112", police: "100", ambulance: "166" },
  { flag: "🇹🇭", country: "Tailandia", emergency: "191", police: "191", ambulance: "1669" },
  { flag: "🇯🇵", country: "Japón", emergency: "110/119", police: "110", ambulance: "119" },
  { flag: "🇦🇺", country: "Australia", emergency: "000", police: "000", ambulance: "000" },
  { flag: "🇿🇦", country: "Sudáfrica", emergency: "10111", police: "10111", ambulance: "10177" },
  { flag: "🇮🇳", country: "India", emergency: "112", police: "100", ambulance: "108" },
  { flag: "🇦🇪", country: "Emiratos Árabes", emergency: "999", police: "999", ambulance: "998" },
];

// ── H: Airport tips ──────────────────────────────────────────────────────────
const AIRPORT_FREE = [
  { emoji: "⏰", tip: "Llega 2h antes para vuelos nacionales y 3h para internacionales" },
  { emoji: "📱", tip: "Descarga la app de tu aerolínea para tener la tarjeta de embarque offline" },
  { emoji: "💧", tip: "Lleva una botella vacía — puedes llenarla gratis después del control de seguridad" },
];

const AIRPORT_PREMIUM = [
  { emoji: "🛋️", tip: "Muchas tarjetas de crédito premium dan acceso gratuito a salas VIP. Consulta la tuya antes de viajar." },
  { emoji: "🔌", tip: "Los enchufes están en las columnas centrales y junto a las puertas de embarque, no solo en las cafeterías." },
  { emoji: "🧳", tip: "Factura las maletas grandes online siempre. En el aeropuerto suele costar más." },
  { emoji: "🚿", tip: "En vuelos largos, muchos aeropuertos ofrecen duchas de pago en la terminal (suele costar 10-20€). Ideal entre escalas largas." },
  { emoji: "💊", tip: "Las farmacias en terminales venden adaptadores, cargadores y artículos básicos si olvidaste algo." },
  { emoji: "🎫", tip: "Si tu vuelo se cancela o retrasa más de 3h en la UE, tienes derecho a compensación de hasta 600€ (Reglamento CE 261/2004)." },
  { emoji: "🍽️", tip: "Pide comida especial (vegana, sin gluten, kosher) al reservar. Suele llegar antes y a veces es mejor que la estándar." },
  { emoji: "💺", tip: "Los asientos junto a la salida de emergencia tienen más espacio para las piernas pero no reclinan. Elige según tus prioridades." },
  { emoji: "🔋", tip: "Carga todos los dispositivos antes de pasar el control — te pueden pedir que los enciendas para verificar que funcionan." },
];

// ── I: Anti-theft & lost guide ───────────────────────────────────────────────
const ANTITHEFT_FREE = [
  { emoji: "👜", tip: "Lleva la mochila por delante en zonas concurridas y transportes públicos" },
  { emoji: "💳", tip: "Nunca lleves todas tus tarjetas juntas — guarda una de repuesto separada" },
  { emoji: "📵", tip: "No uses el móvil en la calle en zonas turísticas conocidas por carteristas" },
];

const ANTITHEFT_PREMIUM = [
  { emoji: "🌍", tip: "Zonas de especial cuidado en Europa: La Rambla (Barcelona), Termini (Roma), Châtelet (París), Praterstern (Viena)." },
  { emoji: "💰", tip: "Lleva el dinero en efectivo repartido en dos sitios. Así si te roban uno, tienes el otro." },
  { emoji: "🔐", tip: "Usa una riñonera interior (debajo de la ropa) para el pasaporte y tarjetas en zonas de alto riesgo." },
  { emoji: "📷", tip: "Los carteristas suelen trabajar en parejas: uno distrae, otro roba. Si alguien te enfoca mucho, alerta." },
  { emoji: "🚇", tip: "En el metro, los robos ocurren principalmente al entrar y salir del vagón — ese es el momento de mayor vigilancia." },
  { emoji: "🏨", tip: "Guarda pasaporte y objetos de valor en la caja fuerte del hotel, nunca en la maleta aunque esté con candado." },
];

const STOLEN_GUIDE = [
  { emoji: "📄", step: "1. Pasaporte robado", action: "Ve directamente a la embajada o consulado de tu país. Necesitarán una copia de tu DNI o pasaporte (por eso guárdala en la nube) y una denuncia policial." },
  { emoji: "💳", step: "2. Tarjeta robada", action: "Llama inmediatamente al número de emergencias de tu banco (suele estar en el reverso). Bloquéala por teléfono o app. Pide una tarjeta de emergencia — muchos bancos la envían en 24-48h." },
  { emoji: "📱", step: "3. Móvil robado", action: "Desde otro dispositivo: activa 'Buscar mi iPhone' o 'Encontrar mi dispositivo' de Google para bloquearlo remotamente. Luego denuncia a la policía local." },
  { emoji: "🧳", step: "4. Maleta perdida en el aeropuerto", action: "Antes de salir del aeropuerto ve al mostrador de la aerolínea. Abre un parte de irregularidad de equipaje (PIR). Tienes derecho a compensación por retraso y a una cantidad diaria para artículos básicos." },
  { emoji: "🏥", step: "5. Necesitas atención médica", action: "En la UE usa la Tarjeta Sanitaria Europea (TSE) para atención gratuita. Fuera de la UE, contacta a tu seguro de viaje inmediatamente antes de recibir tratamiento si es posible." },
];

// ── J: Using FallonYou while travelling ─────────────────────────────────────
const APP_TRAVEL_TIPS = {
  es: {
    title: "Aprovecha FallonYou en tu viaje",
    subtitle: "Funciones útiles antes de salir y cuando ya estás en tu destino.",
    items: [
      { emoji: "✈️", title: "Compara vuelos reales", text: "Usa Viajes para consultar opciones y precios actuales. Revisa siempre las condiciones finales del proveedor antes de pagar." },
      { emoji: "🗺️", title: "Consulta la guía de la ciudad", text: "Antes de llegar, revisa transporte, moneda, costumbres y consejos prácticos del destino." },
      { emoji: "📅", title: "Crea un plan claro", text: "Publica una actividad con ciudad, hora, lugar público y una descripción sencilla para que otros viajeros sepan qué esperar." },
      { emoji: "👥", title: "Planea con tu grupo", text: "Comparte una actividad con amigos o compañeros para organizar juntos el próximo evento o viaje." },
      { emoji: "🗣️", title: "Practica frases útiles", text: "Visita Idiomas antes del viaje para practicar saludos, direcciones, compras y situaciones habituales." },
      { emoji: "🛡️", title: "Prioriza perfiles fiables", text: "Revisa la información del perfil, queda en lugares públicos y utiliza Reportar o Bloquear si algo no te transmite confianza." },
      { emoji: "🛫", title: "Si trabajas en aviación", text: "Activa Tripulación en escala para encontrar a otros profesionales en tu ciudad de escala sin compartir vuelo, aerolínea ni hotel." },
    ],
  },
  en: {
    title: "Make the most of FallonYou",
    subtitle: "Useful features before departure and once you reach your destination.",
    items: [
      { emoji: "✈️", title: "Compare live flights", text: "Use Trips to check current options and prices. Always review the provider's final terms before paying." },
      { emoji: "🗺️", title: "Read the city guide", text: "Before arrival, check local transport, currency, customs and practical destination advice." },
      { emoji: "📅", title: "Create a clear plan", text: "Publish an activity with a city, time, public meeting place and simple description so travelers know what to expect." },
      { emoji: "👥", title: "Plan with your group", text: "Share an activity with friends or colleagues to organize your next event or trip together." },
      { emoji: "🗣️", title: "Practice useful phrases", text: "Visit Languages before traveling to practice greetings, directions, shopping and everyday situations." },
      { emoji: "🛡️", title: "Choose trustworthy profiles", text: "Review profile information, meet in public and use Report or Block if something does not feel right." },
      { emoji: "🛫", title: "If you work in aviation", text: "Enable Layover crew to find other professionals without sharing your flight, airline or hotel." },
    ],
  },
  fr: {
    title: "Profitez pleinement de FallonYou",
    subtitle: "Des fonctions utiles avant le départ et une fois à destination.",
    items: [
      { emoji: "✈️", title: "Comparez les vols actuels", text: "Utilisez Voyages pour consulter les options et tarifs. Vérifiez toujours les conditions finales du fournisseur avant de payer." },
      { emoji: "🗺️", title: "Consultez le guide de la ville", text: "Avant l'arrivée, vérifiez les transports, la monnaie, les coutumes et les conseils pratiques." },
      { emoji: "📅", title: "Créez un plan clair", text: "Publiez une activité avec la ville, l'heure, un lieu public et une description simple." },
      { emoji: "👥", title: "Planifiez avec votre groupe", text: "Partagez une activité avec vos amis ou collègues pour organiser ensemble un événement ou voyage." },
      { emoji: "🗣️", title: "Pratiquez des phrases utiles", text: "Consultez Langues avant le voyage pour pratiquer les salutations, directions, achats et situations courantes." },
      { emoji: "🛡️", title: "Privilégiez les profils fiables", text: "Vérifiez les profils, rencontrez-vous dans un lieu public et utilisez Signaler ou Bloquer en cas de doute." },
      { emoji: "🛫", title: "Si vous travaillez dans l'aviation", text: "Activez Équipage en escale pour trouver des professionnels sans partager vol, compagnie ni hôtel." },
    ],
  },
  sv: {
    title: "Få ut mer av FallonYou på resan",
    subtitle: "Användbara funktioner före avresa och när du är framme.",
    items: [
      { emoji: "✈️", title: "Jämför aktuella flyg", text: "Använd Resor för att se alternativ och priser. Kontrollera alltid leverantörens slutliga villkor innan du betalar." },
      { emoji: "🗺️", title: "Läs stadsguiden", text: "Kontrollera lokaltrafik, valuta, seder och praktiska råd innan du anländer." },
      { emoji: "📅", title: "Skapa en tydlig plan", text: "Publicera en aktivitet med stad, tid, offentlig mötesplats och en enkel beskrivning." },
      { emoji: "👥", title: "Planera med din grupp", text: "Dela en aktivitet med vänner eller kollegor och planera nästa evenemang eller resa tillsammans." },
      { emoji: "🗣️", title: "Öva användbara fraser", text: "Besök Språk före resan och öva hälsningar, vägbeskrivningar, inköp och vanliga situationer." },
      { emoji: "🛡️", title: "Välj pålitliga profiler", text: "Läs profilinformationen, träffas offentligt och använd Anmäl eller Blockera om något känns fel." },
      { emoji: "🛫", title: "Om du arbetar inom flyget", text: "Aktivera Besättning på stopp för att hitta andra flygproffs utan att dela flyg, flygbolag eller hotell." },
    ],
  },
} as const;

// ── Main component ────────────────────────────────────────────────────────────
export default function TipsPage() {
  const [openSafety, setOpenSafety] = useState<number | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>("en");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { t, language } = useI18n();

  const localeCopy = TIPS_PAGE_LOCALE_COPY[language];
  const dailyTip = getDailyTip();
  const challenge = getWeeklyChallenge();
  const dailyIndex = dailyTip.index;
  const challengeIndex = WEEKLY_CHALLENGES.indexOf(challenge);
  const localizedDailyTip = localeCopy.dailyTips[dailyIndex];
  const localizedChallenge = {
    ...challenge,
    text: localeCopy.weeklyChallenges[challengeIndex][0],
    tip: localeCopy.weeklyChallenges[challengeIndex][1],
  };

  const { data: premiumStatus } = useQuery<{ isPremium: boolean }>({ queryKey: ["/api/premium/status"] });
  const isPremium = premiumStatus?.isPremium ?? false;

  const { data: destinationsData } = useQuery<{ destinations: { city: string; count: number }[] }>({
    queryKey: ["/api/explore/destinations"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: cityUsersData, isLoading: cityLoading } = useQuery<{
    users: { photoUrl: string }[];
    isPremium: boolean;
    total: number;
  }>({
    queryKey: ["/api/explore/destination-users", selectedCity],
    queryFn: () => fetch(`/api/explore/destination-users?city=${encodeURIComponent(selectedCity!)}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedCity,
    staleTime: 2 * 60 * 1000,
  });

  const destinations = destinationsData?.destinations ?? [];
  const lang = PHRASES[selectedLang];
  const appTips = APP_TRAVEL_TIPS[language];
  const reviewCopy = PLACE_REVIEW_COPY[language];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors" data-testid="button-back-tips">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-base font-bold leading-tight">{t.tipsPage.title}</h1>
          <p className="text-xs text-muted-foreground">{localeCopy.subtitle}</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-7 max-w-lg mx-auto">

        <Link href="/place-reviews" data-testid="link-place-reviews" className="group flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.07] p-4 transition-colors hover:bg-primary/[0.11]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Hotel className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{reviewCopy.title}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{reviewCopy.intro}</span>
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>

        {/* ── A: Consejo del día ─────────────────────────────────────────── */}
        <section data-testid="section-daily-tip">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">{t.ui.tipsDaily}</h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 flex items-start gap-4"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(0,0,0,0.3) 100%)",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            <div className="text-3xl shrink-0">{dailyTip.emoji}</div>
            <p className="text-sm text-foreground leading-relaxed">{localizedDailyTip}</p>
          </motion.div>
        </section>

        {/* ── E: Reto semanal ───────────────────────────────────────────── */}
        <section data-testid="section-weekly-challenge-tips">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">{t.ui.tipsWeekly}</h2>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(0,0,0,0.3) 100%)",
              border: "1px solid rgba(245,158,11,0.25)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl shrink-0">
                {localizedChallenge.emoji}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-snug">{localizedChallenge.text}</p>
                <p className="text-xs text-amber-400/80 mt-1.5 leading-snug">💡 {localizedChallenge.tip}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── J: Cómo aprovechar FallonYou durante el viaje ─────────────── */}
        <section data-testid="section-app-travel-tips">
          <div className="flex items-center gap-2 mb-3">
            <Plane className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">{appTips.title}</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{appTips.subtitle}</p>
          <div className="space-y-2">
            {appTips.items.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.035 }}
                className="rounded-xl border border-border/60 bg-card p-3 flex items-start gap-3"
              >
                <span className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">{item.emoji}</span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── D: Frases útiles ─────────────────────────────────────────── */}
        <section data-testid="section-travel-phrases">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">{t.ui.tipsTravelPhrases}</h2>
          </div>
          {/* Language selector */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
            {Object.entries(PHRASES).map(([code, { label, flag }]) => (
              <button
                key={code}
                onClick={() => setSelectedLang(code)}
                data-testid={`button-lang-${code}`}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={
                  selectedLang === code
                    ? { background: "linear-gradient(90deg,#D97706,#F59E0B)", color: "#000" }
                    : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "inherit" }
                }
              >
                {flag} {label}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedLang}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {lang.items.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  data-testid={`phrase-item-${i}`}
                >
                  <span className="text-xl shrink-0">{item.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.phrase}</p>
                    <p className="text-xs text-muted-foreground">
                      {localeCopy.phraseMeanings[i]}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* ── C: Seguridad al conocer gente ─────────────────────────── */}
        <section data-testid="section-safety-tips">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">{t.ui.tipsSafeTravel}</h2>
          </div>
          <div className="space-y-2">
            {SAFETY_TIPS.map((s, i) => {
              const localizedTip = localeCopy.safetyTips[i];
              return (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  data-testid={`safety-tip-${i}`}
                >
                  <button
                    className="w-full flex items-center gap-3 p-3.5 text-left"
                    onClick={() => setOpenSafety(openSafety === i ? null : i)}
                    aria-expanded={openSafety === i}
                    aria-controls={`safety-tip-content-${i}`}
                  >
                    <span className="text-xl shrink-0">{s.emoji}</span>
                    <p className="flex-1 text-sm font-semibold">{localizedTip.title}</p>
                    {openSafety === i
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>
                  <AnimatePresence>
                    {openSafety === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                        id={`safety-tip-content-${i}`}
                      >
                        <p className="text-sm text-muted-foreground leading-relaxed px-4 pb-4">
                          {localizedTip.content}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── G: Números de emergencia ──────────────────────────────── */}
        <section data-testid="section-emergency-numbers">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">{t.ui.tipsEmergency}</h2>
          </div>
          {/* Free: universal numbers */}
          <div className="space-y-2 mb-3">
            {UNIVERSAL_NUMBERS.map((n, i) => (
              <div key={i} className="rounded-xl p-3.5 flex items-center gap-3"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
                data-testid={`emergency-universal-${i}`}>
                <span className="text-xl shrink-0">{n.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{localeCopy.universalNumbers[i].label}</p>
                  <p className="text-xs text-muted-foreground">{localeCopy.universalNumbers[i].description}</p>
                </div>
                <span className="text-lg font-bold text-red-400 shrink-0">{n.number}</span>
              </div>
            ))}
          </div>
          {/* Premium: country-specific */}
          {isPremium ? (
            <div className="space-y-2">
               <p className="text-xs text-muted-foreground mb-2">{t.ui.tipsCountryNumbers}</p>
              {COUNTRY_NUMBERS.map((c, i) => (
                <div key={i} className="rounded-xl px-3.5 py-2.5 flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  data-testid={`emergency-country-${i}`}>
                  <span className="text-lg shrink-0">{c.flag}</span>
                  <p className="flex-1 text-sm font-semibold">{localeCopy.countryNames[i]}</p>
                  <div className="text-right text-xs text-muted-foreground space-y-0.5 shrink-0">
                    <p>🚨 <span className="font-bold text-red-400">{c.emergency}</span></p>
                    <p>👮 {c.police} · 🚑 {c.ambulance}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <button onClick={() => navigate("/premium")}
              className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
              data-testid="button-emergency-premium-lock">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-semibold">{t.ui.tipsPremiumCountries}</p>
                 <p className="text-xs text-muted-foreground">{t.ui.tipsCountriesHint}</p>
              </div>
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            </button>
          )}
        </section>

        {/* ── H: Consejos en el aeropuerto ──────────────────────────── */}
        <section data-testid="section-airport-tips">
          <div className="flex items-center gap-2 mb-3">
            <Plane className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">{t.ui.tipsAirport}</h2>
          </div>
          <div className="space-y-2 mb-3">
            {AIRPORT_FREE.map((t, i) => (
              <div key={i} className="rounded-xl p-3 flex items-start gap-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-xl shrink-0">{t.emoji}</span>
                <p className="text-sm text-foreground leading-snug">{localeCopy.airportFree[i]}</p>
              </div>
            ))}
          </div>
          {isPremium ? (
            <div className="space-y-2">
               <p className="text-xs text-muted-foreground mb-2">{t.ui.tipsPremiumInsider}</p>
              {AIRPORT_PREMIUM.map((t, i) => (
                <div key={i} className="rounded-xl p-3 flex items-start gap-3"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
                  <span className="text-xl shrink-0">{t.emoji}</span>
                  <p className="text-sm text-foreground leading-snug">{localeCopy.airportPremium[i]}</p>
                </div>
              ))}
            </div>
          ) : (
            <button onClick={() => navigate("/premium")}
              className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
              data-testid="button-airport-premium-lock">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-semibold">{t.ui.tipsAirportPremiumTitle}</p>
                 <p className="text-xs text-muted-foreground">{t.ui.tipsAirportPremiumDesc}</p>
              </div>
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            </button>
          )}
        </section>

        {/* ── I: Anti-robo y qué hacer si te pasa algo ─────────────── */}
        <section data-testid="section-antitheft">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">{t.ui.tipsTheft}</h2>
          </div>
          {/* Free: 3 basic anti-theft */}
          <div className="space-y-2 mb-3">
            {ANTITHEFT_FREE.map((t, i) => (
              <div key={i} className="rounded-xl p-3 flex items-start gap-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-xl shrink-0">{t.emoji}</span>
                <p className="text-sm text-foreground leading-snug">{localeCopy.antiTheftFree[i]}</p>
              </div>
            ))}
          </div>
          {isPremium ? (
            <div className="space-y-3">
               <p className="text-xs text-muted-foreground">{t.ui.tipsAdvancedTheft}</p>
              {ANTITHEFT_PREMIUM.map((t, i) => (
                <div key={i} className="rounded-xl p-3 flex items-start gap-3"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
                  <span className="text-xl shrink-0">{t.emoji}</span>
                  <p className="text-sm text-foreground leading-snug">{localeCopy.antiTheftPremium[i]}</p>
                </div>
              ))}
               <p className="text-xs text-muted-foreground mt-1">{t.ui.tipsWhatToDo}</p>
              {STOLEN_GUIDE.map((s, i) => (
                <div key={i} className="rounded-xl p-4"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
                  data-testid={`stolen-step-${i}`}>
                  <p className="text-sm font-bold flex items-center gap-2 mb-1.5">
                    <span>{s.emoji}</span>{localeCopy.stolenGuide[i].step}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{localeCopy.stolenGuide[i].action}</p>
                </div>
              ))}
            </div>
          ) : (
            <button onClick={() => navigate("/premium")}
              className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
              data-testid="button-antitheft-premium-lock">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-semibold">{t.ui.tipsFullTheft}</p>
                 <p className="text-xs text-muted-foreground">{t.ui.tipsFullTheftDesc}</p>
              </div>
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            </button>
          )}
        </section>

        {/* ── F: Recursos y herramientas de viaje ───────────────────── */}
        <section data-testid="section-travel-resources">
          <div className="flex items-center gap-2 mb-3">
            <Backpack className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">{t.ui.tipsTools}</h2>
          </div>
           <p className="text-xs text-muted-foreground mb-4">{t.ui.tipsToolsDesc}</p>
          <div className="space-y-2">
            {TRAVEL_RESOURCES.map((r, i) => (
              <motion.a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-xl p-3.5 active:scale-98 transition-transform"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                data-testid={`resource-${r.name.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 font-bold"
                  style={{ background: r.color + "22", border: `1px solid ${r.color}44` }}
                >
                  {r.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{localeCopy.resourceDescriptions[i]}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </motion.a>
            ))}
          </div>
        </section>

        {/* ── B: Destinos populares, intentionally last ─────────────────── */}
        <section data-testid="section-popular-destinations">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">{t.ui.tipsPopularDestinations}</h2>
          </div>
          {destinations.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 text-center">
              <p className="text-sm text-muted-foreground">{t.ui.tipsNoDestinations}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {destinations.slice(0, 8).map((d, i) => (
                <motion.button
                  key={d.city}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => isPremium ? setSelectedCity(d.city) : navigate("/premium")}
                  className="rounded-xl p-3 text-left w-full active:scale-95 transition-transform"
                  style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}
                  data-testid={`card-destination-${i}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <p className="text-sm font-semibold truncate">{d.city}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />{d.count} {d.count === 1 ? localeCopy.travelers.singular : localeCopy.travelers.plural}
                  </p>
                  {isPremium ? (
                    <p className="text-[10px] text-amber-500 mt-1.5 font-semibold">{t.ui.tipsSeeWho}</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> {t.ui.tipsPremiumOnly}
                    </p>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* ── Modal: viajeros en destino ───────────────────────────────── */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setSelectedCity(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl overflow-hidden"
              style={{ background: "#111", border: "1px solid rgba(245,158,11,0.25)" }}
              data-testid="modal-destination-users"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500" /> {selectedCity}
                  </h3>
                  {cityUsersData && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cityUsersData.total} {cityUsersData.total === 1 ? localeCopy.travelers.singular : localeCopy.travelers.plural} {localeCopy.travelers.citySuffix}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCity(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                  data-testid="button-close-destination-modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photos grid */}
              <div className="px-5 pb-2">
                {cityLoading ? (
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-white/10 animate-pulse" />
                    ))}
                  </div>
                ) : cityUsersData && cityUsersData.users.length > 0 ? (
                  <div className="grid grid-cols-4 gap-1.5">
                    {cityUsersData.users.map((u, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden">
                        <img
                          src={u.photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {localeCopy.travelers.noPhotos}
                  </p>
                )}
              </div>

              {/* CTA */}
              <div className="px-5 pb-5 pt-3">
                <p className="text-xs text-center text-muted-foreground">
                  {localeCopy.travelers.discoveryHint}
                  <Crown className="w-3 h-3 inline ml-1 text-amber-500" />
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
