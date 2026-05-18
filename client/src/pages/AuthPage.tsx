import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Heart, Star, Plane, ChevronDown, ShieldCheck, Camera, Ban, UserX, Scale, Hand } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/i18n";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import posterBg from "@assets/poster_adventure_base.png";

const fallingIcons = [
  { delay: 0,   duration: 12, left: 5,  size: 16, color: "text-amber-400", type: "plane" },
  { delay: 2,   duration: 15, left: 20, size: 13, color: "text-yellow-300", type: "star"  },
  { delay: 4,   duration: 10, left: 35, size: 18, color: "text-amber-500", type: "plane" },
  { delay: 1,   duration: 14, left: 50, size: 11, color: "text-white",     type: "star"  },
  { delay: 3,   duration: 16, left: 65, size: 14, color: "text-amber-400", type: "plane" },
  { delay: 5,   duration: 11, left: 80, size: 15, color: "text-yellow-400", type: "star" },
  { delay: 2.5, duration: 13, left: 92, size: 10, color: "text-white",     type: "plane" },
  { delay: 6,   duration: 14, left: 12, size: 12, color: "text-amber-300", type: "plane" },
  { delay: 0.8, duration: 17, left: 73, size: 13, color: "text-yellow-300", type: "star"},
];

export default function AuthPage() {
  const t = useTranslation();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", firstName: "" });
  const [legalExpanded, setLegalExpanded] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !ageConfirmed) {
      toast({ title: "Edad requerida", description: "Debes confirmar que tienes 18 años o más para registrarte.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const attemptLogin = async (attempt: number): Promise<void> => {
      const endpoint = isLogin ? "/api/login" : "/api/register";
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, lastName: "", ageConfirmed }),
          credentials: "include",
        });
      } catch {
        // Network error — server may be restarting, retry once after 2 seconds
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 2000));
          return attemptLogin(attempt + 1);
        }
        throw new Error("No se pudo conectar con el servidor. Inténtalo de nuevo en unos segundos.");
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Email o contraseña incorrectos.");
        }
        if (response.status >= 500) {
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 2000));
            return attemptLogin(attempt + 1);
          }
          throw new Error("El servidor tuvo un problema. Inténtalo de nuevo en unos segundos.");
        }
        throw new Error(data.error || "Error al iniciar sesión.");
      }

      toast({ title: isLogin ? t.auth.welcomeBack : "¡Bienvenido/a! 🎉", description: isLogin ? t.auth.loginSuccess : t.auth.registerSuccess });
      window.location.href = "/";
    };

    try {
      await attemptLogin(1);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Algo salió mal. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">

      {/* Background */}
      <img src={posterBg} alt="" className="absolute inset-0 w-full h-full object-cover object-top" draggable={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/55 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-amber-900/10" />

      {/* Falling icons */}
      <style>{`
        @keyframes fall { 0%{transform:translateY(-30px) rotate(0deg);opacity:0} 8%{opacity:.55} 92%{opacity:.45} 100%{transform:translateY(105vh) rotate(360deg);opacity:0} }
        @keyframes ballDrop {
          0%   { transform:translateX(-50%) translateY(-90px); opacity:0; }
          10%  { opacity:1; }
          42%  { transform:translateX(-50%) translateY(62px); animation-timing-function:ease-out; }
          44%  { transform:translateX(-50%) translateY(66px) scaleX(1.2) scaleY(0.76); }
          52%  { transform:translateX(-50%) translateY(18px) scaleX(1) scaleY(1); }
          60%  { transform:translateX(-50%) translateY(62px); }
          62%  { transform:translateX(-50%) translateY(64px) scaleX(1.1) scaleY(0.86); }
          68%  { transform:translateX(-50%) translateY(38px); }
          74%  { transform:translateX(-50%) translateY(60px); }
          80%  { transform:translateX(-50%) translateY(56px); }
          87%  { transform:translateX(-50%) translateY(56px); opacity:1; }
          100% { transform:translateX(-50%) translateY(56px); opacity:0; }
        }
        @keyframes handsReceive {
          0%,41%  { transform:scale(1) translateY(0); }
          44%  { transform:scale(1.06) translateY(4px); }
          51%  { transform:scale(0.97) translateY(-2px); }
          56%  { transform:scale(1) translateY(0); }
          60%  { transform:scale(1.03) translateY(2px); }
          65%  { transform:scale(1) translateY(0); }
          100% { transform:scale(1) translateY(0); }
        }
        @keyframes titleBounce {
          0%,40%  { transform:scaleX(1) scaleY(1); }
          43%  { transform:scaleX(1.03) scaleY(0.94); }
          47%  { transform:scaleX(0.98) scaleY(1.04); }
          52%  { transform:scaleX(1) scaleY(1); }
          100% { transform:scaleX(1) scaleY(1); }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {fallingIcons.map((icon, i) => {
          const Ic = icon.type === "heart" ? Heart : icon.type === "plane" ? Plane : Star;
          return <Ic key={i} className={`absolute ${icon.color} fill-current`} style={{ width: icon.size, height: icon.size, left: `${icon.left}%`, top: "-30px", animation: `fall ${icon.duration}s linear infinite`, animationDelay: `${icon.delay}s`, filter: "drop-shadow(0 0 4px rgba(251,191,36,0.5))" }} />;
        })}
      </div>

      {/* Language selector */}
      <div className="absolute top-4 right-4 z-20"><LanguageSelector /></div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm px-5 flex flex-col items-center gap-5">

        {/* Brand */}
        <div className="text-center relative">
          {/* Falling ball */}
          <div style={{
            position: "absolute",
            top: 0,
            left: "50%",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #FDE68A, #D97706 70%)",
            boxShadow: "0 0 14px rgba(251,191,36,0.7), 0 2px 6px rgba(0,0,0,0.5)",
            animation: "ballDrop 4s ease-in infinite",
            animationDelay: "0.6s",
            zIndex: 10,
            pointerEvents: "none",
          }} />
          <h1
            className="font-display font-black text-5xl italic tracking-tight"
            style={{
              background: "linear-gradient(135deg,#D97706 0%,#FCD34D 45%,#F59E0B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 2px 16px rgba(251,191,36,0.45))",
              animation: "titleBounce 4s ease-in infinite",
              animationDelay: "0.6s",
              display: "inline-block",
            }}>
            FallonYou
          </h1>
          {/* Golden hands that catch the ball */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: 2,
            marginTop: 4,
            animation: "handsReceive 4s ease-in infinite",
            animationDelay: "0.6s",
          }}>
            <Hand
              size={30}
              style={{
                transform: "scaleX(-1) rotate(20deg)",
                color: "#FCD34D",
                filter: "drop-shadow(0 0 10px rgba(251,191,36,0.75))",
                strokeWidth: 1.6,
              }}
            />
            <Hand
              size={30}
              style={{
                transform: "rotate(-20deg)",
                color: "#FCD34D",
                filter: "drop-shadow(0 0 10px rgba(251,191,36,0.75))",
                strokeWidth: 1.6,
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-8 bg-amber-500/40" />
            <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase">Depende de ti</p>
            <div className="h-px w-8 bg-amber-500/40" />
          </div>
          <p className="text-white/50 text-xs mt-2 tracking-wide">
            Conoce gente, únete a planes y viaja diferente
          </p>
        </div>

        {/* ── Main auth card ── */}
        <div className="w-full rounded-3xl p-6 shadow-2xl"
            style={{ background: "rgba(8,8,8,0.75)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(245,158,11,0.25)", boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(245,158,11,0.15)" }}>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }}>
              {[true, false].map((login) => (
                <button
                  key={String(login)}
                  type="button"
                  onClick={() => { setIsLogin(login); setAgeConfirmed(false); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${isLogin === login ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30" : "text-white/50 hover:text-white/80"}`}
                  data-testid={login ? "button-login-tab" : "button-register-tab"}
                >
                  {login ? t.auth.login : t.auth.register}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* First name — only on register */}
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                  <Input
                    type="text"
                    placeholder="Tu nombre"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="pl-10 h-12 rounded-xl text-white placeholder:text-white/30 border-white/10 focus:border-amber-500/60"
                    style={{ background: "rgba(255,255,255,0.07)" }}
                    required
                    data-testid="input-first-name"
                  />
                </div>
              )}

              {/* Email */}
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
                  autoComplete="email"
                  data-testid="input-email"
                />
              </div>

              {/* Password */}
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
                  autoComplete={isLogin ? "current-password" : "new-password"}
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

              {/* Terms acceptance — only on register */}
              {!isLogin && (
                <div className="space-y-2.5">

                  {/* Checkbox + accept text */}
                  <label className="flex items-start gap-3 cursor-pointer group" data-testid="label-age-confirm">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={ageConfirmed}
                        onChange={(e) => setAgeConfirmed(e.target.checked)}
                        className="sr-only"
                        data-testid="checkbox-age-confirm"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${ageConfirmed ? "border-amber-500 bg-amber-500" : "border-white/30 bg-white/5 group-hover:border-amber-500/50"}`}>
                        {ageConfirmed && (
                          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-white/60 text-xs leading-relaxed group-hover:text-white/80 transition-colors">
                      Tengo <strong className="text-amber-400">18 años o más</strong> y acepto los{" "}
                      <Link href="/legal" className="text-amber-400/80 hover:text-amber-400 underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
                        Términos de Uso y la Política de Privacidad
                      </Link>{" "}de FallonYou.
                    </span>
                  </label>

                  {/* Expandable conditions */}
                  <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}>
                    <button
                      type="button"
                      onClick={() => setLegalExpanded(!legalExpanded)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-white/5"
                      data-testid="button-toggle-legal"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-400/70 shrink-0" />
                      <span className="text-amber-300/80 text-xs font-medium flex-1 text-left">Ver condiciones de uso</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-amber-400/50 shrink-0 transition-transform duration-200 ${legalExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {legalExpanded && (
                      <div className="px-3.5 pb-4 pt-1 space-y-3 border-t" style={{ borderColor: "rgba(245,158,11,0.12)" }}>

                        <p className="text-white/40 text-[11px] uppercase tracking-widest font-semibold pt-1">
                          Compromisos al crear tu cuenta
                        </p>

                        {[
                          {
                            icon: <Camera className="w-3.5 h-3.5 text-amber-400" />,
                            title: "Solo tus propias fotos",
                            desc: "Debes subir únicamente fotos tuyas reales. Usar imágenes de otras personas sin su consentimiento constituye usurpación de identidad.",
                          },
                          {
                            icon: <UserX className="w-3.5 h-3.5 text-amber-400" />,
                            title: "Sin cuentas falsas",
                            desc: "Está prohibido crear perfiles con identidades inventadas, personajes ficticios o datos falsos. Cada cuenta debe representar a una persona real.",
                          },
                          {
                            icon: <Ban className="w-3.5 h-3.5 text-amber-400" />,
                            title: "Comportamiento respetuoso",
                            desc: "No se permite el acoso, el lenguaje ofensivo ni el contenido inapropiado. FallonYou es un espacio seguro para todos.",
                          },
                          {
                            icon: <Scale className="w-3.5 h-3.5 text-amber-400" />,
                            title: "Responsabilidad legal",
                            desc: "El incumplimiento puede derivar en la suspensión de la cuenta y, en casos graves, en acciones legales conforme a la legislación vigente.",
                          },
                        ].map((item, i) => (
                          <div key={i} className="flex gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              {item.icon}
                            </div>
                            <div>
                              <p className="text-white/75 text-xs font-semibold leading-tight">{item.title}</p>
                              <p className="text-white/40 text-[11px] leading-relaxed mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))}

                        <p className="text-white/25 text-[10px] leading-relaxed pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                          FallonYou registra el email, la IP y el dispositivo de cada sesión con fines de seguridad y cumplimiento legal.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base rounded-xl font-bold text-black shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-200"
                style={{ background: "linear-gradient(135deg,#D97706,#F59E0B,#FCD34D)" }}
                data-testid="button-submit"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? t.auth.loginButton : t.auth.registerButton}
              </Button>
            </form>

            {isLogin && (
              <div className="mt-3 text-center">
                <Link href="/reset-password" className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors" data-testid="link-forgot-password">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            )}

            <div className="mt-4 pt-4 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <Link href="/legal" className="text-xs text-white/20 hover:text-white/45 transition-colors" data-testid="link-legal">
                {t.legal.terms} & {t.legal.privacy}
              </Link>
            </div>
        </div>

        <p className="text-white/30 text-xs text-center tracking-wide">Gratis · Free · Gratuit</p>
      </div>
    </div>
  );
}
