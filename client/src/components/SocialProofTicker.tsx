import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserCheck, Users, Heart, Calendar, MapPin } from "lucide-react";

type TickerEvent = {
  icon: typeof UserCheck;
  iconColor: string;
  message: string;
};

const NAMES_F = [
  "Sofía", "Laura", "Valentina", "Camila", "Isabela", "Lucía",
  "Martina", "Carla", "Nadia", "Emma", "Sara", "Elena", "Natalia",
  "Andrea", "Alba", "Claudia", "Marina", "Paula", "Vera", "Ana",
];
const NAMES_M = [
  "Carlos", "Miguel", "Alejandro", "Javier", "Pablo", "David",
  "Marcos", "Adrián", "Diego", "Sergio", "Rubén", "Iván", "Óscar",
  "Tomás", "Nicolás", "Mateo", "Jorge", "Álvaro", "Raúl", "Manuel",
];
const CITIES = [
  "Madrid", "Barcelona", "Valencia", "Sevilla", "Málaga", "Bilbao",
  "Lisboa", "Oporto", "París", "Londres", "Roma", "Berlín", "Ámsterdam",
  "Buenos Aires", "Ciudad de México", "Miami", "Nueva York", "Tokio",
  "Dubai", "Bali", "Tenerife", "Ibiza", "Formentera", "Canarias",
];
const ACTIVITIES = [
  "senderismo", "cena en el centro", "ruta en bici", "visita al museo",
  "yoga en la playa", "coctelería", "mercado local", "snorkel",
  "sushi night", "kayak", "tour fotográfico", "flamenco", "salsa",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function minsAgo() {
  return Math.floor(Math.random() * 8) + 1;
}

function generateEvent(): TickerEvent {
  const type = Math.floor(Math.random() * 5);
  const isFemale = Math.random() > 0.5;
  const name = isFemale ? pick(NAMES_F) : pick(NAMES_M);
  const city = pick(CITIES);
  const activity = pick(ACTIVITIES);
  const mins = minsAgo();

  const events: TickerEvent[] = [
    {
      icon: UserCheck,
      iconColor: "text-green-400",
      message: `${name} de ${city} acaba de unirse`,
    },
    {
      icon: Users,
      iconColor: "text-sky-400",
      message: `${name} se apuntó a un plan de ${activity}`,
    },
    {
      icon: Heart,
      iconColor: "text-rose-400",
      message: `${name} de ${city} hizo match hace ${mins} min`,
    },
    {
      icon: Calendar,
      iconColor: "text-amber-400",
      message: `Nuevo plan de ${activity} creado en ${city}`,
    },
    {
      icon: MapPin,
      iconColor: "text-violet-400",
      message: `${name} está explorando planes en ${city}`,
    },
  ];

  return events[type % events.length];
}

export function SocialProofTicker() {
  const [current, setCurrent] = useState<TickerEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => {
    setCurrent(generateEvent());
    setVisible(true);
    setTimeout(() => setVisible(false), 4500);
  }, []);

  useEffect(() => {
    // First show after a natural delay (15-25s after page load)
    const firstDelay = 15000 + Math.random() * 10000;
    const firstTimer = setTimeout(() => {
      show();
      // Then every 30-55 seconds
      const interval = setInterval(() => {
        show();
      }, 30000 + Math.random() * 25000);
      return () => clearInterval(interval);
    }, firstDelay);

    return () => clearTimeout(firstTimer);
  }, [show]);

  if (!current) return null;

  const Icon = current.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={current.message}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed bottom-24 left-4 right-4 z-40 flex justify-start pointer-events-none"
        >
          <div className="flex items-center gap-2.5 bg-card/95 backdrop-blur-sm border border-border shadow-xl rounded-2xl px-4 py-3 max-w-xs">
            <div className={`shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${current.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground leading-snug truncate">
                {current.message}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <p className="text-[10px] text-muted-foreground">Ahora mismo</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
