import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-danceme";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { MessageEmailOption } from "./MessageEmailOption";
import type { NotificationPreferences } from "@shared/notification-preferences";
import { messageNoticeCopy } from "@shared/message-notice-copy";

export function MessageEmailPreference() {
  const { data: user } = useCurrentUser();
  const { language } = useI18n();
  const copy = messageNoticeCopy[language];
  const client = useQueryClient();
  const preferences = useQuery<NotificationPreferences>({
    queryKey: ["/api/notifications/preferences"], enabled: !!user,
  });
  const save = useMutation({
    mutationFn: async (messageEmails: boolean) =>
      (await apiRequest("PATCH", "/api/notifications/preferences", { messageEmails })).json(),
    onSuccess: data => client.setQueryData(["/api/notifications/preferences"], data),
  });
  const verify = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/auth/resend-verification", { email: user?.email, language }),
  });
  return (
    <div className="space-y-2">
      <MessageEmailOption
        language={language} checked={preferences.data?.messageEmails === true}
        pending={!preferences.data || preferences.isFetching || save.isPending}
        failed={preferences.isError || save.isError}
        hasEmail={!!user?.email} verified={user?.emailVerified === "true"}
        messagesEnabled={preferences.data?.messages === true}
        onChange={value => save.mutate(value)}
      />
      {(preferences.isError || save.isError) && <Button type="button" variant="outline" size="sm"
        onClick={() => { save.reset(); void preferences.refetch(); }} data-testid="retry-message-emails">
        {copy.retry}
      </Button>}
      {!!user?.email && user.emailVerified !== "true" && (
        <div className="space-y-2">
          {verify.isSuccess ? <>
            <p role="status" className="text-xs text-muted-foreground">{copy.verifyRequested}</p>
            <Button type="button" size="sm" variant="outline"
              onClick={() => { void client.invalidateQueries({ queryKey: ["/api/user"] }); }}
              data-testid="refresh-email-verification">{copy.refreshVerification}</Button>
          </> : <Button type="button" size="sm" variant="outline" disabled={verify.isPending}
            onClick={() => verify.mutate()} data-testid="request-email-verification">{copy.verifyButton}</Button>}
          {verify.isError && <p role="alert" className="text-xs text-destructive">{copy.verifyFailed}</p>}
        </div>
      )}
    </div>
  );
}
