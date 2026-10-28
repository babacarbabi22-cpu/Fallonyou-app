import { Link } from "wouter";
import { Plane, Star, Hand, Users, CalendarDays, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n, type Language } from "@/lib/i18n";
import posterBg from "@assets/poster_adventure_base.webp";
import baliImage from "@assets/landing-destinations/bali.jpg";
import tokyoImage from "@assets/landing-destinations/tokyo.jpg";
import senegalImage from "@assets/landing-destinations/senegal-goree-card.jpg";

const fallingIcons = [
  { delay: 0,   duration: 12, left: 5,  size: 16, color: "text-amber-400", type: "plane" },
  { delay: 2,   duration: 15, left: 20, size: 13, color: "text-yellow-300", type: "star"  },
  { delay: 4,   duration: 10, left: 35, size: 18, color: "text-amber-500", type: "plane" },
  { delay: 1,   duration: 14, left: 50, size: 11, color: "text-white",     type: "star"  },
  { delay: 3,   duration: 16, left: 65, size: 14, color: "text-amber-400", type: "plane" },
  { delay: 5,   duration: 11, left: 80, size: 15, color: "text-yellow-400", type: "star" },
  { delay: 2.5, duration: 13, left: 92, size: 10, color: "text-white",     type: "plane" },
  { delay: 6,   duration: 14, left: 12, size: 12, color: "text-amber-300", type: "plane" },
  { delay: 0.8, duration: 17, left: 73, size: 13, color: "text-yellow-300", type: "star" },
];

const FEATURES = [Plane, Users, CalendarDays];
const DESTINATION_PREVIEWS = [
  { key: "bali", image: baliImage },
  { key: "tokyo", image: tokyoImage },
  { key: "senegal", image: senegalImage },
] as const;

const LANDING_COPY: Record<Language, {
  tagline: string;
  subtitle: string;
  features: Array<{ label: string; sub: string }>;
  inspiration: string;
  destinations: Record<(typeof DESTINATION_PREVIEWS)[number]["key"], string>;
  exploreDestinations: string;
  signIn: string;
  legal: string;
  terms: string;
  privacy: string;
}> = {
  en: {
    tagline: "It's up to you",
    subtitle: "Meet people, join plans and travel differently",
    features: [
      { label: "Destinations", sub: "Explore travel guides" },
      { label: "Meet people", sub: "Connect with travelers" },
      { label: "Plans & Events", sub: "Join experiences" },
    ],
    inspiration: "Inspiration for your next trip",
    destinations: { bali: "Bali", tokyo: "Tokyo", senegal: "Senegal" },
    exploreDestinations: "Explore destinations",
    signIn: "Sign in · Sign up",
    legal: "By signing up you accept our",
    terms: "Terms of Service",
    privacy: "Privacy",
  },
  es: {
    tagline: "Depende de ti",
    subtitle: "Conoce gente, únete a planes y viaja diferente",
    features: [
      { label: "Destinos", sub: "Explora guías de viaje" },
      { label: "Conoce personas", sub: "Conecta con viajeros" },
      { label: "Planes & Eventos", sub: "Únete a experiencias" },
    ],
    inspiration: "Ideas para tu próximo viaje",
    destinations: { bali: "Bali", tokyo: "Tokio", senegal: "Senegal" },
    exploreDestinations: "Explorar destinos",
    signIn: "Entrar · Registrarse",
    legal: "Al registrarte aceptas nuestros",
    terms: "Términos de Servicio",
    privacy: "Privacidad",
  },
  fr: {
    tagline: "Ça dépend de toi",
    subtitle: "Rencontre des gens, rejoins des activités et voyage autrement",
    features: [
      { label: "Destinations", sub: "Explore les guides de voyage" },
      { label: "Rencontre des gens", sub: "Connecte-toi avec des voyageurs" },
      { label: "Activités & événements", sub: "Rejoins des expériences" },
    ],
    inspiration: "Inspiration pour ton prochain voyage",
    destinations: { bali: "Bali", tokyo: "Tokyo", senegal: "Sénégal" },
    exploreDestinations: "Explorer les destinations",
    signIn: "Se connecter · S'inscrire",
    legal: "En vous inscrivant, vous acceptez nos",
    terms: "Conditions d'utilisation",
    privacy: "Confidentialité",
  },
  sv: {
    tagline: "Det är upp till dig",
    subtitle: "Träffa människor, delta i aktiviteter och res på ett nytt sätt",
    features: [
      { label: "Resmål", sub: "Utforska reseguider" },
      { label: "Träffa människor", sub: "Lär känna andra resenärer" },
      { label: "Planer och evenemang", sub: "Delta i upplevelser" },
    ],
    inspiration: "Inspiration för din nästa resa",
    destinations: { bali: "Bali", tokyo: "Tokyo", senegal: "Senegal" },
    exploreDestinations: "Utforska resmål",
    signIn: "Logga in · Registrera dig",
    legal: "Genom att registrera dig godkänner du våra",
    terms: "Användarvillkor",
    privacy: "Integritetspolicy",
  },
};

export default function LandingPage() {
  const { language } = useI18n();
  const copy = LANDING_COPY[language];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start relative overflow-hidden">

      {/* Background */}
      {/* React 18 forwards this newer HTML attribute using its lowercase name. */}
      <img src={posterBg} alt="" {...{ fetchpriority: "high" }} decoding="async" className="absolute inset-0 w-full h-full object-cover object-top" draggable={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/50 to-black/90" />

      {/* Animations */}
      <style>{`
        @keyframes fall {
          0%   { transform:translateY(-30px) rotate(0deg); opacity:0 }
          8%   { opacity:.55 }
          92%  { opacity:.45 }
          100% { transform:translateY(105vh) rotate(360deg); opacity:0 }
        }
        @keyframes ballDrop {
          0%   { transform:translateX(-50%) translateY(-90px); opacity:0 }
          10%  { opacity:1 }
          42%  { transform:translateX(-50%) translateY(62px); animation-timing-function:ease-out }
          44%  { transform:translateX(-50%) translateY(66px) scaleX(1.2) scaleY(0.76) }
          52%  { transform:translateX(-50%) translateY(18px) scaleX(1) scaleY(1) }
          60%  { transform:translateX(-50%) translateY(62px) }
          62%  { transform:translateX(-50%) translateY(64px) scaleX(1.1) scaleY(0.86) }
          68%  { transform:translateX(-50%) translateY(38px) }
          74%  { transform:translateX(-50%) translateY(60px) }
          80%  { transform:translateX(-50%) translateY(56px) }
          87%  { transform:translateX(-50%) translateY(56px); opacity:1 }
          100% { transform:translateX(-50%) translateY(56px); opacity:0 }
        }
        @keyframes handsReceive {
          0%,41% { transform:scale(1) translateY(0) }
          44%    { transform:scale(1.06) translateY(4px) }
          51%    { transform:scale(0.97) translateY(-2px) }
          56%    { transform:scale(1) translateY(0) }
          60%    { transform:scale(1.03) translateY(2px) }
          65%    { transform:scale(1) translateY(0) }
          100%   { transform:scale(1) translateY(0) }
        }
        @keyframes titleBounce {
          0%,40% { transform:scaleX(1) scaleY(1) }
          43%    { transform:scaleX(1.03) scaleY(0.94) }
          47%    { transform:scaleX(0.98) scaleY(1.04) }
          52%    { transform:scaleX(1) scaleY(1) }
          100%   { transform:scaleX(1) scaleY(1) }
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(24px) }
          to   { opacity:1; transform:translateY(0) }
        }
        .slide-up-1 { animation: slideUp .5s ease-out .2s both }
        .slide-up-2 { animation: slideUp .5s ease-out .4s both }
        .slide-up-3 { animation: slideUp .5s ease-out .6s both }
        .slide-up-4 { animation: slideUp .5s ease-out .8s both }
      `}</style>

      {/* Falling icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {fallingIcons.map((icon, i) => {
          const Ic = icon.type === "plane" ? Plane : Star;
          return (
            <Ic key={i} className={`absolute ${icon.color} fill-current`}
              style={{ width: icon.size, height: icon.size, left: `${icon.left}%`, top: "-30px",
                animation: `fall ${icon.duration}s linear infinite`, animationDelay: `${icon.delay}s`,
                filter: "drop-shadow(0 0 4px rgba(251,191,36,0.5))" }} />
          );
        })}
      </div>

      {/* Language picker */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector prominent />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 w-full max-w-sm px-5 pt-16 pb-8 flex flex-col items-center gap-6">

        {/* Brand */}
        <div className="text-center relative slide-up-1">
          {/* Falling ball */}
          <div style={{
            position: "absolute", top: 0, left: "50%",
            width: 20, height: 20, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #FDE68A, #D97706 70%)",
            boxShadow: "0 0 14px rgba(251,191,36,0.7), 0 2px 6px rgba(0,0,0,0.5)",
            animation: "ballDrop 4s ease-in infinite", animationDelay: "0.6s",
            zIndex: 10, pointerEvents: "none",
          }} />

          <h1 className="font-display font-black text-5xl italic tracking-tight"
            style={{
              background: "linear-gradient(135deg,#D97706 0%,#FCD34D 45%,#F59E0B 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 2px 16px rgba(251,191,36,0.45))",
              animation: "titleBounce 4s ease-in infinite", animationDelay: "0.6s", display: "inline-block",
            }}>
            FallOnyou
          </h1>

          {/* Hands */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 2, marginTop: 4,
            animation: "handsReceive 4s ease-in infinite", animationDelay: "0.6s" }}>
            <Hand size={30} style={{ transform: "scaleX(-1) rotate(20deg)", color: "#FCD34D", filter: "drop-shadow(0 0 10px rgba(251,191,36,0.75))", strokeWidth: 1.6 }} />
            <Hand size={30} style={{ transform: "rotate(-20deg)", color: "#FCD34D", filter: "drop-shadow(0 0 10px rgba(251,191,36,0.75))", strokeWidth: 1.6 }} />
          </div>

          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-8 bg-amber-500/40" />
            <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase">{copy.tagline}</p>
            <div className="h-px w-8 bg-amber-500/40" />
          </div>
          <p className="text-white/50 text-xs mt-1 tracking-wide">
            {copy.subtitle}
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex gap-2 w-full justify-center slide-up-2">
          {FEATURES.map((Icon, index) => (
            <div key={copy.features[index].label} className="flex-1 rounded-2xl p-2.5 text-center"
              style={{ background: "rgba(8,8,8,0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Icon className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="text-white text-[10px] font-bold leading-tight">{copy.features[index].label}</p>
              <p className="text-white/40 text-[9px] leading-tight mt-0.5">{copy.features[index].sub}</p>
            </div>
          ))}
        </div>

        {/* Destination inspiration only: no packages or example prices. */}
        <section className="w-full slide-up-3" aria-labelledby="destination-inspiration">
          <h2 id="destination-inspiration" className="text-white/60 text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5 text-amber-400" />
            {copy.inspiration}
          </h2>
          <div className="flex gap-2">
            {DESTINATION_PREVIEWS.map(({ key, image }) => (
              <div key={key} className="flex-1 relative h-20 rounded-xl overflow-hidden">
                <img src={image} alt={copy.destinations[key]} decoding="async" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <p className="absolute bottom-2 left-1.5 right-1 text-white text-[10px] font-bold leading-none">
                  {copy.destinations[key]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-3 slide-up-4">
          <Link href="/viajes">
            <Button className="w-full h-13 text-base font-bold rounded-2xl shadow-lg shadow-amber-500/30"
              style={{ background: "linear-gradient(135deg,#D97706,#F59E0B)", color: "#000" }}
              size="lg">
              <Plane className="w-5 h-5 mr-2" />
              {copy.exploreDestinations}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>

          <Link href="/auth">
            <Button variant="outline" size="lg"
              className="w-full h-13 text-base font-semibold rounded-2xl text-white border-white/20 hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
              {copy.signIn}
            </Button>
          </Link>
        </div>

        {/* Legal */}
        <p className="text-center text-[10px] text-white/30 px-2">
          {copy.legal}{" "}
          <Link href="/legal" className="text-amber-400/60 underline">{copy.terms}</Link>
          {" & "}
          <Link href="/privacy" className="text-amber-400/60 underline">{copy.privacy}</Link>
          {" · Gratis · Free · Gratuit"}
        </p>
      </div>
    </div>
  );
}
