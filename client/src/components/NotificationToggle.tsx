import { Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { profileSettingsCopy } from "@/lib/profile-settings-copy";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { nativePushCopy } from "@/lib/native-push-copy";

export function NotificationToggle() {
  const { language, t } = useI18n();
  const copy = profileSettingsCopy[language];
  const { toast } = useToast();
  const { isSupported, isSubscribed, subscribe, unsubscribe, isBusy, isNative, nativeError } = usePushNotifications();
  const nativeMessage = nativePushCopy[language][nativeError as keyof typeof nativePushCopy.en];

  const handleToggle = async () => {
    if (!isSupported) {
      toast({
        title: t.common.error,
        variant: "destructive",
      });
      return;
    }

    if (!isSubscribed) {
      const success = await subscribe();
      if (success) {
        toast({ title: t.notifications.enable });
      } else {
        toast({
          title: t.common.error,
          variant: "destructive",
        });
      }
    } else {
      if (await unsubscribe()) toast({ title: t.notifications.disable });
      else toast({ title: t.common.error, variant: "destructive" });
    }
  };

  if (!isSupported && !isNative) return null;

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSubscribed ? "bg-primary/10" : "bg-muted"}`}>
              {isSubscribed ? (
                <Bell className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">{copy.notificationsTitle}</p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed ? t.notifications.disable : t.notifications.enable}
              </p>
            </div>
          </div>
          <Switch
            disabled={isBusy || !isSupported}
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            data-testid="switch-notifications"
            aria-label={copy.notificationsTitle}
          />
        </div>
        {nativeMessage && <p role="status" className="mt-3 text-sm text-muted-foreground">{nativeMessage}</p>}
      </CardContent>
    </Card>
  );
}
