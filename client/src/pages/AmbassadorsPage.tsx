import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Star, Plane, Copy, Check, Users, Gift, Trophy, Crown, Sparkles, ChevronRight, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface ReferralTier {
  min: number;
  max: number;
  reward: string;
  label: string;
}

interface ReferralStats {
  code: string;
  count: number;
  currentTier: ReferralTier | null;
  nextTier: ReferralTier | null;
  tiers: ReferralTier[];
  referredBy: string | null;
}

const TIER_ICONS = [Gift, Star, Crown, Trophy, Sparkles];
const TIER_COLORS = [
  "from-amber-600/20 to-amber-500/10 border-amber-500/30",
  "from-amber-500/25 to-yellow-500/10 border-yellow-500/40",
  "from-yellow-400/25 to-amber-400/10 border-yellow-400/40",
  "from-amber-300/25 to-yellow-300/10 border-amber-300/40",
  "from-yellow-300/30 to-amber-200/10 border-yellow-300/50",
];

export default function AmbassadorsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");

  const { data: stats, isLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/stats"],
  });

  const { mutate: applyReferral, isPending: isApplying } = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/referrals/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error aplicando código");
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "¡Código aplicado!", description: `Registrado como invitado por ${data.referrerName}. ¡Gracias!` });
      setApplyCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/stats"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const shareLink = stats?.code
    ? `${window.location.origin}/auth?ref=${stats.code}`
    : "";

  const handleCopy = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast({ title: "¡Copiado!", description: "Enlace copiado al portapapeles" });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share && shareLink) {
      await navigator.share({
        title: "Únete a FallonYou",
        text: "¡Te invito a FallonYou, la app para viajeros y conexiones! Usa mi código para registrarte.",
        url: shareLink,
      });
    } else {
      handleCopy();
    }
  };

  const progressPct = stats
    ? stats.nextTier
      ? Math.min(100, ((stats.count - (stats.nextTier.min - 1)) / (stats.nextTier.min - (stats.currentTier?.min ?? 0))) * 100)
      : 100
    : 0;

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-800" />
        {/* Background particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <span key={i} className={`absolute text-amber-400 opacity-20 animate-slowblink-${i % 8}`}
              style={{ top: `${10 + (i * 7) % 80}%`, left: `${5 + (i * 9) % 90}%`, fontSize: `${10 + (i % 3) * 4}px` }}>
              {i % 2 === 0 ? "♥" : "★"}
            </span>
          ))}
        </div>

        <div className="relative px-4 pt-14 pb-8">
          <Link href="/profile">
            <button className="absolute top-4 left-4 p-2 rounded-full bg-white/10 text-white" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Star className="w-6 h-6 text-amber-400 fill-amber-400 animate-twinkle" />
              <Plane className="w-6 h-6 text-amber-400 fill-amber-400 animate-twinkle-delay-1 -rotate-45" />
              <span className="font-black uppercase tracking-widest text-lg"
                style={{
                  fontFamily: "'Georgia', serif",
                  fontStyle: "italic",
                  background: "linear-gradient(135deg, #fde68a, #f59e0b, #fbbf24)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                FallonYou
              </span>
              <Plane className="w-6 h-6 text-amber-400 fill-amber-400 animate-twinkle-delay-2 rotate-45" />
              <Star className="w-6 h-6 text-amber-400 fill-amber-400 animate-twinkle-delay-3" />
            </div>

            <h1 className="text-2xl font-black text-white mb-1">Programa de Embajadores</h1>
            <p className="text-amber-300/80 text-sm max-w-xs mx-auto">
              Invita a tus amigos, gana recompensas y ayúdanos a crecer juntos
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">

        {/* How it works */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-muted-foreground uppercase tracking-widest">¿Cómo funciona?</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🔗", step: "1", text: "Comparte tu enlace único con amigos" },
              { icon: "👥", step: "2", text: "Se registran usando tu enlace" },
              { icon: "🎁", step: "3", text: "Ganas recompensas automáticamente" },
            ].map((item) => (
              <Card key={item.step} className="bg-muted/40 border-border/50">
                <CardContent className="p-3 text-center space-y-1.5">
                  <div className="text-2xl">{item.icon}</div>
                  <div className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mx-auto">
                    {item.step}
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Your code & link */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-muted-foreground uppercase tracking-widest">Tu enlace personal</h2>
          {isLoading ? (
            <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
          ) : (
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-zinc-900/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Tu código</p>
                    <p className="text-xl font-black tracking-widest text-amber-400" data-testid="text-referral-code">
                      {stats?.code || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-0.5">Invitados</p>
                    <p className="text-3xl font-black text-white" data-testid="text-referral-count">
                      {stats?.count ?? 0}
                    </p>
                  </div>
                </div>

                {/* Progress to next tier */}
                {stats?.nextTier && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Siguiente: {stats.nextTier.label}</span>
                      <span>{stats.count}/{stats.nextTier.min} invitados</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, (stats.count / stats.nextTier.min) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {!stats?.nextTier && (stats?.count ?? 0) >= 50 && (
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                    <Sparkles className="w-4 h-4" />
                    ¡Eres Embajador Oficial FallonYou!
                  </div>
                )}

                {/* Share buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="flex-1 rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                    data-testid="button-copy-link"
                  >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  <Button
                    onClick={handleShare}
                    className="flex-1 rounded-xl font-bold"
                    data-testid="button-share-link"
                  >
                    <Plane className="w-4 h-4 mr-2 -rotate-45" />
                    Compartir
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Reward tiers */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-muted-foreground uppercase tracking-widest">Recompensas por nivel</h2>
          <div className="space-y-2">
            {stats?.tiers.map((tier, i) => {
              const Icon = TIER_ICONS[i] || Gift;
              const isUnlocked = (stats.count ?? 0) >= tier.min;
              const isCurrent = stats.currentTier?.reward === tier.reward;
              return (
                <Card key={tier.reward}
                  className={`border transition-all ${isUnlocked ? TIER_COLORS[i] : "border-border/30 bg-muted/20 opacity-60"} ${isCurrent ? "ring-1 ring-amber-400/50" : ""}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isUnlocked ? "bg-amber-500/20" : "bg-muted/40"}`}>
                        <Icon className={`w-5 h-5 ${isUnlocked ? "text-amber-400" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{tier.label}</p>
                          {isCurrent && <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">Actual</span>}
                          {isUnlocked && !isCurrent && <Check className="w-4 h-4 text-green-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tier.min === tier.max ? `${tier.min} invitado` : tier.max === Infinity ? `${tier.min}+ invitados` : `${tier.min}–${tier.max} invitados`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Apply a friend's code */}
        {!stats?.referredBy && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-muted-foreground uppercase tracking-widest">¿Te invitó alguien?</h2>
            <Card className="border-border/40">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">Si alguien te invitó, introduce su código para que reciba su recompensa.</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="FALL-XXXXXX"
                    value={applyCode}
                    onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                    className="rounded-xl font-mono tracking-widest"
                    data-testid="input-apply-code"
                  />
                  <Button
                    onClick={() => applyReferral(applyCode)}
                    disabled={isApplying || applyCode.length < 6}
                    className="rounded-xl px-5"
                    data-testid="button-apply-code"
                  >
                    {isApplying ? "..." : "Aplicar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {stats?.referredBy && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Código de invitación aplicado</p>
                <p className="text-xs text-muted-foreground">Te registraste con el código <span className="font-mono font-bold text-amber-500">{stats.referredBy}</span></p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats callout */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-950/20 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-amber-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Crece con nosotros</p>
                <p className="text-xs text-muted-foreground">
                  Cada persona que invites ayuda a construir una comunidad de viajeros y conectores. Tu recompensa crece con la comunidad.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <BottomNav />
    </div>
  );
}
