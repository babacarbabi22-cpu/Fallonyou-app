import { Heart } from "lucide-react";

const fallingHearts = [
  { delay: 0, duration: 8, left: 5, size: 16, color: "text-blue-500" },
  { delay: 1, duration: 10, left: 15, size: 12, color: "text-pink-500" },
  { delay: 2, duration: 7, left: 25, size: 18, color: "text-blue-400" },
  { delay: 0.5, duration: 9, left: 35, size: 14, color: "text-pink-400" },
  { delay: 3, duration: 11, left: 45, size: 10, color: "text-blue-500" },
  { delay: 1.5, duration: 8, left: 55, size: 16, color: "text-pink-500" },
  { delay: 2.5, duration: 10, left: 65, size: 12, color: "text-blue-400" },
  { delay: 0.8, duration: 9, left: 75, size: 18, color: "text-pink-400" },
  { delay: 4, duration: 7, left: 85, size: 14, color: "text-blue-500" },
  { delay: 3.5, duration: 12, left: 95, size: 10, color: "text-pink-500" },
  { delay: 1.2, duration: 8, left: 10, size: 15, color: "text-pink-400" },
  { delay: 2.8, duration: 9, left: 30, size: 11, color: "text-blue-500" },
  { delay: 0.3, duration: 11, left: 50, size: 13, color: "text-pink-500" },
  { delay: 4.2, duration: 8, left: 70, size: 17, color: "text-blue-400" },
  { delay: 1.8, duration: 10, left: 90, size: 9, color: "text-pink-400" },
];

export function HeartCascade() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
      {fallingHearts.map((heart, i) => (
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
