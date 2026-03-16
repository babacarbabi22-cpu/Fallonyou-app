import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Star, MessageCircle, Users, Plane, ArrowRight, X, Bell, Check } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface WelcomeTourProps {
  onComplete: () => void;
}

export function WelcomeTour({ onComplete }: WelcomeTourProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [notifDone, setNotifDone] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();

  const totalSlides = 6;

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleEnableNotifications = async () => {
    setNotifLoading(true);
    await subscribe();
    setNotifLoading(false);
    setNotifDone(true);
    setTimeout(() => handleNext(), 1000);
  };

  const slides = [
    {
      icon: <Plane className="w-16 h-16" />,
      title: "¡Bienvenido a FallonYou!",
      description: "Tu compañero de viaje perfecto. Conecta con viajeros, crea actividades y conoce gente nueva estés donde estés.",
    },
    {
      icon: <Calendar className="w-16 h-16" />,
      title: "Crea y únete a actividades",
      description: "Organiza tours, cenas, fiestas o deportes. Encuentra personas con tus mismos intereses para explorar juntos.",
    },
    {
      icon: <Star className="w-16 h-16" />,
      title: "Descubre personas",
      description: "Desliza para encontrar compañeros de viaje, amigos locales o conexiones especiales. Tú decides qué tipo de conexión buscas.",
    },
    {
      icon: <MessageCircle className="w-16 h-16" />,
      title: "Conecta y chatea",
      description: "Cuando haya interés mutuo, podrás chatear y planificar vuestra próxima aventura juntos.",
    },
    {
      icon: <Bell className="w-16 h-16" />,
      title: "Activa las notificaciones",
      description: null,
      isNotifSlide: true,
    },
    {
      icon: <Users className="w-16 h-16" />,
      title: "¡Comienza tu aventura!",
      description: "Explora actividades, conoce viajeros y vive experiencias únicas. Tu próxima conexión te espera.",
    },
  ];

  const slide = slides[currentSlide];
  const isLast = currentSlide === totalSlides - 1;
  const isNotifSlide = (slide as any).isNotifSlide;

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
            <div className="text-amber-500 flex justify-center animate-pulse">
              {slide.icon}
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold">{slide.title}</h2>

              {isNotifSlide ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground leading-relaxed">
                    Recibe avisos cuando alguien te escriba, cuando empiece una actividad en tu ciudad o cuando tengas un nuevo match.
                  </p>

                  {isSupported && !isSubscribed && !notifDone && (
                    <div className="space-y-2 pt-2">
                      <Button
                        onClick={handleEnableNotifications}
                        disabled={notifLoading}
                        className="w-full bg-amber-500 hover:bg-amber-600"
                        data-testid="button-enable-notifications"
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        {notifLoading ? "Activando..." : "Activar notificaciones"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleNext}
                        className="w-full text-muted-foreground"
                        data-testid="button-skip-notifications"
                      >
                        Ahora no
                      </Button>
                    </div>
                  )}

                  {(isSubscribed || notifDone) && (
                    <div className="flex items-center justify-center gap-2 text-green-600 font-medium pt-2">
                      <Check className="w-5 h-5" />
                      ¡Notificaciones activadas!
                    </div>
                  )}

                  {!isSupported && (
                    <p className="text-sm text-muted-foreground">
                      Tu navegador no soporta notificaciones. Puedes activarlas más tarde desde tu perfil.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground leading-relaxed">
                  {(slide as any).description}
                </p>
              )}
            </div>

            <div className="flex justify-center gap-2 py-2">
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

            {!isNotifSlide && (
              <div className="flex gap-3">
                {!isLast ? (
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
