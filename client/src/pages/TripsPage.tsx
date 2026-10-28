import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n, useTranslation, type Language } from "@/lib/i18n";
import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CalendarDays, Users, MapPin, CheckCircle2, Mail, ChevronRight, Luggage, X, LogIn, Send, Phone, Search, Plane, ArrowLeftRight, Clock, AlertCircle, BookOpen, Landmark, Languages, Sparkles, ExternalLink, ChevronDown, Globe2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { enUS, es, fr, sv } from "date-fns/locale";
import marrakechImage from "@assets/trip-destinations/marrakech.jpg";
import cairoImage from "@assets/trip-destinations/cairo.jpg";
import { flightSearchEnabled } from "@shared/travel-availability";

// ── Agency WhatsApp ───────────────────────────────────────────────────────────
const AGENCY_WHATSAPP = "34611327364";
const waLink = (text: string) =>
  `https://wa.me/${AGENCY_WHATSAPP}?text=${encodeURIComponent(text)}`;

// Keep supplier sales disabled independently of credentials. A typed feature
// flag also lets TypeScript validate the guarded legacy UI normally.
const supplierFeatures: { salesEnabled: boolean } = { salesEnabled: false };

// ── Destination inspiration ──────────────────────────────────────────────────
interface Destination {
  city: string;
  country: string;
  emoji: string;
  image: string;        // Bundled asset or external photo URL
  photoCredit?: { author: string; source: string; license: string; licenseUrl: string };
  iataCode: string;     // used to prefill flight search and destination guides
  duration: [number, number]; // suggested stay in days
}

const POPULAR_DESTINATIONS: Destination[] = [
  {
    city: "Bali",         country: "Indonesia",   emoji: "🌴",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=380&fit=crop&q=80",
    iataCode: "DPS", duration: [10, 14],
  },
  {
    city: "Bangkok",      country: "Tailandia",   emoji: "🏯",
    image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&h=380&fit=crop&q=80",
    iataCode: "BKK", duration: [7, 12],
  },
  {
    city: "Tokio",        country: "Japón",       emoji: "🗾",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=380&fit=crop&q=80",
    iataCode: "TYO", duration: [10, 15],
  },
  {
    city: "La Meca",      country: "Arabia Saudí", emoji: "🕋",
    image: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&h=380&fit=crop&q=80",
    iataCode: "JED", duration: [7, 14],
  },
  {
    city: "Dakar",        country: "Senegal",     emoji: "🌍",
    image: "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=600&h=380&fit=crop&q=80",
    iataCode: "DSS", duration: [7, 12],
  },
  {
    city: "Marrakech",    country: "Marruecos",   emoji: "🕌",
    image: marrakechImage,
    photoCredit: {
      author: "Marcin Sochacki",
      source: "https://commons.wikimedia.org/wiki/File:Koutoubia_Mosque,Marrakech,Morocco.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    iataCode: "RAK", duration: [4, 7],
  },
  {
    city: "Zanzíbar",     country: "Tanzania",    emoji: "🏖️",
    image: "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=600&h=380&fit=crop&q=80",
    iataCode: "ZNZ", duration: [10, 14],
  },
  {
    city: "El Cairo",     country: "Egipto",      emoji: "🏛️",
    image: cairoImage,
    iataCode: "CAI", duration: [5, 10],
  },
  {
    city: "Nairobi",      country: "Kenia",       emoji: "🦁",
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&h=380&fit=crop&q=80",
    iataCode: "NBO", duration: [10, 15],
  },
  {
    city: "Nueva York",   country: "EE. UU.",     emoji: "🗽",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=380&fit=crop&q=80",
    iataCode: "JFK", duration: [7, 10],
  },
  {
    city: "Maldivas",     country: "Maldivas",    emoji: "🏝️",
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600&h=380&fit=crop&q=80",
    iataCode: "MLE", duration: [7, 10],
  },
  {
    city: "Lisboa",       country: "Portugal",    emoji: "🇵🇹",
    image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&h=380&fit=crop&q=80",
    iataCode: "LIS", duration: [3, 5],
  },
  {
    city: "Cancún",       country: "México",      emoji: "🌊",
    image: "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=600&h=380&fit=crop&q=80",
    iataCode: "CUN", duration: [7, 12],
  },
];

const DESTINATION_NAMES: Record<string, Record<Language, { city: string; country: string }>> = {
  DPS: {
    es: { city: "Bali", country: "Indonesia" }, en: { city: "Bali", country: "Indonesia" },
    fr: { city: "Bali", country: "Indonésie" }, sv: { city: "Bali", country: "Indonesien" },
  },
  BKK: {
    es: { city: "Bangkok", country: "Tailandia" }, en: { city: "Bangkok", country: "Thailand" },
    fr: { city: "Bangkok", country: "Thaïlande" }, sv: { city: "Bangkok", country: "Thailand" },
  },
  TYO: {
    es: { city: "Tokio", country: "Japón" }, en: { city: "Tokyo", country: "Japan" },
    fr: { city: "Tokyo", country: "Japon" }, sv: { city: "Tokyo", country: "Japan" },
  },
  JED: {
    es: { city: "La Meca", country: "Arabia Saudí" }, en: { city: "Mecca", country: "Saudi Arabia" },
    fr: { city: "La Mecque", country: "Arabie saoudite" }, sv: { city: "Mecka", country: "Saudiarabien" },
  },
  DSS: {
    es: { city: "Dakar", country: "Senegal" }, en: { city: "Dakar", country: "Senegal" },
    fr: { city: "Dakar", country: "Sénégal" }, sv: { city: "Dakar", country: "Senegal" },
  },
  RAK: {
    es: { city: "Marrakech", country: "Marruecos" }, en: { city: "Marrakech", country: "Morocco" },
    fr: { city: "Marrakech", country: "Maroc" }, sv: { city: "Marrakech", country: "Marocko" },
  },
  ZNZ: {
    es: { city: "Zanzíbar", country: "Tanzania" }, en: { city: "Zanzibar", country: "Tanzania" },
    fr: { city: "Zanzibar", country: "Tanzanie" }, sv: { city: "Zanzibar", country: "Tanzania" },
  },
  CAI: {
    es: { city: "El Cairo", country: "Egipto" }, en: { city: "Cairo", country: "Egypt" },
    fr: { city: "Le Caire", country: "Égypte" }, sv: { city: "Kairo", country: "Egypten" },
  },
  NBO: {
    es: { city: "Nairobi", country: "Kenia" }, en: { city: "Nairobi", country: "Kenya" },
    fr: { city: "Nairobi", country: "Kenya" }, sv: { city: "Nairobi", country: "Kenya" },
  },
  JFK: {
    es: { city: "Nueva York", country: "EE. UU." }, en: { city: "New York", country: "United States" },
    fr: { city: "New York", country: "États-Unis" }, sv: { city: "New York", country: "USA" },
  },
  MLE: {
    es: { city: "Maldivas", country: "Maldivas" }, en: { city: "Maldives", country: "Maldives" },
    fr: { city: "Maldives", country: "Maldives" }, sv: { city: "Maldiverna", country: "Maldiverna" },
  },
  LIS: {
    es: { city: "Lisboa", country: "Portugal" }, en: { city: "Lisbon", country: "Portugal" },
    fr: { city: "Lisbonne", country: "Portugal" }, sv: { city: "Lissabon", country: "Portugal" },
  },
  CUN: {
    es: { city: "Cancún", country: "México" }, en: { city: "Cancún", country: "Mexico" },
    fr: { city: "Cancún", country: "Mexique" }, sv: { city: "Cancún", country: "Mexiko" },
  },
};

const SEARCH_ONLY_AIRPORTS: Array<{ code: string; names: Record<Language, string> }> = [
  { code: "NRT", names: { es: "Tokio (Narita)", en: "Tokyo (Narita)", fr: "Tokyo (Narita)", sv: "Tokyo (Narita)" } },
  { code: "CMN", names: { es: "Marrakech", en: "Marrakech", fr: "Marrakech", sv: "Marrakech" } },
  { code: "DXB", names: { es: "Dubái", en: "Dubai", fr: "Dubaï", sv: "Dubai" } },
  { code: "IST", names: { es: "Estambul", en: "Istanbul", fr: "Istanbul", sv: "Istanbul" } },
  { code: "CDG", names: { es: "París", en: "Paris", fr: "Paris", sv: "Paris" } },
];

function getDestinationNames(destination: Destination, language: Language) {
  return DESTINATION_NAMES[destination.iataCode]?.[language] ?? { city: destination.city, country: destination.country };
}

function formatDestinationDuration(destination: Destination, template: string) {
  const [min, max] = destination.duration;
  return template.replace("{min}", String(min)).replace("{max}", String(max));
}

function DestinationPhotoCredit({ destination, language }: { destination: Destination; language: Language }) {
  const credit = destination.photoCredit;
  if (!credit) return null;
  const { city } = getDestinationNames(destination, language);
  return (
    <p className="text-[10px] text-muted-foreground text-center mt-2 px-2">
      {city}:{" "}
      <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline">
        {credit.author}
      </a>{" · "}
      <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">
        {credit.license}
      </a>
    </p>
  );
}

type GuideTheme = "beaches" | "temples" | "food" | "history" | "markets" | "nature" | "city" | "island" | "desert" | "safari" | "nightlife" | "culture" | "pilgrimage";
type GuideTransport = "walk" | "metro" | "scooter" | "rideHailing" | "resortTransfer";
type GuideTip = "respectfulDress" | "cashMarkets" | "icCard" | "officialGuides" | "reserveAhead";

interface DestinationGuide {
  currency: string;
  themes: GuideTheme[];
  transport: GuideTransport;
  tip: GuideTip;
}

type LocalizedFact = Partial<Record<Language, string>> & Record<"en", string>;

interface CountryFacts {
  country: LocalizedFact;
  capital: LocalizedFact;
  population: number;
  populationYear: number;
  languages: LocalizedFact;
  nationalDay: LocalizedFact;
  curiosity: LocalizedFact;
  worldBankCode: string;
}

const DESTINATION_GUIDES: Record<string, DestinationGuide> = {
  DPS: { currency: "IDR", themes: ["beaches", "temples", "nature"], transport: "scooter", tip: "respectfulDress" },
  BKK: { currency: "THB", themes: ["food", "temples", "markets"], transport: "metro", tip: "cashMarkets" },
  TYO: { currency: "JPY", themes: ["city", "food", "culture"], transport: "metro", tip: "icCard" },
  JED: { currency: "SAR", themes: ["pilgrimage", "culture", "history"], transport: "rideHailing", tip: "respectfulDress" },
  DSS: { currency: "XOF", themes: ["beaches", "markets", "culture"], transport: "rideHailing", tip: "cashMarkets" },
  RAK: { currency: "MAD", themes: ["markets", "history", "culture"], transport: "walk", tip: "cashMarkets" },
  ZNZ: { currency: "TZS", themes: ["beaches", "island", "nature"], transport: "rideHailing", tip: "respectfulDress" },
  CAI: { currency: "EGP", themes: ["history", "markets", "culture"], transport: "rideHailing", tip: "cashMarkets" },
  NBO: { currency: "KES", themes: ["nature", "safari", "city"], transport: "rideHailing", tip: "officialGuides" },
  JFK: { currency: "USD", themes: ["city", "food", "culture"], transport: "metro", tip: "reserveAhead" },
  MLE: { currency: "USD", themes: ["beaches", "island", "nature"], transport: "resortTransfer", tip: "respectfulDress" },
  LIS: { currency: "EUR", themes: ["city", "food", "history"], transport: "walk", tip: "reserveAhead" },
  CUN: { currency: "MXN", themes: ["beaches", "nature", "nightlife"], transport: "rideHailing", tip: "officialGuides" },
};

const COUNTRY_FACTS: Record<string, CountryFacts> = {
  DPS: {
    country: { es: "Indonesia", en: "Indonesia", fr: "Indonésie", sv: "Indonesien" },
    capital: { es: "Yakarta (transición a Nusantara)", en: "Jakarta (transitioning to Nusantara)", fr: "Jakarta (transition vers Nusantara)", sv: "Jakarta (övergång till Nusantara)" },
    population: 285721236, populationYear: 2025,
    languages: { es: "Indonesio", en: "Indonesian", fr: "Indonésien", sv: "Indonesiska" },
    nationalDay: { es: "17 de agosto · Independencia", en: "17 August · Independence Day", fr: "17 août · Fête de l'indépendance", sv: "17 augusti · Självständighetsdagen" },
    curiosity: {
      es: "Durante Nyepi, el Día del Silencio balinés, la isla reduce casi toda su actividad y el aeropuerto suele cerrar durante 24 horas.",
      en: "During Nyepi, Bali's Day of Silence, the island pauses almost all activity and the airport usually closes for 24 hours.",
      fr: "Pendant Nyepi, le Jour du Silence balinais, l'île suspend presque toute activité et l'aéroport ferme généralement pendant 24 heures.",
      sv: "Under Nyepi, Balis tystnadsdag, stannar nästan all verksamhet på ön och flygplatsen brukar vara stängd i 24 timmar.",
    },
    worldBankCode: "ID",
  },
  BKK: {
    country: { es: "Tailandia", en: "Thailand", fr: "Thaïlande", sv: "Thailand" },
    capital: { es: "Bangkok", en: "Bangkok", fr: "Bangkok", sv: "Bangkok" },
    population: 71619863, populationYear: 2025,
    languages: { es: "Tailandés", en: "Thai", fr: "Thaï", sv: "Thailändska" },
    nationalDay: { es: "5 de diciembre · Día Nacional", en: "5 December · National Day", fr: "5 décembre · Fête nationale", sv: "5 december · Nationaldagen" },
    curiosity: {
      es: "El nombre ceremonial completo de Bangkok es uno de los nombres de ciudad más largos del mundo.",
      en: "Bangkok's full ceremonial name is one of the longest city names in the world.",
      fr: "Le nom cérémoniel complet de Bangkok est l'un des noms de ville les plus longs au monde.",
      sv: "Bangkoks fullständiga ceremoniella namn är ett av de längsta stadsnamnen i världen.",
    },
    worldBankCode: "TH",
  },
  TYO: {
    country: { es: "Japón", en: "Japan", fr: "Japon", sv: "Japan" },
    capital: { es: "Tokio", en: "Tokyo", fr: "Tokyo", sv: "Tokyo" },
    population: 123366734, populationYear: 2025,
    languages: { es: "Japonés", en: "Japanese", fr: "Japonais", sv: "Japanska" },
    nationalDay: { es: "11 de febrero · Fundación Nacional", en: "11 February · National Foundation Day", fr: "11 février · Fondation nationale", sv: "11 februari · Nationaldagen för grundandet" },
    curiosity: {
      es: "La estación de Shinjuku es conocida como una de las estaciones ferroviarias con más tránsito del mundo.",
      en: "Shinjuku Station is known as one of the busiest railway stations in the world.",
      fr: "La gare de Shinjuku est connue comme l'une des gares les plus fréquentées au monde.",
      sv: "Shinjuku station är känd som en av världens mest trafikerade järnvägsstationer.",
    },
    worldBankCode: "JP",
  },
  JED: {
    country: { es: "Arabia Saudí", en: "Saudi Arabia", fr: "Arabie saoudite", sv: "Saudiarabien" },
    capital: { es: "Riad", en: "Riyadh", fr: "Riyad", sv: "Riyad" },
    population: 36973555, populationYear: 2025,
    languages: { es: "Árabe", en: "Arabic", fr: "Arabe", sv: "Arabiska" },
    nationalDay: { es: "23 de septiembre · Día Nacional", en: "23 September · National Day", fr: "23 septembre · Fête nationale", sv: "23 september · Nationaldagen" },
    curiosity: {
      es: "La entrada a La Meca está reservada a personas musulmanas; conviene comprobar siempre las normas oficiales antes del viaje.",
      en: "Entry to Mecca is reserved for Muslims; always check the official rules before travelling.",
      fr: "L'entrée à La Mecque est réservée aux personnes musulmanes ; vérifie toujours les règles officielles avant le voyage.",
      sv: "Endast muslimer får besöka Mecka. Kontrollera alltid de officiella reglerna innan du planerar resan.",
    },
    worldBankCode: "SA",
  },
  DSS: {
    country: { es: "Senegal", en: "Senegal", fr: "Sénégal", sv: "Senegal" },
    capital: { es: "Dakar", en: "Dakar", fr: "Dakar", sv: "Dakar" },
    population: 18931966, populationYear: 2025,
    languages: { es: "Francés; wolof muy extendido", en: "French; Wolof widely spoken", fr: "Français ; wolof très répandu", sv: "Franska; wolof talas av många" },
    nationalDay: { es: "4 de abril · Independencia", en: "4 April · Independence Day", fr: "4 avril · Fête de l'indépendance", sv: "4 april · Självständighetsdagen" },
    curiosity: {
      es: "Dakar ocupa la península de Cabo Verde, una de las zonas más occidentales del continente africano.",
      en: "Dakar sits on the Cape Verde Peninsula, one of the westernmost areas of mainland Africa.",
      fr: "Dakar se trouve sur la presqu'île du Cap-Vert, l'une des zones les plus occidentales du continent africain.",
      sv: "Dakar ligger på Kap Verde-halvön, en av de västligaste delarna av det afrikanska fastlandet.",
    },
    worldBankCode: "SN",
  },
  RAK: {
    country: { es: "Marruecos", en: "Morocco", fr: "Maroc", sv: "Marocko" },
    capital: { es: "Rabat", en: "Rabat", fr: "Rabat", sv: "Rabat" },
    population: 38430770, populationYear: 2025,
    languages: { es: "Árabe y amazigh", en: "Arabic and Amazigh", fr: "Arabe et amazighe", sv: "Arabiska och amazigh" },
    nationalDay: { es: "18 de noviembre · Independencia", en: "18 November · Independence Day", fr: "18 novembre · Fête de l'indépendance", sv: "18 november · Självständighetsdagen" },
    curiosity: {
      es: "Marrakech es conocida como la Ciudad Roja por el color ocre de sus murallas y edificios tradicionales.",
      en: "Marrakech is known as the Red City because of the ochre colour of its walls and traditional buildings.",
      fr: "Marrakech est surnommée la Ville Rouge pour la couleur ocre de ses remparts et bâtiments traditionnels.",
      sv: "Marrakech kallas den röda staden på grund av den ockrafärgade tonen på murarna och de traditionella byggnaderna.",
    },
    worldBankCode: "MA",
  },
  ZNZ: {
    country: { es: "Tanzania", en: "Tanzania", fr: "Tanzanie", sv: "Tanzania" },
    capital: { es: "Dodoma", en: "Dodoma", fr: "Dodoma", sv: "Dodoma" },
    population: 70545865, populationYear: 2025,
    languages: { es: "Suajili e inglés", en: "Swahili and English", fr: "Swahili et anglais", sv: "Swahili och engelska" },
    nationalDay: { es: "26 de abril · Día de la Unión", en: "26 April · Union Day", fr: "26 avril · Jour de l'Union", sv: "26 april · Unionsdagen" },
    curiosity: {
      es: "Stone Town, en Zanzíbar, es Patrimonio Mundial de la UNESCO y refleja siglos de intercambio cultural.",
      en: "Stone Town in Zanzibar is a UNESCO World Heritage Site shaped by centuries of cultural exchange.",
      fr: "Stone Town, à Zanzibar, est inscrite au patrimoine mondial de l'UNESCO et témoigne de siècles d'échanges culturels.",
      sv: "Stone Town på Zanzibar är ett världsarv präglat av århundraden av kulturellt utbyte.",
    },
    worldBankCode: "TZ",
  },
  CAI: {
    country: { es: "Egipto", en: "Egypt", fr: "Égypte", sv: "Egypten" },
    capital: { es: "El Cairo", en: "Cairo", fr: "Le Caire", sv: "Kairo" },
    population: 118365995, populationYear: 2025,
    languages: { es: "Árabe", en: "Arabic", fr: "Arabe", sv: "Arabiska" },
    nationalDay: { es: "23 de julio · Día de la Revolución", en: "23 July · Revolution Day", fr: "23 juillet · Jour de la Révolution", sv: "23 juli · Revolutionsdagen" },
    curiosity: {
      es: "Las pirámides están en Guiza, al otro lado del Nilo y dentro de la gran área metropolitana de El Cairo.",
      en: "The pyramids are in Giza, across the Nile and within Greater Cairo's metropolitan area.",
      fr: "Les pyramides se trouvent à Gizeh, de l'autre côté du Nil, dans la grande aire métropolitaine du Caire.",
      sv: "Pyramiderna ligger i Giza, på andra sidan Nilen och inom Kairos storstadsområde.",
    },
    worldBankCode: "EG",
  },
  NBO: {
    country: { es: "Kenia", en: "Kenya", fr: "Kenya", sv: "Kenya" },
    capital: { es: "Nairobi", en: "Nairobi", fr: "Nairobi", sv: "Nairobi" },
    population: 57532493, populationYear: 2025,
    languages: { es: "Suajili e inglés", en: "Swahili and English", fr: "Swahili et anglais", sv: "Swahili och engelska" },
    nationalDay: { es: "12 de diciembre · Jamhuri Day", en: "12 December · Jamhuri Day", fr: "12 décembre · Jamhuri Day", sv: "12 december · Jamhuri-dagen" },
    curiosity: {
      es: "Nairobi tiene un parque nacional junto a la ciudad, donde es posible observar fauna con el perfil urbano al fondo.",
      en: "Nairobi has a national park beside the city, where wildlife can be seen with the skyline in the background.",
      fr: "Nairobi possède un parc national aux portes de la ville, où l'on peut observer la faune avec la skyline en arrière-plan.",
      sv: "Nairobi har en nationalpark precis intill staden där du kan se vilda djur med stadens silhuett i bakgrunden.",
    },
    worldBankCode: "KE",
  },
  JFK: {
    country: { es: "Estados Unidos", en: "United States", fr: "États-Unis", sv: "USA" },
    capital: { es: "Washington D. C.", en: "Washington, D.C.", fr: "Washington D.C.", sv: "Washington, D.C." },
    population: 341784857, populationYear: 2025,
    languages: { es: "Inglés a nivel federal", en: "English at federal level", fr: "Anglais au niveau fédéral", sv: "Engelska på federal nivå" },
    nationalDay: { es: "4 de julio · Independencia", en: "4 July · Independence Day", fr: "4 juillet · Fête de l'indépendance", sv: "4 juli · Självständighetsdagen" },
    curiosity: {
      es: "Nueva York está formada por cinco distritos: Manhattan, Brooklyn, Queens, el Bronx y Staten Island.",
      en: "New York City is made up of five boroughs: Manhattan, Brooklyn, Queens, the Bronx and Staten Island.",
      fr: "New York est composée de cinq boroughs : Manhattan, Brooklyn, Queens, le Bronx et Staten Island.",
      sv: "New York består av fem stadsdelar: Manhattan, Brooklyn, Queens, Bronx och Staten Island.",
    },
    worldBankCode: "US",
  },
  MLE: {
    country: { es: "Maldivas", en: "Maldives", fr: "Maldives", sv: "Maldiverna" },
    capital: { es: "Malé", en: "Malé", fr: "Malé", sv: "Malé" },
    population: 529676, populationYear: 2025,
    languages: { es: "Dhivehi", en: "Dhivehi", fr: "Dhivehi", sv: "Dhivehi" },
    nationalDay: { es: "26 de julio · Independencia", en: "26 July · Independence Day", fr: "26 juillet · Fête de l'indépendance", sv: "26 juli · Självständighetsdagen" },
    curiosity: {
      es: "Maldivas está formada por 26 atolones naturales y es uno de los países de menor altitud del mundo.",
      en: "The Maldives consists of 26 natural atolls and is one of the world's lowest-lying countries.",
      fr: "Les Maldives comptent 26 atolls naturels et figurent parmi les pays les plus bas du monde.",
      sv: "Maldiverna består av 26 naturliga atoller och är ett av världens lägst belägna länder.",
    },
    worldBankCode: "MV",
  },
  LIS: {
    country: { es: "Portugal", en: "Portugal", fr: "Portugal", sv: "Portugal" },
    capital: { es: "Lisboa", en: "Lisbon", fr: "Lisbonne", sv: "Lissabon" },
    population: 10804871, populationYear: 2025,
    languages: { es: "Portugués", en: "Portuguese", fr: "Portugais", sv: "Portugisiska" },
    nationalDay: { es: "10 de junio · Día de Portugal", en: "10 June · Portugal Day", fr: "10 juin · Jour du Portugal", sv: "10 juni · Portugaldagen" },
    curiosity: {
      es: "Los tranvías históricos de Lisboa siguen formando parte del transporte público habitual de la ciudad.",
      en: "Lisbon's historic trams are still part of the city's everyday public transport network.",
      fr: "Les tramways historiques de Lisbonne font toujours partie du réseau de transport public quotidien.",
      sv: "Lissabons historiska spårvagnar är fortfarande en del av stadens dagliga kollektivtrafik.",
    },
    worldBankCode: "PT",
  },
  CUN: {
    country: { es: "México", en: "Mexico", fr: "Mexique", sv: "Mexiko" },
    capital: { es: "Ciudad de México", en: "Mexico City", fr: "Mexico", sv: "Mexico City" },
    population: 131946900, populationYear: 2025,
    languages: { es: "Español y 68 lenguas indígenas nacionales", en: "Spanish and 68 national Indigenous languages", fr: "Espagnol et 68 langues autochtones nationales", sv: "Spanska och 68 nationella ursprungsspråk" },
    nationalDay: { es: "16 de septiembre · Independencia", en: "16 September · Independence Day", fr: "16 septembre · Fête de l'indépendance", sv: "16 september · Självständighetsdagen" },
    curiosity: {
      es: "Cancún comenzó a desarrollarse como destino turístico planificado en la década de 1970.",
      en: "Cancún began developing as a purpose-planned tourism destination in the 1970s.",
      fr: "Cancún a commencé à se développer comme destination touristique planifiée dans les années 1970.",
      sv: "Cancún började utvecklas som ett planerat turistmål på 1970-talet.",
    },
    worldBankCode: "MX",
  },
};

const GUIDE_COPY: Record<Language, {
  themes: Record<GuideTheme, { label: string; description: string }>;
  transport: Record<GuideTransport, string>;
  tips: Record<GuideTip, string>;
}> = {
  es: {
    themes: {
      beaches: { label: "Playas", description: "Busca playas populares y reserva tiempo para ver el atardecer." },
      temples: { label: "Templos", description: "Visita temprano y respeta las normas de vestimenta y fotografía." },
      food: { label: "Gastronomía", description: "Prueba especialidades locales en lugares concurridos y recomendados." },
      history: { label: "Historia", description: "Combina los lugares más conocidos con una visita guiada local." },
      markets: { label: "Mercados", description: "Lleva algo de efectivo y compara precios antes de comprar." },
      nature: { label: "Naturaleza", description: "Planifica las excursiones con tiempo y cuida los espacios naturales." },
      city: { label: "Ciudad", description: "Explora por barrios para descubrir cafeterías, parques y vida local." },
      island: { label: "Vida insular", description: "Comprueba los horarios de barcos o traslados entre islas." },
      desert: { label: "Desierto", description: "Elige excursiones responsables y lleva agua, protección solar y capas." },
      safari: { label: "Safari", description: "Reserva con operadores autorizados y sigue siempre las indicaciones del guía." },
      nightlife: { label: "Vida nocturna", description: "Muévete por zonas conocidas y acuerda el transporte de vuelta." },
      culture: { label: "Cultura local", description: "Aprende algunas costumbres y frases para conectar con respeto." },
      pilgrimage: { label: "Peregrinación", description: "Revisa los requisitos y normas oficiales antes de organizar la visita." },
    },
    transport: {
      walk: "Muchas zonas se disfrutan a pie; usa transporte para trayectos más largos.",
      metro: "El metro y el transporte público suelen ser la forma más práctica de moverse.",
      scooter: "Una moto puede ser útil, pero comprueba la normativa, el seguro y las condiciones de la carretera.",
      rideHailing: "Las aplicaciones de transporte pueden simplificar los trayectos; confirma siempre el vehículo y el precio.",
      resortTransfer: "Coordina el traslado con el alojamiento antes de llegar, especialmente si dependes de un barco o hidroavión.",
    },
    tips: {
      respectfulDress: "Lleva ropa que cubra hombros y rodillas para visitar lugares religiosos o comunidades locales.",
      cashMarkets: "Ten billetes pequeños y pregunta si aceptan tarjeta antes de comprar en mercados o comercios pequeños.",
      icCard: "Una tarjeta de transporte recargable te ahorra tiempo en desplazamientos urbanos.",
      officialGuides: "Para excursiones, animales o zonas remotas, elige proveedores autorizados y con buenas reseñas.",
      reserveAhead: "Reserva con antelación las atracciones y restaurantes más populares en temporada alta.",
    },
  },
  en: {
    themes: {
      beaches: { label: "Beaches", description: "Look for popular beaches and leave time to catch the sunset." },
      temples: { label: "Temples", description: "Visit early and follow local dress and photography rules." },
      food: { label: "Food", description: "Try local specialities at busy, well-reviewed places." },
      history: { label: "History", description: "Pair the main landmarks with a local guided experience." },
      markets: { label: "Markets", description: "Carry some cash and compare prices before buying." },
      nature: { label: "Nature", description: "Plan day trips ahead and help protect natural spaces." },
      city: { label: "City life", description: "Explore by neighbourhood to find cafés, parks and local life." },
      island: { label: "Island life", description: "Check boat or transfer timetables when moving between islands." },
      desert: { label: "Desert", description: "Choose responsible tours and bring water, sun protection and layers." },
      safari: { label: "Safari", description: "Book licensed operators and follow your guide's instructions." },
      nightlife: { label: "Nightlife", description: "Stay in familiar areas and plan your way back." },
      culture: { label: "Local culture", description: "Learn a few local customs and phrases to connect respectfully." },
      pilgrimage: { label: "Pilgrimage", description: "Check official requirements and rules before planning your visit." },
    },
    transport: {
      walk: "Many areas are best explored on foot; use transport for longer journeys.",
      metro: "The metro and public transport are usually the easiest way to get around.",
      scooter: "A scooter can be useful, but check local rules, insurance and road conditions first.",
      rideHailing: "Ride-hailing apps can simplify journeys; always confirm the vehicle and price.",
      resortTransfer: "Arrange your transfer with the accommodation before arrival, especially for boats or seaplanes.",
    },
    tips: {
      respectfulDress: "Pack clothing that covers shoulders and knees for religious sites and local communities.",
      cashMarkets: "Carry small notes and ask if cards are accepted before buying at markets or small shops.",
      icCard: "A rechargeable transport card can save time on city journeys.",
      officialGuides: "For excursions, wildlife or remote areas, choose licensed providers with good reviews.",
      reserveAhead: "Book the most popular attractions and restaurants ahead during busy seasons.",
    },
  },
  fr: {
    themes: {
      beaches: { label: "Plages", description: "Repère les plages populaires et garde du temps pour le coucher du soleil." },
      temples: { label: "Temples", description: "Visite tôt et respecte les règles locales de tenue et de photographie." },
      food: { label: "Gastronomie", description: "Goûte aux spécialités locales dans des adresses fréquentées et bien notées." },
      history: { label: "Histoire", description: "Combine les monuments connus avec une visite guidée locale." },
      markets: { label: "Marchés", description: "Prends un peu d'argent liquide et compare les prix avant d'acheter." },
      nature: { label: "Nature", description: "Prépare les excursions à l'avance et protège les espaces naturels." },
      city: { label: "Vie urbaine", description: "Explore les quartiers pour découvrir cafés, parcs et vie locale." },
      island: { label: "Vie insulaire", description: "Vérifie les horaires des bateaux ou des transferts entre les îles." },
      desert: { label: "Désert", description: "Choisis des excursions responsables et prends eau, protection solaire et vêtements chauds." },
      safari: { label: "Safari", description: "Réserve auprès d'opérateurs agréés et suis les conseils du guide." },
      nightlife: { label: "Vie nocturne", description: "Reste dans des zones connues et prévois ton retour." },
      culture: { label: "Culture locale", description: "Apprends quelques coutumes et expressions pour créer du lien avec respect." },
      pilgrimage: { label: "Pèlerinage", description: "Vérifie les exigences et règles officielles avant de préparer ta visite." },
    },
    transport: {
      walk: "Beaucoup de quartiers se découvrent à pied ; utilise les transports pour les longs trajets.",
      metro: "Le métro et les transports publics sont souvent le moyen le plus simple de se déplacer.",
      scooter: "Un scooter peut être pratique, mais vérifie les règles, l'assurance et l'état des routes.",
      rideHailing: "Les applications de transport facilitent les trajets ; confirme toujours le véhicule et le prix.",
      resortTransfer: "Organise le transfert avec l'hébergement avant l'arrivée, surtout pour les bateaux ou hydravions.",
    },
    tips: {
      respectfulDress: "Prévois des vêtements couvrant les épaules et les genoux pour les lieux religieux et les communautés locales.",
      cashMarkets: "Prends de petites coupures et demande si la carte est acceptée dans les marchés et petits commerces.",
      icCard: "Une carte de transport rechargeable fait gagner du temps en ville.",
      officialGuides: "Pour les excursions, les animaux ou les zones isolées, choisis des prestataires agréés et bien notés.",
      reserveAhead: "Réserve à l'avance les attractions et restaurants populaires en haute saison.",
    },
  },
  sv: {
    themes: {
      beaches: { label: "Stränder", description: "Leta efter populära stränder och avsätt tid för solnedgången." },
      temples: { label: "Tempel", description: "Besök tidigt och följ lokala regler för klädsel och fotografering." },
      food: { label: "Mat", description: "Prova lokala specialiteter på välbesökta, välrecenserade ställen." },
      history: { label: "Historia", description: "Kombinera de främsta sevärdheterna med en lokal guidad tur." },
      markets: { label: "Marknader", description: "Ta med kontanter och jämför priser innan du köper." },
      nature: { label: "Natur", description: "Planera utflykter i förväg och hjälp till att skydda naturområden." },
      city: { label: "Stadsliv", description: "Utforska stadsdel för stadsdel för att hitta kaféer, parker och lokalt liv." },
      island: { label: "Öliv", description: "Kontrollera tider för båt eller transfer mellan öarna." },
      desert: { label: "Öken", description: "Välj ansvarsfulla turer och ta med vatten, solskydd och extra lager." },
      safari: { label: "Safari", description: "Boka licensierade arrangörer och följ alltid guidens anvisningar." },
      nightlife: { label: "Nattliv", description: "Håll dig i välkända områden och planera vägen tillbaka." },
      culture: { label: "Lokal kultur", description: "Lär dig några lokala seder och fraser för att mötas med respekt." },
      pilgrimage: { label: "Pilgrimsresa", description: "Kontrollera officiella krav och regler innan du planerar besöket." },
    },
    transport: {
      walk: "Många områden upptäcks bäst till fots; använd transport för längre sträckor.",
      metro: "Tunnelbana och kollektivtrafik är oftast det enklaste sättet att ta sig runt.",
      scooter: "En skoter kan vara praktisk, men kontrollera lokala regler, försäkring och vägförhållanden.",
      rideHailing: "Appar för beställningsresor kan förenkla färden; kontrollera alltid bil och pris.",
      resortTransfer: "Ordna transfer med boendet före ankomst, särskilt om du behöver båt eller sjöflygplan.",
    },
    tips: {
      respectfulDress: "Ta med kläder som täcker axlar och knän vid religiösa platser och lokala samhällen.",
      cashMarkets: "Ha små sedlar och fråga om kort accepteras innan du handlar på marknader eller i små butiker.",
      icCard: "Ett laddningsbart resekort sparar tid på resor i staden.",
      officialGuides: "För utflykter, djur eller avlägsna områden: välj licensierade arrangörer med goda omdömen.",
      reserveAhead: "Boka populära sevärdheter och restauranger i förväg under högsäsong.",
    },
  },
};

interface TripParticipant {
  firstName: string | null;
  profileImageUrl: string | null;
}

interface Trip {
  id: number;
  title: string;
  description: string | null;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  pricePerPerson: number; // cents
  capacity: number;
  coverImageUrl: string | null;
  includedServices: string | null;
  type: string;
  isActive: boolean;
  featured: boolean;
  originalPricePerPerson: number | null; // cents, for crossed-out price
  confirmedCount: number;
  participants: TripParticipant[];
}

function fmtDate(iso: string, language: Language) {
  const locale = language === "es" ? es : language === "fr" ? fr : language === "sv" ? sv : enUS;
  return format(new Date(iso), "d MMM yyyy", { locale });
}

function fmtPrice(cents: number) {
  return (cents / 100).toFixed(0);
}

export default function TripsPage() {
  const t = useTranslation();
  const { language } = useI18n();
  const guideCopy = GUIDE_COPY[language];
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<Destination | null>(null);
  const [inquiryForm, setInquiryForm] = useState({ name: user?.firstName || "", email: "", phone: "", message: "" });
  const [inquirySent, setInquirySent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Hotel search state (RateHawk)
  const today = new Date();
  const defaultCheckin = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const defaultCheckout = new Date(today.getTime() + 37 * 86400000).toISOString().slice(0, 10);
  const [hotelCheckin, setHotelCheckin] = useState(defaultCheckin);
  const [hotelCheckout, setHotelCheckout] = useState(defaultCheckout);
  const [hotelAdults, setHotelAdults] = useState(2);
  const [hotelResults, setHotelResults] = useState<any[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [hotelError, setHotelError] = useState<string | null>(null);
  const [rhConfigured, setRhConfigured] = useState<boolean | null>(null);

  async function searchHotels(iata: string) {
    setHotelLoading(true);
    setHotelError(null);
    setHotelResults([]);
    try {
      const params = new URLSearchParams({ iata, checkin: hotelCheckin, checkout: hotelCheckout, adults: String(hotelAdults) });
      const res = await fetch(`/api/hotels/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error al buscar hoteles");
      setHotelResults(data);
    } catch (e: any) {
      setHotelError(e.message);
    } finally {
      setHotelLoading(false);
    }
  }

  // Flight search state
  const ORIGIN_AIRPORTS: Array<{ code: string; names: Record<Language, string> }> = [
    { code: "MAD", names: { es: "Madrid", en: "Madrid", fr: "Madrid", sv: "Madrid" } },
    { code: "BCN", names: { es: "Barcelona", en: "Barcelona", fr: "Barcelone", sv: "Barcelona" } },
    { code: "AGP", names: { es: "Málaga", en: "Málaga", fr: "Malaga", sv: "Málaga" } },
    { code: "SVQ", names: { es: "Sevilla", en: "Seville", fr: "Séville", sv: "Sevilla" } },
    { code: "VLC", names: { es: "Valencia", en: "Valencia", fr: "Valence", sv: "Valencia" } },
    { code: "PMI", names: { es: "Palma", en: "Palma", fr: "Palma", sv: "Palma" } },
    { code: "LPA", names: { es: "Gran Canaria", en: "Gran Canaria", fr: "Grande Canarie", sv: "Gran Canaria" } },
    { code: "TFS", names: { es: "Tenerife Sur", en: "Tenerife South", fr: "Tenerife Sud", sv: "Teneriffa södra" } },
  ];
  const SPANISH_AIRPORTS = ORIGIN_AIRPORTS.map(({ code, names }) => ({ code, label: `${names[language]} (${code})` }));
  const DESTINATION_AIRPORT_OPTIONS = [
    ...SEARCH_ONLY_AIRPORTS.map(({ code, names }) => ({ code, label: `${names[language]} (${code})` })),
    ...POPULAR_DESTINATIONS.map(destination => {
      const names = getDestinationNames(destination, language);
      return { code: destination.iataCode, label: `${names.city} (${destination.iataCode})` };
    }),
  ];
  const [flightForm, setFlightForm] = useState({
    origin: "MAD",
    destination: "DPS",
    departureDate: "",
    returnDate: "",
    adults: 1,
    tripType: "roundtrip" as "roundtrip" | "oneway",
  });
  const [flightResults, setFlightResults] = useState<any[] | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [showFlightSearch, setShowFlightSearch] = useState(false);

  async function handleFlightSearch() {
    if (!flightSearchEnabled) return;
    if (!flightForm.departureDate) return;
    setFlightLoading(true);
    setFlightError(null);
    setFlightResults(null);
    try {
      const qs = new URLSearchParams({
        origin: flightForm.origin,
        destination: flightForm.destination,
        departureDate: flightForm.departureDate,
        adults: String(flightForm.adults),
      });
      if (flightForm.tripType === "roundtrip" && flightForm.returnDate) qs.set("returnDate", flightForm.returnDate);
      const res = await fetch(`/api/flights/search?${qs}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "flight_search_not_configured") {
          setFlightError("not_configured");
        } else {
          setFlightError(t.ui.tripsFlightSearchError);
        }
      } else {
        setFlightResults(data);
      }
    } catch {
      setFlightError(t.ui.tripsNetworkError);
    } finally {
      setFlightLoading(false);
    }
  }

  function openFlightSearchForDestination(dest: Destination) {
    if (!flightSearchEnabled) {
      setSelectedGuide(dest);
      return;
    }
    setFlightForm(f => ({ ...f, destination: dest.iataCode }));
    setShowFlightSearch(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const guideDetails = selectedGuide ? DESTINATION_GUIDES[selectedGuide.iataCode] : null;
  const countryFacts = selectedGuide ? COUNTRY_FACTS[selectedGuide.iataCode] : null;
  const populationLocale = language === "es" ? "es-ES" : language === "fr" ? "fr-FR" : language === "sv" ? "sv-SE" : "en-US";
  const selectedGuideNames = selectedGuide ? getDestinationNames(selectedGuide, language) : null;

  function fmtDuration(iso: string) {
    // PT14H30M → 14h 30min
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!m) return iso;
    const h = m[1] ? `${m[1]}h ` : "";
    const min = m[2] ? `${m[2]}min` : "";
    return h + min;
  }
  function fmtFlightTime(iso: string) {
    const locale = language === "es" ? "es-ES" : language === "fr" ? "fr-FR" : language === "sv" ? "sv-SE" : "en-GB";
    return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  function fmtFlightDate(iso: string) {
    const locale = language === "es" ? "es-ES" : language === "fr" ? "fr-FR" : language === "sv" ? "sv-SE" : "en-GB";
    return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
  }

  // Pre-fill name/email when user logs in
  useEffect(() => {
    if (user) setInquiryForm(f => ({ ...f, name: f.name || user.firstName || "" }));
  }, [user?.firstName]);

  const { data: trips, isLoading, refetch } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  // Handle booking success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("booking_success") === "true") {
      const sessionId = params.get("session_id");
      const tripId = params.get("trip_id");
      if (sessionId && tripId) {
        verifyBooking({ tripId: Number(tripId), sessionId });
      }
      // Clean URL
      window.history.replaceState({}, "", "/viajes");
    }
  }, []);

  const inquiryMutation = useMutation({
    mutationFn: (payload: typeof inquiryForm & { destination: string; country: string; duration: string }) =>
      apiRequest("POST", "/api/trips/inquiry", payload),
    onSuccess: () => {
      setInquirySent(true);
      toast({ title: "✅ Solicitud enviada", description: "Te contactaremos en menos de 24 horas." });
    },
    onError: () => toast({ title: "Error al enviar", variant: "destructive" }),
  });

  const bookMutation = useMutation({
    mutationFn: (tripId: number) => apiRequest("POST", `/api/trips/${tripId}/book`, {}),
    onSuccess: (data: any) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Error al reservar", variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ tripId, sessionId }: { tripId: number; sessionId: string }) =>
      apiRequest("POST", `/api/trips/${tripId}/verify-booking`, { sessionId }),
    onSuccess: () => {
      toast({ title: t.trips.bookingSuccess, description: t.trips.bookingSuccessDesc });
      refetch();
    },
  });

  function verifyBooking({ tripId, sessionId }: { tripId: number; sessionId: string }) {
    verifyMutation.mutate({ tripId, sessionId });
  }

  const spotsLeft = (trip: Trip) => trip.capacity - trip.confirmedCount;
  const isFull = (trip: Trip) => spotsLeft(trip) <= 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Luggage className="w-6 h-6 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold">{t.trips.title}</h1>
              <p className="text-xs text-muted-foreground truncate">{t.trips.subtitle}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Flight search section ─────────────────────────────── */}
      {flightSearchEnabled && <><div className="px-4 pt-4">
        <button
          className="w-full flex items-center justify-between p-3.5 rounded-2xl border bg-card shadow-sm active:scale-[0.99] transition-transform"
          onClick={() => setShowFlightSearch(v => !v)}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Plane className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-left">
               <p className="text-sm font-bold">{t.ui.tripsSearchFlights}</p>
               <p className="text-xs text-muted-foreground">{t.ui.tripsRealPrices}</p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showFlightSearch ? "rotate-90" : ""}`} />
        </button>

        {showFlightSearch && (
          <div className="mt-3 p-4 rounded-2xl border bg-card space-y-3">
            {/* Origin / Destination */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                 <label className="text-xs text-muted-foreground font-medium mb-1 block">{t.ui.tripsFrom}</label>
                <select
                  className="w-full border rounded-xl p-2 text-sm bg-background"
                  value={flightForm.origin}
                  onChange={e => setFlightForm(f => ({ ...f, origin: e.target.value }))}
                >
                  {SPANISH_AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
                </select>
              </div>
              <div>
                 <label className="text-xs text-muted-foreground font-medium mb-1 block">{t.ui.tripsTo}</label>
                <select
                  className="w-full border rounded-xl p-2 text-sm bg-background"
                  value={flightForm.destination}
                  onChange={e => setFlightForm(f => ({ ...f, destination: e.target.value }))}
                >
                  {[...DESTINATION_AIRPORT_OPTIONS, ...SPANISH_AIRPORTS].map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
                </select>
              </div>
            </div>

            {/* Trip type */}
            <div className="flex gap-2">
              {(["roundtrip", "oneway"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFlightForm(f => ({ ...f, tripType: type }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    flightForm.tripType === type
                      ? "bg-blue-500 text-white border-blue-500"
                      : "text-muted-foreground border-border hover:border-blue-300"
                  }`}
                >
                   {type === "roundtrip" ? t.ui.tripsRoundTrip : t.ui.tripsOneWay}
                </button>
              ))}
            </div>

            {/* Dates + adults */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                 <label className="text-xs text-muted-foreground font-medium mb-1 block">{t.ui.tripsDepartureRequired}</label>
                <Input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={flightForm.departureDate}
                  onChange={e => setFlightForm(f => ({ ...f, departureDate: e.target.value }))}
                  className="rounded-xl text-sm"
                />
              </div>
              {flightForm.tripType === "roundtrip" ? (
                <div>
                   <label className="text-xs text-muted-foreground font-medium mb-1 block">{t.trips.returnDate}</label>
                  <Input
                    type="date"
                    min={flightForm.departureDate || new Date().toISOString().slice(0, 10)}
                    value={flightForm.returnDate}
                    onChange={e => setFlightForm(f => ({ ...f, returnDate: e.target.value }))}
                    className="rounded-xl text-sm"
                  />
                </div>
              ) : (
                <div>
                   <label className="text-xs text-muted-foreground font-medium mb-1 block">{t.ui.tripsPassengers}</label>
                  <div className="flex items-center gap-2 h-10 border rounded-xl px-3">
                    <button onClick={() => setFlightForm(f => ({ ...f, adults: Math.max(1, f.adults - 1) }))} className="text-muted-foreground font-bold text-lg leading-none">−</button>
                    <span className="flex-1 text-center text-sm font-semibold">{flightForm.adults}</span>
                    <button onClick={() => setFlightForm(f => ({ ...f, adults: Math.min(9, f.adults + 1) }))} className="text-muted-foreground font-bold text-lg leading-none">+</button>
                  </div>
                </div>
              )}
            </div>

            {flightForm.tripType === "roundtrip" && (
              <div className="flex items-center gap-2">
                 <label className="text-xs text-muted-foreground font-medium">{t.ui.tripsPassengers}:</label>
                <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5">
                  <button onClick={() => setFlightForm(f => ({ ...f, adults: Math.max(1, f.adults - 1) }))} className="text-muted-foreground font-bold text-lg leading-none">−</button>
                  <span className="w-6 text-center text-sm font-semibold">{flightForm.adults}</span>
                  <button onClick={() => setFlightForm(f => ({ ...f, adults: Math.min(9, f.adults + 1) }))} className="text-muted-foreground font-bold text-lg leading-none">+</button>
                </div>
                <Users className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              </div>
            )}

            <Button
              className="w-full rounded-xl"
              onClick={handleFlightSearch}
              disabled={!flightForm.departureDate || flightLoading}
            >
              {flightLoading ? (
                 <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />{t.ui.tripsSearchingFlights}</>
              ) : (
                 <><Plane className="w-4 h-4 mr-2" />{t.ui.tripsSearchButton}</>
              )}
            </Button>

            {/* Error state */}
            {flightError === "not_configured" && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                   <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t.ui.tripsSearchNotConfigured}</p>
                   <p className="text-xs text-amber-600/80 dark:text-amber-500 mt-0.5">{t.ui.tripsDuffelNotConfigured}</p>
                </div>
              </div>
            )}
            {flightError && flightError !== "not_configured" && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{flightError}</p>
              </div>
            )}

            {/* Results */}
            {flightResults !== null && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-muted-foreground">
                   {flightResults.length === 0 ? t.ui.tripsNoFlights : (flightResults.length === 1 ? t.ui.tripsFlightFound : t.ui.tripsFlightsFound.replace("{n}", String(flightResults.length)))}
                </p>
                {flightResults.map((offer: any) => {
                  const outbound = offer.itineraries[0];
                  const inbound  = offer.itineraries[1];
                  const seg0     = outbound.segments[0];
                  const segLast  = outbound.segments[outbound.segments.length - 1];
                  const stops    = outbound.segments.length - 1;
                  return (
                    <div key={offer.id} className="border rounded-2xl p-3 space-y-2">
                      {/* Airline + price row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-[11px] font-bold text-blue-600">
                            {offer.validatingAirlineCodes?.[0] ?? "?"}
                          </div>
                          <div>
                             <p className="text-xs font-bold">{offer.validatingAirlineCodes?.join(", ") || t.ui.tripsAirline}</p>
                             <p className="text-[10px] text-muted-foreground">{stops === 0 ? t.ui.tripsDirect : (stops === 1 ? t.ui.tripsStop : t.ui.tripsStops).replace("{n}", String(stops))}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{parseFloat(offer.price.total).toFixed(0)}€</p>
                           <p className="text-[10px] text-muted-foreground">{t.ui.tripsPerPerson}</p>
                        </div>
                      </div>

                      {/* Outbound itinerary */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className="text-center">
                          <p className="font-bold">{fmtFlightTime(seg0.departure.at)}</p>
                          <p className="text-muted-foreground">{seg0.departure.iataCode}</p>
                          <p className="text-muted-foreground text-[10px]">{fmtFlightDate(seg0.departure.at)}</p>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="flex items-center gap-1">
                            <div className="flex-1 h-px bg-border" />
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <div className="flex-1 h-px bg-border" />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDuration(outbound.duration)}</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{fmtFlightTime(segLast.arrival.at)}</p>
                          <p className="text-muted-foreground">{segLast.arrival.iataCode}</p>
                          <p className="text-muted-foreground text-[10px]">{fmtFlightDate(segLast.arrival.at)}</p>
                        </div>
                      </div>

                      {/* Return flight if round-trip */}
                      {inbound && (() => {
                        const rs0    = inbound.segments[0];
                        const rsLast = inbound.segments[inbound.segments.length - 1];
                        return (
                          <div className="border-t pt-2 flex items-center gap-2 text-xs">
                            <ArrowLeftRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            <div className="text-center">
                              <p className="font-bold">{fmtFlightTime(rs0.departure.at)}</p>
                              <p className="text-muted-foreground">{rs0.departure.iataCode}</p>
                            </div>
                            <div className="flex-1 text-center">
                              <div className="flex items-center gap-1">
                                <div className="flex-1 h-px bg-border" />
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <div className="flex-1 h-px bg-border" />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDuration(inbound.duration)}</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold">{fmtFlightTime(rsLast.arrival.at)}</p>
                              <p className="text-muted-foreground">{rsLast.arrival.iataCode}</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Total for group */}
                      {flightForm.adults > 1 && (
                        <p className="text-[10px] text-muted-foreground text-right">
                           {t.ui.tripsGroupTotal.replace("{n}", String(flightForm.adults))} <strong>{(parseFloat(offer.price.total) * flightForm.adults).toFixed(0)}€</strong>
                        </p>
                      )}
                    </div>
                  );
                })}
                {flightResults.length > 0 && (
                  <p className="text-center text-[10px] text-muted-foreground pt-1">
                     {t.ui.tripsRealtime}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

       <div className="p-4">
         <div className="rounded-2xl border bg-card p-4 text-center">
           <Plane className="w-8 h-8 mx-auto mb-2 text-blue-500" />
           <p className="text-sm font-semibold">{t.ui.tripsSearchFlights}</p>
           <p className="text-xs text-muted-foreground mt-1">{t.ui.tripsRealPrices}</p>
         </div>
       </div></>}

       {/* ── Agency-style flight destinations ───────────────────── */}
       <section className="px-4 pb-4">
         <div className="flex items-center gap-2 mb-1">
            <Globe2 className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-base">{t.trips.inspiration.heading}</h2>
         </div>
           <p className="text-xs text-muted-foreground mb-4">{t.trips.inspiration.description}</p>
          <div className="grid grid-cols-1 gap-4">
            {POPULAR_DESTINATIONS.map((dest) => (
               <div
                key={dest.iataCode}
                role="button"
                tabIndex={0}
                className="group relative w-full aspect-[2.2] overflow-hidden rounded-[1.25rem] text-left shadow-sm active:scale-[0.99] transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
                onClick={() => openFlightSearchForDestination(dest)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openFlightSearchForDestination(dest);
                  }
                }}
                aria-label={t.ui.tripsGuideTitle.replace("{city}", getDestinationNames(dest, language).city)}
             >
               <img src={dest.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/85" />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                  <span className="text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm bg-white/95 text-gray-800">
                    {t.trips.inspiration.badge}
                  </span>
                   <button
                     type="button"
                     className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-gray-800 shadow-sm transition-transform hover:bg-white group-hover:translate-x-0.5"
                     onClick={e => {
                       e.stopPropagation();
                       setSelectedGuide(dest);
                     }}
                      aria-label={`${t.ui.tripsReadGuide}: ${getDestinationNames(dest, language).city}`}
                   >
                     <BookOpen className="w-3.5 h-3.5" />
                     {t.ui.tripsReadGuide}
                   </button>
                </div>
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 text-white">
                  <div className="min-w-0">
                     <p className="font-display text-xl font-bold leading-tight drop-shadow-md sm:text-2xl">{dest.emoji} {getDestinationNames(dest, language).city}</p>
                     <p className="mt-0.5 text-xs text-white/80 drop-shadow-sm sm:text-sm">
                       {getDestinationNames(dest, language).country} · {formatDestinationDuration(dest, t.trips.inspiration.duration)}
                     </p>
                  </div>
                </div>
              </div>
           ))}
         </div>
          {POPULAR_DESTINATIONS.filter(dest => dest.photoCredit).map(dest => (
             <DestinationPhotoCredit key={dest.iataCode} destination={dest} language={language} />
          ))}
       </section>

        {/* ── Destination guide ─────────────────────────────────── */}
        <Sheet
          open={!!selectedGuide}
          onOpenChange={open => {
            if (!open) setSelectedGuide(null);
          }}
        >
          <SheetContent side="bottom" className="max-h-[92vh] rounded-t-3xl overflow-y-auto p-0">
            {selectedGuide && guideDetails && (
              <div>
                <div className="relative h-44 overflow-hidden rounded-t-3xl">
                  <img src={selectedGuide.image} alt={selectedGuideNames?.city ?? ""} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <button
                    type="button"
                    onClick={() => setSelectedGuide(null)}
                    className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white"
                    aria-label={t.common.close}
                  >
                    <X size={18} />
                  </button>
                  <div className="absolute bottom-4 left-5 right-5 text-white">
                    <p className="text-xs font-semibold text-white/75 uppercase tracking-wider">{selectedGuideNames?.country}</p>
                    <h2 className="font-display text-2xl font-bold drop-shadow-md">
                      {selectedGuide.emoji} {selectedGuideNames?.city}
                    </h2>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  <DestinationPhotoCredit destination={selectedGuide} language={language} />
                  <div>
                    <h3 className="font-display text-lg font-bold">
                      {t.ui.tripsGuideTitle.replace("{city}", selectedGuideNames?.city ?? "")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t.ui.tripsGuideIntro}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.ui.tripsGuideDuration}</p>
                      <p className="text-sm font-semibold mt-1">
                        {formatDestinationDuration(selectedGuide, t.trips.inspiration.duration)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.ui.tripsGuideCurrency}</p>
                      <p className="text-sm font-semibold mt-1">{guideDetails.currency}</p>
                    </div>
                  </div>

                  <section>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      {t.ui.tripsGuideHighlights}
                    </h4>
                    <div className="space-y-2">
                      {guideDetails.themes.map(theme => {
                        const themeCopy = guideCopy.themes[theme];
                        return (
                          <div key={theme} className="rounded-xl border bg-card p-3">
                            <p className="text-sm font-semibold">{themeCopy.label}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{themeCopy.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-xl border bg-card p-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Luggage className="w-4 h-4 text-primary" />
                      {t.ui.tripsGuideBestFor}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">{guideDetails.themes.map(theme => guideCopy.themes[theme].label).join(" · ")}</p>
                  </section>

                  <section className="rounded-xl border bg-card p-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Plane className="w-4 h-4 text-primary" />
                      {t.ui.tripsGuideTransport}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{guideCopy.transport[guideDetails.transport]}</p>
                  </section>

                  <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-500" />
                      {t.ui.tripsGuideLocalTip}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{guideCopy.tips[guideDetails.tip]}</p>
                  </section>

                  {countryFacts && (
                    <details className="group rounded-xl border bg-card overflow-hidden">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-sm [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-2 min-w-0">
                          <Globe2 className="w-4 h-4 shrink-0 text-primary" />
                          <span className="truncate">
                            {t.ui.tripsGuideMoreAbout.replace("{country}", countryFacts.country[language] ?? countryFacts.country.en)}
                          </span>
                        </span>
                        <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                      </summary>

                      <div className="border-t px-4 pb-4 pt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <Landmark className="w-3.5 h-3.5" />
                              {t.ui.tripsGuideCapital}
                            </p>
                            <p className="text-xs font-semibold mt-1.5 leading-snug">{countryFacts.capital[language] ?? countryFacts.capital.en}</p>
                          </div>

                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <Users className="w-3.5 h-3.5" />
                              {t.ui.tripsGuidePopulation.replace("{year}", String(countryFacts.populationYear))}
                            </p>
                            <p className="text-xs font-semibold mt-1.5">
                              {new Intl.NumberFormat(populationLocale).format(countryFacts.population)}
                            </p>
                          </div>

                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <Languages className="w-3.5 h-3.5" />
                              {t.ui.tripsGuideLanguages}
                            </p>
                            <p className="text-xs font-semibold mt-1.5 leading-snug">{countryFacts.languages[language] ?? countryFacts.languages.en}</p>
                          </div>

                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {t.ui.tripsGuideNationalDay}
                            </p>
                            <p className="text-xs font-semibold mt-1.5 leading-snug">{countryFacts.nationalDay[language] ?? countryFacts.nationalDay.en}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                          <p className="flex items-center gap-1.5 text-xs font-semibold">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            {t.ui.tripsGuideCuriosity}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{countryFacts.curiosity[language] ?? countryFacts.curiosity.en}</p>
                        </div>

                        <a
                          href={`https://data.worldbank.org/indicator/SP.POP.TOTL?locations=${countryFacts.worldBankCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                        >
                          {t.ui.tripsGuidePopulationSource}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </details>
                  )}

                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {t.ui.tripsGuidePlanningNote}
                  </p>

                  <div className="space-y-2">
                    {flightSearchEnabled && <Button
                      className="w-full rounded-xl"
                      onClick={() => {
                        openFlightSearchForDestination(selectedGuide);
                        setSelectedGuide(null);
                      }}
                    >
                      <Plane className="w-4 h-4 mr-2" />
                      {t.ui.tripsGuideSearchFlights}
                    </Button>}
                    <a
                      href={waLink(t.trips.inspiration.contactMessage
                        .replace("{city}", selectedGuideNames?.city ?? "")
                        .replace("{country}", selectedGuideNames?.country ?? ""))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
                    >
                      {t.ui.tripsGuideContact}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

      {/* Legacy group-trip and hotel flows stay disabled until the supplier responds. */}
      {supplierFeatures.salesEnabled && <>
      {/* Trip detail sheet */}
      <Sheet open={!!selectedTrip} onOpenChange={(open) => !open && setSelectedTrip(null)}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto p-0">
          {selectedTrip && (
            <div>
              {/* Close */}
              <button
                onClick={() => setSelectedTrip(null)}
                className="absolute top-3 right-3 z-50 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white"
              >
                <X size={20} />
              </button>

              {/* Hero */}
              {selectedTrip.coverImageUrl ? (
                <div className="relative h-56 overflow-hidden">
                  <img src={selectedTrip.coverImageUrl} alt={selectedTrip.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <Badge variant="secondary" className="mb-1">
                      {selectedTrip.type === "package" ? t.trips.package : t.trips.experience}
                    </Badge>
                    <h2 className="text-white text-2xl font-bold">{selectedTrip.title}</h2>
                    <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
                      <MapPin className="w-4 h-4" />
                      {selectedTrip.destination}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-end p-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedTrip.title}</h2>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <MapPin className="w-4 h-4" />
                      {selectedTrip.destination}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-5 space-y-5">
                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">{t.trips.departure}</p>
                    <p className="font-semibold text-sm">{fmtDate(selectedTrip.departureDate, language)}</p>
                  </div>
                  {selectedTrip.returnDate && (
                    <div className="bg-muted/40 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-1">{t.trips.returnDate}</p>
                      <p className="font-semibold text-sm">{fmtDate(selectedTrip.returnDate, language)}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedTrip.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedTrip.description}</p>
                )}

                {/* Included */}
                {selectedTrip.includedServices && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {t.trips.included}
                    </h3>
                    <div className="space-y-1.5">
                      {selectedTrip.includedServices.split("\n").filter(Boolean).map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                          <span>{item.replace(/^[-•*]\s*/, "")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Participants */}
                {selectedTrip.confirmedCount > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      {t.trips.goingCount.replace("{n}", String(selectedTrip.confirmedCount))}
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {selectedTrip.participants.slice(0, 8).map((p, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-full border-2 border-background overflow-hidden bg-muted">
                            {p.profileImageUrl ? (
                              <img src={p.profileImageUrl} alt={p.firstName || ""} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                                {p.firstName?.[0] || "?"}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[40px]">{p.firstName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price + CTA */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-primary">{fmtPrice(selectedTrip.pricePerPerson)}€</span>
                      <span className="text-sm text-muted-foreground"> {t.trips.perPerson}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {isFull(selectedTrip)
                        ? t.trips.fullyBooked
                        : t.trips.spotsLeft.replace("{n}", String(spotsLeft(selectedTrip)))}
                    </span>
                  </div>

                  {isFull(selectedTrip) ? (
                    <Badge variant="destructive" className="w-full justify-center py-2.5 text-sm">
                      {t.trips.fullyBooked}
                    </Badge>
                  ) : !isLoggedIn ? (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => { setSelectedTrip(null); navigate("/auth"); }}
                      data-testid="button-login-to-book"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Inicia sesión para reservar
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => bookMutation.mutate(selectedTrip.id)}
                      disabled={bookMutation.isPending}
                      data-testid="button-book-trip"
                    >
                      {bookMutation.isPending
                        ? "Procesando..."
                        : t.trips.bookNow.replace("{price}", fmtPrice(selectedTrip.pricePerPerson))}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    asChild
                    data-testid="button-contact-trip"
                  >
                    <a href={`mailto:fallonyouapp@hotmail.com?subject=Pregunta sobre viaje: ${encodeURIComponent(selectedTrip.title)}`}>
                      <Mail className="w-4 h-4 mr-2" />
                      {t.trips.contact}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Destination inquiry sheet ─────────────────────────── */}
      <Sheet open={!!selectedDest} onOpenChange={(open) => { if (!open) { setSelectedDest(null); setInquirySent(false); } }}>
        <SheetContent side="bottom" className="rounded-t-3xl overflow-y-auto p-0 max-h-[92vh]">
          {selectedDest && (
            <div>
              {/* Hero */}
              <div className="relative h-48 overflow-hidden rounded-t-3xl">
                <img src={selectedDest.image} alt={getDestinationNames(selectedDest, language).city} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <button
                  onClick={() => setSelectedDest(null)}
                  className="absolute top-3 right-3 z-50 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-4 left-4">
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-white/95 text-gray-800 mb-2 inline-block">
                    {t.trips.inspiration.badge}
                  </span>
                  <p className="text-white font-bold text-2xl">{selectedDest.emoji} {getDestinationNames(selectedDest!, language).city}</p>
                  <p className="text-white/70 text-sm">
                    {getDestinationNames(selectedDest!, language).country} · {formatDestinationDuration(selectedDest!, t.trips.inspiration.duration)}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <DestinationPhotoCredit destination={selectedDest} language={language} />

                {/* ── RateHawk hotel search ───────────────────────────── */}
                {rhConfigured && !inquirySent && (
                  <div className="bg-muted/40 rounded-2xl p-4 space-y-3">
                   <h4 className="font-semibold text-sm flex items-center gap-2">{t.ui.tripsHotels}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                         <label className="text-[10px] font-medium text-muted-foreground block mb-1">{t.ui.tripsCheckin}</label>
                        <Input type="date" value={hotelCheckin} min={new Date().toISOString().slice(0,10)}
                          onChange={e => setHotelCheckin(e.target.value)} className="text-xs h-8" />
                      </div>
                      <div>
                         <label className="text-[10px] font-medium text-muted-foreground block mb-1">{t.ui.tripsCheckout}</label>
                        <Input type="date" value={hotelCheckout} min={hotelCheckin}
                          onChange={e => setHotelCheckout(e.target.value)} className="text-xs h-8" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                       <span className="text-xs text-muted-foreground">{t.ui.tripsAdults}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setHotelAdults(a => Math.max(1, a - 1))}
                            className="w-7 h-7 rounded-full border flex items-center justify-center text-base font-bold hover:bg-muted">−</button>
                          <span className="w-5 text-center text-sm font-semibold">{hotelAdults}</span>
                          <button onClick={() => setHotelAdults(a => Math.min(9, a + 1))}
                            className="w-7 h-7 rounded-full border flex items-center justify-center text-base font-bold hover:bg-muted">+</button>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => searchHotels(selectedDest.iataCode)} disabled={hotelLoading} className="text-xs">
                         {hotelLoading ? t.ui.tripsSearchingHotels : t.ui.tripsSearchHotels}
                      </Button>
                    </div>

                    {/* Results */}
                    {hotelError && (
                      <p className="text-xs text-destructive text-center py-2">{hotelError}</p>
                    )}
                    {hotelResults.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {hotelResults.map((h: any) => (
                          <div key={h.id} className="flex items-center gap-3 bg-background rounded-xl p-3 shadow-sm">
                            {h.images?.[0] ? (
                              <img src={h.images[0]} alt={h.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-2xl shrink-0">🏨</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold leading-tight truncate">{h.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                 {"⭐".repeat(Math.min(h.star_rating ?? 0, 5))} {h.star_rating ? t.ui.tripsStars.replace("{n}", String(h.star_rating)) : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-primary">{h.cheapestRate}€</p>
                               <p className="text-[9px] text-muted-foreground">{t.ui.tripsPerNight}</p>
                            </div>
                          </div>
                        ))}
                        <p className="text-[9px] text-center text-muted-foreground pt-1">
                           {t.ui.tripsTaxAvailability}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Separator between hotel search and form ─────────── */}
                {rhConfigured && !inquirySent && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                     <span className="text-[10px] text-muted-foreground font-medium">{t.ui.tripsInterested}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                {inquirySent ? (
                  /* ── Success state ── */
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                     <h3 className="text-lg font-bold mb-2">{t.ui.tripsRequestSent}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t.ui.tripsRequestReceived.replace("{city}", getDestinationNames(selectedDest!, language).city)}
                    </p>
                    <a
                       href={waLink(`Hola, acabo de enviar una consulta para ${getDestinationNames(selectedDest!, language).city} y necesito ayuda para preparar mi viaje 😊`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.528 5.845L0 24l6.335-1.507A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6a9.572 9.572 0 01-4.944-1.374l-.354-.21-3.664.872.936-3.558-.23-.366A9.556 9.556 0 012.4 12c0-5.295 4.305-9.6 9.6-9.6 5.296 0 9.6 4.305 9.6 9.6 0 5.296-4.304 9.6-9.6 9.6z"/></svg>
                       {t.ui.tripsMessageWhatsApp}
                    </a>
                    <Button className="mt-3 w-full" variant="outline" onClick={() => setSelectedDest(null)}>
                       {t.ui.tripsMoreDestinations}
                    </Button>
                  </div>
                ) : (
                  /* ── Inquiry form ── */
                  <>
                    <div>
                       <h3 className="font-bold text-base">{t.ui.tripsRequestPackage}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                         {t.ui.tripsPackageHint}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                         <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.ui.tripsYourName}</label>
                        <Input
                           placeholder={t.ui.tripsFullName}
                          value={inquiryForm.name}
                          onChange={e => setInquiryForm(f => ({ ...f, name: e.target.value }))}
                          data-testid="input-inquiry-name"
                        />
                      </div>
                      <div>
                         <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.ui.tripsContactEmail}</label>
                        <Input
                          type="email"
                          placeholder="tu@email.com"
                          value={inquiryForm.email}
                          onChange={e => setInquiryForm(f => ({ ...f, email: e.target.value }))}
                          data-testid="input-inquiry-email"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          <Phone className="w-3 h-3 inline mr-1" />
                           {t.ui.tripsPhone}
                        </label>
                        <Input
                          type="tel"
                          placeholder="+34 600 000 000"
                          value={inquiryForm.phone}
                          onChange={e => setInquiryForm(f => ({ ...f, phone: e.target.value }))}
                          data-testid="input-inquiry-phone"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                           {t.ui.tripsDetailsLabel}
                        </label>
                        <Textarea
                          placeholder={`Ej: Quiero ir a ${getDestinationNames(selectedDest!, language).city} en agosto para 2 personas`}
                          value={inquiryForm.message}
                          onChange={e => setInquiryForm(f => ({ ...f, message: e.target.value }))}
                          className="min-h-[80px]"
                          data-testid="input-inquiry-message"
                        />
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!inquiryForm.name.trim() || !inquiryForm.email.trim() || inquiryMutation.isPending}
                      onClick={() => inquiryMutation.mutate({
                        ...inquiryForm,
                        destination: getDestinationNames(selectedDest!, language).city,
                        country: getDestinationNames(selectedDest!, language).country,
                        duration: formatDestinationDuration(selectedDest!, t.trips.inspiration.duration),
                      })}
                      data-testid="button-send-inquiry"
                    >
                       {inquiryMutation.isPending ? (
                         t.ui.tripsRequesting
                       ) : (
                          <><Send className="w-4 h-4 mr-2" /> {t.ui.tripsRequestFor.replace("{city}", getDestinationNames(selectedDest!, language).city)}</>
                      )}
                    </Button>

                    <div className="flex items-center gap-2 my-1">
                      <div className="flex-1 h-px bg-border" />
                       <span className="text-[10px] text-muted-foreground">{t.ui.tripsOr}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <a
                       href={waLink(t.trips.inspiration.contactMessage
                         .replace("{city}", getDestinationNames(selectedDest!, language).city)
                         .replace("{country}", getDestinationNames(selectedDest!, language).country))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.528 5.845L0 24l6.335-1.507A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6a9.572 9.572 0 01-4.944-1.374l-.354-.21-3.664.872.936-3.558-.23-.366A9.556 9.556 0 012.4 12c0-5.295 4.305-9.6 9.6-9.6 5.296 0 9.6 4.305 9.6 9.6 0 5.296-4.304 9.6-9.6 9.6z"/></svg>
                       {t.ui.tripsContactWhatsApp}
                    </a>

                    <p className="text-center text-[10px] text-muted-foreground">
                       {t.ui.tripsInquiryNote}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      </>}

      <BottomNav />
    </div>
  );
}
