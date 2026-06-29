import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, X, HandHeart, MapPin, Search, CheckCircle2, Trash2, Users, ChevronDown, ChevronUp, Euro, Gift, Shirt, ShoppingBag, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HelpRequest {
  id: number;
  userId: string;
  city: string;
  category: string;
  description: string;
  status: string;
  budget: number | null;
  createdAt: string;
  firstName: string | null;
  profileImageUrl: string | null;
  offerCount: number;
  iOffered: boolean;
}

interface Offer {
  id: number;
  helperId: string;
  createdAt: string;
  firstName: string | null;
  profileImageUrl: string | null;
}

const CATEGORIES: { key: string; label: string; emoji: string; color: string }[] = [
  { key: "recommendation", label: "Recomendación", emoji: "🗺️", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { key: "companion",      label: "Acompañante",   emoji: "👥", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { key: "translator",     label: "Traductor",      emoji: "🗣️", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { key: "transport",      label: "Transporte",     emoji: "🚗", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  { key: "accommodation",  label: "Alojamiento",    emoji: "🏠", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  { key: "other",          label: "Otro",            emoji: "❓", color: "bg-muted text-muted-foreground border-border" },
];

const DONATION_CATEGORIES: { key: string; label: string; emoji: string; color: string }[] = [
  { key: "donation_clothes", label: "Ropa",           emoji: "👗", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25" },
  { key: "donation_food",    label: "Comida",          emoji: "🍱", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25" },
  { key: "donation_items",   label: "Objetos / Otros", emoji: "📦", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25" },
];

const ALL_CATEGORIES = [...CATEGORIES, ...DONATION_CATEGORIES];

function getCat(key: string) {
  return ALL_CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

function isDonation(category: string) {
  return category.startsWith("donation_");
}

function RequestCard({ req, currentUserId }: { req: HelpRequest; currentUserId: string }) {
  const { toast } = useToast();
  const [showOffers, setShowOffers] = useState(false);
  const cat = getCat(req.category);
  const isOwn = req.userId === currentUserId;

  const offerMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/local-help/${req.id}/offer`),
    onSuccess: () => {
      toast({ title: "¡Oferta enviada! 🤝", description: "El usuario recibirá una notificación." });
      queryClient.invalidateQueries({ queryKey: ['/api/local-help'] });
    },
    onError: () => toast({ title: "Error", description: "No se pudo enviar la oferta", variant: "destructive" }),
  });

  const resolveMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/api/local-help/${req.id}/resolve`),
    onSuccess: () => {
      toast({ title: "Marcado como resuelto ✓" });
      queryClient.invalidateQueries({ queryKey: ['/api/local-help'] });
      queryClient.invalidateQueries({ queryKey: ['/api/local-help/mine'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/local-help/${req.id}`),
    onSuccess: () => {
      toast({ title: "Solicitud eliminada" });
      queryClient.invalidateQueries({ queryKey: ['/api/local-help'] });
      queryClient.invalidateQueries({ queryKey: ['/api/local-help/mine'] });
    },
  });

  const { data: offers = [] } = useQuery<Offer[]>({
    queryKey: ['/api/local-help', req.id, 'offers'],
    enabled: isOwn && showOffers,
  });

  const isDon = isDonation(req.category);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`rounded-2xl border p-4 flex flex-col gap-3 ${isDon ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card"}`}
      data-testid={`help-request-${req.id}`}
    >
      {/* Donation banner */}
      {isDon && (
        <div className="flex items-center gap-2 -mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white">
            <Gift className="w-3 h-3" /> DONACIÓN SOLIDARIA
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">Gratis · Sin coste</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={req.profileImageUrl || undefined} />
          <AvatarFallback>{req.firstName?.[0] || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{req.firstName || "Usuario"}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${cat.color}`}>
              {cat.emoji} {cat.label}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <MapPin className="w-3 h-3" />
            <span>{req.city}</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: es })}</span>
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-foreground/90">{req.description}</p>

      {!isDon && req.budget && req.budget > 0 && (
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/25"
            data-testid={`badge-budget-${req.id}`}
          >
            <Euro className="w-3 h-3" />
            Se paga · {req.budget}€
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {isOwn ? (
          <>
            <button
              onClick={() => setShowOffers(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`button-show-offers-${req.id}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                {isDon
                  ? `${req.offerCount} ${req.offerCount === 1 ? "persona interesada" : "personas interesadas"}`
                  : `${req.offerCount} ${req.offerCount === 1 ? "persona quiere ayudar" : "personas quieren ayudar"}`}
              </span>
              {showOffers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => resolveMutation.mutate()}
                disabled={resolveMutation.isPending}
                className="h-8 text-xs gap-1 text-green-600 border-green-500/30 hover:bg-green-500/10"
                data-testid={`button-resolve-${req.id}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> {isDon ? "Donado ✓" : "Resuelto"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                data-testid={`button-delete-${req.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <>
            {req.offerCount > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {isDon ? `${req.offerCount} interesado/s` : `${req.offerCount} ayudando`}
              </span>
            )}
            <Button
              size="sm"
              onClick={() => offerMutation.mutate()}
              disabled={req.iOffered || offerMutation.isPending}
              className={`ml-auto h-8 text-xs gap-1.5 ${req.iOffered ? "bg-emerald-600 hover:bg-emerald-600" : isDon ? "bg-emerald-600 hover:bg-emerald-700 text-white" : req.budget ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
              data-testid={`button-offer-${req.id}`}
            >
              {isDon ? <Gift className="w-3.5 h-3.5" /> : <HandHeart className="w-3.5 h-3.5" />}
              {req.iOffered
                ? (isDon ? "Interés enviado ✓" : "Oferta enviada ✓")
                : isDon ? "Me interesa" : req.budget ? `Ayudar · ${req.budget}€` : "Puedo ayudar"}
            </Button>
          </>
        )}
      </div>

      <AnimatePresence>
        {isOwn && showOffers && offers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t pt-3 flex flex-col gap-2"
          >
            <p className="text-xs font-medium text-muted-foreground mb-1">Quieren ayudarte:</p>
            {offers.map(offer => (
              <div key={offer.id} className="flex items-center gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={offer.profileImageUrl || undefined} />
                  <AvatarFallback>{offer.firstName?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{offer.firstName || "Usuario"}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true, locale: es })}
                </span>
              </div>
            ))}
          </motion.div>
        )}
        {isOwn && showOffers && offers.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-muted-foreground border-t pt-3"
          >
            Aún nadie ha respondido. ¡Las notificaciones llegarán aquí!
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function LocalHelpPanel() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"help" | "donate">("help");
  const [cityFilter, setCityFilter] = useState("");
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [form, setForm] = useState({ city: "", category: "", description: "", budget: "" });

  const isDonateMode = formMode === "donate";

  const { data: currentUser } = useQuery<{ id: string }>({ queryKey: ['/api/user'] });

  const { data: requests = [], isLoading } = useQuery<HelpRequest[]>({
    queryKey: ['/api/local-help', cityFilter],
    queryFn: async () => {
      const url = cityFilter ? `/api/local-help?city=${encodeURIComponent(cityFilter)}` : '/api/local-help';
      const res = await fetch(url, { credentials: 'include' });
      return res.json();
    },
  });

  const { data: myRequests = [] } = useQuery<HelpRequest[]>({
    queryKey: ['/api/local-help/mine'],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/local-help', { ...form, budget: isDonateMode ? "" : form.budget }),
    onSuccess: () => {
      if (isDonateMode) {
        toast({ title: "¡Donación publicada! 🎁", description: "La comunidad verá lo que ofreces. ¡Gracias por tu generosidad!" });
      } else {
        toast({ title: "¡Solicitud publicada! 🌍", description: "Los locales verán tu petición y podrán ayudarte." });
      }
      setShowForm(false);
      setForm({ city: "", category: "", description: "", budget: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/local-help'] });
      queryClient.invalidateQueries({ queryKey: ['/api/local-help/mine'] });
    },
    onError: () => toast({ title: "Error", description: "Rellena todos los campos", variant: "destructive" }),
  });

  const displayed = tab === "all" ? requests : myRequests;

  return (
    <div className="flex flex-col flex-1">
      {/* Controls */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        {/* Sub-tabs: all vs mine */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          <button
            onClick={() => setTab("all")}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${tab === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            data-testid="tab-all"
          >
            Todas las peticiones
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${tab === "mine" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            data-testid="tab-mine"
          >
            Mis peticiones {myRequests.length > 0 && <span className="ml-1 text-primary">({myRequests.length})</span>}
          </button>
        </div>

        {/* City filter */}
        {tab === "all" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por ciudad..."
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="pl-9 h-9 text-sm"
              data-testid="input-city-filter"
            />
            {cityFilter && (
              <button onClick={() => setCityFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 space-y-3 pb-4">
        {tab === "all" && !cityFilter && (
          <div className="space-y-2">
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/20 p-4">
              <p className="text-sm font-semibold text-amber-600">¿Estás viajando o eres nuevo en la ciudad?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Publica lo que necesitas — una recomendación, un acompañante, un traductor — y los locales responderán.
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent border border-emerald-500/20 p-4 flex items-start gap-3">
              <span className="text-2xl shrink-0">🎁</span>
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">¿Tienes ropa o comida que donar?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Publica tu donación y quien la necesite podrá contactarte. La comunidad solidaria.
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3 px-6">
            <div className="text-5xl">🌍</div>
            {tab === "all" ? (
              <>
                <p className="font-semibold text-base">No hay peticiones abiertas</p>
                <p className="text-sm text-muted-foreground">
                  {cityFilter ? `No hay peticiones en "${cityFilter}" ahora mismo.` : "Sé el primero en pedir ayuda a la comunidad."}
                </p>
                <Button onClick={() => setShowForm(true)} className="mt-2 gap-2" data-testid="button-empty-new">
                  <Plus className="w-4 h-4" /> Publicar una petición
                </Button>
              </>
            ) : (
              <>
                <p className="font-semibold text-base">Aún no has pedido ayuda</p>
                <p className="text-sm text-muted-foreground">Cuando publiques una petición, aparecerá aquí y podrás ver quién quiere ayudarte.</p>
                <Button onClick={() => setShowForm(true)} className="mt-2 gap-2" data-testid="button-mine-empty-new">
                  <Plus className="w-4 h-4" /> Pedir ayuda ahora
                </Button>
              </>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {displayed.map(req => (
              <RequestCard key={req.id} req={req} currentUserId={currentUser?.id || ""} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* New request / donation dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setForm({ city: "", category: "", description: "", budget: "" }); setFormMode("help"); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {isDonateMode ? "🎁 Publicar donación" : "🤝 Pedir ayuda local"}
            </DialogTitle>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            <button
              onClick={() => { setFormMode("help"); setForm(f => ({ ...f, category: "" })); }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-semibold transition-all ${!isDonateMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              data-testid="form-mode-help"
            >
              <HandHeart className="w-3.5 h-3.5" /> Pedir ayuda
            </button>
            <button
              onClick={() => { setFormMode("donate"); setForm(f => ({ ...f, category: "", budget: "" })); }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-semibold transition-all ${isDonateMode ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground"}`}
              data-testid="form-mode-donate"
            >
              <Gift className="w-3.5 h-3.5" /> Quiero donar
            </button>
          </div>

          <div className="space-y-4 py-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {isDonateMode ? "Ciudad donde puedes entregar" : "Ciudad donde necesitas ayuda"}
              </label>
              <Input
                placeholder="Ej: Barcelona, París, Tokio..."
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                data-testid="input-help-city"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {isDonateMode ? "¿Qué quieres donar?" : "¿Qué tipo de ayuda necesitas?"}
              </label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-help-category">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {(isDonateMode ? DONATION_CATEGORIES : CATEGORIES).map(cat => (
                    <SelectItem key={cat.key} value={cat.key}>
                      {cat.emoji} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {isDonateMode ? "Describe lo que donas" : "Cuéntanos más"}
              </label>
              <Textarea
                placeholder={isDonateMode
                  ? "Ej: Tengo ropa de invierno en buen estado: abrigos, jerséis talla M/L. Puedo quedar en el centro de Barcelona..."
                  : "Ej: Busco a alguien que me recomiende restaurantes locales auténticos en el centro, nada turístico..."}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="resize-none"
                data-testid="textarea-help-description"
              />
              <p className="text-xs text-muted-foreground mt-1">{form.description.length}/300</p>
            </div>

            {!isDonateMode && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  ¿Ofreces pago? <span className="text-muted-foreground/60">(opcional)</span>
                </label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="1"
                    max="9999"
                    placeholder="Ej: 20"
                    value={form.budget}
                    onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                    className="pl-9"
                    data-testid="input-help-budget"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Si indicas un importe, aparecerá un badge "Se paga · X€" para atraer más ayuda.
                </p>
              </div>
            )}

            {isDonateMode && (
              <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 p-3 flex items-start gap-2">
                <span className="text-base shrink-0">💚</span>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  Tu donación es completamente gratuita. Quien esté interesado te contactará por el chat.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} data-testid="button-cancel-help">
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.city.trim() || !form.category || !form.description.trim() || createMutation.isPending}
              className={isDonateMode ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              data-testid="button-submit-help"
            >
              {createMutation.isPending
                ? "Publicando..."
                : isDonateMode ? "🎁 Publicar donación" : "Publicar petición"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LocalHelpPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">🤝 Ayuda Local</h1>
            <p className="text-xs text-muted-foreground">Pide o ofrece ayuda en cualquier ciudad</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5" data-testid="button-new-request">
            <Plus className="w-4 h-4" /> Pedir ayuda
          </Button>
        </div>
      </header>
      <LocalHelpPanel />
      <BottomNav />
    </div>
  );
}
