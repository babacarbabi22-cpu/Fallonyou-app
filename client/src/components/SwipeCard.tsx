import { useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { UserWithPhotos } from "@/hooks/use-danceme";
import { X, Heart, MapPin, Briefcase, Ruler, GraduationCap, Star } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface SwipeCardProps {
  user: UserWithPhotos;
  onSwipe: (direction: "left" | "right") => void;
}

export function SwipeCard({ user, onSwipe }: SwipeCardProps) {
  const { t } = useLanguage();
  const [exitX, setExitX] = useState<number>(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);
  
  // Color overlays based on drag direction
  const likeOpacity = useTransform(x, [0, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [0, -150], [0, 1]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100) {
      setExitX(200);
      onSwipe("right");
    } else if (info.offset.x < -100) {
      setExitX(-200);
      onSwipe("left");
    }
  };

  const primaryPhoto = user.photos?.[0]?.url || "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&fit=crop&q=60"; // Default fallback

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={exitX !== 0 ? { x: exitX, opacity: 0 } : { x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing"
    >
      <div className="relative w-full h-[75vh] rounded-3xl overflow-hidden shadow-2xl bg-card border border-white/10">
        {/* Photo */}
        <img 
          src={primaryPhoto} 
          alt={user.displayName || "User"} 
          className="w-full h-full object-cover"
        />

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
              {user.displayName}, <span className="text-3xl font-medium opacity-90">{user.age}</span>
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
            {user.bio && (
              <p className="text-lg leading-relaxed line-clamp-2 text-shadow">
                {user.bio}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium mt-4">
               {user.birthplace && (
                 <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                   <MapPin size={14} />
                   <span>{user.birthplace}</span>
                 </div>
               )}
               {user.occupation && (
                 <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                   <Briefcase size={14} />
                   <span>{user.occupation}</span>
                 </div>
               )}
               {user.height && (
                 <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                   <Ruler size={14} />
                   <span>{user.height} cm</span>
                 </div>
               )}
               {user.education && (
                 <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                   <GraduationCap size={14} />
                   <span>{t(`education.${user.education}` as any) || user.education}</span>
                 </div>
               )}
               {user.zodiacSign && (
                 <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                   <Star size={14} />
                   <span>{t(`zodiac.${user.zodiacSign}` as any) || user.zodiacSign}</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
