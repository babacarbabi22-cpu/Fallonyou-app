import { Plane, Heart, Star, Cloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface FallingIcon {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotation: number;
  type: 'plane' | 'heart' | 'star' | 'cloud';
}

interface MatchHeartCascadeProps {
  isActive: boolean;
  duration?: number;
}

const IconComponent = ({ type, className, style }: { type: string; className: string; style: React.CSSProperties }) => {
  switch (type) {
    case 'plane':
      return <Plane className={className} style={style} />;
    case 'heart':
      return <Heart className={className} style={style} />;
    case 'star':
      return <Star className={className} style={style} />;
    case 'cloud':
      return <Cloud className={className} style={style} />;
    default:
      return <Heart className={className} style={style} />;
  }
};

export function MatchHeartCascade({ isActive, duration = 3000 }: MatchHeartCascadeProps) {
  const [icons, setIcons] = useState<FallingIcon[]>([]);

  useEffect(() => {
    if (isActive) {
      const colors = [
        "text-amber-500",
        "text-yellow-500",
        "text-orange-400",
        "text-amber-400",
        "text-yellow-400",
        "text-amber-600",
      ];
      const types: Array<'plane' | 'heart' | 'star' | 'cloud'> = ['plane', 'heart', 'star', 'cloud'];

      const newIcons: FallingIcon[] = [];
      for (let i = 0; i < 50; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        newIcons.push({
          id: i,
          x: Math.random() * 100,
          delay: Math.random() * 1.2,
          duration: 2 + Math.random() * 2,
          size: 16 + Math.random() * 28,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: type === 'plane' ? -45 + Math.random() * 30 : Math.random() * 360,
          type,
        });
      }
      setIcons(newIcons);

      const timer = setTimeout(() => {
        setIcons([]);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIcons([]);
    }
  }, [isActive, duration]);

  return (
    <AnimatePresence>
      {icons.map((icon) => (
        <motion.div
          key={icon.id}
          initial={{ 
            y: -100, 
            x: `${icon.x}vw`,
            opacity: 1,
            rotate: icon.rotation,
            scale: 0
          }}
          animate={{ 
            y: "110vh",
            opacity: [1, 1, 0.8, 0],
            rotate: icon.rotation + (icon.type === 'plane' ? 20 : 180),
            scale: 1
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: icon.duration,
            delay: icon.delay,
            ease: "easeIn"
          }}
          className="fixed pointer-events-none z-[60]"
          style={{ left: 0, top: 0 }}
        >
          <IconComponent 
            type={icon.type}
            className={`${icon.color} fill-current drop-shadow-lg`}
            style={{ width: icon.size, height: icon.size }}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

const backgroundIcons = [
  { delay: 0, duration: 14, left: 5, size: 16, color: "text-amber-500", rotation: -45, type: 'plane' as const },
  { delay: 2, duration: 12, left: 15, size: 14, color: "text-yellow-500", rotation: 0, type: 'heart' as const },
  { delay: 4, duration: 16, left: 25, size: 12, color: "text-amber-400", rotation: 0, type: 'star' as const },
  { delay: 1, duration: 18, left: 40, size: 18, color: "text-amber-300", rotation: 0, type: 'cloud' as const },
  { delay: 3, duration: 13, left: 55, size: 14, color: "text-amber-500", rotation: -30, type: 'plane' as const },
  { delay: 5, duration: 15, left: 70, size: 12, color: "text-yellow-400", rotation: 0, type: 'heart' as const },
  { delay: 2.5, duration: 17, left: 85, size: 10, color: "text-amber-400", rotation: 0, type: 'star' as const },
  { delay: 6, duration: 14, left: 95, size: 16, color: "text-amber-300", rotation: 0, type: 'cloud' as const },
];

export function HeartCascade() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
      {backgroundIcons.map((icon, i) => (
        <IconComponent
          key={i}
          type={icon.type}
          className={`absolute ${icon.color} fill-current opacity-15 animate-heartfall`}
          style={{
            width: `${icon.size}px`,
            height: `${icon.size}px`,
            left: `${icon.left}%`,
            top: '-20px',
            animationDuration: `${icon.duration}s`,
            animationDelay: `${icon.delay}s`,
            transform: `rotate(${icon.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
