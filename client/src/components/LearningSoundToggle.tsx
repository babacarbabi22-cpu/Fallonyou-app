import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { learningSoundsEnabled, setLearningSoundsEnabled, subscribeLearningSounds, playLearningFeedback } from "@/lib/learning-sounds";

const copy = {
  en: { on: "Answer sounds on", off: "Answer sounds off" },
  es: { on: "Sonidos de respuesta activados", off: "Sonidos de respuesta desactivados" },
  fr: { on: "Sons de réponse activés", off: "Sons de réponse désactivés" },
  sv: { on: "Svarsljud på", off: "Svarsljud av" },
};

export default function LearningSoundToggle() {
  const { language } = useI18n();
  const enabled = useSyncExternalStore(subscribeLearningSounds, learningSoundsEnabled, () => true);
  const label = enabled ? copy[language].on : copy[language].off;
  return <button type="button" data-testid="learning-sound-toggle" aria-label={label} title={label}
    aria-pressed={enabled} onClick={() => {
      setLearningSoundsEnabled(!enabled);
      if (!enabled) void playLearningFeedback("correct");
    }}
    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">
    {enabled ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
  </button>;
}
