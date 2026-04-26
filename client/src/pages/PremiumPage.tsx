import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Crown, Heart, Eye, Sparkles, Check, Shield, Star, HelpCircle, Rocket, Users, Zap, Store, Mail, Tag, ArrowRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

const benefits = [
  { icon: Heart,    title: "Likes ilimitados",          desc: "Sin límite diario, conecta con quien quieras" },
  { icon: Eye,      title: "Ver quién te dio like",     desc: "Descubre quién está interesado en ti antes de decidir" },
  { icon: Sparkles, title: "Visibilidad prioritaria",   desc: "Tu perfil aparece primero en Discover" },
  { icon: Star,     title: "Filtros avanzados",         desc: "Encuentra personas con intereses exactos" },
  { icon: Zap,      title: "Eventos exclusivos",        desc: "Acceso anticipado a planes y experiencias VIP" },
  { icon: Users,    title: "Comunidad de fundadores",   desc: "Sé parte del grupo que da forma a FallonYou" },
];

const faqs = [
  {
    q: "¿Cuánto cuesta la app?",
    a: "FallonYou es completamente gratuita en este momento. Estamos en fase de lanzamiento y queremos que todo el mundo pueda disfrutarla sin coste. ¡Aprovéchalo!",
  },
  {
    q: "¿Habrá un plan de pago en el futuro?",
    a: "En algún momento lanzaremos funciones premium opcionales, pero todas las funcionalidades actuales seguirán siendo gratuitas para los usuarios que se unan ahora.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. Usamos cifrado de extremo a extremo y cumplimos con el RGPD europeo. Tus datos nunca se venden a terceros.",
  },
  {
    q: "¿Necesito una tarjeta de crédito?",
    a: "No. La app es gratis y no te pediremos ningún dato de pago.",
  },
  {
    q: "¿Necesitas ayuda?",
    a: "Escríbenos a fallonyouapp@hotmail.com — respondemos en menos de 24h.",
  },
];

interface ProfileViewersData { count: number; viewers: any[]; }

export default function PremiumPage() {
  const { toast } = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [, navigate] = useLocation();

  interface PremiumStatus { isPremium: boolean; trialEndsAt?: string; premiumExpiresAt?: string; }
  interface LikedByData { count: number; users: any[]; isPremium: boolean; }

  const { data: premiumStatus, isLoading } = useQuery<PremiumStatus>({ queryKey: ["/api/premium/status"] });
  const { data: likedByData } = useQuery<LikedByData>({ queryKey: ["/api/premium/liked-by"] });
  const { data: viewersData } = useQuery<ProfileViewersData>({ queryKey: ["/api/profile-views/viewers"] });

  const portalMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/premium/portal", {}); return res.json(); },
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
  });

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin w-8 h-8 text-primary" />
    </div>
  );

  const isPremium = premiumStatus?.isPremium;

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

          {/* FREE badge */}
          <div className="inline-flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 shadow shadow-green-500/30">
            <Rocket className="w-3 h-3" />
            COMPLETAMENTE GRATIS
          </div>

          <h1 className="text-3xl font-bold mb-2" data-testid="text-premium-title">
            FallonYou Premium
          </h1>
          <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Durante el lanzamiento, todas las funciones premium son gratuitas para todos los usuarios.
          </p>
        </div>
      </div>

      <div className="px-5 space-y-7">

        {/* ── Early access card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div
            className="rounded-2xl p-5"
            style={{
              background: "linear-gradient(135deg,#78350f,#92400e,#b45309)",
              boxShadow: "0 8px 32px rgba(180,83,9,0.35)",
            }}
            data-testid="card-early-access"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Acceso de Fundador</p>
                <p className="text-white/80 text-sm mt-0.5 leading-snug font-medium">
                  Eres de las primeras 4.000 personas en FallonYou.
                </p>
                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                  Disfruta e invita a tus amigos antes de que seamos 10.000 y la app tenga coste. 🚀
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Likes", value: "∞" },
                { label: "Coste", value: "0€" },
                { label: "Funciones", value: "100%" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/10 rounded-xl py-2 px-1">
                  <p className="text-white font-extrabold text-xl">{stat.value}</p>
                  <p className="text-white/60 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Beneficios ── */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Todo incluido gratis
          </h2>
          <div className="grid gap-3">
            {benefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Card className="border-0 bg-card/60" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))" }}
                    >
                      <b.icon className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{b.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Quién te dio like ── */}
        {likedByData && likedByData.count > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              {likedByData.count} {likedByData.count === 1 ? "persona te dio like" : "personas te dieron like"}
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
              <Card
                style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03))", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                <CardContent className="py-8 text-center">
                  <div className="grid grid-cols-3 gap-2 mb-4 opacity-50">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="aspect-square rounded-lg bg-muted backdrop-blur-sm" />
                    ))}
                  </div>
                  <Crown className="w-7 h-7 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Función disponible próximamente</p>
                </CardContent>
              </Card>
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
            ) : (
              <Card style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03))", border: "1px solid rgba(245,158,11,0.2)" }}>
                <CardContent className="py-8 text-center">
                  <div className="grid grid-cols-3 gap-2 mb-4 opacity-40">
                    {[1, 2, 3].map(i => <div key={i} className="aspect-square rounded-lg bg-muted" />)}
                  </div>
                  <Eye className="w-7 h-7 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Función disponible próximamente</p>
                </CardContent>
              </Card>
            )}
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
              <p className="text-white font-bold text-base">Programa Embajador 🚀</p>
              <p className="text-white/65 text-xs mt-0.5 leading-relaxed">
                Representa a FallonYou en tu ciudad y consigue beneficios exclusivos.
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
            <p className="font-semibold text-sm">Cumplimos con el RGPD</p>
            <p className="text-xs text-muted-foreground">Tus datos están protegidos según la normativa europea. Sin anuncios. Sin venta de datos.</p>
          </div>
        </div>

        {/* ── Negocios locales ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(245,158,11,0.25)" }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))" }}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-base">¿Tienes un local? 🏪</p>
                <p className="text-xs text-muted-foreground">Colabora con FallonYou y llega a tu público</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3 bg-card">
              {[
                { icon: Users,  text: "Enviamos nuestros usuarios a tu local — personas reales buscando planes y experiencias." },
                { icon: Tag,    text: "Tus clientes obtienen descuentos exclusivos por ser de la comunidad FallonYou." },
                { icon: Rocket, text: "Tu negocio gana visibilidad dentro de la app ante miles de usuarios activos." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              ))}

              <a
                href="mailto:fallonyouapp@hotmail.com?subject=Colaboración%20local%20FallonYou"
                className="block mt-2"
                data-testid="button-contact-business"
              >
                <div
                  className="w-full rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-semibold text-sm transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(90deg,#D97706,#F59E0B)", color: "#000" }}
                >
                  <Mail className="w-4 h-4" />
                  Contactar con nosotros
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
            <button
              key={i}
              className="w-full text-left"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              data-testid={`faq-${i}`}
            >
              <Card className="transition-colors hover:bg-accent/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-sm">{faq.q}</p>
                    <span className="text-muted-foreground text-lg leading-none shrink-0">
                      {openFaq === i ? "−" : "+"}
                    </span>
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
