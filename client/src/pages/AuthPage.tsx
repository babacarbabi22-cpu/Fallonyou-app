import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Mail } from "lucide-react";
import { SiGoogle, SiApple, SiGithub } from "react-icons/si";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/i18n";
import { Link } from "wouter";
import generatedLogo from "@assets/generated_images/danceme_logo_with_heart_sunset_scene.png";

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
      
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-md px-8 text-center">
        
        {/* Logo/Icon Animation */}
        <div className="mx-auto mb-8 w-48 h-48 relative">
           <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse" />
           <div className="absolute inset-0 flex items-center justify-center">
             <img 
               src={generatedLogo} 
               alt="Fall on You Logo" 
               className="w-44 h-44 object-contain rounded-full drop-shadow-[0_20px_50px_rgba(255,0,0,0.4)] animate-in zoom-in duration-700 ease-out border-4 border-white/20"
             />
           </div>
           <div className="absolute top-1 right-1 bg-white rounded-full p-2 shadow-xl animate-bounce">
             <Sparkles className="w-6 h-6 text-red-500 fill-red-200" />
           </div>
        </div>

        <h1 className="text-5xl font-black italic tracking-tighter mb-4 text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-1000">
          {t.app.name}
        </h1>
        
        <p className="text-base text-muted-foreground mb-8 font-medium leading-relaxed italic">
          "{t.app.tagline}"
        </p>

        <div className="space-y-3">
          {/* Age verification checkbox */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl text-left">
            <Checkbox 
              id="age-confirm" 
              checked={ageConfirmed}
              onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
              data-testid="checkbox-age-confirm"
            />
            <label htmlFor="age-confirm" className="text-sm leading-tight cursor-pointer">
              {t.legal.ageConfirm}
              <span className="block text-xs text-muted-foreground mt-1">
                {t.legal.ageRestriction}
              </span>
            </label>
          </div>

          <Button 
            onClick={handleLogin}
            disabled={!ageConfirmed}
            className="w-full h-12 text-base rounded-xl font-semibold bg-foreground text-background shadow-lg transition-all disabled:opacity-50"
            data-testid="button-login"
          >
            {t.auth.loginButton}
          </Button>
          
          {/* Login options info */}
          <div className="pt-4 pb-2">
            <p className="text-sm text-muted-foreground mb-3">
              {t.auth.loginWith}
            </p>
            <div className="flex justify-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <SiGoogle className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">Google</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <SiApple className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">Apple</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <SiGithub className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">GitHub</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">Email</span>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-6">
            {t.auth.terms}{" "}
            <Link href="/legal" className="underline hover:text-foreground" data-testid="link-legal">
              {t.legal.title}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
