import type { Language } from "@/lib/i18n";

export const privateConnectionsCopy: Record<Language, {
  title: string;
  privacy: string;
  count: (count: number) => string;
  zeroTitle: string;
  zeroDescription: string;
  origins: string;
  cities: string;
  missing: string;
  moreOrigins: string;
  moreCities: string;
  loading: string;
  error: string;
  retry: string;
  viewConnections: string;
}> = {
  en: {
    title: "Your travel connections",
    privacy: "Only you can see this summary.",
    count: (count) => `${count} accepted ${count === 1 ? "connection" : "connections"}`,
    zeroTitle: "Your network starts here",
    zeroDescription: "Only accepted connections count here; pending requests are not included.",
    origins: "Origins",
    cities: "Current cities",
    missing: "Connections without a shared location still count. These places only reflect what people share.",
    moreOrigins: "More origins are shared by your connections.",
    moreCities: "More current cities are shared by your connections.",
    loading: "Loading your connection summary",
    error: "Your connection summary could not be loaded.",
    retry: "Try again",
    viewConnections: "View connections",
  },
  es: {
    title: "Tus conexiones de viaje",
    privacy: "Solo tú puedes ver este resumen.",
    count: (count) => `${count} ${count === 1 ? "conexión aceptada" : "conexiones aceptadas"}`,
    zeroTitle: "Tu red empieza aquí",
    zeroDescription: "Solo cuentan las conexiones aceptadas; las solicitudes pendientes no se incluyen.",
    origins: "Lugares de origen",
    cities: "Ciudades actuales",
    missing: "Las conexiones sin ubicación también cuentan. Estos lugares solo reflejan lo que cada persona comparte.",
    moreOrigins: "Tus conexiones comparten más lugares de origen.",
    moreCities: "Tus conexiones comparten más ciudades actuales.",
    loading: "Cargando el resumen de tus conexiones",
    error: "No se pudo cargar el resumen de tus conexiones.",
    retry: "Reintentar",
    viewConnections: "Ver conexiones",
  },
  fr: {
    title: "Vos connexions de voyage",
    privacy: "Vous seul pouvez voir ce récapitulatif.",
    count: (count) => `${count} ${count === 1 ? "connexion acceptée" : "connexions acceptées"}`,
    zeroTitle: "Votre réseau commence ici",
    zeroDescription: "Seules les connexions acceptées sont comptées ; les demandes en attente sont exclues.",
    origins: "Lieux d’origine",
    cities: "Villes actuelles",
    missing: "Les connexions sans localisation partagée sont aussi comptées. Ces lieux reflètent uniquement ce que chacun partage.",
    moreOrigins: "Vos connexions partagent d’autres lieux d’origine.",
    moreCities: "Vos connexions partagent d’autres villes actuelles.",
    loading: "Chargement du récapitulatif de vos connexions",
    error: "Impossible de charger le récapitulatif de vos connexions.",
    retry: "Réessayer",
    viewConnections: "Voir les connexions",
  },
  sv: {
    title: "Dina resekontakter",
    privacy: "Bara du kan se den här sammanfattningen.",
    count: (count) => `${count} ${count === 1 ? "accepterad kontakt" : "accepterade kontakter"}`,
    zeroTitle: "Ditt nätverk börjar här",
    zeroDescription: "Bara accepterade kontakter räknas; väntande förfrågningar ingår inte.",
    origins: "Ursprung",
    cities: "Nuvarande städer",
    missing: "Kontakter utan delad plats räknas också. Platserna visar bara det som personerna själva delar.",
    moreOrigins: "Dina kontakter delar fler ursprungsplatser.",
    moreCities: "Dina kontakter delar fler nuvarande städer.",
    loading: "Läser in sammanfattningen av dina kontakter",
    error: "Det gick inte att läsa in sammanfattningen av dina kontakter.",
    retry: "Försök igen",
    viewConnections: "Visa kontakter",
  },
};
