import { Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface FallingPlane {
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
  const [planes, setPlanes] = useState<FallingPlane[]>([]);

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

      const newPlanes: FallingPlane[] = [];
      for (let i = 0; i < 40; i++) {
        newPlanes.push({
          id: i,
          x: Math.random() * 100,
          delay: Math.random() * 1.2,
          duration: 2 + Math.random() * 2,
          size: 16 + Math.random() * 32,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: -45 + Math.random() * 30,
        });
      }
      setPlanes(newPlanes);

      const timer = setTimeout(() => {
        setPlanes([]);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setPlanes([]);
    }
  }, [isActive, duration]);

  return (
    <AnimatePresence>
      {planes.map((plane) => (
        <motion.div
          key={plane.id}
          initial={{ 
            y: -100, 
            x: `${plane.x}vw`,
            opacity: 1,
            rotate: plane.rotation,
            scale: 0
          }}
          animate={{ 
            y: "110vh",
            opacity: [1, 1, 0.8, 0],
            rotate: plane.rotation + 20,
            scale: 1
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: plane.duration,
            delay: plane.delay,
            ease: "easeIn"
          }}
          className="fixed pointer-events-none z-[60]"
          style={{ left: 0, top: 0 }}
        >
          <Plane 
            className={`${plane.color} fill-current drop-shadow-lg`}
            style={{ width: plane.size, height: plane.size }}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

const backgroundPlanes = [
  { delay: 0, duration: 12, left: 5, size: 16, color: "text-amber-500", rotation: -45 },
  { delay: 2, duration: 15, left: 20, size: 12, color: "text-yellow-500", rotation: -30 },
  { delay: 4, duration: 10, left: 35, size: 18, color: "text-amber-400", rotation: -60 },
  { delay: 1, duration: 14, left: 50, size: 14, color: "text-orange-400", rotation: -45 },
  { delay: 3, duration: 16, left: 65, size: 10, color: "text-amber-500", rotation: -35 },
  { delay: 5, duration: 11, left: 80, size: 16, color: "text-yellow-500", rotation: -55 },
  { delay: 2.5, duration: 13, left: 95, size: 12, color: "text-amber-400", rotation: -40 },
];

export function HeartCascade() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
      {backgroundPlanes.map((plane, i) => (
        <Plane
          key={i}
          className={`absolute ${plane.color} fill-current opacity-15 animate-heartfall`}
          style={{
            width: `${plane.size}px`,
            height: `${plane.size}px`,
            left: `${plane.left}%`,
            top: '-20px',
            animationDuration: `${plane.duration}s`,
            animationDelay: `${plane.delay}s`,
            transform: `rotate(${plane.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
