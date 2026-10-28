import { useLocation } from "wouter";
import { ArrowLeft, Calendar, Users, MessageCircle, Shield, Crown, Star, Lightbulb, ChevronRight, Plane, Heart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

export default function HowItWorksPage() {
  const [, setLocation] = useLocation();
  const t = useTranslation();
  const h = t.howItWorks;

  const features = [
    {
      icon: Calendar,
      color: "bg-amber-500/15 text-amber-500",
      badge: h.free,
      badgeVariant: "secondary" as const,
      title: h.f1Title,
      desc: h.f1Desc,
      tips: [h.f1Tip1, h.f1Tip2],
    },
    {
      icon: Users,
      color: "bg-rose-500/15 text-rose-500",
      badge: h.free,
      badgeVariant: "secondary" as const,
      title: h.f2Title,
      desc: h.f2Desc,
      tips: [h.f2Tip1, h.f2Tip2],
    },
    {
      icon: MessageCircle,
      color: "bg-blue-500/15 text-blue-500",
      badge: h.free,
      badgeVariant: "secondary" as const,
      title: h.f3Title,
      desc: h.f3Desc,
      tips: [h.f3Tip1, h.f3Tip2],
    },
    {
      icon: Shield,
      color: "bg-green-500/15 text-green-600",
      badge: h.recommended,
      badgeVariant: "outline" as const,
      title: h.f4Title,
      desc: h.f4Desc,
      tips: [h.f4Tip1, h.f4Tip2],
    },
    {
      icon: Crown,
      color: "bg-violet-500/15 text-violet-500",
      badge: "Premium",
      badgeVariant: "default" as const,
      title: h.f5Title,
      desc: h.f5Desc,
      tips: [h.f5Tip1, h.f5Tip2],
    },
    {
      icon: Star,
      color: "bg-amber-400/15 text-amber-400",
      badge: h.rewards,
      badgeVariant: "outline" as const,
      title: h.f6Title,
      desc: h.f6Desc,
      tips: [h.f6Tip1, h.f6Tip2],
    },
  ];

  const proTips = [
    { icon: "📸", text: h.proTip1 },
    { icon: "✍️", text: h.proTip2 },
    { icon: "🎉", text: h.proTip3 },
    { icon: "🪪", text: h.proTip4 },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/profile")}
          data-testid="button-back"
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h1 className="font-bold text-lg">{h.title}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="w-5 h-5" />
              <span className="text-sm font-semibold opacity-90">FallonYou</span>
            </div>
            <h2 className="text-2xl font-black mb-1">{h.heroTitle}</h2>
            <p className="text-sm opacity-85 leading-relaxed">{h.heroDesc}</p>
          </div>
        </div>

        {/* Feature cards */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-muted-foreground uppercase tracking-wider text-xs">{h.featuresLabel}</h3>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${f.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-sm">{f.title}</span>
                          <Badge variant={f.badgeVariant} className="text-xs h-5">
                            {f.badge}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="border-t bg-muted/30 px-4 py-3 space-y-1.5">
                    {f.tips.map((tip, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pro tips section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground text-xs">{h.proTipsLabel}</h3>
          </div>
          <Card>
            <CardContent className="p-4 space-y-3">
              {proTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{tip.icon}</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={() => setLocation("/")}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
            size="lg"
            data-testid="button-explore-activities"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {h.ctaActivities}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/discover")}
            className="w-full"
            data-testid="button-discover-people"
          >
            <Heart className="w-4 h-4 mr-2" />
            {h.ctaDiscover}
          </Button>
        </div>

      </div>
    </div>
  );
}
