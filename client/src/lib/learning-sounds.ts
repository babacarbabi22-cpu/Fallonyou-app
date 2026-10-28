// Short, local feedback tones. No audio downloads, autoplay or tracking.
type Feedback = "correct" | "incorrect" | "complete";
const preferenceKey = "learning-feedback-sounds";
let context: AudioContext | undefined;
let enabled = true;
let loaded = false;
let warned = false;
const listeners = new Set<() => void>();
const active = new Set<OscillatorNode>();

export function learningSoundsEnabled(): boolean {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try { enabled = window.localStorage.getItem(preferenceKey) !== "off"; } catch { /* Session-only preference when storage is unavailable. */ }
  }
  return enabled;
}

export function setLearningSoundsEnabled(value: boolean) {
  learningSoundsEnabled();
  enabled = value;
  if (!value) for (const oscillator of active) {
    try { oscillator.stop(); } catch { /* It may already have ended. */ }
  }
  try { window.localStorage.setItem(preferenceKey, value ? "on" : "off"); } catch { /* Do not prevent studying when storage is unavailable. */ }
  listeners.forEach(listener => listener());
}

export function subscribeLearningSounds(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== preferenceKey && event.key !== null) return;
    loaded = false;
    learningSoundsEnabled();
    listeners.forEach(notify => notify());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// Call from the answer's click/submit handler so iOS can unlock Web Audio.
export async function playLearningFeedback(result: Feedback): Promise<void> {
  if (typeof window === "undefined" || !learningSoundsEnabled()) return;
  try {
    const Audio = window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    if (!context || context.state === "closed") context = new Audio();
    // Safari can interrupt audio after backgrounding the app.
    if (context.state !== "running") await context.resume();
    if (!learningSoundsEnabled() || context.state !== "running") return;
    // Avoid overlapping feedback when the learner answers quickly.
    for (const oscillator of active) {
      try { oscillator.stop(); } catch { /* Already ended. */ }
    }
    active.clear();
    const celebration = result === "complete";
    const notes = celebration ? [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5]
      : result === "correct" ? [523.25, 783.99] : [246.94, 196];
    const spacing = celebration ? 0.13 : 0.12;
    const duration = celebration ? 0.28 : 0.2;
    const volume = result === "incorrect" ? 0.1 : 0.16;
    notes.forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      const start = context!.currentTime + index * spacing;
      oscillator.type = result === "incorrect" ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      gain.connect(context!.destination);
      active.add(oscillator);
      oscillator.onended = () => {
        active.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
    });
  } catch {
    // Audio is optional: a device restriction must not discard an answer.
    if (!warned) console.warn("[Learning audio] Sound unavailable on this device; visual feedback remains active.");
    warned = true;
  }
}
