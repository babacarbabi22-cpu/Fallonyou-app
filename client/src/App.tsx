import { useState } from "react";
import { Switch, Route } from "wouter";
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
import { useCurrentUser } from "@/hooks/use-danceme";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Loader2 } from "lucide-react";

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

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useCurrentUser();
  const { ageConfirmed } = useAuth();

  if (isLoading) return null;
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

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
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
        {() => <ProtectedRoute component={OnboardingPage} />}
      </Route>
      <Route path="/legal" component={LegalPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <HeartCascade />
          <Toaster />
          <Router />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
