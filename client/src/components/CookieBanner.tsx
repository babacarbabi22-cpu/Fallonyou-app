import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n, type Language } from "@/lib/i18n";
import { getStoredValue, setStoredValue } from "@/lib/safe-storage";

const COOKIE_KEY = "fallonyou_cookie_consent";

const COOKIE_COPY: Record<Language, {
  title: string;
  description: string;
  privacy: string;
  essential: string;
}> = {
  en: {
    title: "We use cookies",
    description: "We use essential cookies and local storage for your session and preferences. This version does not activate optional analytics-cookie tools. See our",
    privacy: "privacy policy",
    essential: "Understood",
  },
  es: {
    title: "Usamos cookies",
    description: "Usamos cookies esenciales y almacenamiento local para tu sesión y preferencias. Esta versión no activa herramientas opcionales de cookies analíticas. Consulta nuestra",
    privacy: "política de privacidad",
    essential: "Entendido",
  },
  fr: {
    title: "Nous utilisons des cookies",
    description: "Nous utilisons cookies essentiels et stockage local pour votre session et vos préférences. Cette version n'active pas d'outils facultatifs de cookies analytiques. Consultez notre",
    privacy: "politique de confidentialité",
    essential: "Compris",
  },
  sv: {
    title: "Vi använder cookies",
    description: "Vi använder nödvändiga kakor och lokal lagring för din session och dina inställningar. Denna version aktiverar inga valfria analysverktyg för kakor. Läs vår",
    privacy: "integritetspolicy",
    essential: "Jag förstår",
  },
};

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const { language } = useI18n();
  const copy = COOKIE_COPY[language];

  useEffect(() => {
    const stored = getStoredValue(COOKIE_KEY);
    if (!stored) setVisible(true);
  }, []);

  const reject = () => {
    setStoredValue(COOKIE_KEY, "essential_only");
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
                 <h3 className="font-bold text-white text-sm mb-1">{copy.title}</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                   {copy.description}{" "}
                   <a href="/privacy" className="text-[#D4AF37] underline underline-offset-2">
                     {copy.privacy}
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
                 {copy.essential}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
