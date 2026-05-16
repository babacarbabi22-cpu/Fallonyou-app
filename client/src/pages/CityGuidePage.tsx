import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Link } from "wouter";
import { ArrowLeft, MapPin, Plus, ThumbsUp, Trash2, Loader2, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-danceme";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface CityTip {
  id: number;
  city: string;
  category: string;
  title: string;
  body: string;
  votes: number;
  voted: boolean;
  createdAt: string;
  userId: string;
  firstName: string | null;
  profileImageUrl: string | null;
}

const CATEGORIES = [
  { id: "all", label: "Todo", emoji: "🗺️" },
  { id: "restaurante", label: "Restaurante", emoji: "🍽️" },
  { id: "bar", label: "Bar", emoji: "🍹" },
  { id: "playa", label: "Playa", emoji: "🏖️" },
  { id: "mercado", label: "Mercado", emoji: "🛒" },
  { id: "transporte", label: "Transporte", emoji: "🚌" },
  { id: "actividad", label: "Actividad", emoji: "🎯" },
  { id: "hospedaje", label: "Hospedaje", emoji: "🏨" },
  { id: "otro", label: "Otro", emoji: "💡" },
];

export default function CityGuidePage() {
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const [cityFilter, setCityFilter] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ city: "", category: "restaurante", title: "", body: "" });

  const params = new URLSearchParams();
  if (cityFilter.trim()) params.set("city", cityFilter.trim());
  if (activeCategory !== "all") params.set("category", activeCategory);

  const { data, isLoading } = useQuery<{ tips: CityTip[] }>({
    queryKey: ["/api/city-tips", cityFilter, activeCategory],
    queryFn: () => fetch(`/api/city-tips?${params}`).then(r => r.json()),
    staleTime: 30_000,
  });

  const tips = data?.tips ?? [];

  const voteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/city-tips/${id}/vote`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/city-tips"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/city-tips/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/city-tips"] }),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => apiRequest("POST", "/api/city-tips", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/city-tips"] });
      setShowForm(false);
      setForm({ city: "", category: "restaurante", title: "", body: "" });
      toast({ title: "¡Tip publicado! 🎉" });
    },
    onError: () => toast({ title: "Error al publicar", variant: "destructive" }),
  });

  const catObj = CATEGORIES.find(c => c.id === (activeCategory === "all" ? "all" : activeCategory));

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/events">
            <button className="p-2 rounded-full hover:bg-muted transition-colors" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-tight">Guía de ciudades</h1>
            <p className="text-xs text-muted-foreground">Tips de locales para viajeros</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-3 py-2 rounded-full transition-colors"
            data-testid="button-add-tip"
          >
            <Plus className="w-4 h-4" />
            Añadir
          </button>
        </div>

        {/* City search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar ciudad..."
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-input bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            data-testid="input-city-filter"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                activeCategory === cat.id
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:border-amber-300"
              }`}
              data-testid={`filter-category-${cat.id}`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tips feed */}
      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : tips.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="font-semibold text-foreground">Sin tips aún</p>
            <p className="text-sm text-muted-foreground mt-1">
              {cityFilter ? `No hay tips para "${cityFilter}"` : "¡Sé el primero en compartir un consejo!"}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {tips.map((tip, i) => {
              const cat = CATEGORIES.find(c => c.id === tip.category);
              const isOwn = tip.userId === user?.id;
              return (
                <motion.div
                  key={tip.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border rounded-2xl p-4 shadow-sm"
                  data-testid={`card-tip-${tip.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-xl flex-shrink-0">
                      {cat?.emoji ?? "💡"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-bold text-sm truncate">{tip.title}</span>
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">{cat?.label ?? tip.category}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-600 font-medium mb-1.5">
                        <MapPin className="w-3 h-3" />
                        {tip.city}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{tip.body}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={tip.profileImageUrl ?? undefined} />
                        <AvatarFallback className="text-[10px]">{tip.firstName?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {tip.firstName ?? "Usuario"} · {formatDistanceToNow(new Date(tip.createdAt), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwn && (
                        <button
                          onClick={() => deleteMutation.mutate(tip.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          data-testid={`button-delete-tip-${tip.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => voteMutation.mutate(tip.id)}
                        disabled={voteMutation.isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          tip.voted
                            ? "bg-amber-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600"
                        }`}
                        data-testid={`button-vote-tip-${tip.id}`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {tip.votes}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Add tip bottom sheet */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl p-6 shadow-2xl"
            >
              <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-5" />
              <h2 className="font-bold text-lg mb-4">Compartir un tip</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ciudad *</label>
                  <input
                    type="text"
                    placeholder="Barcelona, Tokio, París..."
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    data-testid="input-tip-city"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoría *</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CATEGORIES.filter(c => c.id !== "all").map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all ${
                          form.category === cat.id
                            ? "bg-amber-500 text-white border-amber-500"
                            : "border-border text-muted-foreground hover:border-amber-300"
                        }`}
                        data-testid={`select-category-${cat.id}`}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Título *</label>
                  <input
                    type="text"
                    placeholder="El mercado de la Boqueria..."
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    data-testid="input-tip-title"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Consejo *</label>
                  <textarea
                    rows={3}
                    placeholder="Comparte lo que sabes... dirección, horarios, precio, consejo especial..."
                    value={form.body}
                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-muted/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    data-testid="input-tip-body"
                  />
                </div>
                <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.city.trim() || !form.title.trim() || !form.body.trim() || createMutation.isPending}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  data-testid="button-submit-tip"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar tip"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
