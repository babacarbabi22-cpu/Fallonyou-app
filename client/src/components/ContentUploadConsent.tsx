import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { contentLicenseCopy } from "@/lib/content-license";
import { CURRENT_TERMS_VERSION } from "@shared/terms";

type PendingConsent = { promise: Promise<boolean>; resolve: (accepted: boolean) => void };
const ContentUploadConsentContext = createContext<(() => Promise<boolean>) | null>(null);

export function useContentUploadConsent() {
  const requestConsent = useContext(ContentUploadConsentContext);
  if (!requestConsent) throw new Error("ContentUploadConsentProvider is missing");
  return requestConsent;
}

export function ContentUploadConsentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { language } = useI18n();
  const copy = contentLicenseCopy[language];
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef<PendingConsent | null>(null);

  const requestConsent = useCallback((): Promise<boolean> => {
    if (!user) return Promise.resolve(false);
    if (user.termsAcceptedVersion === CURRENT_TERMS_VERSION) return Promise.resolve(true);
    if (pending.current) return pending.current.promise;
    let resolve!: (accepted: boolean) => void;
    const promise = new Promise<boolean>(r => { resolve = r; });
    pending.current = { promise, resolve };
    setOpen(true);
    return promise;
  }, [user]);

  const finish = (accepted: boolean) => {
    pending.current?.resolve(accepted);
    pending.current = null;
    setOpen(false);
    setChecked(false);
    setShowDetails(false);
    setError(false);
  };

  useEffect(() => () => {
    pending.current?.resolve(false);
    pending.current = null;
  }, []);

  const accept = async () => {
    if (!checked || saving) return;
    setSaving(true);
    setError(false);
    try {
      const response = await fetch("/api/accept-terms", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termsVersion: CURRENT_TERMS_VERSION, contentLicenseAccepted: true }),
      });
      if (!response.ok) throw new Error("Could not save acceptance");
      queryClient.setQueryData<Record<string, unknown> | null>(["/api/user"], old =>
        old ? { ...old, termsAcceptedVersion: CURRENT_TERMS_VERSION, termsAcceptedAt: new Date().toISOString() } : old
      );
      finish(true);
      void queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ContentUploadConsentContext.Provider value={requestConsent}>
      {children}
      <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen && !saving) finish(false); }}>
        <DialogContent className="max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription className="sr-only">{copy.rights}</DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
            <Checkbox
              id="upload-content-consent"
              checked={checked}
              onCheckedChange={value => setChecked(value === true)}
              className="mt-0.5"
              data-testid="checkbox-upload-content-consent"
            />
            <label htmlFor="upload-content-consent" className="cursor-pointer text-sm leading-tight">
              {copy.checkbox}
            </label>
          </div>
          <button
            type="button"
            onClick={() => setShowDetails(value => !value)}
            aria-expanded={showDetails}
            aria-controls="upload-content-consent-details"
            className="w-fit text-left text-sm text-amber-600 underline"
          >
            {showDetails ? copy.readLess : copy.readMore}
          </button>
          <div id="upload-content-consent-details" hidden={!showDetails} className="space-y-3 text-sm text-muted-foreground">
            <p>{copy.rights}</p>
            <p>{copy.license}</p>
          </div>
          <a href="/legal" target="_blank" rel="noopener noreferrer" className="text-sm text-amber-600 underline">
            {copy.termsLink}
          </a>
          {error && <p role="alert" className="text-sm text-destructive">{copy.saveError}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => finish(false)} disabled={saving}>
              {copy.uploadNotNow}
            </Button>
            <Button type="button" onClick={accept} disabled={!checked || saving} data-testid="button-confirm-upload-content">
              {copy.uploadContinue}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContentUploadConsentContext.Provider>
  );
}