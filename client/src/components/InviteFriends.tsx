import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { Share2, Users, MapPin, Sparkles, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function InviteFriends() {
  const t = useTranslation();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("fallonyou_invite_dismissed") === "true";
  });

  if (dismissed) return null;

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://fallonyou.app";

  const handleShare = async () => {
    const shareData = {
      title: "FallonYou",
      text: t.invite.shareText,
      url: appUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await copyToClipboard(appUrl);
        }
      }
    } else {
      await copyToClipboard(appUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t.invite.copied, description: text });
    } catch {
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      toast({ title: t.invite.copied, description: text });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("fallonyou_invite_dismissed", "true");
    setDismissed(true);
  };

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

        <div className="flex gap-2">
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
      </div>
    </div>
  );
}
