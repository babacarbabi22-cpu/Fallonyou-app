import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

interface VerificationStatusProps {
  showRequestButton?: boolean;
}

export function VerificationStatus({ showRequestButton = true }: VerificationStatusProps) {
  const t = useTranslation();
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery({
    queryKey: ["/api/verification/status"],
  });

  const requestVerification = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verification/request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verification/status"] });
      toast({
        title: t.verification.approved,
        description: t.verification.benefits,
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        variant: "destructive",
      });
    },
  });

  if (isLoading) return null;

  const isVerified = status?.isVerified;

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isVerified ? (
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">
                {t.profile.verification}
              </p>
              <p className="text-sm text-muted-foreground">
                {isVerified ? t.profile.verified : t.profile.notVerified}
              </p>
            </div>
          </div>
          {showRequestButton && !isVerified && (
            <Button
              size="sm"
              onClick={() => requestVerification.mutate()}
              disabled={requestVerification.isPending}
              data-testid="button-verify-now"
            >
              {t.profile.verifyNow}
            </Button>
          )}
        </div>
        {!isVerified && (
          <p className="text-xs text-muted-foreground mt-3">
            {t.verification.benefits}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <ShieldCheck className={`w-4 h-4 text-blue-500 ${className}`} />
  );
}
