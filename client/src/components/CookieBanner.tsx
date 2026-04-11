import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COOKIE_KEY = "fallonyou_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem(COOKIE_KEY, "rejected");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-6"
        >
          <div className="max-w-lg mx-auto bg-[#111] border border-[#D4AF37]/40 rounded-2xl shadow-2xl shadow-black/60 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#D4AF37]/15 flex items-center justify-center shrink-0 mt-0.5">
                <Cookie className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">Usamos cookies</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Utilizamos cookies esenciales para que la app funcione y cookies de análisis para mejorar tu experiencia.
                  Puedes aceptarlas o rechazarlas. Consulta nuestra{" "}
                  <a href="/legal" className="text-[#D4AF37] underline underline-offset-2">
                    política de privacidad
                  </a>.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={reject}
                variant="outline"
                size="sm"
                className="flex-1 border-white/20 text-white/70 hover:text-white hover:border-white/40 bg-transparent text-xs h-9"
                data-testid="button-cookie-reject"
              >
                Solo esenciales
              </Button>
              <Button
                onClick={accept}
                size="sm"
                className="flex-1 bg-[#D4AF37] hover:bg-[#c9a227] text-black font-bold text-xs h-9"
                data-testid="button-cookie-accept"
              >
                Aceptar todo
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
