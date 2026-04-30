import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Heart, Star, Plane, AlertTriangle } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/i18n";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import posterBg from "@assets/poster_adventure_base.png";

const fallingIcons = [
  { delay: 0,   duration: 12, left: 5,  size: 16, color: "text-amber-400", type: "heart" },
  { delay: 2,   duration: 15, left: 20, size: 13, color: "text-yellow-300", type: "star"  },
  { delay: 4,   duration: 10, left: 35, size: 18, color: "text-amber-500", type: "heart" },
  { delay: 1,   duration: 14, left: 50, size: 11, color: "text-white",     type: "star"  },
  { delay: 3,   duration: 16, left: 65, size: 14, color: "text-amber-400", type: "plane" },
  { delay: 5,   duration: 11, left: 80, size: 15, color: "text-yellow-400", type: "star" },
  { delay: 2.5, duration: 13, left: 92, size: 10, color: "text-white",     type: "heart" },
  { delay: 6,   duration: 14, left: 12, size: 12, color: "text-amber-300", type: "plane" },
  { delay: 0.8, duration: 17, left: 73, size: 13, color: "text-yellow-300", type: "heart"},
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
      if (!response.ok) throw new Error(data.error || "Authentication failed");

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
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">

      {/* Full-screen background image */}
      <img
        src={posterBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-top"
        draggable={false}
      />

      {/* Dark overlay — stronger at bottom where form sits */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/55 to-black/80" />

      {/* Subtle gold vignette */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-amber-900/10" />

      {/* Falling icons */}
      <style>{`
        @keyframes fall {
          0%   { transform: translateY(-30px) rotate(0deg);   opacity: 0; }
          8%   { opacity: 0.55; }
          92%  { opacity: 0.45; }
          100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {fallingIcons.map((icon, i) => {
          const IconComponent = icon.type === "heart" ? Heart : icon.type === "plane" ? Plane : Star;
          return (
            <IconComponent
              key={i}
              className={`absolute ${icon.color} fill-current`}
              style={{
                width: `${icon.size}px`,
                height: `${icon.size}px`,
                left: `${icon.left}%`,
                top: "-30px",
                animation: `fall ${icon.duration}s linear infinite`,
                animationDelay: `${icon.delay}s`,
                filter: "drop-shadow(0 0 4px rgba(251,191,36,0.5))",
              }}
            />
          );
        })}
      </div>

      {/* Language selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-5 flex flex-col items-center gap-6">

        {/* Brand block */}
        <div className="text-center">
          <h1 className="font-display font-black text-5xl italic tracking-tight"
            style={{
              background: "linear-gradient(135deg,#D97706 0%,#FCD34D 45%,#F59E0B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 2px 16px rgba(251,191,36,0.45))",
            }}>
            FallonYou
          </h1>
          <p className="text-white/60 text-sm font-light tracking-[3px] uppercase mt-1">
            Actividades · Viajes · Conexiones
          </p>
        </div>

        {/* Glass card */}
        <div
          className="w-full rounded-3xl p-6 shadow-2xl"
          style={{
            background: "rgba(8,8,8,0.72)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(245,158,11,0.25)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(245,158,11,0.15)",
          }}
        >
          {/* Tab switcher */}
          <div className="flex gap-1 mb-6 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }}>
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isLogin
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                  : "text-white/50 hover:text-white/80"
              }`}
              data-testid="button-login-tab"
            >
              {t.auth.login}
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                !isLogin
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                  : "text-white/50 hover:text-white/80"
              }`}
              data-testid="button-register-tab"
            >
              {t.auth.register}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                    <Input
                      type="text"
                      placeholder={t.auth.firstName}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="pl-10 h-12 rounded-xl text-white placeholder:text-white/30 border-white/10 focus:border-amber-500/60"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                    <Input
                      type="text"
                      placeholder={t.auth.lastName}
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="pl-10 h-12 rounded-xl text-white placeholder:text-white/30 border-white/10 focus:border-amber-500/60"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                {/* ⚠️ Aviso legal anti-cuentas falsas */}
                <div
                  className="rounded-xl p-3 flex gap-2.5"
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.45)",
                  }}
                  data-testid="warning-fake-accounts"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-red-300 text-xs font-bold uppercase tracking-wide">
                      Aviso legal importante
                    </p>
                    <p className="text-red-200/85 text-xs leading-relaxed">
                      Usar fotos de otra persona sin su consentimiento es un delito tipificado en el{" "}
                      <strong>artículo 197 del Código Penal español</strong> (usurpación de identidad) y puede conllevar{" "}
                      <strong>penas de prisión de hasta 4 años</strong> y responsabilidad civil.
                      FallonYou registra la IP, el email y el dispositivo de cada cuenta.
                      Los perfiles falsos serán denunciados a las autoridades competentes.
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
              <Input
                type="email"
                placeholder={t.auth.email}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 h-12 rounded-xl text-white placeholder:text-white/30 border-white/10 focus:border-amber-500/60"
                style={{ background: "rgba(255,255,255,0.07)" }}
                required
                data-testid="input-email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t.auth.password}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 pr-10 h-12 rounded-xl text-white placeholder:text-white/30 border-white/10 focus:border-amber-500/60"
                style={{ background: "rgba(255,255,255,0.07)" }}
                required
                minLength={6}
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Age confirm */}
            <div
              className="flex items-start gap-3 p-3 rounded-xl text-left"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Checkbox
                id="age-confirm"
                checked={ageConfirmed}
                onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
                className="mt-0.5 border-white/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                data-testid="checkbox-age-confirm"
              />
              <label htmlFor="age-confirm" className="text-xs leading-tight cursor-pointer">
                <span className="font-medium text-white/80">{t.legal.ageConfirm}</span>
                <span className="block text-white/35 mt-0.5">{t.legal.ageRestriction}</span>
              </label>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={!ageConfirmed || isLoading}
              className="w-full h-12 text-base rounded-xl font-bold text-black shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
              style={{
                background: ageConfirmed
                  ? "linear-gradient(135deg,#D97706,#F59E0B,#FCD34D)"
                  : "rgba(245,158,11,0.4)",
              }}
              data-testid="button-submit"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? t.auth.loginButton : t.auth.registerButton
              )}
            </Button>
          </form>

          {isLogin && (
            <div className="mt-3 text-center">
              <Link
                href="/reset-password"
                className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
                data-testid="link-forgot-password"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          )}

          <div className="mt-4 pt-4 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Link
              href="/legal"
              className="text-xs text-white/25 hover:text-white/50 transition-colors"
              data-testid="link-legal"
            >
              {t.legal.terms} & {t.legal.privacy}
            </Link>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-white/35 text-xs text-center tracking-wide">
          Gratis · Free · Gratuit
        </p>
      </div>
    </div>
  );
}
