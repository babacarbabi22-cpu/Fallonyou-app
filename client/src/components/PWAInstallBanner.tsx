import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

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

// Safari share icon as SVG (matches iOS exactly)
function SafareShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 10H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-3" />
      <polyline points="12 2 12 15" />
      <polyline points="9 5 12 2 15 5" />
    </svg>
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

  // ── iOS: full instructional card ─────────────────────────────────────────────
  if (showIOS) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom-6 duration-400 pb-safe">
        <div
          className="mx-3 mb-3 rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: "linear-gradient(160deg, #141008 0%, #1c1500 60%, #0f0a00 100%)",
            border: "1px solid rgba(245,158,11,0.3)",
            boxShadow: "0 -4px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.1)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <img src="/icons/icon-192x192.png" alt="FallonYou" className="w-11 h-11 rounded-2xl border border-amber-500/30 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-white text-sm leading-tight">Instala FallonYou en tu iPhone</p>
              <p className="text-amber-400/70 text-xs mt-0.5">Gratis · Sin pasar por la App Store</p>
            </div>
            <button
              onClick={dismiss}
              data-testid="button-pwa-dismiss"
              className="w-7 h-7 flex items-center justify-center rounded-full shrink-0"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px" style={{ background: "rgba(245,158,11,0.12)" }} />

          {/* Steps */}
          <div className="px-4 py-3 space-y-2.5">
            {/* Step 1 */}
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <span className="text-black font-black text-xs">1</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold leading-tight">Toca el botón Compartir de Safari</p>
                <p className="text-white/40 text-[11px] mt-0.5">Está en la barra inferior de tu pantalla</p>
              </div>
              {/* Share icon visual */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,122,255,0.15)", border: "1px solid rgba(0,122,255,0.3)" }}>
                <SafareShareIcon className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <span className="text-black font-black text-xs">2</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold leading-tight">Desliza y toca <span className="text-amber-400">"Añadir a pantalla de inicio"</span></p>
                <p className="text-white/40 text-[11px] mt-0.5">Puede que tengas que desplazarte un poco</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                ➕
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <span className="text-black font-black text-xs">3</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold leading-tight">Pulsa <span className="text-amber-400">"Añadir"</span> — ¡listo!</p>
                <p className="text-white/40 text-[11px] mt-0.5">El icono aparecerá en tu pantalla</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: "rgba(52,199,89,0.12)", border: "1px solid rgba(52,199,89,0.25)" }}>
                ✅
              </div>
            </div>
          </div>

          {/* Bottom tip + arrow pointing to Safari toolbar */}
          <div className="px-4 pb-4 pt-1 flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: "rgba(245,158,11,0.1)" }} />
            <p className="text-white/25 text-[10px] text-center px-2">Solo funciona desde Safari</p>
            <div className="h-px flex-1" style={{ background: "rgba(245,158,11,0.1)" }} />
          </div>

          {/* Visual arrow pointing DOWN to Safari toolbar */}
          <div className="flex justify-center pb-3">
            <div className="flex flex-col items-center gap-1 animate-bounce">
              <p className="text-amber-400/60 text-[11px] font-medium">Botón compartir aquí abajo</p>
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                <path d="M10 14L0.339746 0.5H19.6603L10 14Z" fill="rgba(245,158,11,0.5)" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Android: simple banner with install button ───────────────────────────────
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
        <img src="/icons/icon-192x192.png" alt="FallonYou" className="w-12 h-12 rounded-xl shrink-0 border border-amber-500/30" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm leading-tight">Instala FallonYou</p>
          <p className="text-amber-200/70 text-xs mt-0.5">Accede más rápido desde tu móvil</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={installAndroid}
            data-testid="button-pwa-install"
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-2 rounded-xl transition-colors active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Instalar
          </button>
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
