import { useState, useEffect } from "react";
import { X, Download, ExternalLink } from "lucide-react";
import { getStoredValue, setStoredValue } from "@/lib/safe-storage";
import { useI18n } from "@/lib/i18n";

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

function isInAppBrowser() {
  const ua = navigator.userAgent;
  return (
    /Instagram/i.test(ua) ||
    /FBAN|FBAV/i.test(ua) ||
    /TikTok/i.test(ua) ||
    /Twitter/i.test(ua) ||
    /Pinterest/i.test(ua) ||
    /LinkedIn/i.test(ua) ||
    /Snapchat/i.test(ua) ||
    /WhatsApp/i.test(ua)
  );
}

function getInAppBrowserName(fallback: string) {
  const ua = navigator.userAgent;
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  if (/TikTok/i.test(ua)) return "TikTok";
  if (/Twitter/i.test(ua)) return "Twitter/X";
  if (/WhatsApp/i.test(ua)) return "WhatsApp";
  return fallback;
}

const installCopy = {
  en: {
    dismiss: "Dismiss install instructions",
    brandAlt: "FallonYou",
    inAppTitle: "Install FallonYou for free",
    openIn: (browser: string) => `Open in ${browser} to install`,
    inAppStepOne: (browser: string) => `You’re using the ${browser} browser`,
    unsupportedBrowser: "This browser doesn’t allow app installs",
    inAppStepTwo: (browser: string) => <>Tap <span className="text-amber-400">⋮</span> or <span className="text-amber-400">Share</span> and choose <span className="text-amber-400">“Open in {browser}”</span></>,
    topBar: "Find it in the browser’s top bar",
    inAppStepThree: (browser: string) => <>In {browser}, tap <span className="text-amber-400">“Add to Home Screen”</span></>,
    iconInstant: "The icon will appear on your phone right away",
    onlyWorksIn: (browser: string) => `Only available in ${browser}`,
    iosTitle: "Install FallonYou on your iPhone",
    iosSubtitle: "Free · No App Store required",
    safariShare: "Tap Safari’s Share button",
    bottomBar: "It’s in the bottom toolbar",
    swipeAdd: <>Scroll and tap <span className="text-amber-400">“Add to Home Screen”</span></>,
    mayScroll: "You may need to scroll a little",
    tapAdd: <>Tap <span className="text-amber-400">“Add”</span> — you’re all set</>,
    iconOnScreen: "The icon will appear on your Home Screen",
    shareBelow: "Share button is down here",
    androidTitle: "Install FallonYou",
    androidDescription: "Open it faster from your phone",
    install: "Install",
    inAppFallback: "this app",
  },
  es: {
    dismiss: "Cerrar instrucciones de instalación",
    brandAlt: "FallonYou",
    inAppTitle: "Instala FallonYou gratis",
    openIn: (browser: string) => `Ábrela en ${browser} para instalar`,
    inAppStepOne: (browser: string) => `Estás en el navegador de ${browser}`,
    unsupportedBrowser: "Este navegador no permite instalar apps",
    inAppStepTwo: (browser: string) => <>Toca <span className="text-amber-400">⋮</span> o <span className="text-amber-400">Compartir</span> y elige <span className="text-amber-400">«Abrir en ${browser}»</span></>,
    topBar: "Está en la barra superior del navegador",
    inAppStepThree: (browser: string) => <>En ${browser}, pulsa <span className="text-amber-400">«Añadir a pantalla de inicio»</span></>,
    iconInstant: "El icono aparecerá en tu móvil al instante",
    onlyWorksIn: (browser: string) => `Solo funciona desde ${browser}`,
    iosTitle: "Instala FallonYou en tu iPhone",
    iosSubtitle: "Gratis · Sin pasar por la App Store",
    safariShare: "Toca el botón Compartir de Safari",
    bottomBar: "Está en la barra inferior de tu pantalla",
    swipeAdd: <>Desliza y toca <span className="text-amber-400">«Añadir a pantalla de inicio»</span></>,
    mayScroll: "Puede que tengas que desplazarte un poco",
    tapAdd: <>Pulsa <span className="text-amber-400">«Añadir»</span> — ¡listo!</>,
    iconOnScreen: "El icono aparecerá en tu pantalla",
    shareBelow: "Botón Compartir aquí abajo",
    androidTitle: "Instala FallonYou",
    androidDescription: "Accede más rápido desde tu móvil",
    install: "Instalar",
    inAppFallback: "esta app",
  },
  fr: {
    dismiss: "Fermer les instructions d’installation",
    brandAlt: "FallonYou",
    inAppTitle: "Installer FallonYou gratuitement",
    openIn: (browser: string) => `Ouvrez dans ${browser} pour installer`,
    inAppStepOne: (browser: string) => `Vous utilisez le navigateur ${browser}`,
    unsupportedBrowser: "Ce navigateur ne permet pas d’installer des applications",
    inAppStepTwo: (browser: string) => <>Touchez <span className="text-amber-400">⋮</span> ou <span className="text-amber-400">Partager</span>, puis <span className="text-amber-400">« Ouvrir dans ${browser} »</span></>,
    topBar: "L’option se trouve dans la barre supérieure",
    inAppStepThree: (browser: string) => <>Dans ${browser}, touchez <span className="text-amber-400">« Ajouter à l’écran d’accueil »</span></>,
    iconInstant: "L’icône apparaîtra tout de suite sur votre téléphone",
    onlyWorksIn: (browser: string) => `Disponible uniquement dans ${browser}`,
    iosTitle: "Installer FallonYou sur votre iPhone",
    iosSubtitle: "Gratuit · Sans passer par l’App Store",
    safariShare: "Touchez le bouton Partager de Safari",
    bottomBar: "Il se trouve dans la barre inférieure",
    swipeAdd: <>Faites défiler et touchez <span className="text-amber-400">« Sur l’écran d’accueil »</span></>,
    mayScroll: "Vous devrez peut-être faire défiler un peu",
    tapAdd: <>Touchez <span className="text-amber-400">« Ajouter »</span> — c’est prêt !</>,
    iconOnScreen: "L’icône apparaîtra sur votre écran d’accueil",
    shareBelow: "Le bouton Partager se trouve en bas",
    androidTitle: "Installer FallonYou",
    androidDescription: "Accédez-y plus rapidement depuis votre téléphone",
    install: "Installer",
    inAppFallback: "cette application",
  },
  sv: {
    dismiss: "Stäng installationsanvisningarna",
    brandAlt: "FallonYou",
    inAppTitle: "Installera FallonYou gratis",
    openIn: (browser: string) => `Öppna i ${browser} för att installera`,
    inAppStepOne: (browser: string) => `Du använder webbläsaren ${browser}`,
    unsupportedBrowser: "Den här webbläsaren tillåter inte appinstallationer",
    inAppStepTwo: (browser: string) => <>Tryck på <span className="text-amber-400">⋮</span> eller <span className="text-amber-400">Dela</span> och välj <span className="text-amber-400">”Öppna i ${browser}”</span></>,
    topBar: "Alternativet finns i webbläsarens överkant",
    inAppStepThree: (browser: string) => <>I ${browser}, tryck på <span className="text-amber-400">”Lägg till på hemskärmen”</span></>,
    iconInstant: "Ikonen visas direkt på din mobil",
    onlyWorksIn: (browser: string) => `Fungerar bara i ${browser}`,
    iosTitle: "Installera FallonYou på din iPhone",
    iosSubtitle: "Gratis · Utan App Store",
    safariShare: "Tryck på Dela-knappen i Safari",
    bottomBar: "Den finns i verktygsfältet längst ner",
    swipeAdd: <>Bläddra och tryck på <span className="text-amber-400">”Lägg till på hemskärmen”</span></>,
    mayScroll: "Du kan behöva bläddra lite",
    tapAdd: <>Tryck på <span className="text-amber-400">”Lägg till”</span> — klart!</>,
    iconOnScreen: "Ikonen visas på hemskärmen",
    shareBelow: "Dela-knappen finns här nere",
    androidTitle: "Installera FallonYou",
    androidDescription: "Öppna snabbare från mobilen",
    install: "Installera",
    inAppFallback: "den här appen",
  },
};

function SafariShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 10H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-3" />
      <polyline points="12 2 12 15" />
      <polyline points="9 5 12 2 15 5" />
    </svg>
  );
}

export function PWAInstallBanner() {
  const { language } = useI18n();
  const copy = installCopy[language] ?? installCopy.en;
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [showInAppBrowser, setShowInAppBrowser] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    const dismissed = getStoredValue(DISMISS_KEY);
    if (dismissed) {
      const daysAgo = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysAgo < DISMISS_DAYS) return;
    }

    // In-app browser (Instagram, FB, etc.) — show "open in Chrome/Safari" prompt
    if (isInAppBrowser()) {
      const timer = setTimeout(() => setShowInAppBrowser(true), 2000);
      return () => clearTimeout(timer);
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
    setStoredValue(DISMISS_KEY, Date.now().toString());
    setShowAndroid(false);
    setShowIOS(false);
    setShowInAppBrowser(false);
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

  if (!showAndroid && !showIOS && !showInAppBrowser) return null;

  // ── In-app browser: open in Chrome/Safari ────────────────────────────────────
  if (showInAppBrowser) {
    const browserName = getInAppBrowserName(copy.inAppFallback);
    const ios = isIOS();
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
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <img src="/icons/icon-192x192.png" alt={copy.brandAlt} className="w-11 h-11 rounded-2xl border border-amber-500/30 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-white text-sm leading-tight">{copy.inAppTitle}</p>
              <p className="text-amber-400/70 text-xs mt-0.5">{copy.openIn(ios ? "Safari" : "Chrome")}</p>
            </div>
            <button
              onClick={dismiss}
              data-testid="button-pwa-dismiss"
              aria-label={copy.dismiss}
              className="w-7 h-7 flex items-center justify-center rounded-full shrink-0"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          <div className="mx-4 h-px" style={{ background: "rgba(245,158,11,0.12)" }} />

          <div className="px-4 py-3 space-y-2.5">
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <span className="text-black font-black text-xs">1</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold leading-tight">
                  {copy.inAppStepOne(browserName)}
                </p>
                <p className="text-white/40 text-[11px] mt-0.5">{copy.unsupportedBrowser}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                🚫
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <span className="text-black font-black text-xs">2</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold leading-tight">
                  {copy.inAppStepTwo(ios ? "Safari" : "Chrome")}
                </p>
                <p className="text-white/40 text-[11px] mt-0.5">{copy.topBar}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: ios ? "rgba(0,122,255,0.15)" : "rgba(66,133,244,0.15)", border: ios ? "1px solid rgba(0,122,255,0.3)" : "1px solid rgba(66,133,244,0.3)" }}>
                {ios
                  ? <SafariShareIcon className="w-5 h-5 text-blue-400" />
                  : <ExternalLink className="w-5 h-5 text-blue-400" />
                }
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <span className="text-black font-black text-xs">3</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold leading-tight">
                  {copy.inAppStepThree(ios ? "Safari" : "Chrome")}
                </p>
                <p className="text-white/40 text-[11px] mt-0.5">{copy.iconInstant}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                style={{ background: "rgba(52,199,89,0.12)", border: "1px solid rgba(52,199,89,0.25)" }}>
                ✅
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 pt-1 flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: "rgba(245,158,11,0.1)" }} />
            <p className="text-white/25 text-[10px] text-center px-2">
              {copy.onlyWorksIn(ios ? "Safari" : "Chrome")}
            </p>
            <div className="h-px flex-1" style={{ background: "rgba(245,158,11,0.1)" }} />
          </div>
        </div>
      </div>
    );
  }

  // ── iOS Safari: instructional card ───────────────────────────────────────────
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
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <img src="/icons/icon-192x192.png" alt={copy.brandAlt} className="w-11 h-11 rounded-2xl border border-amber-500/30 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-white text-sm leading-tight">{copy.iosTitle}</p>
              <p className="text-amber-400/70 text-xs mt-0.5">{copy.iosSubtitle}</p>
            </div>
            <button
              onClick={dismiss}
              data-testid="button-pwa-dismiss"
              aria-label={copy.dismiss}
              className="w-7 h-7 flex items-center justify-center rounded-full shrink-0"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          <div className="mx-4 h-px" style={{ background: "rgba(245,158,11,0.12)" }} />

          <div className="px-4 py-3 space-y-2.5">
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <span className="text-black font-black text-xs">1</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold leading-tight">{copy.safariShare}</p>
                <p className="text-white/40 text-[11px] mt-0.5">{copy.bottomBar}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(0,122,255,0.15)", border: "1px solid rgba(0,122,255,0.3)" }}>
                <SafariShareIcon className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <span className="text-black font-black text-xs">2</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold leading-tight">
                  {copy.swipeAdd}
                </p>
                <p className="text-white/40 text-[11px] mt-0.5">{copy.mayScroll}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                ➕
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <span className="text-black font-black text-xs">3</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold leading-tight">
                  {copy.tapAdd}
                </p>
                <p className="text-white/40 text-[11px] mt-0.5">{copy.iconOnScreen}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                style={{ background: "rgba(52,199,89,0.12)", border: "1px solid rgba(52,199,89,0.25)" }}>
                ✅
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 pt-1 flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: "rgba(245,158,11,0.1)" }} />
            <p className="text-white/25 text-[10px] text-center px-2">{copy.onlyWorksIn("Safari")}</p>
            <div className="h-px flex-1" style={{ background: "rgba(245,158,11,0.1)" }} />
          </div>

          <div className="flex justify-center pb-3">
            <div className="flex flex-col items-center gap-1 animate-bounce">
              <p className="text-amber-400/60 text-[11px] font-medium">{copy.shareBelow}</p>
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                <path d="M10 14L0.339746 0.5H19.6603L10 14Z" fill="rgba(245,158,11,0.5)" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Android Chrome: simple install button ─────────────────────────────────────
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
        <img src="/icons/icon-192x192.png" alt={copy.brandAlt} className="w-12 h-12 rounded-xl shrink-0 border border-amber-500/30" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm leading-tight">{copy.androidTitle}</p>
          <p className="text-amber-200/70 text-xs mt-0.5">{copy.androidDescription}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={installAndroid}
            data-testid="button-pwa-install"
            aria-label={copy.install}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-2 rounded-xl transition-colors active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            {copy.install}
          </button>
          <button
            onClick={dismiss}
            data-testid="button-pwa-dismiss"
            aria-label={copy.dismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
