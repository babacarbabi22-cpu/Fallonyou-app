import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Heart, Users, Plane } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

async function acceptTerms() {
  const res = await fetch("/api/accept-terms", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to accept terms");
}

export function TermsModal() {
  const [accepted, setAccepted] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: acceptTerms,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card rounded-2xl max-w-md w-full shadow-2xl border overflow-hidden">

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white text-center">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Plane className="w-7 h-7 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold">Bienvenido/a a FallonYou</h2>
          <p className="text-amber-100 text-sm mt-1">Una comunidad para todos</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Heart className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-medium">Respeto</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Users className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-medium">Inclusión</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Shield className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-medium">Seguridad</span>
            </div>
          </div>

          <ScrollArea className="h-52 rounded-xl border bg-muted/30 p-4">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed pr-2">
              <p className="font-semibold text-foreground text-base">Términos y Comunidad FallonYou</p>

              <div>
                <p className="font-medium text-foreground mb-1">🌍 Todos son bienvenidos</p>
                <p>FallonYou es una plataforma abierta e inclusiva. Sin importar tu origen, edad (mayor de 18 años), género, orientación o nacionalidad, tienes un lugar aquí. Cualquier persona puede unirse a una actividad mientras esté abierta, sin límite de participantes.</p>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">🤝 Respeto ante todo</p>
                <p>Tratarás a todos los usuarios con respeto y consideración. Cualquier forma de acoso, discriminación, lenguaje ofensivo o comportamiento irrespetuoso resultará en la suspensión permanente de tu cuenta.</p>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">✅ Perfil auténtico</p>
                <p>Usarás tu identidad real, una foto tuya y la información correcta en tu perfil. Está prohibido hacerse pasar por otra persona o crear cuentas falsas.</p>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">🎉 Actividades abiertas</p>
                <p>Las actividades creadas en FallonYou son abiertas a todos por defecto. Si creas una actividad, la comunidad puede unirse libremente. El espíritu de la app es conectar a personas para vivir experiencias juntas.</p>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">🔒 Privacidad y seguridad</p>
                <p>No compartirás información personal de otros usuarios fuera de la app. Reportarás cualquier comportamiento inapropiado usando las herramientas de denuncia disponibles.</p>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">🚫 Contenido prohibido</p>
                <p>Está prohibido publicar contenido ilegal, sexual explícito, violento, spam o cualquier contenido que dañe a otros usuarios o a la comunidad.</p>
              </div>

              <p className="text-xs pt-2">Al aceptar estos términos confirmas que tienes 18 años o más y que cumplirás estas normas de comunidad. FallonYou se reserva el derecho de suspender cuentas que no respeten estos términos.</p>
            </div>
          </ScrollArea>

          <div
            className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl cursor-pointer"
            onClick={() => setAccepted(!accepted)}
          >
            <Checkbox
              id="terms-accept"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
              data-testid="checkbox-accept-terms"
            />
            <label htmlFor="terms-accept" className="text-sm leading-tight cursor-pointer">
              He leído y acepto los términos de FallonYou. Me comprometo a respetar a todos los usuarios de la comunidad.
            </label>
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!accepted || mutation.isPending}
            className="w-full bg-amber-500 hover:bg-amber-600"
            data-testid="button-accept-terms"
          >
            {mutation.isPending ? "Guardando..." : "Entrar a FallonYou ✈️"}
          </Button>
        </div>
      </div>
    </div>
  );
}
