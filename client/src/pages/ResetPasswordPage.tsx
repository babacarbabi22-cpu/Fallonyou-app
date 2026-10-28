import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Link, useLocation, useSearch } from "wouter";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/lib/i18n";
import { isPasswordResetToken, passwordRecoveryValidation, RESET_PASSWORD_MIN_LENGTH } from "@shared/password-recovery";
import { resetPasswordCopy } from "./reset-password-copy";

const recoveryCodes = ["INVALID_EMAIL", "INVALID_PASSWORD", "PASSWORD_TOO_LONG", "INVALID_RESET_LINK", "RECOVERY_UNAVAILABLE"] as const;
type RecoveryCode = typeof recoveryCodes[number];

function getRecoveryCode(payload: unknown): RecoveryCode | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const body = payload as { code?: unknown; error?: unknown };
  const code = body.code ?? body.error;
  return typeof code === "string" && recoveryCodes.includes(code as RecoveryCode) ? code as RecoveryCode : undefined;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value || !/^\d+(?:\.\d+)?$/.test(value.trim())) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 900 ? seconds : undefined;
}

export default function ResetPasswordPage() {
  const { language } = useI18n();
  const copy = resetPasswordCopy[language];
  const [, setLocation] = useLocation();
  const search = useSearch();
  const tokenParams = new URLSearchParams(search);
  const hasTokenParameter = tokenParams.has("token");
  const token = tokenParams.get("token");
  const hasValidToken = hasTokenParameter && isPasswordResetToken(token);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [error, setError] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  useEffect(() => {
    setError("");
    setRequestSent(false);
    setResetDone(false);
    setNewPassword("");
    setConfirmPassword("");
  }, [search]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => {
    if (cooldownSeconds === 0 && cooldownUntil !== 0) {
      setCooldownUntil(0);
      setError("");
    }
  }, [cooldownSeconds, cooldownUntil]);

  // ── REQUEST RESET (no token) ──────────────────────────
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || cooldownSeconds > 0) return;
    setError("");
    if (!email.trim()) {
      setError(copy.emailRequired);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(copy.emailInvalid);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), language }),
      });
      let payload: unknown;
      try {
        payload = await res.json();
      } catch {
        payload = undefined;
      }
      if (res.status === 429) {
        const seconds = parseRetryAfter(res.headers.get("Retry-After"));
        if (seconds) {
          setCooldownUntil(Date.now() + seconds * 1000);
          setNow(Date.now());
          setError(copy.cooldown(Math.ceil(seconds)));
        } else {
          setError(copy.rateLimited);
        }
        return;
      }
      if (!res.ok) {
        const code = getRecoveryCode(payload);
        setError(code ? copy.errors[code] : copy.unexpectedError);
        return;
      }
      if (res.status !== 202 || !payload || typeof payload !== "object" ||
          !("success" in payload) || payload.success !== true ||
          !("accepted" in payload) || payload.accepted !== true) {
        setError(copy.unexpectedError);
        return;
      }
      setRequestSent(true);
      setError("");
    } catch {
      setError(copy.networkError);
    } finally {
      setIsLoading(false);
    }
  };

  // ── SET NEW PASSWORD (with token) ────────────────────
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || cooldownSeconds > 0) return;
    setError("");
    if (!newPassword) {
      setError(copy.passwordRequired);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }
    const validation = passwordRecoveryValidation(newPassword);
    if (validation) {
      setError(copy.errors[validation]);
      return;
    }
    if (!hasValidToken || !token) {
      setError(copy.errors.INVALID_RESET_LINK);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      let payload: unknown;
      try {
        payload = await res.json();
      } catch {
        payload = undefined;
      }
      if (res.status === 429) {
        const seconds = parseRetryAfter(res.headers.get("Retry-After"));
        if (seconds) {
          setCooldownUntil(Date.now() + seconds * 1000);
          setNow(Date.now());
          setError(copy.cooldown(Math.ceil(seconds)));
        } else {
          setError(copy.rateLimited);
        }
        return;
      }
      if (!res.ok) {
        const code = getRecoveryCode(payload);
        setError(code ? copy.errors[code] : copy.unexpectedError);
        return;
      }
      if (res.status !== 200 || !payload || typeof payload !== "object" ||
          !("success" in payload) || payload.success !== true) {
        setError(copy.unexpectedError);
        return;
      }
      setResetDone(true);
      setError("");
    } catch {
      setError(copy.networkError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background relative overflow-hidden px-6 py-16">
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-gradient-to-br from-amber-400/20 via-yellow-300/10 to-amber-200/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] bg-gradient-to-tr from-yellow-400/20 via-amber-300/10 to-yellow-200/20 rounded-full blur-[100px]" />

      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector prominent />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <Logo size="xl" />
        </div>

        <div className="bg-black/75 text-white backdrop-blur-xl rounded-3xl border border-amber-500/25 p-6 shadow-2xl shadow-black/40">

          {/* ── Neutral request acknowledgement ── */}
          {requestSent && (
            <div className="space-y-5 text-center" data-testid="recovery-request-received">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{copy.requestReceived}</h2>
                <p className="text-sm text-white/70 leading-relaxed">
                  {copy.requestReceivedDetail}
                </p>
                <p className="text-xs text-white/50 mt-2">{copy.spamReminder}</p>
              </div>
              <Button type="button" variant="outline" className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => { setRequestSent(false); setError(""); }} data-testid="button-request-another-reset">
                {copy.requestAnother}
              </Button>
              <Link href="/auth" className="block text-sm text-amber-300 hover:text-amber-200 transition-colors" data-testid="link-back-to-login">
                {copy.backToLogin}
              </Link>
            </div>
          )}

          {/* ── SUCCESS: password changed ── */}
          {resetDone && (
            <div className="space-y-5 text-center" data-testid="recovery-reset-done">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{copy.resetDone}</h2>
                <p className="text-sm text-white/65">{copy.resetDoneDetail}</p>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold"
                onClick={() => setLocation("/auth")}
              >
                {copy.login}
              </Button>
            </div>
          )}

          {/* ── FORM: enter email (no token) ── */}
          {!hasTokenParameter && !requestSent && (
            <form onSubmit={handleForgotSubmit} noValidate className="space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{copy.requestTitle}</h2>
                <p className="text-sm text-white/60">{copy.requestDescription}
                </p>
              </div>

              <div className="relative">
                <label htmlFor="input-forgot-email" className="mb-1.5 block text-left text-xs font-medium text-white/70">{copy.emailLabel}</label>
                <Mail className="absolute left-3 top-[2.65rem] -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                <Input
                  id="input-forgot-email"
                  type="email"
                  placeholder={copy.emailPlaceholder}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="pl-10 h-12 rounded-xl bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-400"
                  autoComplete="email"
                  inputMode="email"
                  data-testid="input-forgot-email"
                />
              </div>

              {error && <p role="alert" data-testid="recovery-error" className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-left text-sm leading-relaxed text-red-100">{error}</p>}

              <Button
                type="submit"
                disabled={isLoading || !email.trim() || cooldownSeconds > 0}
                className="w-full h-12 rounded-xl font-bold text-black bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 hover:brightness-105 disabled:opacity-50"
                data-testid="button-send-reset"
              >
                {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{copy.requestLoading}</> : cooldownSeconds > 0 ? copy.cooldown(cooldownSeconds) : copy.requestButton}
              </Button>

              <Link href="/auth" className="block w-full text-sm text-white/50 hover:text-white/80 transition-colors" data-testid="link-back-to-login">
                {copy.backToLogin}
              </Link>
            </form>
          )}

          {/* ── FORM: set new password (with token) ── */}
          {hasValidToken && !resetDone && (
            <form onSubmit={handleResetSubmit} noValidate className="space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{copy.resetTitle}</h2>
                <p className="text-sm text-white/60">{copy.resetDescription}</p>
              </div>

              <div className="relative">
                <label htmlFor="input-new-password" className="mb-1.5 block text-left text-xs font-medium text-white/70">{copy.passwordLabel}</label>
                <Lock className="absolute left-3 top-[2.65rem] -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                <Input
                  id="input-new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={copy.passwordPlaceholder}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  className="pl-10 pr-10 h-12 rounded-xl bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-400"
                  autoComplete="new-password"
                  minLength={RESET_PASSWORD_MIN_LENGTH}
                  aria-describedby="password-length-note"
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[2.65rem] -translate-y-1/2 text-white/50 hover:text-white"
                  aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                  data-testid="button-toggle-new-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <p id="password-length-note" className="mt-2 text-left text-xs leading-relaxed text-white/45">{copy.passwordLength}{passwordRecoveryValidation(newPassword) === "PASSWORD_TOO_LONG" ? ` ${copy.passwordTooLongNote}` : ""}</p>
              </div>

              <div className="relative">
                <label htmlFor="input-confirm-password" className="mb-1.5 block text-left text-xs font-medium text-white/70">{copy.confirmLabel}</label>
                <Lock className="absolute left-3 top-[2.65rem] -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                <Input
                  id="input-confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={copy.confirmPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  className="pl-10 h-12 rounded-xl bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-400"
                  autoComplete="new-password"
                  data-testid="input-confirm-password"
                />
              </div>

              {error && <p role="alert" data-testid="recovery-error" className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-left text-sm leading-relaxed text-red-100">{error}</p>}

              <Button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword || cooldownSeconds > 0}
                className="w-full h-12 rounded-xl font-bold text-black bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 hover:brightness-105 disabled:opacity-50"
                data-testid="button-reset-password"
              >
                {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{copy.resetLoading}</> : cooldownSeconds > 0 ? copy.cooldown(cooldownSeconds) : copy.resetButton}
              </Button>
            </form>
          )}

          {hasTokenParameter && !hasValidToken && !requestSent && !resetDone && (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{copy.malformedTitle}</h2>
              <p role="alert" data-testid="recovery-error" className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-left text-sm leading-relaxed text-red-100">{error || copy.errors.INVALID_RESET_LINK}</p>
              <Link href="/reset-password" className="block rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 px-4 py-3 font-bold text-black hover:brightness-105" data-testid="button-request-new-link">
                {copy.requestNewLink}
              </Link>
            </div>
          )}

          {error === copy.errors.INVALID_RESET_LINK && hasValidToken && !resetDone && (
            <Link href="/reset-password" className="mt-4 block text-sm text-amber-300 underline underline-offset-4 hover:text-amber-200" data-testid="button-request-new-link">
              {copy.requestNewLink}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
