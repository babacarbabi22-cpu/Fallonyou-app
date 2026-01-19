import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { UserWithPhotos } from "@/hooks/use-danceme";
import { X, Heart, MapPin, Briefcase, Ruler, GraduationCap, Star, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// Global image cache for faster loading
const imageCache = new Map<string, boolean>();

function preloadImage(url: string): Promise<boolean> {
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { imageCache.set(url, true); resolve(true); };
    img.onerror = () => { imageCache.set(url, false); resolve(false); };
    img.src = url;
  });
}

interface SwipeCardProps {
  user: UserWithPhotos;
  onSwipe: (direction: "left" | "right") => void;
  onTap?: () => void;
}

export function SwipeCard({ user, onSwipe, onTap }: SwipeCardProps) {
  const { t } = useI18n();
  const [exitX, setExitX] = useState<number>(0);
  const [dragDistance, setDragDistance] = useState(0);
  const [imageError, setImageError] = useState(false);
  const x = useMotionValue(0);
  
  // Get photo URL immediately
  const primaryPhoto = user.photos?.[0]?.url || user.profileImageUrl || null;
  
  // Preload image on mount for caching
  useEffect(() => {
    if (primaryPhoto && !imageCache.has(primaryPhoto)) {
      preloadImage(primaryPhoto).then((success) => {
        if (!success) setImageError(true);
      });
    }
  }, [primaryPhoto]);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);
  
  // Color overlays based on drag direction
  const likeOpacity = useTransform(x, [0, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [0, -150], [0, 1]);

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
    >
      <div className="relative w-full h-[75vh] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary/30 via-secondary/20 to-primary/10 border border-white/10">
        {/* Photo - optimized for fast loading */}
        {primaryPhoto && !imageError ? (
          <img 
            src={primaryPhoto} 
            alt={displayName} 
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/5">
            <div className="text-center">
              <User className="w-32 h-32 text-white/40 mx-auto" />
              <p className="text-white/60 mt-4 text-lg">No photo available</p>
            </div>
          </div>
        )}

        {/* Overlays */}
        <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 border-4 border-green-500 rounded-lg px-4 py-2 -rotate-12 z-20">
          <span className="text-4xl font-bold text-green-500 uppercase tracking-widest">Like</span>
        </motion.div>
        
        <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-8 border-4 border-red-500 rounded-lg px-4 py-2 rotate-12 z-20">
          <span className="text-4xl font-bold text-red-500 uppercase tracking-widest">Nope</span>
        </motion.div>

        {/* Gradient Overlay - pointer-events-none to allow clicking through */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80 pointer-events-none z-0" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
          <div className="flex items-end justify-between mb-2">
            <h2 className="text-4xl font-display font-bold text-shadow">
              {displayName}{profile?.age ? <>, <span className="text-3xl font-medium opacity-90">{profile.age}</span></> : null}
            </h2>
            {/* Action buttons embedded in card for tap interaction */}
            <div className="flex gap-4 mb-2 relative z-30">
              <button 
                onClick={(e) => { e.stopPropagation(); setExitX(-200); onSwipe("left"); }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-red-400 hover:bg-white hover:scale-110 transition-all"
                data-testid="button-pass"
              >
                <X size={24} strokeWidth={3} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setExitX(200); onSwipe("right"); }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white shadow-lg hover:scale-110 transition-all"
                data-testid="button-like"
              >
                <Heart size={24} fill="currentColor" />
              </button>
            </div>
          </div>

          <div className="space-y-2 opacity-90">
            {profile?.bio && (
              <p className="text-lg leading-relaxed line-clamp-2 text-shadow">
                {profile.bio}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium mt-4">
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
               {profile?.height && (
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
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
