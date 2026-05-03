import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";

const DISMISS_KEY = "fallonyou_pwa_dismissed_at";
const DISMISS_DAYS = 7;

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const daysAgo = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysAgo < DISMISS_DAYS) return;
    }

    if (isIOS()) {
      const timer = setTimeout(() => setShowIOS(true), 3000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowAndroid(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShowAndroid(false);
    setShowIOS(false);
  };

  const installAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowAndroid(false);
    }
  };

  if (!showAndroid && !showIOS) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div
        className="rounded-2xl p-4 shadow-2xl flex items-center gap-3 border"
        style={{
          background: "linear-gradient(135deg, #0f0a00 0%, #1a1200 50%, #0f0a00 100%)",
          borderColor: "rgba(245,158,11,0.35)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(245,158,11,0.15)",
        }}
      >
        <img
          src="/icons/icon-192x192.png"
          alt="FallonYou"
          className="w-12 h-12 rounded-xl shrink-0 border border-amber-500/30"
        />

        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm leading-tight">
            {showIOS ? "Añade FallonYou a tu pantalla" : "Instala FallonYou"}
          </p>
          {showIOS ? (
            <p className="text-amber-200/70 text-xs mt-0.5 leading-snug">
              Pulsa <Share className="inline w-3 h-3 mb-0.5" /> y luego{" "}
              <strong className="text-amber-300">"Añadir a pantalla de inicio"</strong>
            </p>
          ) : (
            <p className="text-amber-200/70 text-xs mt-0.5">
              Accede más rápido desde tu móvil
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!showIOS && (
            <button
              onClick={installAndroid}
              data-testid="button-pwa-install"
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar
            </button>
          )}
          <button
            onClick={dismiss}
            data-testid="button-pwa-dismiss"
            className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
