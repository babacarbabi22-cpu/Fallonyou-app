import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider, useI18n, useTranslation } from "@/lib/i18n";
import { HeartCascade } from "@/components/HeartCascade";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import LandingPage from "@/pages/LandingPage";
import SupportPage from "@/pages/SupportPage";
const SwipePage = lazy(() => import("@/pages/SwipePage"));
const MatchesPage = lazy(() => import("@/pages/MatchesPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const PremiumPage = lazy(() => import("@/pages/PremiumPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const SafetyPage = lazy(() => import("@/pages/SafetyPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const DeleteAccountPage = lazy(() => import("@/pages/DeleteAccountPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const EventsPage = lazy(() => import("@/pages/EventsPage"));
const EventDetailPage = lazy(() => import("@/pages/EventDetailPage"));
const TipsPage = lazy(() => import("@/pages/TipsPage"));
const AmbassadorsPage = lazy(() => import("@/pages/AmbassadorsPage"));
const AmbassadorPage = lazy(() => import("@/pages/AmbassadorPage"));
const HowItWorksPage = lazy(() => import("@/pages/HowItWorksPage"));
const AlbumPage = lazy(() => import("@/pages/AlbumPage"));
const CityGuidePage = lazy(() => import("@/pages/CityGuidePage"));
const LanguagePage = lazy(() => import("@/pages/LanguagePage"));
const DestinationsPage = lazy(() => import("@/pages/DestinationsPage"));
const LocalHelpPage = lazy(() => import("@/pages/LocalHelpPage"));
const TripsPage = lazy(() => import("@/pages/TripsPage"));
const LayoversPage = lazy(() => import("@/pages/LayoversPage"));
const PlaceReviewsPage = lazy(() => import("@/pages/PlaceReviewsPage"));
import { useCurrentUser } from "@/hooks/use-danceme";
import { NativePushBridge } from "@/components/NativePushBridge";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TermsModal } from "@/components/TermsModal";
import { ContentUploadConsentProvider } from "@/components/ContentUploadConsent";
import { CookieBanner } from "@/components/CookieBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { hasProfilePhoto } from "@shared/profile-photo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AppLanguageControl } from "@/components/AppLanguageControl";

function AgeConfirmationModal() {
  const t = useTranslation();
  const { confirmAge, isConfirmingAge } = useAuth();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl border">
        <div className="flex justify-end mb-2"><LanguageSelector showLabel /></div>
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
  const { language } = useI18n();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("logged_out") === "1") {
      const messages = {
        es: "Sesión cerrada. Nos vemos pronto.",
        en: "Signed out. See you soon.",
        fr: "Session fermée. À bientôt.",
        sv: "Du har loggat ut. Vi ses snart.",
      };
      toast({ title: messages[language] });
      params.delete("logged_out");
      const remainingQuery = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ""}${window.location.hash}`);
    }
    const verified = params.get("verified");
    const verificationCopy = {
      en: { success: "Email confirmed", welcome: "Welcome to FallonYou! Your account is now active.", expired: "Link expired", expiredDescription: "The verification link has expired. Sign in again to request a new one.", invalid: "Invalid link", invalidDescription: "The verification link is not valid." },
      es: { success: "Email confirmado", welcome: "¡Bienvenido/a a FallonYou! Tu cuenta ya está activa.", expired: "Enlace caducado", expiredDescription: "El enlace de verificación ha expirado. Vuelve a iniciar sesión para solicitar uno nuevo.", invalid: "Enlace inválido", invalidDescription: "El enlace de verificación no es válido." },
      fr: { success: "Adresse e-mail confirmée", welcome: "Bienvenue sur FallonYou ! Votre compte est maintenant actif.", expired: "Lien expiré", expiredDescription: "Le lien de vérification a expiré. Reconnectez-vous pour en demander un nouveau.", invalid: "Lien invalide", invalidDescription: "Le lien de vérification n'est pas valide." },
      sv: { success: "E-post bekräftad", welcome: "Välkommen till FallonYou! Ditt konto är nu aktivt.", expired: "Länken har gått ut", expiredDescription: "Verifieringslänken har gått ut. Logga in igen för att begära en ny.", invalid: "Ogiltig länk", invalidDescription: "Verifieringslänken är inte giltig." },
    }[language];
    if (verified === "success") {
      toast({ title: verificationCopy.success, description: verificationCopy.welcome });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (verified === "expired") {
      toast({ title: verificationCopy.expired, description: verificationCopy.expiredDescription, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (verified === "invalid" || verified === "error") {
      toast({ title: verificationCopy.invalid, description: verificationCopy.invalidDescription, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [language, toast]);
  return null;
}

function ProtectedRoute({ component: Component, skipOnboarding = false }: { component: React.ComponentType; skipOnboarding?: boolean }) {
  const { data: user, isLoading } = useCurrentUser();
  const { ageConfirmed, termsAccepted } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <AppLanguageControl />
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <LandingPage />;
  
  // Show age confirmation modal if user hasn't confirmed yet
  if (!ageConfirmed) {
    return <AgeConfirmationModal />;
  }

  // Show terms & conditions modal if user hasn't accepted yet
  if (!termsAccepted) {
    return <TermsModal />;
  }

  // Redirect new users to onboarding if they don't have a profile yet
  // (unless we're already on the onboarding page)
  if (!skipOnboarding && (!user.profile || !hasProfilePhoto(user))) {
    return <Redirect to="/onboarding" />;
  }

  return (
    <>
      <SessionPing />
      {!skipOnboarding && Component !== ProfilePage && <AppLanguageControl />}
      <Component />
    </>
  );
}

function PublicPageWithLanguage({ component: Component }: { component: React.ComponentType }) {
  return <><AppLanguageControl /><Component /></>;
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
      <Route path="/legal">{() => <PublicPageWithLanguage component={LegalPage} />}</Route>
      <Route path="/privacy">{() => <PublicPageWithLanguage component={LegalPage} />}</Route>
      <Route path="/support">{() => <PublicPageWithLanguage component={SupportPage} />}</Route>
      <Route path="/safety">
        {() => <ProtectedRoute component={SafetyPage} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminPage} />}
      </Route>
      <Route path="/viajes">
        {() => <ProtectedRoute component={TripsPage} />}
      </Route>
      <Route path="/tips">
        {() => <ProtectedRoute component={TipsPage} />}
      </Route>
      <Route path="/place-reviews">
        {() => <ProtectedRoute component={PlaceReviewsPage} />}
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
      <Route path="/destinations">
        {() => <ProtectedRoute component={DestinationsPage} />}
      </Route>
      <Route path="/local-help">
        {() => <ProtectedRoute component={LocalHelpPage} />}
      </Route>
      <Route path="/layovers">
        {() => <ProtectedRoute component={LayoversPage} />}
      </Route>
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/delete-account">{() => <PublicPageWithLanguage component={DeleteAccountPage} />}</Route>
      <Route>{() => <PublicPageWithLanguage component={NotFound} />}</Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ContentUploadConsentProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <NativePushBridge />
            <HeartCascade />
            <Toaster />
            <VerificationToast />
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><AppLanguageControl /><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
              <div className="app-safe-area" data-testid="app-safe-area">
                <Router />
              </div>
            </Suspense>
            <CookieBanner />
            <PWAInstallBanner />
          </ErrorBoundary>
        </TooltipProvider>
        </ContentUploadConsentProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
