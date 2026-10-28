import type { Language } from "@/lib/i18n";

// This is the single, production-safe destination used by every invite surface.
export const INVITE_URL = "https://fallonyou.app";

export const inviteQrCopy: Record<
  Language,
  {
    showQr: string;
    title: string;
    caption: string;
    imageAlt: string;
    copyLink: string;
    copied: string;
    copyError: string;
    generating: string;
    generationError: string;
    retry: string;
  }
> = {
  en: {
    showQr: "Show QR code",
    title: "Scan to discover FallOnYou",
    caption: "Scan this code to visit FallOnYou and meet fellow travelers.",
    imageAlt: "QR code linking to FallOnYou",
    copyLink: "Copy link",
    copied: "Link copied to clipboard.",
    copyError: "Could not copy the link. Please try again.",
    generating: "Preparing your QR code…",
    generationError: "We couldn’t create the QR code. Please try again.",
    retry: "Try again",
  },
  es: {
    showQr: "Mostrar código QR",
    title: "Escanea para descubrir FallOnYou",
    caption: "Escanea este código para visitar FallOnYou y conocer a otros viajeros.",
    imageAlt: "Código QR con enlace a FallOnYou",
    copyLink: "Copiar enlace",
    copied: "Enlace copiado.",
    copyError: "No se pudo copiar el enlace. Inténtalo de nuevo.",
    generating: "Preparando el código QR…",
    generationError: "No se pudo crear el código QR. Inténtalo de nuevo.",
    retry: "Volver a intentar",
  },
  fr: {
    showQr: "Afficher le code QR",
    title: "Scannez pour découvrir FallOnYou",
    caption: "Scannez ce code pour visiter FallOnYou et rencontrer d’autres voyageurs.",
    imageAlt: "Code QR menant à FallOnYou",
    copyLink: "Copier le lien",
    copied: "Lien copié.",
    copyError: "Impossible de copier le lien. Veuillez réessayer.",
    generating: "Préparation du code QR…",
    generationError: "Impossible de créer le code QR. Veuillez réessayer.",
    retry: "Réessayer",
  },
  sv: {
    showQr: "Visa QR-kod",
    title: "Skanna för att upptäcka FallOnYou",
    caption: "Skanna koden för att besöka FallOnYou och träffa andra resenärer.",
    imageAlt: "QR-kod som länkar till FallOnYou",
    copyLink: "Kopiera länk",
    copied: "Länken har kopierats.",
    copyError: "Det gick inte att kopiera länken. Försök igen.",
    generating: "Skapar QR-kod…",
    generationError: "Det gick inte att skapa QR-koden. Försök igen.",
    retry: "Försök igen",
  },
};

export async function createInviteQrDataUrl(): Promise<string> {
  // qrcode is already part of the client bundle; no external QR service is used.
  // @ts-ignore qrcode 1.5.4 does not bundle TypeScript declarations
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(INVITE_URL, {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 320,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export async function copyInviteUrl(): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(INVITE_URL);
      return;
    } catch {
      // Fall through to the browser's local copy fallback.
    }
  }

  const input = document.createElement("textarea");
  input.value = INVITE_URL;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, input.value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(input);
  if (!copied) throw new Error("Clipboard copy failed");
}
