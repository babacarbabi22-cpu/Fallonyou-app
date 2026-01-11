import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SiGoogle, SiApple, SiGithub } from "react-icons/si";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/i18n";
import { Link } from "wouter";
import fallonYouLogo from "@assets/IMG_1362_1768162016332.jpeg";

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
      
      {/* Premium animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-gradient-to-br from-primary/30 via-pink-400/20 to-secondary/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[600px] h-[600px] bg-gradient-to-tr from-secondary/30 via-purple-400/20 to-primary/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      
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
            className="w-full h-14 text-lg rounded-2xl font-bold bg-gradient-to-r from-primary via-pink-500 to-secondary text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
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
