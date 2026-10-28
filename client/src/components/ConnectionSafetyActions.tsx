import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MoreHorizontal, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { connectionCopy } from "@/lib/connection-copy";

type Props = { userId: string; userName: string; onBlocked?: () => void; testId?: string };
type Action = "menu" | "block" | "report";

export function ConnectionSafetyActions({ userId, userName, onBlocked, testId }: Props) {
  const { language } = useI18n();
  const copy = connectionCopy[language];
  const { toast } = useToast();
  const [action, setAction] = useState<Action | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  const mutation = useMutation({
    mutationFn: async (kind: "block" | "report") => {
      const response = await apiRequest("POST", `/api/users/${encodeURIComponent(userId)}/${kind}`, kind === "block"
        ? { reason: "other" }
        : { reason: "other", ...(details.trim() ? { details: details.trim() } : {}) });
      const result = await response.json();
      if (result?.success !== true) throw new Error("Safety action not confirmed");
      return result;
    },
    onSuccess: async (_result, kind) => {
      setError("");
      setAction(null);
      setDetails("");
      toast({ title: kind === "block" ? copy.blockSuccess : copy.reportSuccess });
      if (kind === "block") {
        onBlocked?.();
        await Promise.all([
          "/api/matches", "/api/matches/requests", "/api/matches/incoming", "/api/users",
          "/api/premium/liked-by", "/api/blocked-users", "/api/my-connected-cities",
        ].map(queryKey => queryClient.invalidateQueries({ queryKey: [queryKey] })));
      }
    },
    onError: (_err, kind) => setError(kind === "block" ? copy.blockError : copy.reportError),
  });

  const close = (open: boolean) => {
    if (!open && !mutation.isPending) {
      setAction(null);
      setError("");
      setDetails("");
    }
  };

  const openChooser = () => {
    if (mutation.isPending) return;
    setError("");
    setDetails("");
    setAction("menu");
  };

  const chooseAction = (nextAction: "block" | "report") => {
    setError("");
    if (nextAction === "report") setDetails("");
    setAction(nextAction);
  };

  return (
    <>
      <Button
        type="button"
        ref={triggerRef}
        variant="ghost"
        size="icon"
        aria-label={copy.safetyActions}
        aria-haspopup="dialog"
        aria-expanded={action !== null}
        onClick={openChooser}
        className="h-11 w-11 shrink-0 rounded-full text-muted-foreground"
        data-testid={testId ? `${testId}-menu` : undefined}
      >
        <MoreHorizontal className="h-5 w-5" />
      </Button>
      <Dialog open={action !== null} onOpenChange={close}>
        <DialogContent
          className="max-w-sm rounded-2xl"
          onCloseAutoFocus={event => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === "menu" ? (
                copy.safetyActions
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  {(action === "block" ? copy.blockTitle : copy.reportTitle).replace("{name}", userName)}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {action === "menu"
                ? userName
                : action === "block"
                  ? `${copy.blockDescription} ${copy.blockChatEffect}`
                  : copy.reportDescription}
            </DialogDescription>
          </DialogHeader>
          {action === "menu" && (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 w-full"
                onClick={() => chooseAction("block")}
                data-testid={testId ? `${testId}-block` : undefined}
              >
                {copy.block}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => chooseAction("report")}
                data-testid={testId ? `${testId}-report` : undefined}
              >
                {copy.report}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 w-full"
                onClick={() => close(false)}
                data-testid={testId ? `${testId}-cancel` : undefined}
              >
                {copy.cancel}
              </Button>
            </div>
          )}
          {action === "report" && (
            <label className="block space-y-1.5 text-sm font-medium">
              {copy.reportDetails}
              <textarea
                value={details}
                onChange={event => setDetails(event.target.value)}
                placeholder={copy.reportDetailsPlaceholder}
                rows={3}
                maxLength={2000}
                className="w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm font-normal"
                data-testid={testId ? `${testId}-report-details` : undefined}
              />
            </label>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {(action === "block" || action === "report") && (
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1"
                disabled={mutation.isPending}
                onClick={() => close(false)}
                data-testid={testId ? `${testId}-cancel` : undefined}
              >
                {copy.cancel}
              </Button>
              <Button
                type="button"
                variant={action === "block" ? "destructive" : "default"}
                className="min-h-11 flex-1"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(action)}
                data-testid={testId ? `${testId}-${action}-confirm` : undefined}
              >
                {action === "block" ? copy.confirmBlock : copy.confirmReport}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
