import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plane, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/i18n";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

const fallingPlanes = [
  { delay: 0, duration: 12, left: 5, size: 16, color: "text-amber-400", rotation: -45 },
  { delay: 2, duration: 15, left: 20, size: 12, color: "text-yellow-300", rotation: -30 },
  { delay: 4, duration: 10, left: 35, size: 18, color: "text-amber-500", rotation: -60 },
  { delay: 1, duration: 14, left: 50, size: 14, color: "text-white", rotation: -45 },
  { delay: 3, duration: 16, left: 65, size: 10, color: "text-amber-400", rotation: -35 },
  { delay: 5, duration: 11, left: 80, size: 16, color: "text-yellow-400", rotation: -55 },
  { delay: 2.5, duration: 13, left: 95, size: 12, color: "text-white", rotation: -40 },
];

export default function AuthPage() {
  const t = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageConfirmed) {
      toast({
        title: "Error",
        description: t.legal.ageConfirm,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const endpoint = isLogin ? "/api/login" : "/api/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, ageConfirmed: true }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      toast({
        title: isLogin ? t.auth.welcomeBack : t.auth.welcome,
        description: isLogin ? t.auth.loginSuccess : t.auth.registerSuccess,
      });

      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-gradient-to-br from-amber-400/20 via-yellow-300/10 to-amber-200/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] bg-gradient-to-tr from-yellow-400/20 via-amber-300/10 to-yellow-200/20 rounded-full blur-[100px]" />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {fallingPlanes.map((plane, i) => (
          <Plane
            key={i}
            className={`absolute ${plane.color} fill-current opacity-30`}
            style={{
              width: `${plane.size}px`,
              height: `${plane.size}px`,
              left: `${plane.left}%`,
              top: '-20px',
              animation: `fall ${plane.duration}s linear infinite`,
              animationDelay: `${plane.delay}s`,
              transform: `rotate(${plane.rotation}deg)`,
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

      <div className="relative z-10 w-full max-w-md px-6 text-center">
        <div className="mb-6">
          <div className="flex justify-center mb-3">
            <Logo size="xl" />
          </div>
          <p className="text-sm text-muted-foreground font-medium italic max-w-xs mx-auto mt-2">
            "{t.app.tagline}"
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-sm rounded-3xl border border-border/50 p-6 shadow-xl">
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant="ghost"
              className={`flex-1 rounded-xl ${isLogin ? "bg-amber-500 text-white hover:bg-amber-600" : ""}`}
              onClick={() => setIsLogin(true)}
              data-testid="button-login-tab"
            >
              {t.auth.login}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={`flex-1 rounded-xl ${!isLogin ? "bg-amber-500 text-white hover:bg-amber-600" : ""}`}
              onClick={() => setIsLogin(false)}
              data-testid="button-register-tab"
            >
              {t.auth.register}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t.auth.firstName}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="pl-10 h-12 rounded-xl bg-background/50"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t.auth.lastName}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="pl-10 h-12 rounded-xl bg-background/50"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t.auth.email}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 h-12 rounded-xl bg-background/50"
                required
                data-testid="input-email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t.auth.password}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 pr-10 h-12 rounded-xl bg-background/50"
                required
                minLength={6}
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-xl text-left">
              <Checkbox 
                id="age-confirm" 
                checked={ageConfirmed}
                onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
                className="mt-0.5"
                data-testid="checkbox-age-confirm"
              />
              <label htmlFor="age-confirm" className="text-xs leading-tight cursor-pointer">
                <span className="font-medium">{t.legal.ageConfirm}</span>
                <span className="block text-muted-foreground mt-0.5">
                  {t.legal.ageRestriction}
                </span>
              </label>
            </div>

            <Button 
              type="submit"
              disabled={!ageConfirmed || isLoading}
              className="w-full h-12 text-base rounded-xl font-bold bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
              data-testid="button-submit"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? t.auth.loginButton : t.auth.registerButton
              )}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-border/50">
            <Link href="/legal" className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline" data-testid="link-legal">
              {t.legal.terms} & {t.legal.privacy}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
