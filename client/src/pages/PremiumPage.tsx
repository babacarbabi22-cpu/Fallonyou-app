import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, Crown, Heart, Eye, Sparkles, Check, Shield,
  Star, HelpCircle, Rocket, Users, Zap, Store, Mail,
  Tag, ArrowRight, Lock, X, Infinity as InfinityIcon,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

const FREE_DAILY_LIKES = 10;

const BLUR_FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108755-2616b612e5e4?w=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&fit=crop&q=80",
];

const freeFeatures = [
  { label: `${FREE_DAILY_LIKES} conexiones por día`, included: true },
  { label: "1 Super Like por día", included: true },
  { label: "Filtros básicos (edad, distancia)", included: true },
  { label: "Crear y unirte a eventos", included: true },
  { label: "Ver quién quiere conocerte", included: false },
  { label: "Ver quién visitó tu perfil", included: false },
  { label: "Visibilidad prioritaria", included: false },
  { label: "Filtros avanzados (intereses, idioma)", included: false },
  { label: "5 Super Likes por día", included: false },
];

const premiumFeatures = [
  { label: "Conexiones ilimitadas", included: true },
  { label: "5 Super Likes por día", included: true },
  { label: "Filtros avanzados (intereses, idioma)", included: true },
  { label: "Crear y unirte a eventos", included: true },
  { label: "Ver quién quiere conocerte", included: true },
  { label: "Ver quién visitó tu perfil", included: true },
  { label: "Visibilidad prioritaria", included: true },
  { label: "Insignia Premium en tu perfil", included: true },
];

const faqs = [
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, puedes cancelar en cualquier momento desde el portal de gestión. Si cancelas, mantendrás el acceso premium hasta el final del período pagado.",
  },
  {
    q: "¿Hay periodo de prueba?",
    a: "Sí, ofrecemos 7 días gratis en tu primera suscripción. No se te cobrará nada hasta que finalice el periodo de prueba.",
  },
  {
    q: "¿Qué métodos de pago aceptáis?",
    a: "Aceptamos todas las tarjetas de crédito y débito principales (Visa, Mastercard, Amex) a través de Stripe, el procesador de pagos más seguro del mundo.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. Usamos cifrado de extremo a extremo y cumplimos con el RGPD europeo. Tus datos nunca se venden a terceros.",
  },
  {
    q: "¿Necesitas ayuda?",
    a: "Escríbenos a fallonyouapp@hotmail.com — respondemos en menos de 24h.",
  },
];

interface PremiumStatus {
  isPremium: boolean;
  trialEndsAt?: string;
  premiumExpiresAt?: string;
  remainingLikes: number;
  canLike: boolean;
}
interface LikedByData { count: number; users: any[]; isPremium: boolean; }
interface ProfileViewersData { count: number; viewers: any[]; }
interface Product { id: string; name: string; prices: { id: string; unit_amount: number; currency: string; recurring?: { interval: string } }[] }

export default function PremiumPage() {
  const { toast } = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("year");
  const [showPricing, setShowPricing] = useState(false);
  const [, navigate] = useLocation();

  const { data: premiumStatus, isLoading } = useQuery<PremiumStatus>({ queryKey: ["/api/premium/status"] });
  const { data: likedByData } = useQuery<LikedByData>({ queryKey: ["/api/premium/liked-by"] });
  const { data: viewersData } = useQuery<ProfileViewersData>({ queryKey: ["/api/profile-views/viewers"] });
  const { data: productsData } = useQuery<{ products: Product[] }>({ queryKey: ["/api/premium/products"] });

  const isPremium = premiumStatus?.isPremium;

  const selectedPrice = productsData?.products?.[0]?.prices?.find(
    (p) => p.recurring?.interval === billingInterval
  );

  const monthlyPrice = productsData?.products?.[0]?.prices?.find(p => p.recurring?.interval === "month");
  const yearlyPrice = productsData?.products?.[0]?.prices?.find(p => p.recurring?.interval === "year");

  const displayMonthly = billingInterval === "year" && yearlyPrice
    ? (yearlyPrice.unit_amount / 100 / 12).toFixed(2)
    : monthlyPrice
    ? (monthlyPrice.unit_amount / 100).toFixed(2)
    : billingInterval === "year" ? "4.17" : "7.00";

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPrice?.id) throw new Error("No hay planes disponibles aún");
      const res = await apiRequest("POST", "/api/premium/checkout", {
        priceId: selectedPrice.id,
        includeTrial: true,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "No se pudo iniciar el pago", variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/premium/portal", {});
      return res.json();
    },
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: () => {
      toast({ title: "Error", description: "No se pudo abrir el portal de gestión", variant: "destructive" });
    },
  });

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin w-8 h-8 text-amber-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 via-orange-500/10 to-yellow-400/20" />
        <div className="relative px-6 pt-12 pb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full shadow-lg shadow-amber-500/30 mb-5"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}
          >
            <Crown className="w-10 h-10 text-white" />
          </motion.div>

          {isPremium ? (
            <>
              <div className="inline-flex items-center gap-1.5 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full mb-4">
                <Crown className="w-3 h-3" /> PREMIUM ACTIVO
              </div>
              <h1 className="text-3xl font-bold mb-2" data-testid="text-premium-title">Eres Premium</h1>
              <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Tienes acceso a todas las funciones sin límites.
                {premiumStatus?.premiumExpiresAt && (
                  <> Renovación: {new Date(premiumStatus.premiumExpiresAt).toLocaleDateString("es-ES")}.</>
                )}
              </p>
              <Button
                className="mt-5 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-subscription"
              >
                {portalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Gestionar suscripción
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-2" data-testid="text-premium-title">FallonYou Premium</h1>
              <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Conecta sin límites. Descubre quién está interesado en ti.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="px-5 space-y-7">

        {/* ── Pricing (only for non-premium) ── */}
        {!isPremium && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

            {/* Collapsed CTA button */}
            {!showPricing ? (
              <button
                onClick={() => setShowPricing(true)}
                data-testid="button-show-pricing"
                className="w-full rounded-2xl py-4 px-6 flex items-center justify-between transition-opacity active:opacity-80"
                style={{
                  background: "linear-gradient(135deg,#78350f,#92400e,#b45309)",
                  boxShadow: "0 8px 32px rgba(180,83,9,0.35)",
                }}
              >
                <div className="flex items-center gap-3">
                  <Crown className="w-6 h-6 text-amber-300" />
                  <div className="text-left">
                    <p className="text-white font-bold text-base">Prueba gratis 7 días</p>
                    <p className="text-amber-300/70 text-xs">Sin compromiso · Cancela cuando quieras</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-300" />
              </button>
            ) : (
              <>
                {/* Billing toggle */}
                <div className="flex items-center justify-center gap-1 p-1 rounded-full mb-5 mx-auto w-fit"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  {(["month", "year"] as const).map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setBillingInterval(interval)}
                      data-testid={`tab-billing-${interval}`}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                      style={billingInterval === interval
                        ? { background: "linear-gradient(90deg,#D97706,#F59E0B)", color: "#000" }
                        : { color: "var(--muted-foreground)" }
                      }
                    >
                      {interval === "month" ? "Mensual 7€" : "Anual 50€"}
                      {interval === "year" && (
                        <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold ml-1">−40%</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Price display */}
                <div
                  className="rounded-3xl p-6 text-center mb-4"
                  style={{
                    background: "linear-gradient(135deg,#78350f,#92400e,#b45309)",
                    boxShadow: "0 8px 32px rgba(180,83,9,0.35)",
                  }}
                  data-testid="card-pricing"
                >
                  <Crown className="w-8 h-8 text-amber-300 mx-auto mb-3" />
                  <p className="text-amber-200 text-sm font-medium mb-1">FallonYou Premium</p>
                  <div className="flex items-end justify-center gap-1 mb-1">
                    <span className="text-white font-black text-5xl">€{displayMonthly}</span>
                    <span className="text-amber-300/80 text-sm mb-2">/mes</span>
                  </div>
                  {billingInterval === "year" && (
                    <p className="text-amber-300/70 text-xs mb-4">
                      Facturado anualmente · {yearlyPrice ? `€${(yearlyPrice.unit_amount / 100).toFixed(2)}/año` : "€50/año"}
                    </p>
                  )}
                  {billingInterval === "month" && (
                    <p className="text-amber-300/70 text-xs mb-4">Facturado mensualmente · €7/mes</p>
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-green-300 text-xs font-medium mb-4">
                    <Check className="w-3.5 h-3.5" />
                    7 días gratis — cancela cuando quieras
                  </div>

                  <Button
                    className="w-full font-bold text-base py-6 rounded-2xl"
                    style={{ background: "linear-gradient(90deg,#FCD34D,#F59E0B)", color: "#000" }}
                    onClick={() => checkoutMutation.mutate()}
                    disabled={checkoutMutation.isPending}
                    data-testid="button-subscribe"
                  >
                    {checkoutMutation.isPending
                      ? <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      : <Crown className="w-5 h-5 mr-2" />}
                    Empezar prueba gratuita
                  </Button>

                  <p className="text-amber-300/50 text-xs mt-3">
                    Sin compromiso · Pago seguro con Stripe
                  </p>
                </div>

                {/* Free vs Premium comparison */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl overflow-hidden border border-border">
                    <div className="px-3 py-2.5 text-center bg-muted/50">
                      <p className="font-bold text-sm">Gratis</p>
                    </div>
                    <div className="p-3 space-y-2">
                      {freeFeatures.map((f, i) => (
                        <div key={i} className="flex items-start gap-2">
                          {f.included
                            ? <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                            : <X className="w-3.5 h-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />}
                          <p className={`text-xs leading-tight ${f.included ? "" : "text-muted-foreground/50"}`}>{f.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl overflow-hidden"
                    style={{ border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.04)" }}>
                    <div className="px-3 py-2.5 text-center"
                      style={{ background: "linear-gradient(90deg,rgba(217,119,6,0.3),rgba(245,158,11,0.2))" }}>
                      <p className="font-bold text-sm text-amber-500 flex items-center justify-center gap-1">
                        <Crown className="w-3.5 h-3.5" /> Premium
                      </p>
                    </div>
                    <div className="p-3 space-y-2">
                      {premiumFeatures.map((f, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-xs leading-tight font-medium">{f.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.section>
        )}

        {/* ── Quién quiere conocerte ── */}
        {likedByData && likedByData.count > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              {likedByData.count} {likedByData.count === 1 ? "persona quiere conocerte" : "personas quieren conocerte"}
            </h2>
            {isPremium ? (
              <div className="grid grid-cols-3 gap-3">
                {likedByData.users?.map((user: any) => (
                  <Card key={user.id} className="overflow-hidden">
                    <img
                      src={user.photos?.[0]?.url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=60"}
                      alt={user.firstName}
                      className="w-full aspect-square object-cover"
                    />
                    <CardContent className="p-2 text-center">
                      <p className="font-medium text-xs truncate">{user.firstName || "Alguien"}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-hidden relative"
                style={{ border: "1px solid rgba(245,158,11,0.25)" }}
                data-testid="card-liked-by-locked"
              >
                {/* Blurred real photos */}
                {(() => {
                  const count = Math.min(likedByData.count, 6);
                  const cols = count <= 2 ? count : count <= 4 ? 2 : 3;
                  const slots = Array.from({ length: Math.max(count, 4) }, (_, i) => {
                    const user = likedByData.users?.[i];
                    return user?.photos?.[0]?.url || BLUR_FALLBACK_PHOTOS[i % BLUR_FALLBACK_PHOTOS.length];
                  });
                  const gridClass = cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3";
                  return (
                    <div className={`grid ${gridClass} gap-0.5 pointer-events-none select-none`}>
                      {slots.map((src, i) => (
                        <div key={i} className="aspect-square overflow-hidden relative">
                          <img
                            src={src}
                            alt=""
                            className="w-full h-full object-cover"
                            style={{ filter: "blur(14px)", transform: "scale(1.15)" }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4"
                  style={{ background: "rgba(0,0,0,0.25)" }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-center text-white drop-shadow">
                    Descubre quién quiere <span className="text-amber-300">conocerte</span>
                  </p>
                  <Button
                    size="sm"
                    className="font-bold"
                    style={{ background: "linear-gradient(90deg,#D97706,#F59E0B)", color: "#000" }}
                    onClick={() => { setShowPricing(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    data-testid="button-unlock-liked-by"
                  >
                    <Crown className="w-3.5 h-3.5 mr-1.5" /> Desbloquear con Premium
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Quién vio tu perfil ── */}
        {(viewersData?.count ?? 0) > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-500" />
              {viewersData!.count} {viewersData!.count === 1 ? "persona vio tu perfil" : "personas vieron tu perfil"}
            </h2>
            {isPremium && viewersData!.viewers.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {viewersData!.viewers.map((user: any) => (
                  <Card key={user.id} className="overflow-hidden">
                    <img
                      src={user.photos?.[0]?.url || user.profileImageUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=60"}
                      alt={user.firstName}
                      className="w-full aspect-square object-cover"
                    />
                    <CardContent className="p-2 text-center">
                      <p className="font-medium text-xs truncate">{user.firstName || "Alguien"}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !isPremium ? (
              <div
                className="rounded-2xl overflow-hidden relative"
                style={{ border: "1px solid rgba(245,158,11,0.25)" }}
                data-testid="card-viewers-locked"
              >
                {/* Blurred real photos */}
                {(() => {
                  const count = Math.min(viewersData!.count, 6);
                  const cols = count <= 2 ? count : count <= 4 ? 2 : 3;
                  const slots = Array.from({ length: Math.max(count, 4) }, (_, i) => {
                    const user = viewersData!.viewers?.[i];
                    return user?.photos?.[0]?.url || user?.profileImageUrl || BLUR_FALLBACK_PHOTOS[(i + 2) % BLUR_FALLBACK_PHOTOS.length];
                  });
                  const gridClass = cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3";
                  return (
                    <div className={`grid ${gridClass} gap-0.5 pointer-events-none select-none`}>
                      {slots.map((src, i) => (
                        <div key={i} className="aspect-square overflow-hidden relative">
                          <img
                            src={src}
                            alt=""
                            className="w-full h-full object-cover"
                            style={{ filter: "blur(14px)", transform: "scale(1.15)" }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4"
                  style={{ background: "rgba(0,0,0,0.25)" }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-center text-white drop-shadow">
                    Ve quién ha <span className="text-amber-300">visitado tu perfil</span>
                  </p>
                  <Button
                    size="sm"
                    className="font-bold"
                    style={{ background: "linear-gradient(90deg,#D97706,#F59E0B)", color: "#000" }}
                    onClick={() => { setShowPricing(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    data-testid="button-unlock-viewers"
                  >
                    <Crown className="w-3.5 h-3.5 mr-1.5" /> Desbloquear con Premium
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* ── Programa Embajador ── */}
        <div
          className="rounded-2xl overflow-hidden cursor-pointer group"
          style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)", boxShadow: "0 8px 32px rgba(67,56,202,0.3)" }}
          onClick={() => navigate("/ambassador")}
          data-testid="card-ambassador-cta"
        >
          <div className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-base">Programa Embajador</p>
              <p className="text-white/65 text-xs mt-0.5 leading-relaxed">
                Representa a FallonYou en tu ciudad y consigue Premium gratis.
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* ── Seguridad ── */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
          data-testid="card-security"
        >
          <Shield className="w-8 h-8 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Pagos seguros · RGPD</p>
            <p className="text-xs text-muted-foreground">Procesado por Stripe. Tus datos están protegidos y nunca se venden.</p>
          </div>
        </div>

        {/* ── Negocios locales ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(245,158,11,0.25)" }}>
            <div
              className="px-5 py-4 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))" }}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-base">¿Tienes un local?</p>
                <p className="text-xs text-muted-foreground">Colabora con FallonYou y llega a tu público</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3 bg-card">
              {[
                { icon: Users, text: "Enviamos nuestros usuarios a tu local — personas reales buscando planes y experiencias." },
                { icon: Tag, text: "Tus clientes obtienen descuentos exclusivos por ser de la comunidad FallonYou." },
                { icon: Rocket, text: "Tu negocio gana visibilidad dentro de la app ante miles de usuarios activos." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              ))}
              <a href="mailto:fallonyouapp@hotmail.com?subject=Colaboración%20local%20FallonYou" className="block mt-2" data-testid="button-contact-business">
                <div
                  className="w-full rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-semibold text-sm"
                  style={{ background: "linear-gradient(90deg,#D97706,#F59E0B)", color: "#000" }}
                >
                  <Mail className="w-4 h-4" /> Contactar con nosotros
                </div>
              </a>
              <p className="text-xs text-center text-muted-foreground">fallonyouapp@hotmail.com</p>
            </div>
          </div>
        </motion.section>

        {/* ── FAQ ── */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HelpCircle className="w-5 h-5" /> Preguntas frecuentes
          </h2>
          {faqs.map((faq, i) => (
            <button key={i} className="w-full text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)} data-testid={`faq-${i}`}>
              <Card className="transition-colors hover:bg-accent/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-sm">{faq.q}</p>
                    <span className="text-muted-foreground text-lg leading-none shrink-0">{openFaq === i ? "−" : "+"}</span>
                  </div>
                  {openFaq === i && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-sm text-muted-foreground mt-2 leading-relaxed"
                    >
                      {faq.a}
                    </motion.p>
                  )}
                </CardContent>
              </Card>
            </button>
          ))}
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
