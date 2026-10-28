import { useEffect, useState, type CSSProperties } from "react";
import { Plane, Star } from "lucide-react";

interface TravelLoadingProps {
  className?: string;
  label?: string;
}

const fallingIcons = [
  { delay: "0s", duration: "8.5s", left: "7%", size: 15, type: "plane", color: "#fbbf24", rotation: "-22deg", restingTop: "12%" },
  { delay: "-2.2s", duration: "10s", left: "19%", size: 11, type: "star", color: "#fde047", rotation: "12deg", restingTop: "72%" },
  { delay: "-4.8s", duration: "9.2s", left: "32%", size: 17, type: "plane", color: "#f59e0b", rotation: "18deg", restingTop: "28%" },
  { delay: "-1.1s", duration: "11s", left: "45%", size: 12, type: "star", color: "#fbbf24", rotation: "-10deg", restingTop: "86%" },
  { delay: "-6s", duration: "8.8s", left: "57%", size: 14, type: "plane", color: "#fcd34d", rotation: "-18deg", restingTop: "45%" },
  { delay: "-3.4s", duration: "10.5s", left: "69%", size: 10, type: "star", color: "#fde047", rotation: "8deg", restingTop: "18%" },
  { delay: "-7.1s", duration: "9.5s", left: "81%", size: 16, type: "plane", color: "#f59e0b", rotation: "24deg", restingTop: "63%" },
  { delay: "-5s", duration: "11.5s", left: "93%", size: 12, type: "star", color: "#fbbf24", rotation: "-14deg", restingTop: "35%" },
] as const;

export function TravelLoading({ className = "", label }: TravelLoadingProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener?.("change", updatePreference);
    return () => mediaQuery.removeEventListener?.("change", updatePreference);
  }, []);

  return (
    <div
      className={`travel-loading ${className}`.trim()}
      data-testid="travel-loading"
      data-reduced-motion={prefersReducedMotion ? "true" : "false"}
      role={label ? "status" : undefined}
      aria-live={label ? "polite" : undefined}
      aria-hidden={label ? undefined : true}
    >
      {label && <span className="travel-loading__sr-only">{label}</span>}

      <style>{`
        .travel-loading {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          container-type: size;
        }
        .travel-loading__sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .travel-loading__icon {
          position: absolute;
          top: 0;
          display: block;
          animation: travel-loading-fall var(--fall-duration) linear var(--fall-delay) infinite;
          will-change: transform, opacity;
        }
        @keyframes travel-loading-fall {
          0% { transform: translateY(-22px) rotate(var(--fall-rotation)); opacity: 0; }
          9% { opacity: 0.8; }
          89% { opacity: 0.65; }
          100% { transform: translateY(calc(100cqh + 22px)) rotate(calc(var(--fall-rotation) + 110deg)); opacity: 0; }
        }
        .travel-loading[data-reduced-motion="true"] .travel-loading__icon {
          top: var(--resting-top);
          animation: none;
          transform: rotate(var(--fall-rotation));
          opacity: 0.72;
          will-change: auto;
        }
        @media (prefers-reduced-motion: reduce) {
          .travel-loading__icon {
            top: var(--resting-top);
            animation: none;
            transform: rotate(var(--fall-rotation));
            opacity: 0.72;
            will-change: auto;
          }
        }
      `}</style>

      {fallingIcons.map((icon, index) => {
        const Icon = icon.type === "plane" ? Plane : Star;
        return (
          <Icon
            key={index}
            className="travel-loading__icon"
            aria-hidden="true"
            focusable="false"
            style={{
              left: icon.left,
              width: icon.size,
              height: icon.size,
              color: icon.color,
              fill: icon.type === "star" ? icon.color : "none",
              strokeWidth: 1.8,
              filter: "drop-shadow(0 1px 4px rgba(217, 119, 6, 0.3))",
              "--fall-delay": icon.delay,
              "--fall-duration": icon.duration,
              "--fall-rotation": icon.rotation,
              "--resting-top": icon.restingTop,
            } as CSSProperties}
          />
        );
      })}
    </div>
  );
}