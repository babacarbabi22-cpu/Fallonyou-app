import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

interface FallingHeart {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotation: number;
}

interface MatchHeartCascadeProps {
  isActive: boolean;
  duration?: number;
}

export function MatchHeartCascade({ isActive, duration = 3000 }: MatchHeartCascadeProps) {
  const [hearts, setHearts] = useState<FallingHeart[]>([]);

  useEffect(() => {
    if (isActive) {
      const colors = [
        "text-primary",
        "text-pink-500",
        "text-rose-500",
        "text-purple-500",
        "text-fuchsia-400",
        "text-red-400",
      ];

      const newHearts: FallingHeart[] = [];
      for (let i = 0; i < 60; i++) {
        newHearts.push({
          id: i,
          x: Math.random() * 100,
          delay: Math.random() * 1.2,
          duration: 2 + Math.random() * 2,
          size: 16 + Math.random() * 32,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
        });
      }
      setHearts(newHearts);

      const timer = setTimeout(() => {
        setHearts([]);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setHearts([]);
    }
  }, [isActive, duration]);

  return (
    <AnimatePresence>
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ 
            y: -100, 
            x: `${heart.x}vw`,
            opacity: 1,
            rotate: heart.rotation,
            scale: 0
          }}
          animate={{ 
            y: "110vh",
            opacity: [1, 1, 0.8, 0],
            rotate: heart.rotation + 180,
            scale: 1
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: heart.duration,
            delay: heart.delay,
            ease: "easeIn"
          }}
          className="fixed pointer-events-none z-[60]"
          style={{ left: 0, top: 0 }}
        >
          <Heart 
            className={`${heart.color} fill-current drop-shadow-lg`}
            style={{ width: heart.size, height: heart.size }}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

const backgroundHearts = [
  { delay: 0, duration: 8, left: 5, size: 16, color: "text-primary" },
  { delay: 1, duration: 10, left: 15, size: 12, color: "text-pink-500" },
  { delay: 2, duration: 7, left: 25, size: 18, color: "text-purple-400" },
  { delay: 0.5, duration: 9, left: 35, size: 14, color: "text-pink-400" },
  { delay: 3, duration: 11, left: 45, size: 10, color: "text-primary" },
  { delay: 1.5, duration: 8, left: 55, size: 16, color: "text-pink-500" },
  { delay: 2.5, duration: 10, left: 65, size: 12, color: "text-purple-400" },
  { delay: 0.8, duration: 9, left: 75, size: 18, color: "text-pink-400" },
  { delay: 4, duration: 7, left: 85, size: 14, color: "text-primary" },
  { delay: 3.5, duration: 12, left: 95, size: 10, color: "text-pink-500" },
  { delay: 1.2, duration: 8, left: 10, size: 15, color: "text-pink-400" },
  { delay: 2.8, duration: 9, left: 30, size: 11, color: "text-primary" },
  { delay: 0.3, duration: 11, left: 50, size: 13, color: "text-pink-500" },
  { delay: 4.2, duration: 8, left: 70, size: 17, color: "text-purple-400" },
  { delay: 1.8, duration: 10, left: 90, size: 9, color: "text-pink-400" },
];

export function HeartCascade() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
      {backgroundHearts.map((heart, i) => (
        <Heart
          key={i}
          className={`absolute ${heart.color} fill-current opacity-20 animate-heartfall`}
          style={{
            width: `${heart.size}px`,
            height: `${heart.size}px`,
            left: `${heart.left}%`,
            top: '-20px',
            animationDuration: `${heart.duration}s`,
            animationDelay: `${heart.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
