import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Crown, Heart, Eye, Sparkles, Check, Gift, Shield, Star, CreditCard, HelpCircle } from "lucide-react";
import { SiPaypal, SiRevolut, SiStripe } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

const PAYPAL_LINK = "https://www.paypal.me/babaca1vf5";
const REVOLUT_LINK = "https://revolut.me/babaca1vf5";
const STRIPE_MONTHLY_LINK = "https://buy.stripe.com/4gMcMY2wsdUS462gpSfw400";
const STRIPE_YEARLY_LINK = "https://buy.stripe.com/5kQ7sE9YUg30cCy7Tmfw401";

const PLANS = {
  monthly: { label: "Mensual", price: "7,99 €", period: "/mes", hint: "Cancela cuando quieras" },
  yearly:  { label: "Anual",   price: "59,99 €", period: "/año", hint: "Ahorra un 37% · mejor valor" },
};

export default function PremiumPage() {
  const { toast } = useToast();
  const t = useTranslation();
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const searchParams = new URLSearchParams(window.location.search);
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (success) {
      toast({ title: "¡Bienvenido a Premium!", description: "Tu suscripción ya está activa. ¡Disfruta de todos los beneficios!" });
      window.history.replaceState({}, "", "/premium");
    }
    if (canceled) {
      toast({ title: "Pago cancelado", description: "Sin problema, puedes suscribirte cuando quieras.", variant: "destructive" });
      window.history.replaceState({}, "", "/premium");
    }
  }, [success, canceled]);

  interface PremiumStatus { isPremium: boolean; trialEndsAt?: string; premiumExpiresAt?: string; }
  interface LikedByData { count: number; users: any[]; isPremium: boolean; }

  const { data: premiumStatus, isLoading } = useQuery<PremiumStatus>({ queryKey: ["/api/premium/status"] });
  const { data: likedByData } = useQuery<LikedByData>({ queryKey: ["/api/premium/liked-by"] });

  const trialMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/premium/trial", {}); return res.json(); },
    onSuccess: () => {
      toast({ title: "¡Prueba iniciada!", description: "7 días gratis de Premium. ¡Disfrútalos!" });
      queryClient.invalidateQueries({ queryKey: ["/api/premium/status"] });
    },
    onError: () => { toast({ title: "Prueba no disponible", description: "Ya usaste tu prueba gratuita.", variant: "destructive" }); },
  });

  const portalMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/premium/portal", {}); return res.json(); },
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
  });

  const benefits = [
    { icon: Heart,    title: "Likes ilimitados",       desc: "Sin límite diario de likes" },
    { icon: Eye,      title: "Ver quién te dio like",  desc: "Descubre quién está interesado en ti" },
    { icon: Sparkles, title: "Visibilidad prioritaria", desc: "Aparece antes que otros perfiles" },
    { icon: Star,     title: "Filtros avanzados",       desc: "Encuentra exactamente lo que buscas" },
  ];

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin w-8 h-8 text-primary" />
    </div>
  );

  const isPremium = premiumStatus?.isPremium;

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 via-orange-500/20 to-yellow-500/20" />
        <div className="relative px-6 py-12 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30 mb-6">
            <Crown className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-premium-title">FallonYou Premium</h1>
          <p className="text-muted-foreground">Desbloquea la experiencia completa</p>
        </div>
      </div>

      <div className="px-6 space-y-8">

        {/* === USUARIO YA PREMIUM === */}
        {isPremium ? (
          <Card className="border-amber-500/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" /> ¡Eres miembro Premium!
              </CardTitle>
              <CardDescription>
                {premiumStatus?.trialEndsAt
                  ? `Prueba hasta: ${new Date(premiumStatus.trialEndsAt).toLocaleDateString("es-ES")}`
                  : premiumStatus?.premiumExpiresAt
                  ? `Renueva el: ${new Date(premiumStatus.premiumExpiresAt).toLocaleDateString("es-ES")}`
                  : "Disfruta de todos los beneficios"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-medium">{b.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending} data-testid="button-manage-subscription">
                {portalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                Gestionar suscripción
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <>
            {/* Prueba gratis */}
            {!premiumStatus?.trialEndsAt && (
              <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
                <CardHeader className="text-center">
                  <Gift className="w-12 h-12 mx-auto text-primary mb-2" />
                  <CardTitle>Prueba Premium gratis 7 días</CardTitle>
                  <CardDescription>Todas las funciones, sin compromiso</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600"
                    onClick={() => trialMutation.mutate()} disabled={trialMutation.isPending}
                    data-testid="button-start-trial">
                    {trialMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />}
                    Empezar prueba gratis
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Beneficios */}
            <section>
              <h2 className="text-xl font-bold mb-4">Beneficios Premium</h2>
              <div className="grid gap-3">
                {benefits.map((b, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <Card>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center">
                          <b.icon className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{b.title}</h3>
                          <p className="text-sm text-muted-foreground">{b.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* ===== SECCIÓN DE PAGO ===== */}
            <section>
              <h2 className="text-xl font-bold mb-4">Elige tu plan</h2>

              {/* Selector mensual / anual */}
              <div className="flex gap-3 mb-5">
                {(["monthly", "yearly"] as const).map((p) => (
                  <button key={p} onClick={() => setPlan(p)}
                    className={`flex-1 rounded-2xl border-2 p-4 text-left transition-all ${
                      plan === p
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                        : "border-muted bg-card hover:border-amber-300"
                    }`}
                    data-testid={`button-plan-${p}`}>
                    <div className="font-bold text-base">{PLANS[p].label}</div>
                    <div className="text-2xl font-extrabold text-amber-600 leading-tight">
                      {PLANS[p].price}<span className="text-sm font-normal text-muted-foreground">{PLANS[p].period}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{PLANS[p].hint}</div>
                  </button>
                ))}
              </div>

              {/* Botones de pago */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">Paga directamente con tu método favorito:</p>

                {/* PayPal */}
                <a
                  href={`${PAYPAL_LINK}/${plan === "monthly" ? "7.99" : "59.99"}EUR`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="button-pay-paypal"
                >
                  <Button className="w-full h-14 text-base font-bold bg-[#0070BA] hover:bg-[#005ea6] text-white rounded-2xl flex items-center gap-3 shadow-md shadow-blue-500/20">
                    <SiPaypal className="w-6 h-6" />
                    Pagar con PayPal
                    <span className="ml-auto text-blue-200 font-normal text-sm">{PLANS[plan].price}</span>
                  </Button>
                </a>

                {/* Revolut */}
                <a
                  href={REVOLUT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="button-pay-revolut"
                >
                  <Button className="w-full h-14 text-base font-bold bg-[#7C3AED] hover:bg-[#6d28d9] text-white rounded-2xl flex items-center gap-3 shadow-md shadow-violet-500/20">
                    <SiRevolut className="w-6 h-6" />
                    Pagar con Revolut
                    <span className="ml-auto text-violet-200 font-normal text-sm">{PLANS[plan].price}</span>
                  </Button>
                </a>

                {/* Stripe — tarjeta de crédito/débito */}
                {(plan === "monthly" ? STRIPE_MONTHLY_LINK : STRIPE_YEARLY_LINK) && (
                  <a
                    href={plan === "monthly" ? STRIPE_MONTHLY_LINK : STRIPE_YEARLY_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="button-pay-stripe"
                  >
                    <Button className="w-full h-14 text-base font-bold bg-[#635BFF] hover:bg-[#5046e5] text-white rounded-2xl flex items-center gap-3 shadow-md shadow-indigo-500/20">
                      <SiStripe className="w-6 h-6" />
                      Pagar con tarjeta
                      <span className="ml-auto text-indigo-200 font-normal text-sm">{PLANS[plan].price}</span>
                    </Button>
                  </a>
                )}

                <div className="space-y-2">
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-xs text-center text-green-800 dark:text-green-300">
                    ✅ Pago con tarjeta — activación automática e instantánea
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-center text-amber-800 dark:text-amber-300">
                    💬 PayPal / Revolut — confirma por WhatsApp tras el pago (menos de 24h)
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Quién te dio like */}
        {likedByData && likedByData.count > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              {likedByData.count} personas te dieron like
            </h2>
            {isPremium ? (
              <div className="grid grid-cols-3 gap-3">
                {likedByData.users?.map((user: any) => (
                  <Card key={user.id} className="overflow-hidden">
                    <img src={user.photos?.[0]?.url || "/placeholder.jpg"} alt={user.firstName}
                      className="w-full aspect-square object-cover" />
                    <CardContent className="p-2 text-center">
                      <p className="font-medium text-sm truncate">{user.firstName || "Alguien"}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
                <CardContent className="py-8 text-center">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[1, 2, 3].map((i) => <div key={i} className="aspect-square rounded-lg bg-muted blur-sm" />)}
                  </div>
                  <p className="text-muted-foreground mb-4">Hazte Premium para ver quién te dio like</p>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HelpCircle className="w-5 h-5" /> Preguntas frecuentes
          </h2>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <h3 className="font-semibold mb-1">¿Cómo confirmo mi pago?</h3>
                <p className="text-sm text-muted-foreground">
                  Después de pagar por PayPal o Revolut, escríbenos por WhatsApp con el comprobante. Activaremos tu cuenta Premium en menos de 24h.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">¿Es seguro el pago?</h3>
                <p className="text-sm text-muted-foreground">
                  Sí. PayPal y Revolut son plataformas de pago seguras con protección al comprador.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">¿Necesitas ayuda?</h3>
                <p className="text-sm text-muted-foreground">
                  Escríbenos a <strong>fallonyouapp@hotmail.com</strong> o por WhatsApp.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Shield className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold">Cumple con el RGPD</h3>
                <p className="text-sm text-muted-foreground">Tus datos están protegidos según la normativa europea</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
