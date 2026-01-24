import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/i18n";
import { useLocation } from "wouter";
import { ArrowLeft, FileText, Shield, Mail } from "lucide-react";

export default function LegalPage() {
  const t = useTranslation();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation("/profile")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.common.back}
        </Button>

        <h1 className="text-3xl font-bold mb-6">{t.legal.title}</h1>

        <Tabs defaultValue="terms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="terms" data-testid="tab-terms">
              <FileText className="w-4 h-4 mr-2" />
              {t.legal.terms}
            </TabsTrigger>
            <TabsTrigger value="privacy" data-testid="tab-privacy">
              <Shield className="w-4 h-4 mr-2" />
              {t.legal.privacy}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terms">
            <Card>
              <CardHeader>
                <CardTitle>{t.legal.terms}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t.legal.lastUpdated}: {t.legal.lastUpdatedDate}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="font-semibold text-destructive">
                    {t.legal.ageRestriction}
                  </p>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t.legal.termsContent}
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <h3 className="font-semibold text-foreground">1. {t.legal.acceptableUse}</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{t.legal.noExplicitContent}</li>
                    <li>{t.legal.noHarassment}</li>
                    <li>{t.legal.noImpersonation}</li>
                    <li>{t.legal.noSpam}</li>
                  </ul>
                  <h3 className="font-semibold text-foreground mt-4">2. {t.legal.contentGuidelines}</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{t.legal.noNudity}</li>
                    <li>{t.legal.noViolence}</li>
                    <li>{t.legal.noHateSpeech}</li>
                  </ul>
                  <h3 className="font-semibold text-foreground mt-4">3. {t.legal.safety}</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{t.legal.noFinancialInfo}</li>
                    <li>{t.legal.reportSuspicious}</li>
                    <li>{t.legal.publicMeetings}</li>
                  </ul>
                  <h3 className="font-semibold text-foreground mt-4">4. {t.legal.subscriptionTerms}</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{t.legal.autoRenewal}</li>
                    <li>{t.legal.cancelAnytime}</li>
                    <li>{t.legal.refundPolicy}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>{t.legal.privacy}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t.legal.lastUpdated}: {t.legal.lastUpdatedDate}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="font-semibold text-primary">
                    {t.legal.gdprCompliance}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.legal.gdprDesc}
                  </p>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t.legal.privacyContent}
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <h3 className="font-semibold text-foreground">{t.legal.dataCollected}:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{t.legal.profileInfo}</li>
                    <li>{t.legal.searchPreferences}</li>
                    <li>{t.legal.matchHistory}</li>
                    <li>{t.legal.usageData}</li>
                  </ul>
                  <h3 className="font-semibold text-foreground mt-4">{t.legal.yourRights}:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{t.legal.accessData}</li>
                    <li>{t.legal.correctData}</li>
                    <li>{t.legal.deleteAccount}</li>
                    <li>{t.legal.dataPortability}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{t.settings.support}</p>
                <p className="text-sm text-muted-foreground">{t.settings.contactEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
