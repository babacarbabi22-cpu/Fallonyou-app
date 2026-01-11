import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import {
  requestNotificationPermission,
  isNotificationsSupported,
  getNotificationPermission,
} from "@/lib/notifications";

export function NotificationToggle() {
  const t = useTranslation();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(isNotificationsSupported());
    setEnabled(getNotificationPermission() === "granted");
  }, []);

  const handleToggle = async () => {
    if (!supported) {
      toast({
        title: t.common.error,
        variant: "destructive",
      });
      return;
    }

    if (!enabled) {
      const granted = await requestNotificationPermission();
      setEnabled(granted);
      if (granted) {
        toast({
          title: t.notifications.enable,
        });
      }
    } else {
      toast({
        title: t.notifications.disable,
      });
      setEnabled(false);
    }
  };

  if (!supported) return null;

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${enabled ? "bg-primary/10" : "bg-muted"}`}>
              {enabled ? (
                <Bell className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">{t.settings.notifications}</p>
              <p className="text-sm text-muted-foreground">
                {enabled ? t.notifications.disable : t.notifications.enable}
              </p>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            data-testid="switch-notifications"
          />
        </div>
      </CardContent>
    </Card>
  );
}
