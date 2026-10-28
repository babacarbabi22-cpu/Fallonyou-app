import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { contentLicenseCopy } from "@/lib/content-license";
import { Link, useLocation } from "wouter";
import { privacyCopy, PRIVACY_UPDATED_AT, PRIVACY_CONTROLLER_NAME } from "@/lib/privacy-copy";
import { ArrowLeft, FileText, Shield, Mail } from "lucide-react";

export default function LegalPage() {
  const { t, language } = useI18n();
  const license = contentLicenseCopy[language];
  const privacy = privacyCopy[language];
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

        <Tabs defaultValue={window.location.pathname === "/privacy" ? "privacy" : "terms"} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2">
            <TabsTrigger value="terms" className="min-w-0 whitespace-normal text-xs sm:text-sm" data-testid="tab-terms">
              <FileText className="w-4 h-4 mr-2 shrink-0" />
              {t.legal.terms}
            </TabsTrigger>
            <TabsTrigger value="privacy" className="min-w-0 whitespace-normal text-xs sm:text-sm" data-testid="tab-privacy">
              <Shield className="w-4 h-4 mr-2 shrink-0" />
              {privacy.title}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terms">
            <Card>
              <CardHeader>
                <CardTitle>{t.legal.terms}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t.legal.lastUpdated}: {license.updatedAt}
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
                  <h3 className="font-semibold text-foreground mt-4">{license.title}</h3>
                  <p>{license.rights}</p>
                  <p>{license.license}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>{privacy.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {privacy.updated}: {new Intl.DateTimeFormat(language, { dateStyle: "long", timeZone: "UTC" }).format(new Date(PRIVACY_UPDATED_AT))}
                </p>
              </CardHeader>
              <CardContent className="space-y-5" data-testid="privacy-policy-content">
                <section className="space-y-2" data-testid="privacy-controller">
                  <h2 className="font-semibold">{privacy.controllerLabel}</h2>
                  <p className="text-sm text-muted-foreground">{PRIVACY_CONTROLLER_NAME} · {privacy.controllerCountry}</p>
                </section>
                <p className="text-muted-foreground leading-relaxed">{privacy.intro}</p>
                {privacy.sections.map(section => (
                  <section key={section.id} id={`privacy-${section.id}`} className="space-y-2">
                    <h2 className="font-semibold">{section.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{section.text}</p>
                  </section>
                ))}
                <Link href="/delete-account">
                  <Button variant="outline" data-testid="privacy-delete-account">{privacy.deleteAction}</Button>
                </Link>
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
