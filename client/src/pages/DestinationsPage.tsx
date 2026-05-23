import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, X, Users, TrendingUp, Compass, Search, Lock, Crown, Infinity } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

const FREE_LIMIT = 3;

interface MyDestination {
  id: number;
  destination: string;
  country: string | null;
  emoji: string;
  created_at: string;
}

interface TrendingDestination {
  destination: string;
  country: string | null;
  emoji: string;
  traveler_count: string;
  avatars: string[];
}

interface Traveler {
  id: string;
  firstName: string;
  profileImageUrl: string | null;
  city: string | null;
  age: number | null;
  bio: string | null;
}

interface PremiumStatus {
  isPremium: boolean;
}

const POPULAR_SUGGESTIONS = [
  { destination: "Tokio", country: "Japón", emoji: "🇯🇵" },
  { destination: "Bali", country: "Indonesia", emoji: "🇮🇩" },
  { destination: "Nueva York", country: "EEUU", emoji: "🇺🇸" },
  { destination: "París", country: "Francia", emoji: "🇫🇷" },
  { destination: "Tailandia", country: "Tailandia", emoji: "🇹🇭" },
  { destination: "Maldivas", country: "Maldivas", emoji: "🇲🇻" },
  { destination: "Roma", country: "Italia", emoji: "🇮🇹" },
  { destination: "Marruecos", country: "Marruecos", emoji: "🇲🇦" },
  { destination: "Islandia", country: "Islandia", emoji: "🇮🇸" },
  { destination: "Perú", country: "Perú", emoji: "🇵🇪" },
  { destination: "Grecia", country: "Grecia", emoji: "🇬🇷" },
  { destination: "Jordania", country: "Jordania", emoji: "🇯🇴" },
];

function PremiumLockOverlay({ compact = false, onUpgrade }: { compact?: boolean; onUpgrade: () => void }) {
  if (compact) {
    return (
      <button
        onClick={onUpgrade}
        data-testid="btn-upgrade-travelers"
        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all"
      >
        <Crown className="w-3 h-3" />
        Premium
      </button>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 p-5 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
        <Lock className="w-5 h-5 text-amber-500" />
      </div>
      <p className="font-semibold text-sm mb-1">Función Premium</p>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Descubre qué usuarios quieren visitar el mismo destino que tú y conéctate con ellos.
      </p>
      <button
        onClick={onUpgrade}
        data-testid="btn-upgrade-cta"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
      >
        <Crown className="w-4 h-4" />
        Activar Premium
      </button>
    </motion.div>
  );
}

export default function DestinationsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"mine" | "trending">("mine");
  const [input, setInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [selectedTravelers, setSelectedTravelers] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const { data: premiumStatus } = useQuery<PremiumStatus>({
    queryKey: ["/api/premium/status"],
  });
  const isPremium = premiumStatus?.isPremium ?? false;

  const { data: myList = [], isLoading: loadingMine } = useQuery<MyDestination[]>({
    queryKey: ["/api/dream-destinations/mine"],
  });

  const { data: trending = [], isLoading: loadingTrending } = useQuery<TrendingDestination[]>({
    queryKey: ["/api/dream-destinations/trending"],
    enabled: tab === "trending",
  });

  const { data: travelers = [], isLoading: loadingTravelers } = useQuery<Traveler[]>({
    queryKey: ["/api/dream-destinations/travelers", selectedTravelers],
    queryFn: () =>
      fetch(`/api/dream-destinations/travelers?destination=${encodeURIComponent(selectedTravelers!)}`, {
        credentials: "include",
      }).then((r) => r.json()),
    enabled: !!selectedTravelers && isPremium,
  });

  const addMutation = useMutation({
    mutationFn: (data: { destination: string; country: string; emoji: string }) =>
      apiRequest("POST", "/api/dream-destinations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dream-destinations/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dream-destinations/trending"] });
      setInput("");
      setCountryInput("");
      setShowAdd(false);
      toast({ title: "✈️ Destino añadido", description: "Ya está en tu lista de sueños" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "No se pudo añadir", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/dream-destinations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dream-destinations/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dream-destinations/trending"] });
    },
  });

  const handleAdd = (dest?: string, country?: string, emoji?: string) => {
    const destination = dest || input.trim();
    if (!destination) return;
    if (!isPremium && myList.length >= FREE_LIMIT) {
      toast({
        title: "Límite alcanzado",
        description: `Con la versión gratuita puedes guardar hasta ${FREE_LIMIT} destinos. Activa Premium para añadir ilimitados.`,
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate({
      destination,
      country: country || countryInput.trim(),
      emoji: emoji || "✈️",
    });
  };

  const handleTravelersClick = (destination: string) => {
    if (!isPremium) {
      setSelectedTravelers("__premium_gate__");
      return;
    }
    setSelectedTravelers(selectedTravelers === destination ? null : destination);
  };

  const myDestSet = new Set(myList.map((d) => d.destination.toLowerCase()));

  const filteredTrending = trending.filter(
    (d) =>
      !searchFilter ||
      d.destination.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (d.country || "").toLowerCase().includes(searchFilter.toLowerCase())
  );

  const atFreeLimit = !isPremium && myList.length >= FREE_LIMIT;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-bold">Destinos soñados</h1>
          </div>
          {isPremium ? (
            <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full">
              <Crown className="w-3.5 h-3.5" /> Premium
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              <Infinity className="w-3.5 h-3.5" />
              {myList.length}/{FREE_LIMIT} gratis
            </span>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-full p-1">
          <button
            onClick={() => setTab("mine")}
            data-testid="tab-my-destinations"
            className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-all ${
              tab === "mine" ? "bg-background shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            Mi lista {myList.length > 0 && `(${myList.length})`}
          </button>
          <button
            onClick={() => setTab("trending")}
            data-testid="tab-trending-destinations"
            className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-all ${
              tab === "trending" ? "bg-background shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Tendencias
            </span>
          </button>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* MY LIST TAB */}
        {tab === "mine" && (
          <div className="space-y-4">

            {/* Free limit banner */}
            {atFreeLimit && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/8 to-yellow-500/5 p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Límite de {FREE_LIMIT} destinos</p>
                  <p className="text-xs text-muted-foreground">Activa Premium para añadir destinos ilimitados y ver quién quiere ir contigo</p>
                </div>
                <button
                  onClick={() => navigate("/premium")}
                  data-testid="btn-upgrade-limit"
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
                >
                  Ver
                </button>
              </motion.div>
            )}

            {/* Add button — disabled at free limit */}
            {!atFreeLimit && (
              <button
                onClick={() => setShowAdd(!showAdd)}
                data-testid="btn-add-destination"
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-amber-500/40 rounded-2xl text-amber-600 hover:border-amber-500/70 hover:bg-amber-500/5 transition-all font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Añadir destino
              </button>
            )}

            {/* Add form */}
            <AnimatePresence>
              {showAdd && !atFreeLimit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card border rounded-2xl p-4 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ciudad o país (ej. Tokio)"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        data-testid="input-destination"
                        className="flex-1"
                        autoFocus
                      />
                      <Input
                        placeholder="País (opcional)"
                        value={countryInput}
                        onChange={(e) => setCountryInput(e.target.value)}
                        data-testid="input-destination-country"
                        className="w-28"
                      />
                    </div>
                    <Button
                      onClick={() => handleAdd()}
                      disabled={!input.trim() || addMutation.isPending}
                      data-testid="btn-save-destination"
                      className="w-full"
                      size="sm"
                    >
                      {addMutation.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">O elige uno popular:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_SUGGESTIONS.filter(
                          (s) => !myDestSet.has(s.destination.toLowerCase())
                        ).slice(0, 8).map((s) => (
                          <button
                            key={s.destination}
                            onClick={() => handleAdd(s.destination, s.country, s.emoji)}
                            data-testid={`btn-quick-add-${s.destination}`}
                            className="flex items-center gap-1 px-2.5 py-1 bg-muted rounded-full text-xs hover:bg-amber-500/10 hover:text-amber-700 transition-colors"
                          >
                            {s.emoji} {s.destination}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {!loadingMine && myList.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Compass className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Tu lista está vacía</p>
                <p className="text-sm mt-1">Añade los destinos que sueñas visitar</p>
              </div>
            )}

            {/* My destinations list */}
            <AnimatePresence>
              {myList.map((d) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 bg-card border rounded-2xl p-3.5 group"
                  data-testid={`card-destination-${d.id}`}
                >
                  <span className="text-2xl">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{d.destination}</p>
                    {d.country && (
                      <p className="text-xs text-muted-foreground">{d.country}</p>
                    )}
                  </div>
                  {isPremium ? (
                    <button
                      onClick={() => setSelectedTravelers(selectedTravelers === d.destination ? null : d.destination)}
                      data-testid={`btn-see-travelers-${d.id}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                    >
                      <Users className="w-3 h-3" />
                      Viajeros
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate("/premium")}
                      data-testid={`btn-travelers-locked-${d.id}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:bg-amber-500/10 hover:text-amber-700 transition-colors"
                    >
                      <Lock className="w-3 h-3" />
                      Viajeros
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(d.id)}
                    data-testid={`btn-delete-destination-${d.id}`}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Premium upsell if not premium and has destinations */}
            {!isPremium && myList.length > 0 && (
              <PremiumLockOverlay onUpgrade={() => navigate("/premium")} />
            )}

            {/* Travelers panel (premium only) */}
            <AnimatePresence>
              {isPremium && selectedTravelers && selectedTravelers !== "__premium_gate__" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-card border rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-500" />
                      Quieren ir a {selectedTravelers}
                    </h3>
                    <button
                      onClick={() => setSelectedTravelers(null)}
                      className="p-1 rounded-full hover:bg-muted"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {loadingTravelers && (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {!loadingTravelers && travelers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      Todavía nadie más quiere ir aquí — ¡sé el primero!
                    </p>
                  )}
                  <div className="space-y-2">
                    {travelers.map((t) => (
                      <div key={t.id} className="flex items-center gap-3" data-testid={`traveler-${t.id}`}>
                        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                          {t.profileImageUrl ? (
                            <img src={t.profileImageUrl} alt={t.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">
                              {t.firstName?.[0] || "?"}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{t.firstName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[t.city, t.age ? `${t.age} años` : null].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* TRENDING TAB */}
        {tab === "trending" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar destino..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                data-testid="input-search-destinations"
                className="pl-9"
              />
            </div>

            {loadingTrending && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loadingTrending && filteredTrending.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Sin resultados</p>
                <p className="text-sm mt-1">Sé el primero en añadir este destino</p>
              </div>
            )}

            {filteredTrending.map((d, i) => {
              const alreadyAdded = myDestSet.has(d.destination.toLowerCase());
              const isExpanded = selectedTravelers === d.destination;
              return (
                <motion.div
                  key={d.destination}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card border rounded-2xl p-3.5"
                  data-testid={`trending-card-${i}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{d.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{d.destination}</p>
                        {i < 3 && (
                          <span className="text-xs bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                            #{i + 1}
                          </span>
                        )}
                      </div>
                      {d.country && <p className="text-xs text-muted-foreground">{d.country}</p>}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex -space-x-1.5">
                          {d.avatars.slice(0, 4).map((av, j) => (
                            <img key={j} src={av} alt="" className="w-5 h-5 rounded-full border border-background object-cover" />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {d.traveler_count} {Number(d.traveler_count) === 1 ? "viajero" : "viajeros"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {!alreadyAdded ? (
                        <button
                          onClick={() => handleAdd(d.destination, d.country || "", d.emoji)}
                          disabled={addMutation.isPending || atFreeLimit}
                          data-testid={`btn-add-trending-${i}`}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            atFreeLimit
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : "bg-amber-500 text-white hover:bg-amber-600"
                          }`}
                        >
                          {atFreeLimit ? <Lock className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {atFreeLimit ? "Límite" : "Añadir"}
                        </button>
                      ) : (
                        <span className="text-xs text-green-600 font-medium px-2 py-1">✓ En tu lista</span>
                      )}
                      {isPremium ? (
                        <button
                          onClick={() => setSelectedTravelers(isExpanded ? null : d.destination)}
                          data-testid={`btn-see-trending-travelers-${i}`}
                          className="text-xs text-amber-600 hover:text-amber-700 transition-colors font-medium"
                        >
                          {isExpanded ? "Ocultar" : "Ver quiénes"}
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate("/premium")}
                          data-testid={`btn-trending-travelers-locked-${i}`}
                          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-amber-600 transition-colors"
                        >
                          <Lock className="w-3 h-3" /> Ver quiénes
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Travelers expandable (premium only) */}
                  <AnimatePresence>
                    {isPremium && isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {loadingTravelers && (
                            <div className="flex justify-center py-2">
                              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                          {!loadingTravelers && travelers.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-1">
                              Ningún otro viajero en este destino todavía
                            </p>
                          )}
                          {travelers.map((t) => (
                            <div key={t.id} className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                                {t.profileImageUrl ? (
                                  <img src={t.profileImageUrl} alt={t.firstName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm">
                                    {t.firstName?.[0] || "?"}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-xs">{t.firstName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {[t.city, t.age ? `${t.age}a` : null].filter(Boolean).join(" · ")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Premium banner at bottom of trending if not premium */}
            {!isPremium && filteredTrending.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/8 to-yellow-500/5 p-4 flex items-center gap-3 mt-2"
              >
                <Crown className="w-8 h-8 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Ve quién quiere ir contigo</p>
                  <p className="text-xs text-muted-foreground">Conecta con viajeros que sueñan con los mismos destinos</p>
                </div>
                <button
                  onClick={() => navigate("/premium")}
                  data-testid="btn-upgrade-trending"
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
                >
                  Premium
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
