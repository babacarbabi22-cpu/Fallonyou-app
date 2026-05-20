import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider, useTranslation } from "@/lib/i18n";
import { HeartCascade } from "@/components/HeartCascade";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import SwipePage from "@/pages/SwipePage";
import MatchesPage from "@/pages/MatchesPage";
import ProfilePage from "@/pages/ProfilePage";
import PremiumPage from "@/pages/PremiumPage";
import ChatPage from "@/pages/ChatPage";
import OnboardingPage from "@/pages/OnboardingPage";
import LegalPage from "@/pages/LegalPage";
import SafetyPage from "@/pages/SafetyPage";
import AdminPage from "@/pages/AdminPage";
import DeleteAccountPage from "@/pages/DeleteAccountPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import EventsPage from "@/pages/EventsPage";
import EventDetailPage from "@/pages/EventDetailPage";
import TipsPage from "@/pages/TipsPage";
import AmbassadorsPage from "@/pages/AmbassadorsPage";
import AmbassadorPage from "@/pages/AmbassadorPage";
import HowItWorksPage from "@/pages/HowItWorksPage";
import AlbumPage from "@/pages/AlbumPage";
import CityGuidePage from "@/pages/CityGuidePage";
import LanguagePage from "@/pages/LanguagePage";
import { useCurrentUser } from "@/hooks/use-danceme";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TermsModal } from "@/components/TermsModal";
import { CookieBanner } from "@/components/CookieBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

function AgeConfirmationModal() {
  const t = useTranslation();
  const { confirmAge, isConfirmingAge } = useAuth();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl border">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <Shield className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-center mb-2">{t.legal.ageVerification || "Age Verification"}</h2>
        <p className="text-muted-foreground text-center mb-6 text-sm">
          {t.legal.ageRestriction}
        </p>
        
        <div className="flex items-start gap-3 p-3 bg-background/50 rounded-xl mb-4">
          <Checkbox 
            id="age-confirm-modal" 
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
            className="mt-0.5"
            data-testid="checkbox-age-confirm-modal"
          />
          <label htmlFor="age-confirm-modal" className="text-sm leading-tight cursor-pointer">
            {t.legal.ageConfirm}
          </label>
        </div>

        <Button
          onClick={() => confirmAge()}
          disabled={!confirmed || isConfirmingAge}
          className="w-full"
          data-testid="button-confirm-age"
        >
          {isConfirmingAge ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t.legal.continue || "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}

function SessionPing() {
  useEffect(() => {
    fetch("/api/sessions/ping", { method: "POST", credentials: "include" }).catch(() => {});
  }, []);
  return null;
}

function VerificationToast() {
  const { toast } = useToast();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    if (verified === "success") {
      toast({ title: "✅ Email confirmado", description: "¡Bienvenido/a a FallonYou! Tu cuenta ya está activa." });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (verified === "expired") {
      toast({ title: "Enlace caducado", description: "El enlace de verificación ha expirado. Vuelve a iniciar sesión para solicitar uno nuevo.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (verified === "invalid" || verified === "error") {
      toast({ title: "Enlace inválido", description: "El enlace de verificación no es válido.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  return null;
}

function ProtectedRoute({ component: Component, skipOnboarding = false }: { component: React.ComponentType; skipOnboarding?: boolean }) {
  const { data: user, isLoading } = useCurrentUser();
  const { ageConfirmed, termsAccepted } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <AuthPage />;
  
  // Show age confirmation modal if user hasn't confirmed yet
  if (!ageConfirmed) {
    return (
      <>
        <AgeConfirmationModal />
        <div className="blur-sm pointer-events-none">
          <Component />
        </div>
      </>
    );
  }

  // Show terms & conditions modal if user hasn't accepted yet
  if (!termsAccepted) {
    return (
      <>
        <TermsModal />
        <div className="blur-sm pointer-events-none">
          <Component />
        </div>
      </>
    );
  }

  // Redirect new users to onboarding if they don't have a profile yet
  // (unless we're already on the onboarding page)
  if (!skipOnboarding && !user.profile) {
    return <Redirect to="/onboarding" />;
  }

  return (
    <>
      <SessionPing />
      <Component />
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        {() => <ProtectedRoute component={EventsPage} />}
      </Route>
      <Route path="/discover">
        {() => <ProtectedRoute component={SwipePage} />}
      </Route>
      <Route path="/matches">
        {() => <ProtectedRoute component={MatchesPage} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>
      <Route path="/premium">
        {() => <ProtectedRoute component={PremiumPage} />}
      </Route>
      <Route path="/chat/:matchId">
        {() => <ProtectedRoute component={ChatPage} />}
      </Route>
      <Route path="/onboarding">
        {() => <ProtectedRoute component={OnboardingPage} skipOnboarding />}
      </Route>
      <Route path="/legal" component={LegalPage} />
      <Route path="/privacy">
        {() => <Redirect to="/legal" />}
      </Route>
      <Route path="/safety">
        {() => <ProtectedRoute component={SafetyPage} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminPage} />}
      </Route>
      <Route path="/tips">
        {() => <ProtectedRoute component={TipsPage} />}
      </Route>
      <Route path="/events">
        {() => <ProtectedRoute component={EventsPage} />}
      </Route>
      <Route path="/event/:id">
        {() => <ProtectedRoute component={EventDetailPage} />}
      </Route>
      <Route path="/ambassadors">
        {() => <ProtectedRoute component={AmbassadorsPage} />}
      </Route>
      <Route path="/ambassador">
        {() => <ProtectedRoute component={AmbassadorPage} />}
      </Route>
      <Route path="/how-it-works">
        {() => <ProtectedRoute component={HowItWorksPage} />}
      </Route>
      <Route path="/album">
        {() => <ProtectedRoute component={AlbumPage} />}
      </Route>
      <Route path="/city-guide">
        {() => <ProtectedRoute component={CityGuidePage} />}
      </Route>
      <Route path="/languages">
        {() => <ProtectedRoute component={LanguagePage} />}
      </Route>
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/delete-account" component={DeleteAccountPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <HeartCascade />
            <Toaster />
            <VerificationToast />
            <Router />
            <CookieBanner />
            <PWAInstallBanner />
          </ErrorBoundary>
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
