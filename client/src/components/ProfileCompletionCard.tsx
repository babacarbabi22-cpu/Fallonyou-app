import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, FileText, User, CheckCircle2, ChevronRight, Shield } from "lucide-react";
import { Link } from "wouter";

interface UserData {
  firstName?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
  photos?: { url: string }[];
  profile?: {
    bio?: string | null;
    age?: number | null;
    gender?: string | null;
  } | null;
  bio?: string | null;
  age?: number | null;
  gender?: string | null;
}

function calcCompletion(user: UserData) {
  const steps = [
    {
      id: "name",
      label: "Nombre en el perfil",
      done: !!(user.firstName || user.displayName),
      icon: User,
      weight: 15,
      hint: "Añade tu nombre para que te reconozcan",
    },
    {
      id: "age",
      label: "Edad",
      done: !!(user.profile?.age || user.age),
      icon: User,
      weight: 10,
      hint: "Indica tu edad para conectar mejor",
    },
    {
      id: "bio",
      label: "Descripción / Bio",
      done: !!(user.profile?.bio || user.bio),
      icon: FileText,
      weight: 15,
      hint: "Cuéntale a los demás quién eres",
    },
    {
      id: "photo1",
      label: "Primera foto",
      done: !!(user.profileImageUrl || (user.photos && user.photos.length >= 1)),
      icon: Camera,
      weight: 20,
      hint: "Añade al menos una foto de perfil",
    },
    {
      id: "photo3",
      label: "3 fotos o más (verificación)",
      done: !!(user.photos && user.photos.length >= 3),
      icon: Shield,
      weight: 30,
      hint: "Con 3+ fotos tu perfil queda verificado y visible",
    },
    {
      id: "gender",
      label: "Género",
      done: !!(user.profile?.gender || user.gender),
      icon: User,
      weight: 10,
      hint: "Configura tu género para aparecer en las búsquedas",
    },
  ];

  const total = steps.reduce((acc, s) => acc + (s.done ? s.weight : 0), 0);
  return { steps, total };
}

interface Props {
  user: UserData;
  compact?: boolean;
}

export function ProfileCompletionCard({ user, compact = false }: Props) {
  const { steps, total } = calcCompletion(user);

  if (total === 100) return null;

  const pending = steps.filter(s => !s.done);
  const done = steps.filter(s => s.done);

  if (compact) {
    return (
      <div className="px-4 pt-2">
        <Link href="/profile">
          <Card className="border-amber-400/60 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Perfil {total}% completo</span>
                    <ChevronRight className="w-4 h-4 text-amber-500" />
                  </div>
                  <Progress value={total} className="h-2 bg-amber-100" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Completa tu perfil para ser verificado y visible
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    );
  }

  return (
    <Card className="border-amber-400/60 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 mx-4 mt-4">
      <CardContent className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Perfil {total}% completado
            </h3>
            <span className="text-xs text-muted-foreground">{done.length}/{steps.length} pasos</span>
          </div>
          <Progress value={total} className="h-3 bg-amber-100" />
        </div>

        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pendiente</p>
            {pending.map(s => (
              <div key={s.id} className="flex items-start gap-3 bg-white/70 dark:bg-white/5 rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <s.icon className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
                </div>
                <span className="text-xs text-amber-600 font-bold whitespace-nowrap">+{s.weight}%</span>
              </div>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completado</p>
            {done.map(s => (
              <div key={s.id} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <Button
          size="sm"
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold"
          data-testid="button-complete-profile"
          onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
        >
          <Camera className="w-4 h-4 mr-2" />
          Completar perfil ahora
        </Button>
      </CardContent>
    </Card>
  );
}
