import { Link, useLocation } from "wouter";
import { Heart, MessageCircle, User as UserIcon, Crown } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "@/lib/i18n";

export function BottomNav() {
  const [location] = useLocation();
  const t = useTranslation();

  const navItems = [
    { href: "/", icon: Heart, label: t.nav.discover },
    { href: "/matches", icon: MessageCircle, label: t.nav.matches },
    { href: "/premium", icon: Crown, label: t.nav.premium },
    { href: "/profile", icon: UserIcon, label: t.nav.profile },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
      <div className="mx-auto max-w-md">
        <nav className="glass-panel flex items-center justify-around p-2 rounded-full shadow-lg shadow-black/5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = location === href;
            return (
              <Link key={href} href={href} className={clsx(
                "flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 -translate-y-2 scale-110" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <Icon className={clsx("w-6 h-6", isActive && "fill-current")} />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
