import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { engagementCopy } from "@shared/engagement-copy";

type Preferences = { learningReminders: boolean; interfaceLanguage?: string };

const messages = {
  en: { loading: "Loading reminder preference…", failed: "Could not load this preference.", retry: "Retry", saveError: "Could not save this preference.", delivery: "Optional delivery: in-app and email to your verified address; push only when configured." },
  es: { loading: "Cargando preferencia…", failed: "No se pudo cargar esta preferencia.", retry: "Reintentar", saveError: "No se pudo guardar esta preferencia.", delivery: "Entrega opcional: en la app y por correo a tu dirección verificada; notificaciones push solo si están configuradas." },
  fr: { loading: "Chargement de la préférence…", failed: "Impossible de charger cette préférence.", retry: "Réessayer", saveError: "Impossible d'enregistrer cette préférence.", delivery: "Envoi facultatif : dans l’application et par e-mail à votre adresse vérifiée ; notifications push uniquement si elles sont configurées." },
  sv: { loading: "Läser in inställningen…", failed: "Inställningen kunde inte läsas in.", retry: "Försök igen", saveError: "Inställningen kunde inte sparas.", delivery: "Valfri leverans: i appen och via e-post till din verifierade adress; pushnotiser endast om de är konfigurerade." },
};

export default function LanguageReminders() {
  const { language } = useI18n();
  const copy = engagementCopy[language];
  const labels = messages[language];
  const [saveError, setSaveError] = useState(false);
  const [retryValue, setRetryValue] = useState<boolean | null>(null);
  const preferences = useQuery<Preferences>({
    queryKey: ["/api/notifications/preferences"],
    queryFn: async () => {
      const response = await fetch("/api/notifications/preferences", { credentials: "include" });
      if (!response.ok) throw new Error("Could not load preferences");
      return response.json();
    },
  });
  const save = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest("PATCH", "/api/notifications/preferences", {
        learningReminders: enabled,
        interfaceLanguage: language,
      }),
    onSuccess: async () => {
      setSaveError(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
    },
    onError: () => setSaveError(true),
  });

  return (
    <section className="mx-4 mb-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3" aria-label={copy.reminderLabel} data-testid="language-reminders">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300"><BellRing className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{copy.reminderLabel}</p>
            {preferences.data && (
              <Switch
                checked={preferences.data.learningReminders === true}
                disabled={save.isPending}
                onCheckedChange={(value) => { setRetryValue(value); setSaveError(false); save.mutate(value); }}
                aria-label={copy.reminderLabel}
                data-testid="language-reminder-toggle"
              />
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.reminderDescription} {labels.delivery}</p>
          {preferences.isLoading && <p className="mt-2 text-xs text-muted-foreground" role="status">{labels.loading}</p>}
          {preferences.isError && (
            <div className="mt-2 flex items-center justify-between gap-2" role="alert">
              <p className="text-xs text-destructive">{labels.failed}</p>
              <Button size="sm" variant="outline" className="h-7" data-testid="retry-language-reminders-read" onClick={() => preferences.refetch()}>{labels.retry}</Button>
            </div>
          )}
          {saveError && (
            <div className="mt-2 flex items-center justify-between gap-2" role="alert">
              <p className="text-xs text-destructive">{labels.saveError}</p>
              <Button size="sm" variant="outline" className="h-7" data-testid="retry-language-reminders-save" disabled={save.isPending || retryValue === null} onClick={() => { if (retryValue !== null) save.mutate(retryValue); }}>
                {labels.retry}
              </Button>
            </div>
          )}
          {save.isSuccess && !saveError && <p className="mt-2 text-xs text-muted-foreground" role="status">{copy.reminderSaved}</p>}
        </div>
      </div>
    </section>
  );
}