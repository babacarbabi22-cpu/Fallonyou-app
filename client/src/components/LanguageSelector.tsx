import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, languageNames, type Language } from "@/lib/i18n";

interface LanguageSelectorProps {
  prominent?: boolean;
  showLabel?: boolean;
}

const chooseLanguageLabel: Record<Language, string> = {
  en: "Choose language",
  es: "Selecciona idioma",
  fr: "Choisir la langue",
  sv: "Välj språk",
};

export function LanguageSelector({ prominent = false, showLabel = false }: LanguageSelectorProps) {
  const { language, setLanguage } = useI18n();

  const languages: Language[] = ["es", "en", "fr", "sv"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost" 
          size="sm" 
          aria-label={chooseLanguageLabel[language]}
          className={prominent
            ? "relative flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border border-amber-300/60 bg-black/60 text-amber-300 shadow-lg shadow-amber-500/20 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/75 hover:text-amber-200"
            : "gap-2"}
          data-testid="button-language-selector"
        >
          <Globe className={prominent ? "h-[30px] w-[30px]" : "w-4 h-4"} />
          {prominent ? (
            <span className="absolute -bottom-1 -right-1 rounded-full border border-amber-300/50 bg-amber-500 px-1.5 py-0.5 text-[9px] font-black leading-none text-black">
              {language.toUpperCase()}
            </span>
          ) : (
            <span className={showLabel ? "" : "hidden sm:inline"}>{languageNames[language]}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {chooseLanguageLabel[language]}
        </div>
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onSelect={() => setLanguage(lang)}
            className={`min-h-11 cursor-pointer ${language === lang ? "bg-muted" : ""}`}
            data-testid={`menu-item-language-${lang}`}
          >
            <span className="w-7 font-bold text-muted-foreground">{lang.toUpperCase()}</span>
            {languageNames[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
