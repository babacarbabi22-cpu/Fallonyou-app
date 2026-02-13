import { Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function NotificationToggle() {
  const t = useTranslation();
  const { toast } = useToast();
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

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
      await unsubscribe();
      toast({ title: t.notifications.disable });
    }
  };

  if (!isSupported) return null;

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
              <p className="font-medium">{t.settings.notifications}</p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed ? t.notifications.disable : t.notifications.enable}
              </p>
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            data-testid="switch-notifications"
          />
        </div>
      </CardContent>
    </Card>
  );
}
