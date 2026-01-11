import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart } from "lucide-react";
import { SiGoogle, SiApple, SiGithub } from "react-icons/si";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/i18n";
import { Link } from "wouter";
import fallonYouLogo from "@assets/IMG_1362_1768162016332.jpeg";

const fallingHearts = [
  { delay: 0, duration: 8, left: 5, size: 16, color: "text-blue-500" },
  { delay: 1, duration: 10, left: 15, size: 12, color: "text-pink-500" },
  { delay: 2, duration: 7, left: 25, size: 18, color: "text-blue-400" },
  { delay: 0.5, duration: 9, left: 35, size: 14, color: "text-pink-400" },
  { delay: 3, duration: 11, left: 45, size: 10, color: "text-blue-500" },
  { delay: 1.5, duration: 8, left: 55, size: 16, color: "text-pink-500" },
  { delay: 2.5, duration: 10, left: 65, size: 12, color: "text-blue-400" },
  { delay: 0.8, duration: 9, left: 75, size: 18, color: "text-pink-400" },
  { delay: 4, duration: 7, left: 85, size: 14, color: "text-blue-500" },
  { delay: 3.5, duration: 12, left: 95, size: 10, color: "text-pink-500" },
  { delay: 1.2, duration: 8, left: 10, size: 15, color: "text-pink-400" },
  { delay: 2.8, duration: 9, left: 30, size: 11, color: "text-blue-400" },
  { delay: 0.3, duration: 10, left: 50, size: 17, color: "text-blue-500" },
  { delay: 4.2, duration: 8, left: 70, size: 13, color: "text-pink-500" },
  { delay: 1.8, duration: 11, left: 90, size: 15, color: "text-blue-400" },
];

export default function AuthPage() {
  const t = useTranslation();
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  
  const handleLogin = () => {
    if (!ageConfirmed) return;
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Language selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>
      
      {/* Soft gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 via-blue-300/10 to-pink-300/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] bg-gradient-to-tr from-pink-400/20 via-pink-300/10 to-blue-300/20 rounded-full blur-[100px]" />
      </div>

      {/* Falling hearts cascade */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {fallingHearts.map((heart, i) => (
          <Heart
            key={i}
            className={`absolute ${heart.color} fill-current opacity-40`}
            style={{
              width: `${heart.size}px`,
              height: `${heart.size}px`,
              left: `${heart.left}%`,
              top: '-20px',
              animation: `fall ${heart.duration}s linear infinite`,
              animationDelay: `${heart.delay}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.4;
          }
          90% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

      
      <div className="relative z-10 w-full max-w-md px-8 text-center">
        
        {/* Logo */}
        <div className="mb-8">
          <img 
            src={fallonYouLogo} 
            alt="FallonYou Logo" 
            className="w-64 h-64 mx-auto object-contain drop-shadow-lg"
          />
          
          {/* Tagline */}
          <p className="text-base text-muted-foreground font-medium leading-relaxed italic max-w-xs mx-auto mt-2">
            "{t.app.tagline}"
          </p>
        </div>

        <div className="space-y-4">
          {/* Age verification checkbox */}
          <div className="flex items-start gap-3 p-4 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 text-left shadow-sm">
            <Checkbox 
              id="age-confirm" 
              checked={ageConfirmed}
              onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
              className="mt-0.5"
              data-testid="checkbox-age-confirm"
            />
            <label htmlFor="age-confirm" className="text-sm leading-tight cursor-pointer">
              <span className="font-medium">{t.legal.ageConfirm}</span>
              <span className="block text-xs text-muted-foreground mt-1">
                {t.legal.ageRestriction}
              </span>
            </label>
          </div>

          {/* Main login button */}
          <Button 
            onClick={handleLogin}
            disabled={!ageConfirmed}
            className="w-full h-14 text-lg rounded-2xl font-bold bg-gradient-to-r from-blue-500 via-blue-400 to-pink-500 text-white shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-pink-500/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
            data-testid="button-login"
          >
            {t.auth.loginButton}
          </Button>
          
          {/* Login options info */}
          <div className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              {t.auth.loginWith}
            </p>
            <div className="flex justify-center gap-6">
              {[
                { icon: SiGoogle, name: "Google" },
                { icon: SiApple, name: "Apple" },
                { icon: SiGithub, name: "GitHub" }
              ].map(({ icon: Icon, name }) => (
                <div key={name} className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:border-primary/30 transition-all duration-300">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legal link */}
          <div className="pt-6">
            <Link href="/legal" className="text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline" data-testid="link-legal">
              {t.legal.terms} & {t.legal.privacy}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
