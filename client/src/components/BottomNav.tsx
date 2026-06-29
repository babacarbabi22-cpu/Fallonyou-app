import { Link, useLocation } from "wouter";
import { User as UserIcon, Calendar, Plane, Globe2, Crown } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "@/lib/i18n";

export function BottomNav() {
  const [location] = useLocation();
  const t = useTranslation();

  const navItems = [
    { href: "/",         icon: Calendar, label: t.nav.events || "Planes" },
    { href: "/discover", icon: Plane,    label: t.nav.discover },
    { href: "/matches",  icon: Globe2,   label: t.nav.matches },
    { href: "/premium",  icon: Crown,    label: "Premium", golden: true },
    { href: "/profile",  icon: UserIcon, label: t.nav.profile },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom bg-gradient-to-t from-background via-background/95 to-transparent">
      <div className="mx-auto max-w-md">
        <nav className="glass-panel flex items-center justify-around p-2 rounded-full shadow-lg shadow-black/5 touch-manipulation">
          {navItems.map(({ href, icon: Icon, label, golden }) => {
            const isActive = location === href;
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-${href.replace("/", "") || "events"}`}
                className={clsx(
                  "flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300",
                  isActive
                    ? golden
                      ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/40 -translate-y-2 scale-110"
                      : "bg-primary text-primary-foreground shadow-lg shadow-primary/30 -translate-y-2 scale-110"
                    : golden
                    ? "text-amber-500 hover:bg-amber-500/10"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon
                  className={clsx(
                    "w-6 h-6",
                    isActive && "fill-current",
                    golden && !isActive && "drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]"
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
