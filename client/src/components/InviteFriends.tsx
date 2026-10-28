import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Share2, Users, MapPin, Sparkles, X, QrCode, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  copyInviteUrl,
  createInviteQrDataUrl,
  INVITE_URL,
  inviteQrCopy,
} from "./invite-friends-copy";

export function InviteFriends() {
  const t = useTranslation();
  const { language } = useI18n();
  const { toast } = useToast();
  const qrCopy = inviteQrCopy[language];
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("fallonyou_invite_dismissed") === "true";
  });
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [qrRetry, setQrRetry] = useState(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!qrOpen || qrDataUrl) return;
    let active = true;
    setQrLoading(true);
    setQrError(false);
    createInviteQrDataUrl()
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrError(true);
      })
      .finally(() => {
        if (active) setQrLoading(false);
      });
    return () => {
      active = false;
    };
  }, [qrOpen, qrDataUrl, qrRetry]);

  const handleShare = async () => {
    const shareData = {
      title: "FallonYou",
      text: t.invite.shareText,
      url: INVITE_URL,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await copyToClipboard();
        }
      }
    } else {
      await copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await copyInviteUrl();
      toast({ title: t.invite.copied, description: INVITE_URL });
    } catch {
      toast({ title: qrCopy.copyError, description: INVITE_URL });
    }
  };

  const handleQrCopy = async () => {
    setCopyStatus("idle");
    try {
      await copyInviteUrl();
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("fallonyou_invite_dismissed", "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white shadow-lg" data-testid="card-invite-friends">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
        data-testid="button-dismiss-invite"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Share2 className="w-5 h-5" />
          <h3 className="font-bold text-lg">{t.invite.title}</h3>
        </div>

        <p className="text-sm text-white/90 mb-4 leading-relaxed">
          {t.invite.subtitle}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-white/80" />
            <span>{t.invite.tip1}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-white/80" />
            <span>{t.invite.tip2}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-white/80" />
            <span>{t.invite.tip3}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={handleShare}
            className="flex-1 bg-white text-amber-700 hover:bg-white/90 font-semibold"
            data-testid="button-share-invite"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {t.invite.button}
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="border-white/40 text-white hover:bg-white/10 hover:text-white"
            data-testid="button-dismiss-invite-text"
          >
            {t.invite.dismiss}
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setCopyStatus("idle");
            setQrOpen(true);
          }}
          className="mt-2 w-full border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          data-testid="button-show-invite-qr"
        >
          <QrCode className="mr-2 h-4 w-4" aria-hidden="true" />
          {qrCopy.showQr}
        </Button>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border-amber-100 bg-[#fffdf8] p-6 text-center sm:p-7"
          data-testid="dialog-invite-qr"
        >
          <DialogHeader className="items-center space-y-2 pr-5">
            <DialogTitle className="text-xl font-bold leading-snug text-amber-950">
              {qrCopy.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-amber-900/75">
              {qrCopy.caption}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-[17rem] flex-col items-center justify-center gap-4">
            {qrLoading && (
              <p className="text-sm text-amber-900/75" role="status">
                {qrCopy.generating}
              </p>
            )}
            {qrError && (
              <div className="space-y-3" role="alert">
                <p className="text-sm text-red-700">{qrCopy.generationError}</p>
                <Button
                  type="button"
                  onClick={() => {
                    setQrDataUrl(null);
                    setQrError(false);
                    setQrRetry((attempt) => attempt + 1);
                  }}
                  className="bg-amber-700 text-white hover:bg-amber-800"
                >
                  {qrCopy.retry}
                </Button>
              </div>
            )}
            {qrDataUrl && !qrError && (
              <figure className="m-0 flex flex-col items-center gap-3">
                <img
                  src={qrDataUrl}
                  alt={qrCopy.imageAlt}
                  className="h-64 w-64 max-w-full rounded-lg border border-amber-100 bg-white p-3 shadow-sm"
                  data-testid="image-invite-qr"
                />
                <figcaption className="sr-only">{qrCopy.caption}</figcaption>
              </figure>
            )}
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              onClick={handleQrCopy}
              className="w-full bg-amber-700 font-semibold text-white hover:bg-amber-800"
              data-testid="button-copy-invite-link"
            >
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              {qrCopy.copyLink}
            </Button>
            {copyStatus !== "idle" && (
              <p
                className={`text-sm ${copyStatus === "success" ? "text-emerald-800" : "text-red-700"}`}
                role={copyStatus === "success" ? "status" : "alert"}
              >
                {copyStatus === "success" ? qrCopy.copied : qrCopy.copyError}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
