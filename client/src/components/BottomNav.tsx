import { Link, useLocation } from "wouter";
import { Heart, MessageCircle, User as UserIcon, Crown, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";

export function BottomNav() {
  const [location] = useLocation();
  const t = useTranslation();

  const { data: likesData } = useQuery({
    queryKey: ['/api/premium/liked-by'],
  });

  const likesCount = likesData?.count || 0;

  const navItems = [
    { href: "/", icon: Heart, label: t.nav.discover, badge: likesCount > 0 ? likesCount : null },
    { href: "/matches", icon: MessageCircle, label: t.nav.matches },
    { href: "/premium", icon: Crown, label: t.nav.premium },
    { href: "/profile", icon: UserIcon, label: t.nav.profile },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom bg-gradient-to-t from-background via-background/95 to-transparent">
      <div className="mx-auto max-w-md">
        <nav className="glass-panel flex items-center justify-around p-2 rounded-full shadow-lg shadow-black/5 touch-manipulation">
          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const isActive = location === href;
            return (
              <Link key={href} href={href} className={clsx(
                "flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300 relative",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 -translate-y-2 scale-110" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <Icon className={clsx("w-6 h-6", isActive && "fill-current")} />
                {badge && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
