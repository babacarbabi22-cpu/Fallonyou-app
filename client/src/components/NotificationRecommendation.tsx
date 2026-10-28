import React from "react";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { notificationRecommendationCopy } from "../lib/notification-recommendation-copy";

type Props = {
  language: keyof typeof notificationRecommendationCopy;
  supported: boolean;
  subscribed: boolean;
  permission: NotificationPermission;
  loading: boolean;
  failed: boolean;
  onEnable: () => void;
  onContinue: () => void;
  children?: React.ReactNode;
};

export function NotificationRecommendation({
  language, supported, subscribed, permission, loading, failed, onEnable, onContinue, children,
}: Props) {
  const copy = notificationRecommendationCopy[language];
  const blocked = permission === "denied";
  return (
    <Card data-testid="notification-recommendation">
      <CardContent className="p-6 space-y-5">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
            <Bell className="w-8 h-8 text-amber-500" />
          </div>
          <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300">{copy.recommended}</Badge>
          <h2 className="text-2xl font-bold">{copy.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{copy.description}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{copy.optional}</p>
        </div>
        {subscribed ? (
          <p role="status" className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400" data-testid="notification-enabled">
            <CheckCircle2 className="w-5 h-5 shrink-0" />{copy.enabled}
          </p>
        ) : !supported ? (
          <p className="text-sm text-muted-foreground" data-testid="notification-unsupported">{copy.unsupported}</p>
        ) : blocked ? (
          <p role="alert" className="text-sm text-muted-foreground" data-testid="notification-blocked">{copy.blocked}</p>
        ) : failed ? (
          <p role="alert" className="text-sm text-destructive" data-testid="notification-failed">{copy.failed}</p>
        ) : null}
        {children}
        <div className="space-y-2">
          {supported && !blocked && !subscribed && (
            <Button
              type="button"
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              size="lg" onClick={onEnable} disabled={loading}
              data-testid="button-enable-notifications"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
              {loading ? copy.enabling : copy.enable}
            </Button>
          )}
          <Button
            type="button" variant="outline" className="w-full"
            onClick={onContinue} disabled={loading}
            data-testid="button-skip-notifications"
          >
            {subscribed || !supported || blocked ? copy.continue : copy.skip}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
