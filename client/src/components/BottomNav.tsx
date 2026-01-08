import { Link, useLocation } from "wouter";
import { Heart, MessageCircle, User as UserIcon } from "lucide-react";
import { clsx } from "clsx";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Heart, label: "Discover" },
    { href: "/matches", icon: MessageCircle, label: "Matches" },
    { href: "/profile", icon: UserIcon, label: "Profile" },
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
