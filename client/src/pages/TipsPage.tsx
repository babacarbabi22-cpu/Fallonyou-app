import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Lightbulb, MapPin, Shield, Globe, Zap, ChevronDown, ChevronUp, Users, ExternalLink, Backpack, Crown, Lock, X, Phone, Plane, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

// ── A: Daily travel tips (deterministic by day of year) ──────────────────────
const DAILY_TIPS = [
  { emoji: "🌍", tip: "Descarga los mapas offline de tu destino antes de viajar. Funciona sin internet y te salva en zonas sin cobertura." },
  { emoji: "📸", tip: "Guarda una foto de tu pasaporte, tarjetas y documentos importantes en la nube. Si los pierdes, los tienes igualmente." },
  { emoji: "🔋", tip: "Lleva un cargador portátil siempre encima. Un móvil sin batería en una ciudad desconocida es un problema evitable." },
  { emoji: "💊", tip: "Lleva un pequeño botiquín: analgésicos, tiritas, antihistamínico y pastillas para el estómago. Básico y muy útil." },
  { emoji: "💸", tip: "Avisa a tu banco antes de salir al extranjero para evitar que bloqueen tu tarjeta por movimientos inusuales." },
  { emoji: "🎒", tip: "Usa maletas o mochilas con candado de combinación en aeropuertos y alojamientos compartidos." },
  { emoji: "🕐", tip: "Llega a los aeropuertos con al menos 2 horas de antelación para vuelos domésticos y 3 para internacionales." },
  { emoji: "🌐", tip: "Consigue una SIM local o un eSIM al llegar. Suele ser más barato que el roaming de tu operadora." },
  { emoji: "🏨", tip: "Lee las reseñas recientes del alojamiento — las de menos de 3 meses son las más fiables." },
  { emoji: "🚰", tip: "Investiga si el agua del grifo es potable en tu destino. Puede ahorrarte dinero y reducir plásticos." },
  { emoji: "🌤️", tip: "Consulta el clima de tu destino una semana antes para hacer la maleta con criterio." },
  { emoji: "🍽️", tip: "Los restaurantes alejados de las zonas turísticas suelen ser más baratos y más auténticos." },
  { emoji: "📞", tip: "Guarda el número de la embajada de tu país en el destino. Puede ser crucial en emergencias." },
  { emoji: "🎒", tip: "Menos es más. Una mochila de cabina bien organizada te ahorra tiempo de espera y posibles pérdidas de equipaje." },
  { emoji: "🤝", tip: "Aprende 5 frases básicas en el idioma local: gracias, por favor, hola, dónde está y cuánto cuesta. Abre muchas puertas." },
  { emoji: "🔒", tip: "Usa una VPN cuando te conectes a WiFi públicos en hoteles, cafeterías o aeropuertos." },
  { emoji: "🌿", tip: "Compra en mercados locales en lugar de supermercados turísticos. Mejor precio y mejor producto." },
  { emoji: "🚌", tip: "El transporte público local es la mejor forma de entender una ciudad. Más barato y más auténtico que los taxis." },
  { emoji: "📋", tip: "Haz una lista de todo lo que necesitas antes de hacer la maleta. Te evita el típico olvido de última hora." },
  { emoji: "🌅", tip: "Las mejores fotos de ciudades se sacan al amanecer. Sin multitudes y con luz perfecta." },
  { emoji: "💬", tip: "Habla con los lugareños. Los mejores restaurantes, playas y experiencias no aparecen en las guías turísticas." },
  { emoji: "🎫", tip: "Reserva las atracciones más populares con antelación online. Te ahorras colas y a veces también dinero." },
  { emoji: "🏦", tip: "Saca dinero en efectivo en cajeros de bancos locales, no en los del aeropuerto. Las comisiones suelen ser menores." },
  { emoji: "📱", tip: "Activa el modo avión y conecta solo al WiFi cuando no necesites datos. Alarga la batería considerablemente." },
  { emoji: "🧴", tip: "Lleva los líquidos en botellas pequeñas recargables para cumplir la normativa de cabina y ahorrar espacio." },
  { emoji: "🗺️", tip: "Hazte con un mapa físico del centro de la ciudad. Si el móvil falla, siempre tienes orientación." },
  { emoji: "🧳", tip: "Pon una tarjeta con tu nombre y teléfono dentro de la maleta. Si el identificador externo se cae, la recuperas igualmente." },
  { emoji: "🌙", tip: "Reserva alojamiento cerca del transporte principal para los días de llegada y salida. Te simplifica todo." },
  { emoji: "📚", tip: "Lee un poco sobre la cultura local antes de llegar. Gestos y costumbres que parecen normales aquí pueden ser ofensivos allí." },
  { emoji: "🎵", tip: "Descarga música o podcasts offline antes del viaje. Los vuelos largos o trayectos en tren se hacen mucho más llevaderos." },
];

function getDailyTip() {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
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
  { emoji: "📸", text: "Comparte una foto de tu ciudad favorita en tu perfil", tip: "Los perfiles con fotos de viajes reciben un 40% más de conexiones" },
  { emoji: "🗺️", text: "Añade tu próximo destino a tu perfil", tip: "Así otros viajeros que van al mismo sitio pueden encontrarte" },
  { emoji: "🎉", text: "Únete a una actividad que nunca hayas probado", tip: "Las actividades nuevas son las mejores para hacer amigos de verdad" },
  { emoji: "⚡", text: "Activa 'Disponible hoy' y queda con alguien", tip: "Los usuarios activos reciben el doble de mensajes ese día" },
  { emoji: "🌍", text: "Conecta con alguien de una ciudad diferente", tip: "Las amistades a distancia abren puertas a viajes inesperados" },
  { emoji: "✍️", text: "Completa tu bio con algo que te defina de verdad", tip: "Una bio auténtica atrae personas con intereses similares" },
  { emoji: "🤝", text: "Asiste a un evento y conoce al organizador", tip: "Los organizadores suelen tener redes sociales muy activas y variadas" },
  { emoji: "🌅", text: "Sube una foto de tu aventura más reciente", tip: "Las fotos de experiencias reales generan más conversaciones que los selfies" },
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

// ── Main component ────────────────────────────────────────────────────────────
export default function TipsPage() {
  const [openSafety, setOpenSafety] = useState<number | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>("en");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const t = useTranslation();

  const dailyTip = getDailyTip();
  const challenge = getWeeklyChallenge();

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
          <p className="text-xs text-muted-foreground">{t.tipsPage.subtitle}</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-7 max-w-lg mx-auto">

        {/* ── A: Consejo del día ─────────────────────────────────────────── */}
        <section data-testid="section-daily-tip">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">Consejo del día</h2>
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
            <p className="text-sm text-foreground leading-relaxed">{dailyTip.tip}</p>
          </motion.div>
        </section>

        {/* ── E: Reto semanal ───────────────────────────────────────────── */}
        <section data-testid="section-weekly-challenge-tips">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">Reto semanal</h2>
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
                {challenge.emoji}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-snug">{challenge.text}</p>
                <p className="text-xs text-amber-400/80 mt-1.5 leading-snug">💡 {challenge.tip}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── B: Destinos populares ─────────────────────────────────────── */}
        <section data-testid="section-popular-destinations">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">Destinos populares</h2>
          </div>
          {destinations.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 text-center">
              <p className="text-sm text-muted-foreground">Aún no hay suficientes viajeros para mostrar destinos. ¡Sé de los primeros!</p>
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
                    <Users className="w-3 h-3" />{d.count} {d.count === 1 ? "viajero" : "viajeros"}
                  </p>
                  {isPremium ? (
                    <p className="text-[10px] text-amber-500 mt-1.5 font-semibold">Ver quién va aquí →</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Solo Premium
                    </p>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </section>

        {/* ── D: Frases útiles ─────────────────────────────────────────── */}
        <section data-testid="section-travel-phrases">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">Frases útiles</h2>
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
                    <p className="text-xs text-muted-foreground">{item.meaning}</p>
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
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">Viajar y quedar seguro</h2>
          </div>
          <div className="space-y-2">
            {SAFETY_TIPS.map((s, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                data-testid={`safety-tip-${i}`}
              >
                <button
                  className="w-full flex items-center gap-3 p-3.5 text-left"
                  onClick={() => setOpenSafety(openSafety === i ? null : i)}
                >
                  <span className="text-xl shrink-0">{s.emoji}</span>
                  <p className="flex-1 text-sm font-semibold">{s.title}</p>
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
                    >
                      <p className="text-sm text-muted-foreground leading-relaxed px-4 pb-4">
                        {s.content}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* ── G: Números de emergencia ──────────────────────────────── */}
        <section data-testid="section-emergency-numbers">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">Números de emergencia</h2>
          </div>
          {/* Free: universal numbers */}
          <div className="space-y-2 mb-3">
            {UNIVERSAL_NUMBERS.map((n, i) => (
              <div key={i} className="rounded-xl p-3.5 flex items-center gap-3"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
                data-testid={`emergency-universal-${i}`}>
                <span className="text-xl shrink-0">{n.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <span className="text-lg font-bold text-red-400 shrink-0">{n.number}</span>
              </div>
            ))}
          </div>
          {/* Premium: country-specific */}
          {isPremium ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Números específicos por país:</p>
              {COUNTRY_NUMBERS.map((c, i) => (
                <div key={i} className="rounded-xl px-3.5 py-2.5 flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  data-testid={`emergency-country-${i}`}>
                  <span className="text-lg shrink-0">{c.flag}</span>
                  <p className="flex-1 text-sm font-semibold">{c.country}</p>
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
                <p className="text-sm font-semibold">Números por país — 20+ destinos</p>
                <p className="text-xs text-muted-foreground">Reino Unido, Francia, Japón, Australia y más</p>
              </div>
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            </button>
          )}
        </section>

        {/* ── H: Consejos en el aeropuerto ──────────────────────────── */}
        <section data-testid="section-airport-tips">
          <div className="flex items-center gap-2 mb-3">
            <Plane className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">En el aeropuerto</h2>
          </div>
          <div className="space-y-2 mb-3">
            {AIRPORT_FREE.map((t, i) => (
              <div key={i} className="rounded-xl p-3 flex items-start gap-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-xl shrink-0">{t.emoji}</span>
                <p className="text-sm text-foreground leading-snug">{t.tip}</p>
              </div>
            ))}
          </div>
          {isPremium ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Consejos insider Premium:</p>
              {AIRPORT_PREMIUM.map((t, i) => (
                <div key={i} className="rounded-xl p-3 flex items-start gap-3"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
                  <span className="text-xl shrink-0">{t.emoji}</span>
                  <p className="text-sm text-foreground leading-snug">{t.tip}</p>
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
                <p className="text-sm font-semibold">9 consejos insider del aeropuerto</p>
                <p className="text-xs text-muted-foreground">Salas VIP, derechos si te cancelan el vuelo, trucos de comfort</p>
              </div>
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            </button>
          )}
        </section>

        {/* ── I: Anti-robo y qué hacer si te pasa algo ─────────────── */}
        <section data-testid="section-antitheft">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">Si te roban o te pierdes</h2>
          </div>
          {/* Free: 3 basic anti-theft */}
          <div className="space-y-2 mb-3">
            {ANTITHEFT_FREE.map((t, i) => (
              <div key={i} className="rounded-xl p-3 flex items-start gap-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-xl shrink-0">{t.emoji}</span>
                <p className="text-sm text-foreground leading-snug">{t.tip}</p>
              </div>
            ))}
          </div>
          {isPremium ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Guía anti-robo avanzada por zonas:</p>
              {ANTITHEFT_PREMIUM.map((t, i) => (
                <div key={i} className="rounded-xl p-3 flex items-start gap-3"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
                  <span className="text-xl shrink-0">{t.emoji}</span>
                  <p className="text-sm text-foreground leading-snug">{t.tip}</p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-1">¿Qué hacer si te ocurre algo?</p>
              {STOLEN_GUIDE.map((s, i) => (
                <div key={i} className="rounded-xl p-4"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
                  data-testid={`stolen-step-${i}`}>
                  <p className="text-sm font-bold flex items-center gap-2 mb-1.5">
                    <span>{s.emoji}</span>{s.step}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.action}</p>
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
                <p className="text-sm font-semibold">Guía completa + qué hacer si te roban</p>
                <p className="text-xs text-muted-foreground">Pasaporte, tarjeta, móvil, maleta perdida — paso a paso</p>
              </div>
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            </button>
          )}
        </section>

        {/* ── F: Recursos y herramientas de viaje ───────────────────── */}
        <section data-testid="section-travel-resources">
          <div className="flex items-center gap-2 mb-3">
            <Backpack className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">Herramientas de viaje</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Apps y webs útiles para organizar tu próxima aventura</p>
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
                  <p className="text-xs text-muted-foreground leading-snug">{r.desc}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </motion.a>
            ))}
          </div>
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
                      {cityUsersData.total} {cityUsersData.total === 1 ? "viajero" : "viajeros"} en esta ciudad
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
                    Aún no hay usuarios con foto en esta ciudad
                  </p>
                )}
              </div>

              {/* CTA */}
              <div className="px-5 pb-5 pt-3">
                <p className="text-xs text-center text-muted-foreground">
                  Conéctalos en la sección de descubrimiento 
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
