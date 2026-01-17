import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Shield, Flag, AlertTriangle, Users, Heart, ChevronDown, ChevronUp, ExternalLink, Lock, Eye, MessageCircle } from "lucide-react";
import { Link } from "wouter";

interface SafetySection {
  id: string;
  icon: typeof Shield;
  titleKey: keyof typeof import("@/lib/i18n").translations.es.safety;
  descKey: keyof typeof import("@/lib/i18n").translations.es.safety;
  contentKey: keyof typeof import("@/lib/i18n").translations.es.safety;
  color: string;
}

const sections: SafetySection[] = [
  {
    id: "report",
    icon: Flag,
    titleKey: "reportTitle",
    descKey: "reportDesc",
    contentKey: "reportContent",
    color: "text-orange-500 bg-orange-500/10",
  },
  {
    id: "scams",
    icon: AlertTriangle,
    titleKey: "scamsTitle",
    descKey: "scamsDesc",
    contentKey: "scamsContent",
    color: "text-red-500 bg-red-500/10",
  },
  {
    id: "consent",
    icon: Heart,
    titleKey: "consentTitle",
    descKey: "consentDesc",
    contentKey: "consentContent",
    color: "text-pink-500 bg-pink-500/10",
  },
  {
    id: "inclusion",
    icon: Users,
    titleKey: "inclusionTitle",
    descKey: "inclusionDesc",
    contentKey: "inclusionContent",
    color: "text-purple-500 bg-purple-500/10",
  },
];

export default function SafetyPage() {
  const t = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">{t.safety.title}</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/20 p-3 rounded-full shrink-0">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-2">{t.safety.heroTitle}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t.safety.heroDesc}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card className="hover-elevate cursor-pointer" onClick={() => toggleSection("report")} data-testid="quick-report">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="bg-orange-500/10 p-2 rounded-full">
                <Flag className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-xs font-medium">{t.safety.quickReport}</span>
            </CardContent>
          </Card>
          <Card className="hover-elevate cursor-pointer" onClick={() => toggleSection("scams")} data-testid="quick-scams">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="bg-red-500/10 p-2 rounded-full">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-xs font-medium">{t.safety.quickScams}</span>
            </CardContent>
          </Card>
          <Card className="hover-elevate cursor-pointer" onClick={() => toggleSection("consent")} data-testid="quick-consent">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="bg-pink-500/10 p-2 rounded-full">
                <Heart className="w-5 h-5 text-pink-500" />
              </div>
              <span className="text-xs font-medium">{t.safety.quickConsent}</span>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            
            return (
              <Card 
                key={section.id} 
                className={`transition-all duration-300 ${isExpanded ? "ring-2 ring-primary/20" : "hover-elevate"}`}
              >
                <CardHeader 
                  className="cursor-pointer p-4" 
                  onClick={() => toggleSection(section.id)}
                  data-testid={`section-${section.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${section.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{t.safety[section.titleKey] as string}</CardTitle>
                      <CardDescription className="text-sm mt-0.5">
                        {t.safety[section.descKey] as string}
                      </CardDescription>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 px-4 pb-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-line">
                      {t.safety[section.contentKey] as string}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              {t.safety.privacyTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <Lock className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">{t.safety.privacyTip1}</p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">{t.safety.privacyTip2}</p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">{t.safety.privacyTip3}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">{t.safety.emergencyTitle}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{t.safety.emergencyDesc}</p>
            <Button variant="outline" className="w-full" data-testid="button-emergency-resources">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t.safety.emergencyButton}
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
