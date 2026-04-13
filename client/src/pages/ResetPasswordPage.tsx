import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, Mail, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const token = new URLSearchParams(window.location.search).get("token");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // ── REQUEST RESET (no token) ──────────────────────────
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await res.json();
      setRequestSent(true);
    } catch {
      toast({ title: "Error", description: "No se pudo enviar el email. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── SET NEW PASSWORD (with token) ────────────────────
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      setResetDone(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden px-6">
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-gradient-to-br from-amber-400/20 via-yellow-300/10 to-amber-200/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] bg-gradient-to-tr from-yellow-400/20 via-amber-300/10 to-yellow-200/20 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <Logo size="xl" />
        </div>

        <div className="bg-card/80 backdrop-blur-sm rounded-3xl border border-border/50 p-6 shadow-xl">

          {/* ── SUCCESS: email sent ── */}
          {requestSent && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">¡Email enviado!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace para crear una nueva contraseña en los próximos minutos.
                </p>
                <p className="text-xs text-muted-foreground mt-2">Revisa también la carpeta de spam.</p>
              </div>
              <Link href="/auth">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al inicio de sesión
                </Button>
              </Link>
            </div>
          )}

          {/* ── SUCCESS: password changed ── */}
          {resetDone && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">¡Contraseña actualizada!</h2>
                <p className="text-sm text-muted-foreground">
                  Ya puedes iniciar sesión con tu nueva contraseña.
                </p>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold"
                onClick={() => setLocation("/auth")}
              >
                Iniciar sesión
              </Button>
            </div>
          )}

          {/* ── FORM: enter email (no token) ── */}
          {!token && !requestSent && (
            <form onSubmit={handleForgotSubmit} className="space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold mb-1">¿Olvidaste tu contraseña?</h2>
                <p className="text-sm text-muted-foreground">
                  Introduce tu email y te enviaremos un enlace para crear una nueva.
                </p>
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Tu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl bg-background/50"
                  required
                  data-testid="input-forgot-email"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 text-white"
                data-testid="button-send-reset"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar enlace de recuperación"}
              </Button>

              <Link href="/auth">
                <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-to-login">
                  ← Volver al inicio de sesión
                </button>
              </Link>
            </form>
          )}

          {/* ── FORM: set new password (with token) ── */}
          {token && !resetDone && (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold mb-1">Nueva contraseña</h2>
                <p className="text-sm text-muted-foreground">Elige una contraseña segura de al menos 6 caracteres.</p>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 rounded-xl bg-background/50"
                  required
                  minLength={6}
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  data-testid="button-toggle-new-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12 rounded-xl bg-background/50"
                  required
                  data-testid="input-confirm-password"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 text-white"
                data-testid="button-reset-password"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar nueva contraseña"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
