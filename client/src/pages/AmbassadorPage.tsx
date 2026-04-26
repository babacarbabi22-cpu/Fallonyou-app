import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-danceme";
import { motion } from "framer-motion";
import { Rocket, Users, Gift, Globe, Instagram, MapPin, Mail, Sparkles, Check, Star } from "lucide-react";
import posterBg from "@assets/poster_adventure_base.png";

const perks = [
  { icon: Gift,     title: "Comisiones por referidos",  desc: "Gana recompensas cada vez que alguien se une gracias a ti." },
  { icon: Star,     title: "Perfil destacado",           desc: "Tu perfil aparece primero y con badge de Embajador." },
  { icon: Globe,    title: "Red de embajadores",         desc: "Conecta con otros embajadores de tu ciudad y de todo el mundo." },
  { icon: Sparkles, title: "Acceso anticipado",          desc: "Sé el primero en probar nuevas funciones antes que nadie." },
];

export default function AmbassadorPage() {
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const [form, setForm] = useState({
    name: currentUser?.firstName || "",
    email: currentUser?.email || "",
    city: "",
    instagram: "",
    motivation: "",
    followers: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const applyMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ambassador/apply", form),
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "¡Solicitud enviada!", description: "Te contactaremos pronto." });
    },
    onError: () => {
      toast({ title: "Error", description: "Algo salió mal. Inténtalo de nuevo.", variant: "destructive" });
    },
  });

  function handleChange(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const canSubmit = form.name && form.email && form.city && form.motivation;

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 240 }}>
        <img src={posterBg} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-background" />
        <div className="relative z-10 px-6 pt-12 pb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full shadow-lg shadow-amber-500/30 mb-4"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}
          >
            <Rocket className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Programa Embajador</h1>
          <p className="text-white/75 max-w-xs mx-auto text-sm leading-relaxed">
            Ayuda a crecer a FallonYou en tu ciudad y consigue beneficios exclusivos.
          </p>
        </div>
      </div>

      <div className="px-5 space-y-6 -mt-2">

        {/* Perks */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Ventajas de ser Embajador
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {perks.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="h-full border-0" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <CardContent className="p-4">
                    <p.icon className="w-6 h-6 text-amber-500 mb-2" />
                    <p className="font-semibold text-sm leading-tight">{p.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Form or success */}
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-6 text-center"
            style={{ background: "linear-gradient(135deg,#78350f,#b45309)", boxShadow: "0 8px 32px rgba(180,83,9,0.3)" }}
          >
            <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">¡Solicitud recibida!</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Revisaremos tu candidatura y te contactaremos en los próximos días por email. ¡Gracias por querer ser parte del equipo!
            </p>
          </motion.div>
        ) : (
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" /> Solicita ser Embajador
            </h2>
            <Card>
              <CardContent className="p-5 space-y-4">

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
                    <Input
                      placeholder="Tu nombre"
                      value={form.name}
                      onChange={e => handleChange("name", e.target.value)}
                      data-testid="input-ambassador-name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Ciudad *</label>
                    <Input
                      placeholder="Tu ciudad"
                      value={form.city}
                      onChange={e => handleChange("city", e.target.value)}
                      data-testid="input-ambassador-city"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={form.email}
                    onChange={e => handleChange("email", e.target.value)}
                    data-testid="input-ambassador-email"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Instagram</label>
                    <Input
                      placeholder="@tuusuario"
                      value={form.instagram}
                      onChange={e => handleChange("instagram", e.target.value)}
                      data-testid="input-ambassador-instagram"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Seguidores aprox.</label>
                    <Input
                      placeholder="ej: 5.000"
                      value={form.followers}
                      onChange={e => handleChange("followers", e.target.value)}
                      data-testid="input-ambassador-followers"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">¿Por qué quieres ser embajador? *</label>
                  <Textarea
                    placeholder="Cuéntanos brevemente por qué te gustaría representar a FallonYou en tu ciudad..."
                    value={form.motivation}
                    onChange={e => handleChange("motivation", e.target.value)}
                    rows={4}
                    data-testid="input-ambassador-motivation"
                  />
                </div>

                <Button
                  className="w-full h-12 font-bold text-black rounded-xl"
                  style={{ background: "linear-gradient(90deg,#D97706,#F59E0B)" }}
                  disabled={!canSubmit || applyMutation.isPending}
                  onClick={() => applyMutation.mutate()}
                  data-testid="button-ambassador-submit"
                >
                  {applyMutation.isPending ? "Enviando..." : "Enviar solicitud"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Al enviar aceptas que nos pongamos en contacto contigo por email.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Stats teaser */}
        <div
          className="rounded-2xl p-4 flex gap-4 justify-around text-center"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          {[
            { label: "Ciudades activas", value: "12+" },
            { label: "Embajadores", value: "24" },
            { label: "Usuarios referidos", value: "340+" },
          ].map(s => (
            <div key={s.label}>
              <p className="font-extrabold text-xl text-amber-500">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
