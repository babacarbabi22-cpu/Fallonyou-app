import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useCurrentUser } from "@/hooks/use-danceme";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DeleteAccountPage() {
  const t = useTranslation();
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleDeleteAccount = async () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setIsDeleting(true);
    try {
      await apiRequest("DELETE", "/api/user/delete-account");
      queryClient.clear();
      window.location.href = "/";
    } catch (error) {
      toast({
        title: t.common?.error || "Error",
        description: t.profile?.deleteError || "Could not delete account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Link href="/profile">
          <Button variant="ghost" className="mb-6" data-testid="button-back-profile">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.common?.back || "Back"}
          </Button>
        </Link>

        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-destructive">
                  {t.profile?.deleteAccount || "Delete Account"}
                </CardTitle>
                <CardDescription>
                  {t.profile?.deleteAccountDescription || "Permanently remove your account and all data"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <h3 className="font-semibold text-destructive mb-2">
                {t.profile?.deleteWarningTitle || "Warning: This action cannot be undone"}
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• {t.profile?.deleteWarning1 || "Your profile will be permanently deleted"}</li>
                <li>• {t.profile?.deleteWarning2 || "All your photos will be removed"}</li>
                <li>• {t.profile?.deleteWarning3 || "Your matches and conversations will be lost"}</li>
                <li>• {t.profile?.deleteWarning4 || "Any active subscription will be cancelled"}</li>
              </ul>
            </div>

            {user ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {confirmed 
                    ? (t.profile?.deleteConfirmFinal || "Are you absolutely sure? Click again to permanently delete your account.")
                    : (t.profile?.deleteConfirmFirst || "Click the button below to begin the account deletion process.")
                  }
                </p>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="w-full"
                  data-testid="button-delete-account-confirm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting 
                    ? (t.common?.loading || "Loading...")
                    : confirmed 
                      ? (t.profile?.deleteAccountFinal || "Yes, Delete My Account Forever")
                      : (t.profile?.deleteAccount || "Delete Account")
                  }
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  {t.profile?.loginToDelete || "Please log in to delete your account"}
                </p>
                <Link href="/auth">
                  <Button data-testid="button-login-delete">
                    {t.auth?.login || "Log In"}
                  </Button>
                </Link>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {t.profile?.deleteDataInfo || "In accordance with GDPR and data protection regulations, your personal data will be permanently deleted within 30 days of account deletion. Some anonymized data may be retained for legal compliance purposes."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
