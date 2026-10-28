import { useState, useEffect } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";

type ThemePreference = "system" | "light" | "dark";

const labels = {
  es: { title: "Apariencia", system: "Automático", light: "Claro", dark: "Oscuro" },
  en: { title: "Appearance", system: "Automatic", light: "Light", dark: "Dark" },
  fr: { title: "Apparence", system: "Automatique", light: "Clair", dark: "Sombre" },
  sv: { title: "Utseende", system: "Automatiskt", light: "Ljust", dark: "Mörkt" },
} as const;

function applyTheme(preference: ThemePreference) {
  const isDark = preference === "dark"
    || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("light", !isDark);
}

export function ThemeToggle() {
  const { language } = useI18n();
  const copy = labels[language] ?? labels.en;
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: theme }));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (theme === "system") applyTheme("system");
    };
    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, [theme]);

  useEffect(() => {
    const syncTheme = (event: Event) => {
      const nextTheme = (event as CustomEvent<ThemePreference>).detail;
      if (nextTheme && nextTheme !== theme) setTheme(nextTheme);
    };
    window.addEventListener("theme-change", syncTheme);
    return () => window.removeEventListener("theme-change", syncTheme);
  }, [theme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          data-testid="button-theme-toggle"
          aria-label={copy.title}
          title={copy.title}
        >
          {theme === "system" ? (
            <Monitor className="w-5 h-5 text-muted-foreground" />
          ) : theme === "dark" ? (
            <Moon className="w-5 h-5 text-indigo-400" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>{copy.title}</DropdownMenuLabel>
        {([
          ["system", copy.system, Monitor],
          ["light", copy.light, Sun],
          ["dark", copy.dark, Moon],
        ] as const).map(([value, label, Icon]) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)} className="gap-2">
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {theme === value && <Check className="w-4 h-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
