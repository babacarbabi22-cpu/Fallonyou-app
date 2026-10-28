import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Heart, Users, Plane } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CURRENT_TERMS_VERSION } from "@shared/terms";
import { contentLicenseCopy } from "@/lib/content-license";
import { useI18n } from "@/lib/i18n";
import { LanguageSelector } from "./LanguageSelector";
import { termsCommunityCopy } from "@/lib/terms-community-copy";

async function acceptTerms() {
  const res = await fetch("/api/accept-terms", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ termsVersion: CURRENT_TERMS_VERSION, contentLicenseAccepted: true }),
  });
  if (!res.ok) throw new Error("Failed to accept terms");
}

export function TermsModal() {
  const [accepted, setAccepted] = useState(false);
  const queryClient = useQueryClient();
  const { language } = useI18n();
  const license = contentLicenseCopy[language];
  const copy = termsCommunityCopy[language];

  const mutation = useMutation({
    mutationFn: acceptTerms,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card rounded-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl border overflow-hidden">

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white text-center">
          <div className="flex justify-end mb-2"><LanguageSelector showLabel /></div>
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Plane className="w-7 h-7 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold">{copy.title}</h2>
          <p className="text-amber-100 text-sm mt-1">{copy.subtitle}</p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto min-h-0">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Heart className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-medium text-amber-950 dark:text-amber-100">{copy.respect}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Users className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-medium text-amber-950 dark:text-amber-100">{copy.inclusion}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Shield className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-medium text-amber-950 dark:text-amber-100">{copy.safety}</span>
            </div>
          </div>

          <ScrollArea className="h-52 rounded-xl border bg-muted/30 p-4">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed pr-2">
              <p className="font-semibold text-foreground text-base">{copy.heading}</p>
              {copy.sections.map(section => (
                <div key={section.title}>
                  <p className="font-medium text-foreground mb-1">{section.title}</p>
                  <p>{section.body}</p>
                </div>
              ))}

              <div>
                <p className="font-medium text-foreground mb-1">{license.title}</p>
                <p>{license.rights}</p>
                <p className="mt-2">{license.license}</p>
              </div>

              <p className="text-xs pt-2">{copy.confirmation}</p>
            </div>
          </ScrollArea>

          <a href={`/legal?ui_lang=${language}`} target="_blank" rel="noopener noreferrer" className="block text-sm text-amber-600 underline">
            {license.termsLink}
          </a>

          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
            <Checkbox
              id="terms-accept"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
              data-testid="checkbox-accept-terms"
            />
            <label htmlFor="terms-accept" className="text-sm leading-tight cursor-pointer text-amber-950 dark:text-amber-100">
              {license.checkbox}
            </label>
          </div>

          {mutation.isError && <p role="alert" className="text-sm text-destructive">{license.saveError}</p>}
          <Button
            onClick={() => mutation.mutate()}
            disabled={!accepted || mutation.isPending}
            className="w-full bg-amber-500 hover:bg-amber-600"
            data-testid="button-accept-terms"
          >
            {mutation.isPending ? copy.saving : copy.enter}
          </Button>
        </div>
      </div>
    </div>
  );
}
