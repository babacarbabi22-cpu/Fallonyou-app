import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";
import { personalPreferencesCopy } from "@/lib/personal-preferences-copy";

export function PersonalPreferencesConsent({ checked, granted = false, onChange }: {
  checked: boolean; granted?: boolean; onChange: (checked: boolean) => void;
}) {
  const { language } = useI18n();
  const copy = personalPreferencesCopy[language];
  const id = useId();
  return (
    <div className="space-y-2 rounded-xl border p-3" data-testid="personal-preferences-notice">
      <h3 className="text-sm font-semibold">{copy.title}</h3>
      <div className="flex items-start gap-2">
        <Checkbox id={id} checked={checked || granted} disabled={granted}
          onCheckedChange={value => onChange(value === true)} data-testid="checkbox-personal-preferences-consent" />
        <label htmlFor={id} className="text-sm leading-relaxed">{copy.consent}</label>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{copy.optional}</p>
      <a href="/privacy" className="text-xs underline">FallOnYou · {language === "es" ? "Privacidad" : language === "fr" ? "Confidentialité" : language === "sv" ? "Integritet" : "Privacy"}</a>
    </div>
  );
}