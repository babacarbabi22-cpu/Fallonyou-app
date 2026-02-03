import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Star, MessageCircle, Users, Plane, ArrowRight, X } from "lucide-react";

interface WelcomeSlide {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const slides: WelcomeSlide[] = [
  {
    icon: <Plane className="w-16 h-16" />,
    title: "¡Bienvenido a FallonYou!",
    description: "Tu compañero de viaje perfecto. Conecta con viajeros, crea actividades y conoce gente nueva estés donde estés.",
    color: "text-amber-500",
  },
  {
    icon: <Calendar className="w-16 h-16" />,
    title: "Crea y únete a actividades",
    description: "Organiza tours, cenas, fiestas o deportes. Encuentra personas con tus mismos intereses para explorar juntos.",
    color: "text-amber-500",
  },
  {
    icon: <Star className="w-16 h-16" />,
    title: "Descubre personas",
    description: "Desliza para encontrar compañeros de viaje, amigos locales o conexiones especiales. Tú decides qué tipo de conexión buscas.",
    color: "text-amber-500",
  },
  {
    icon: <MessageCircle className="w-16 h-16" />,
    title: "Conecta y chatea",
    description: "Cuando haya interés mutuo, podrás chatear y planificar vuestra próxima aventura juntos.",
    color: "text-amber-500",
  },
  {
    icon: <Users className="w-16 h-16" />,
    title: "¡Comienza tu aventura!",
    description: "Explora actividades, conoce viajeros y vive experiencias únicas. Tu próxima conexión te espera.",
    color: "text-amber-500",
  },
];

interface WelcomeTourProps {
  onComplete: () => void;
}

export function WelcomeTour({ onComplete }: WelcomeTourProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-gradient-to-br from-amber-400/20 via-yellow-300/10 to-amber-200/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] bg-gradient-to-tr from-yellow-400/20 via-amber-300/10 to-yellow-200/20 rounded-full blur-[100px]" />
      </div>

      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
        data-testid="button-skip-tour"
      >
        <X className="w-6 h-6" />
      </button>

      <Card className="w-full max-w-md border-0 shadow-xl bg-card/95 backdrop-blur">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className={`${slide.color} flex justify-center animate-pulse`}>
              {slide.icon}
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">{slide.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {slide.description}
              </p>
            </div>

            <div className="flex justify-center gap-2 py-4">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? "w-6 bg-amber-500"
                      : index < currentSlide
                      ? "bg-amber-500/50"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {currentSlide < slides.length - 1 ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="flex-1"
                    data-testid="button-skip"
                  >
                    Saltar
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-amber-500 hover:bg-amber-600"
                    data-testid="button-next"
                  >
                    Siguiente
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleNext}
                  className="w-full bg-amber-500 hover:bg-amber-600"
                  data-testid="button-start"
                >
                  ¡Comenzar!
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
