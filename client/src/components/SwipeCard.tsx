import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { UserWithPhotos } from "@/hooks/use-danceme";
import { X, MapPin, Briefcase, Ruler, GraduationCap, Star, User, Zap, Plane, BookOpen, UserPlus, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { connectionCopy } from "@/lib/connection-copy";
import { TravelLoading } from "@/components/TravelLoading";
import { courseLevels } from "@shared/language-course";

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  fr: "🇫🇷",
  it: "🇮🇹",
  pt: "🇧🇷",
  de: "🇩🇪",
  ja: "🇯🇵",
  zh: "🇨🇳",
  ar: "🇸🇦",
  nl: "🇳🇱",
};

const LANGUAGE_LEVEL_LABELS: Record<string, string> =
  Object.fromEntries(courseLevels.map(level => [level.id, level.label]));

interface SwipeCardProps {
  user: UserWithPhotos;
  onSwipe: (direction: "left" | "right") => void;
  onTap?: () => void;
}

export function SwipeCard({ user, onSwipe, onTap }: SwipeCardProps) {
  const { t, language } = useI18n();
  const connectionText = connectionCopy[language];
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const [exitX, setExitX] = useState<number>(0);
  const [dragDistance, setDragDistance] = useState(0);
  const primaryPhoto = user.photos?.[0]?.url || user.profileImageUrl || null;
  const photoIdentity = `${user.id}:${primaryPhoto ?? "no-photo"}`;
  const [imageState, setImageState] = useState<{ identity: string; state: "loading" | "ready" | "error"; attempt: number }>({
    identity: photoIdentity,
    state: primaryPhoto ? "loading" : "error",
    attempt: 0,
  });
  const activePhoto = imageState.identity === photoIdentity
    ? imageState
    : { identity: photoIdentity, state: primaryPhoto ? "loading" : "error", attempt: 0 };
  const currentPhoto = useRef({ identity: photoIdentity, attempt: 0, generation: 0 });
  if (currentPhoto.current.identity !== photoIdentity || currentPhoto.current.attempt !== activePhoto.attempt) {
    currentPhoto.current = { identity: photoIdentity, attempt: activePhoto.attempt, generation: currentPhoto.current.generation + 1 };
  }
  const photoGeneration = currentPhoto.current.generation;
  const willRetry = !!primaryPhoto && activePhoto.state === "error" && activePhoto.attempt < 2;
  useEffect(() => {
    if (!willRetry) return;
    const timer = window.setTimeout(() => {
      if (mounted.current && currentPhoto.current.identity === photoIdentity && currentPhoto.current.generation === photoGeneration) {
        setImageState({ identity: photoIdentity, state: "loading", attempt: activePhoto.attempt + 1 });
      }
    }, 450 * (activePhoto.attempt + 1));
    return () => window.clearTimeout(timer);
  }, [willRetry, photoIdentity, photoGeneration, activePhoto.attempt]);
  const x = useMotionValue(0);
  const visibleImageState = willRetry ? "loading" : activePhoto.state;
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);
  
  // Color overlays based on drag direction
  const connectOpacity = useTransform(x, [0, 150], [0, 1]);
  const passOpacity = useTransform(x, [0, -150], [0, 1]);

  const handleDrag = (_: unknown, info: PanInfo) => {
    setDragDistance(Math.abs(info.offset.x));
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100) {
      setExitX(200);
      onSwipe("right");
    } else if (info.offset.x < -100) {
      setExitX(-200);
      onSwipe("left");
    }
    // Reset drag distance after a short delay to allow click handling
    setTimeout(() => setDragDistance(0), 100);
  };

  const handleTap = () => {
    // Only trigger tap if drag distance is minimal (not a swipe)
    if (dragDistance < 10 && onTap) {
      onTap();
    }
  };

  const displayName = user.firstName || "User";
  const profile = user.profile;
  const languageLevel = profile?.langLevel ? LANGUAGE_LEVEL_LABELS[profile.langLevel] : null;
  const languageFlag = profile?.primaryLang ? LANGUAGE_FLAGS[profile.primaryLang] : null;
  const imageCopy = {
    en: { loading: "Loading photo…", error: "Photo unavailable for now.", retry: "Load photo", empty: "No photo available." },
    es: { loading: "Cargando foto…", error: "Foto no disponible por ahora.", retry: "Cargar foto", empty: "No hay foto disponible." },
    fr: { loading: "Chargement de la photo…", error: "Photo indisponible pour le moment.", retry: "Charger la photo", empty: "Aucune photo disponible." },
    sv: { loading: "Laddar foto…", error: "Fotot är inte tillgängligt just nu.", retry: "Ladda fotot", empty: "Ingen bild tillgänglig." },
  }[language];

  const markPhotoReady = (image: HTMLImageElement) => {
    if (!mounted.current || currentPhoto.current.identity !== photoIdentity || currentPhoto.current.generation !== photoGeneration) return;
    const markReady = () => {
      if (mounted.current && currentPhoto.current.identity === photoIdentity && currentPhoto.current.generation === photoGeneration) {
        setImageState({ identity: photoIdentity, state: "ready", attempt: activePhoto.attempt });
      }
    };
    if (typeof image.decode === "function") {
      image.decode().then(markReady).catch(() => {
        if (mounted.current && currentPhoto.current.identity === photoIdentity && currentPhoto.current.generation === photoGeneration) {
          setImageState({ identity: photoIdentity, state: "error", attempt: activePhoto.attempt });
        }
      });
    } else {
      markReady();
    }
  };

  // Helper to get translated value for education/zodiac
  const getEducationLabel = (key: string) => {
    const educationMap: Record<string, string> = {
      highSchool: t.education.highSchool,
      someCollege: t.education.someCollege,
      bachelors: t.education.bachelors,
      masters: t.education.masters,
      doctorate: t.education.doctorate,
      tradeSchool: t.education.tradeSchool,
    };
    return educationMap[key] || key;
  };

  const getZodiacLabel = (key: string) => {
    const zodiacMap: Record<string, string> = {
      aries: t.zodiac.aries,
      taurus: t.zodiac.taurus,
      gemini: t.zodiac.gemini,
      cancer: t.zodiac.cancer,
      leo: t.zodiac.leo,
      virgo: t.zodiac.virgo,
      libra: t.zodiac.libra,
      scorpio: t.zodiac.scorpio,
      sagittarius: t.zodiac.sagittarius,
      capricorn: t.zodiac.capricorn,
      aquarius: t.zodiac.aquarius,
      pisces: t.zodiac.pisces,
    };
    return zodiacMap[key] || key;
  };

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onTap={handleTap}
      animate={exitX !== 0 ? { x: exitX, opacity: 0 } : { x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing"
      data-testid="swipe-card"
      data-member-id={user.id}
      data-image-state={visibleImageState}
    >
      <div className="relative w-full h-[75vh] rounded-3xl overflow-hidden shadow-2xl bg-[#d9dddc] border border-white/10">
        {/* The opaque backing stays in place until this member's own image decodes. */}
        {primaryPhoto && (
          <img 
             key={`${photoIdentity}:${activePhoto.attempt}`}
            src={primaryPhoto} 
            alt={displayName} 
            loading="eager"
            decoding="async"
            onLoad={(event) => markPhotoReady(event.currentTarget)}
            onError={() => {
              if (mounted.current && currentPhoto.current.identity === photoIdentity && currentPhoto.current.generation === photoGeneration) {
                setImageState({ identity: photoIdentity, state: "error", attempt: activePhoto.attempt });
              }
            }}
            data-testid="swipe-card-image"
            data-image-state={visibleImageState}
            className={`absolute inset-0 w-full h-full object-cover ${visibleImageState === "ready" ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {visibleImageState === "loading" && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-[#d9dddc] text-[#59615f]"
            data-testid="swipe-card-image-loading"
          >
            <TravelLoading className="absolute inset-0" label={imageCopy.loading} />
          </div>
        )}
        {visibleImageState === "error" && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-[#d9dddc] text-[#59615f]"
            data-testid={primaryPhoto ? "swipe-card-image-error" : "swipe-card-image-empty"}
            role="status"
          >
            <div className="text-center">
              <User className="w-24 h-24 text-[#87928f] mx-auto" />
              {primaryPhoto ? <>
                <span className="sr-only">{imageCopy.error}</span>
                <button
                  type="button"
                  data-testid="swipe-card-retry-photo"
                  className="relative z-20 mt-3 rounded-full border border-[#59615f]/30 px-4 py-2 text-sm font-medium hover:bg-white/30"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setImageState({ identity: photoIdentity, state: "loading", attempt: 0 });
                  }}
                >{imageCopy.retry}</button>
              </> : <p className="mt-3 text-sm font-medium">{imageCopy.empty}</p>}
            </div>
          </div>
        )}

        {/* Swipe overlays */}
        {visibleImageState === "ready" && <motion.div style={{ opacity: connectOpacity }} className="absolute top-8 left-8 border-4 border-amber-400 rounded-xl px-4 py-2 -rotate-12 z-20 bg-black/20 backdrop-blur-sm">
          <span className="text-3xl font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <Plane className="w-7 h-7 fill-amber-400" /> {connectionText.connect}
          </span>
        </motion.div>}
        
        {visibleImageState === "ready" && <motion.div style={{ opacity: passOpacity }} className="absolute top-8 right-8 border-4 border-white/60 rounded-xl px-4 py-2 rotate-12 z-20 bg-black/20 backdrop-blur-sm">
          <span className="text-3xl font-black text-white/80 uppercase tracking-widest">{connectionText.skip}</span>
        </motion.div>}

        {/* Gradient Overlay - pointer-events-none to allow clicking through */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80 pointer-events-none z-0" />

        {/* Available Today badge */}
        {visibleImageState === "ready" && (profile as any)?.availableToday && (
          <div className="absolute top-3 left-3 z-20">
            <div className="flex items-center gap-1.5 bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
              <Zap className="w-3 h-3 fill-white" />
              Disponible hoy
            </div>
          </div>
        )}

        {/* Available as Guide badge */}
        {visibleImageState === "ready" && (profile as any)?.availableAsGuide && (
          <div className={`absolute z-20 ${(profile as any)?.availableToday ? "top-10 left-3" : "top-3 left-3"}`}>
            <div className="flex items-center gap-1.5 bg-blue-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
              <BookOpen className="w-3 h-3" />
              De guía
            </div>
          </div>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
          <div className="flex items-end justify-between mb-2">
            <h2 className="text-4xl font-display font-bold text-shadow !text-white">
              {displayName}{profile?.age ? <>, <span className="text-3xl font-medium opacity-90">{profile.age}</span></> : null}
            </h2>
            {/* Action buttons */}
            <div className="flex gap-3 mb-2 relative z-30">
              <button 
                onClick={(e) => { e.stopPropagation(); setExitX(-200); onSwipe("left"); }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 hover:scale-110 transition-all"
                data-testid="button-pass"
                aria-label={connectionText.skip}
              >
                <X size={22} strokeWidth={2.5} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setExitX(200); onSwipe("right"); }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-900/40 hover:bg-amber-400 hover:scale-110 transition-all"
                data-testid="button-like"
                aria-label={connectionText.connect}
              >
                <UserPlus size={22} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="space-y-2 opacity-90">
            {profile?.bio && (
              <p className="text-base leading-relaxed line-clamp-2 text-shadow">
                {profile.bio}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium mt-4" data-testid="profile-details">
               {profile?.birthplace && (
                 <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                   <MapPin size={14} />
                   <span>{profile.birthplace}</span>
                 </div>
               )}
               {profile?.occupation && (
                 <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                   <Briefcase size={14} />
                   <span>{profile.occupation}</span>
                 </div>
               )}
               {typeof profile?.height === "number" && profile.height > 0 && (
                 <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                   <Ruler size={14} />
                   <span>{profile.height} cm</span>
                 </div>
               )}
               {profile?.education && (
                 <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                   <GraduationCap size={14} />
                   <span>{getEducationLabel(profile.education)}</span>
                 </div>
               )}
               {profile?.zodiacSign && (
                 <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                   <Star size={14} />
                   <span>{getZodiacLabel(profile.zodiacSign)}</span>
                 </div>
               )}
               {(profile as any)?.nextAdventure && (
                 <div className="flex items-center gap-1 bg-amber-500/30 backdrop-blur px-3 py-1 rounded-full border border-amber-400/40">
                   <Plane size={14} className="text-amber-300" />
                   <span className="text-amber-100">{(profile as any).nextAdventure}</span>
                 </div>
               )}
               {languageLevel && (
                 <div
                   data-testid="badge-lang-level"
                   aria-label={`Nivel de idioma ${languageLevel}${languageFlag ? ` ${languageFlag}` : ""}`}
                   className="flex items-center gap-1 bg-indigo-500/30 backdrop-blur px-3 py-1 rounded-full border border-indigo-400/40"
                 >
                   <Languages size={14} className="text-indigo-300" />
                   <span className="text-indigo-100 font-semibold">
                     {languageLevel}
                   </span>
                   {languageFlag && <span aria-hidden="true">{languageFlag}</span>}
                 </div>
               )}
               {(profile as any)?.workStatus === "looking" && (
                 <div
                   data-testid="badge-work-looking"
                   className="flex items-center gap-1 bg-purple-500/30 backdrop-blur px-3 py-1 rounded-full border border-purple-400/40"
                 >
                   <span className="text-purple-200 text-xs font-semibold">🔍 Busca trabajo</span>
                 </div>
               )}
               {(profile as any)?.workStatus === "offering" && (
                 <div
                   data-testid="badge-work-offering"
                   className="flex items-center gap-1 bg-green-500/30 backdrop-blur px-3 py-1 rounded-full border border-green-400/40"
                 >
                   <span className="text-green-200 text-xs font-semibold">📢 Ofrece trabajo</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
