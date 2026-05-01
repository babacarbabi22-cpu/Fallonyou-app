import { useState, useRef, useEffect } from "react";
import { useI18n, type Language } from "@/lib/i18n";
import { Globe, ChevronLeft, ChevronRight } from "lucide-react";

type LangText = { es: string; en: string; fr: string };

interface CityAd {
  id: string;
  city: string;
  country: LangText;
  tagline: LangText;
  cta: LangText;
  image: string;
  emoji: string;
  accent: string;
}

const cityAds: CityAd[] = [
  {
    id: "barcelona",
    city: "Barcelona",
    country: { es: "España", en: "Spain", fr: "Espagne" },
    tagline: {
      es: "Descubre personas apasionantes en la Ciudad Condal",
      en: "Meet fascinating people in the Catalan capital",
      fr: "Rencontrez des gens fascinants à Barcelone",
    },
    cta: { es: "Explorar", en: "Explore", fr: "Explorer" },
    image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=900&q=80",
    emoji: "🏖️",
    accent: "#f0c040",
  },
  {
    id: "paris",
    city: "París",
    country: { es: "Francia", en: "France", fr: "France" },
    tagline: {
      es: "El amor empieza en una actividad inesperada",
      en: "Love begins at an unexpected event",
      fr: "L'amour commence lors d'une activité inattendue",
    },
    cta: { es: "Descubrir", en: "Discover", fr: "Découvrir" },
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80",
    emoji: "🗼",
    accent: "#f0c040",
  },
  {
    id: "rome",
    city: "Roma",
    country: { es: "Italia", en: "Italy", fr: "Italie" },
    tagline: {
      es: "Cada viaje esconde una conexión especial",
      en: "Every trip hides a special connection",
      fr: "Chaque voyage cache une connexion spéciale",
    },
    cta: { es: "Conectar", en: "Connect", fr: "Connecter" },
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=900&q=80",
    emoji: "🏛️",
    accent: "#f0c040",
  },
  {
    id: "ibiza",
    city: "Ibiza",
    country: { es: "España", en: "Spain", fr: "Espagne" },
    tagline: {
      es: "Comparte atardeceres con gente que vale la pena",
      en: "Share sunsets with people worth meeting",
      fr: "Partagez des couchers de soleil avec des personnes qui en valent la peine",
    },
    cta: { es: "Unirse", en: "Join", fr: "Rejoindre" },
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80",
    emoji: "🌅",
    accent: "#f0c040",
  },
  {
    id: "dubai",
    city: "Dubái",
    country: { es: "Emiratos Árabes", en: "UAE", fr: "Émirats arabes" },
    tagline: {
      es: "Experiencias únicas te esperan con la gente adecuada",
      en: "Unique experiences await with the right people",
      fr: "Des expériences uniques vous attendent avec les bonnes personnes",
    },
    cta: { es: "Descubrir", en: "Discover", fr: "Découvrir" },
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&q=80",
    emoji: "🌆",
    accent: "#f0c040",
  },
  {
    id: "newyork",
    city: "Nueva York",
    country: { es: "Estados Unidos", en: "United States", fr: "États-Unis" },
    tagline: {
      es: "La ciudad que nunca duerme tiene miles de historias por vivir",
      en: "The city that never sleeps has thousands of stories to live",
      fr: "La ville qui ne dort jamais a des milliers d'histoires à vivre",
    },
    cta: { es: "Explorar", en: "Explore", fr: "Explorer" },
    image: "https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=900&q=80",
    emoji: "🗽",
    accent: "#f0c040",
  },
  {
    id: "tokyo",
    city: "Tokio",
    country: { es: "Japón", en: "Japan", fr: "Japon" },
    tagline: {
      es: "Encuentra tu próxima aventura entre culturas",
      en: "Find your next adventure between cultures",
      fr: "Trouvez votre prochaine aventure entre les cultures",
    },
    cta: { es: "Conectar", en: "Connect", fr: "Connecter" },
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=80",
    emoji: "⛩️",
    accent: "#f0c040",
  },
  {
    id: "lisbon",
    city: "Lisboa",
    country: { es: "Portugal", en: "Portugal", fr: "Portugal" },
    tagline: {
      es: "Donde las conexiones saben a brisa del Atlántico",
      en: "Where connections feel like an Atlantic breeze",
      fr: "Où les connexions ont le goût de la brise atlantique",
    },
    cta: { es: "Unirse", en: "Join", fr: "Rejoindre" },
    image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=900&q=80",
    emoji: "🌊",
    accent: "#f0c040",
  },
];

const langLabels: Record<Language, string> = { es: "ES", en: "EN", fr: "FR" };

export function CityAdsCarousel() {
  const { language, setLanguage } = useI18n();
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement;
    if (card) {
      const cardLeft = card.offsetLeft;
      const containerWidth = el.offsetWidth;
      const cardWidth = card.offsetWidth;
      el.scrollTo({ left: cardLeft - (containerWidth - cardWidth) / 2, behavior: "smooth" });
    }
    setCurrent(index);
  };

  const next = () => scrollToIndex((current + 1) % cityAds.length);
  const prev = () => scrollToIndex((current - 1 + cityAds.length) % cityAds.length);

  const advanceTick = () => {
    setCurrent((c) => {
      const next = (c + 1) % cityAds.length;
      const el = scrollRef.current;
      if (el) {
        const card = el.children[next] as HTMLElement;
        if (card) {
          const cardLeft = card.offsetLeft;
          const containerWidth = el.offsetWidth;
          const cardWidth = card.offsetWidth;
          el.scrollTo({ left: cardLeft - (containerWidth - cardWidth) / 2, behavior: "smooth" });
        }
      }
      return next;
    });
  };

  useEffect(() => {
    timerRef.current = setInterval(advanceTick, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(advanceTick, 5000);
  };

  const handleNext = () => { next(); resetTimer(); };
  const handlePrev = () => { prev(); resetTimer(); };
  const handleDot = (i: number) => { scrollToIndex(i); resetTimer(); };

  const ad = cityAds[current];

  return (
    <div className="px-4 py-3" data-testid="city-ads-carousel">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
          ✦ {language === "es" ? "Inspírate" : language === "en" ? "Get inspired" : "Inspirez-vous"}
        </p>
        {/* Language switcher */}
        <div className="flex items-center gap-1 bg-black/30 border border-white/10 rounded-full px-1 py-0.5" data-testid="lang-switcher-carousel">
          <Globe className="w-3 h-3 text-white/40 ml-1" />
          {(["es", "en", "fr"] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                language === lang
                  ? "bg-amber-400 text-black"
                  : "text-white/50 hover:text-white/80"
              }`}
              data-testid={`lang-btn-${lang}`}
            >
              {langLabels[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Carousel track */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {cityAds.map((ad, i) => (
            <div
              key={ad.id}
              className="snap-center shrink-0 w-[88vw] max-w-sm relative rounded-2xl overflow-hidden cursor-pointer"
              style={{ height: 180 }}
              onClick={() => { handleDot(i); }}
              data-testid={`city-ad-card-${ad.id}`}
            >
              {/* Background image */}
              <img
                src={ad.image}
                alt={ad.city}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.1) 100%)",
                }}
              />
              {/* Top badge */}
              <div className="absolute top-3 left-3">
                <span className="text-lg">{ad.emoji}</span>
              </div>
              {/* FallonYou branding badge */}
              <div className="absolute top-3 right-3">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.25)", color: "#f0c040", border: "1px solid rgba(245,158,11,0.4)" }}
                >
                  FallonYou
                </span>
              </div>
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-end justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-xl leading-none">
                      {ad.city}
                    </p>
                    <p className="text-amber-300/80 text-[10px] font-medium uppercase tracking-wide mt-0.5">
                      {ad.country[language]}
                    </p>
                    <p className="text-white/80 text-xs leading-snug mt-1.5 line-clamp-2">
                      {ad.tagline[language]}
                    </p>
                  </div>
                  <button
                    className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all"
                    style={{
                      background: "linear-gradient(135deg,#c9a227,#f0c040)",
                      color: "#1a1a1a",
                    }}
                    data-testid={`city-ad-cta-${ad.id}`}
                  >
                    {ad.cta[language]}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Arrow buttons — desktop */}
        <button
          onClick={handlePrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg hidden sm:flex"
          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}
          data-testid="carousel-prev"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg hidden sm:flex"
          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}
          data-testid="carousel-next"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5">
        {cityAds.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDot(i)}
            className="transition-all rounded-full"
            style={{
              width: i === current ? 16 : 5,
              height: 5,
              background: i === current ? "#f0c040" : "rgba(255,255,255,0.2)",
            }}
            data-testid={`carousel-dot-${i}`}
          />
        ))}
      </div>
    </div>
  );
}
