import { Link, useLocation } from "wouter";
import { User as UserIcon, Calendar, Plane, Users, Luggage, Languages, Lightbulb } from "lucide-react";
import { clsx } from "clsx";
import { useI18n, useTranslation } from "@/lib/i18n";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/use-auth";

export function BottomNav() {
  const [location] = useLocation();
  const t = useTranslation();
  const { language } = useI18n();
  const { ageConfirmed, termsAccepted } = useAuth();
  const navigationLabels = {
    es: "Navegación principal",
    en: "Primary navigation",
    fr: "Navigation principale",
    sv: "Huvudnavigering",
  };

  const navItems = [
    { href: "/",         icon: Calendar,  label: t.nav.events },
    { href: "/discover", icon: Plane,     label: t.nav.discover },
    { href: "/matches",  icon: Users,     label: t.nav.matches },
    { href: "/viajes",   icon: Luggage,   label: t.nav.trips },
    { href: "/languages", icon: Languages, label: t.nav.languages },
    { href: "/tips", icon: Lightbulb, label: t.nav.tips },
    { href: "/profile",  icon: UserIcon,  label: t.nav.profile },
  ];

  const navigation = (
    <div data-testid="bottom-navigation" className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom bg-gradient-to-t from-background via-background/95 to-transparent">
      <div className="mx-auto max-w-md">
        <nav
          aria-label={navigationLabels[language]}
          className="glass-panel flex items-center justify-between gap-1 p-2 rounded-full shadow-lg shadow-black/5 touch-manipulation overflow-visible"
        >
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = location === href;
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-${href.replace("/", "") || "events"}`}
                className={clsx(
                  "flex flex-1 min-w-0 flex-col items-center justify-center h-14 rounded-full transition-all duration-300",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 -translate-y-2 scale-110"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={clsx("w-5 h-5", isActive && "fill-current")} />
                <span className="text-[9px] font-medium leading-none mt-1 truncate max-w-full px-0.5">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );

  // Keep the consent screen's inherited blur and disabled pointer events.
  if (typeof document === "undefined" || !ageConfirmed || !termsAccepted) {
    return navigation;
  }

  // Page overflow and transformed ancestors can trap fixed elements in WebKit.
  // Mount outside routed content so navigation stays anchored to the viewport.
  return createPortal(navigation, document.body);
}
