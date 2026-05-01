import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Search, Ban, UserCheck, AlertTriangle, Flag, Shield, Users, FileWarning, Mail, Camera, Crown, CheckCircle2, XCircle, ShieldCheck, TrendingUp, MessageSquare, Heart, Activity, Tag, Store, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";

interface UserWithProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isPremium: string | null;
  isVerified: string | null;
  isBanned: string | null;
  banReason: string | null;
  createdAt: string | null;
  profile?: {
    displayName: string | null;
    age: number | null;
  };
  reportsCount?: number;
}

interface VerificationRequest {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isVerified: string | null;
  verificationStatus: string | null;
  verificationSelfieUrl: string | null;
  verificationRequestedAt: string | null;
  verificationReviewedAt: string | null;
  verificationRejectedReason: string | null;
}

interface Report {
  id: number;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  details: string | null;
  status: string | null;
  createdAt: string | null;
  reporterName?: string;
  reportedName?: string;
}

export default function AdminPage() {
  const t = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [banReason, setBanReason] = useState("");
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "reports" | "verifications" | "deals">("users");
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [partnerForm, setPartnerForm] = useState({ name: "", description: "", city: "", category: "", contactEmail: "", logoUrl: "", website: "" });
  const [offerForm, setOfferForm] = useState({ partnerId: "", title: "", description: "", discount: "", code: "", validUntil: "" });
  const [userFilter, setUserFilter] = useState<"all" | "premium" | "banned">("all");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<VerificationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageTarget, setMessageTarget] = useState<UserWithProfile | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserWithProfile | null>(null);

  const { data: users, isLoading: usersLoading } = useQuery<UserWithProfile[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: reports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/admin/reports"],
  });

  const { data: verifications, isLoading: verificationsLoading } = useQuery<VerificationRequest[]>({
    queryKey: ["/api/admin/verifications"],
  });

  interface DailyRow { date: string; count: number; }
  interface AdminStats { daily: DailyRow[]; totals: { total_users: number; new_users_7d: number; total_matches: number; total_messages: number; active_today: number; }; }
  const { data: stats } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });

  interface Partner { id: number; name: string; description: string | null; city: string; category: string; contactEmail: string; logoUrl: string | null; website: string | null; status: string | null; }
  interface AdminOffer { id: number; title: string; description: string; discount: string | null; code: string | null; validUntil: string | null; active: boolean | null; partnerName: string; partnerCity: string; }
  const { data: partners } = useQuery<Partner[]>({ queryKey: ["/api/admin/partners"], enabled: activeTab === "deals" });
  const { data: adminOffers } = useQuery<AdminOffer[]>({ queryKey: ["/api/admin/offers"], enabled: activeTab === "deals" });

  const createPartnerMutation = useMutation({
    mutationFn: async (data: typeof partnerForm) => apiRequest("POST", "/api/admin/partners", { ...data, status: "active" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      setPartnerForm({ name: "", description: "", city: "", category: "", contactEmail: "", logoUrl: "", website: "" });
      setShowAddPartner(false);
      toast({ title: "✅ Socio añadido" });
    },
  });

  const createOfferMutation = useMutation({
    mutationFn: async (data: typeof offerForm) => apiRequest("POST", "/api/admin/offers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      setOfferForm({ partnerId: "", title: "", description: "", discount: "", code: "", validUntil: "" });
      setShowAddOffer(false);
      toast({ title: "✅ Oferta creada" });
    },
  });

  const toggleOfferMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => apiRequest("PATCH", `/api/admin/offers/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
    },
  });

  const approveVerificationMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/verifications/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      toast({ title: "✅ Verificación aprobada", description: "El usuario tiene ahora la insignia azul" });
    },
  });

  const rejectVerificationMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/verifications/${userId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      toast({ title: "Verificación rechazada" });
      setShowRejectDialog(false);
      setRejectTarget(null);
      setRejectReason("");
    },
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/ban`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: t.admin.userBanned, description: t.admin.userBannedDesc });
      setShowBanDialog(false);
      setSelectedUser(null);
      setBanReason("");
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/users/${userId}/unban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: t.admin.userUnbanned, description: t.admin.userUnbannedDesc });
    },
  });

  const setPremiumMutation = useMutation({
    mutationFn: async ({ userId, isPremium, months }: { userId: string; isPremium: boolean; months?: number }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/set-premium`, { isPremium, months });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: vars.isPremium ? "⭐ Premium activado" : "Premium desactivado",
        description: vars.isPremium ? `Premium activado por ${vars.months || 1} mes(es)` : "El usuario ya no tiene Premium",
      });
    },
  });

  const resolveReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return apiRequest("POST", `/api/admin/reports/${reportId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({ title: t.admin.reportResolved });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      return apiRequest("POST", "/api/admin/send-user-message", { userId, message });
    },
    onSuccess: () => {
      toast({ title: "✅ Mensaje enviado", description: "El usuario lo recibirá en sus notificaciones" });
      setShowMessageDialog(false);
      setMessageTarget(null);
      setMessageText("");
    },
    onError: () => {
      toast({ title: "Error al enviar el mensaje", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onMutate: async (userId: string) => {
      // Close dialog and remove user from list instantly (optimistic)
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      await queryClient.cancelQueries({ queryKey: ["/api/admin/users"] });
      const previous = queryClient.getQueryData<UserWithProfile[]>(["/api/admin/users"]);
      queryClient.setQueryData<UserWithProfile[]>(["/api/admin/users"], (old) =>
        old ? old.filter((u) => u.id !== userId) : []
      );
      return { previous };
    },
    onSuccess: () => {
      toast({ title: "🗑️ Cuenta eliminada", description: "La cuenta y todos sus datos han sido eliminados permanentemente." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (_err, _userId, context: any) => {
      // Rollback on error
      if (context?.previous) queryClient.setQueryData(["/api/admin/users"], context.previous);
      toast({ title: "Error al eliminar la cuenta", variant: "destructive" });
    },
  });

  const photoEmailMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/send-photo-reminder-emails");
    },
    onSuccess: (data: any) => {
      toast({ title: `📧 Emails enviados: ${data?.sent ?? 0} OK, ${data?.failed ?? 0} fallidos` });
    },
    onError: () => {
      toast({ title: "Error enviando emails", variant: "destructive" });
    },
  });

  const filteredUsers = users?.filter(user => {
    if (userFilter === "premium" && user.isPremium !== "true") return false;
    if (userFilter === "banned" && user.isBanned !== "true") return false;
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(search) ||
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.profile?.displayName?.toLowerCase().includes(search)
    );
  });

  const pendingReports = reports?.filter(r => r.status !== "resolved");

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">{t.admin.title}</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">

        {/* ── Dashboard: métricas clave ── */}
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Activity, label: "Activos hoy", value: stats.totals.active_today, color: "text-green-500" },
                { icon: Users, label: "Usuarios totales", value: stats.totals.total_users, color: "text-blue-500" },
                { icon: TrendingUp, label: "Nuevos (7d)", value: stats.totals.new_users_7d, color: "text-amber-500" },
                { icon: Heart, label: "Matches totales", value: stats.totals.total_matches, color: "text-rose-500" },
                { icon: MessageSquare, label: "Mensajes totales", value: stats.totals.total_messages, color: "text-purple-500" },
              ].map(({ icon: Icon, label, value, color }) => (
                <Card key={label} className="overflow-hidden">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xl font-bold leading-none">{value ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Mini bar chart — usuarios activos por día (últimos 30d) */}
            {stats.daily.length > 0 && (() => {
              const maxCount = Math.max(...stats.daily.map(d => d.count), 1);
              // Show last 14 days max to fit in screen
              const days = stats.daily.slice(-14);
              return (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      Usuarios activos por día (últimos {days.length}d)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1 h-24">
                      {days.map(d => {
                        const pct = Math.round((d.count / maxCount) * 100);
                        const label = d.date.slice(5); // MM-DD
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] text-muted-foreground font-mono leading-none">{d.count}</span>
                            <div
                              className="w-full rounded-t-sm bg-amber-500/80 transition-all"
                              style={{ height: `${Math.max(pct, 4)}%` }}
                              title={`${d.date}: ${d.count}`}
                            />
                            <span className="text-[8px] text-muted-foreground rotate-45 origin-left translate-y-2 whitespace-nowrap">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </>
        )}

        {/* Herramientas de email */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-500" />
              Herramientas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2"
              onClick={() => photoEmailMutation.mutate()}
              disabled={photoEmailMutation.isPending}
              data-testid="button-send-photo-emails"
            >
              <Camera className="w-4 h-4" />
              {photoEmailMutation.isPending
                ? "Enviando emails..."
                : "Enviar email de foto a usuarios sin foto"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            onClick={() => setActiveTab("users")}
            className="flex-1"
            data-testid="tab-users"
          >
            <Users className="w-4 h-4 mr-2" />
            {t.admin.users}
          </Button>
          <Button
            variant={activeTab === "reports" ? "default" : "outline"}
            onClick={() => setActiveTab("reports")}
            className="flex-1 relative"
            data-testid="tab-reports"
          >
            <Flag className="w-4 h-4 mr-2" />
            {t.admin.reports}
            {pendingReports && pendingReports.length > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingReports.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "verifications" ? "default" : "outline"}
            onClick={() => setActiveTab("verifications")}
            className="flex-1 relative"
            data-testid="tab-verifications"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Verificaciones
            {verifications?.filter(v => v.verificationStatus === "pending").length ? (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {verifications.filter(v => v.verificationStatus === "pending").length}
              </Badge>
            ) : null}
          </Button>
          <Button
            variant={activeTab === "deals" ? "default" : "outline"}
            onClick={() => setActiveTab("deals")}
            className={activeTab === "deals" ? "flex-1 bg-green-700 hover:bg-green-800" : "flex-1"}
            data-testid="tab-deals"
          >
            <Tag className="w-4 h-4 mr-2" />
            Ofertas
          </Button>
        </div>

        {activeTab === "users" && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t.admin.searchUsers}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>

            {/* Filtros de usuario */}
            <div className="flex gap-2">
              {(["all", "premium", "banned"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setUserFilter(f)}
                  data-testid={`filter-users-${f}`}
                  className={`flex-1 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    userFilter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-muted text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {f === "all" && `Todos (${users?.length ?? 0})`}
                  {f === "premium" && `⭐ Premium (${users?.filter(u => u.isPremium === "true").length ?? 0})`}
                  {f === "banned" && `🚫 Baneados (${users?.filter(u => u.isBanned === "true").length ?? 0})`}
                </button>
              ))}
            </div>

            {usersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : (
              <div className="space-y-3">
                {filteredUsers?.map((user) => (
                  <Card key={user.id} className={user.isBanned === "true" ? "border-red-500/50 bg-red-500/5" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.profileImageUrl || undefined} />
                          <AvatarFallback>
                            {user.profile?.displayName?.[0] || user.firstName?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">
                              {user.profile?.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown"}
                            </p>
                            {user.isPremium === "true" && (
                              <Badge variant="secondary" className="text-xs">Premium</Badge>
                            )}
                            {user.isVerified === "true" && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                <UserCheck className="w-3 h-3 mr-1" />
                                {t.admin.verified}
                              </Badge>
                            )}
                            {user.isBanned === "true" && (
                              <Badge variant="destructive" className="text-xs">
                                <Ban className="w-3 h-3 mr-1" />
                                {t.admin.banned}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          {user.profile?.age && (
                            <p className="text-xs text-muted-foreground">{user.profile.age} {t.admin.yearsOld}</p>
                          )}
                          {user.isBanned === "true" && user.banReason && (
                            <p className="text-xs text-red-500 mt-1">
                              <AlertTriangle className="w-3 h-3 inline mr-1" />
                              {user.banReason}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {/* Premium toggle */}
                          {user.isPremium === "true" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-500 text-amber-600 hover:bg-amber-50"
                              onClick={() => setPremiumMutation.mutate({ userId: user.id, isPremium: false })}
                              disabled={setPremiumMutation.isPending}
                              data-testid={`button-remove-premium-${user.id}`}
                            >
                              <Crown className="w-4 h-4 mr-1" />
                              Quitar Premium
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-400 text-amber-600 hover:bg-amber-50"
                              onClick={() => setPremiumMutation.mutate({ userId: user.id, isPremium: true, months: 1 })}
                              disabled={setPremiumMutation.isPending}
                              data-testid={`button-set-premium-${user.id}`}
                            >
                              <Crown className="w-4 h-4 mr-1" />
                              Dar Premium
                            </Button>
                          )}
                          {/* Send message */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            onClick={() => {
                              setMessageTarget(user);
                              setMessageText("");
                              setShowMessageDialog(true);
                            }}
                            data-testid={`button-message-${user.id}`}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Mensaje
                          </Button>
                          {/* Ban toggle */}
                          {user.isBanned === "true" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unbanMutation.mutate(user.id)}
                              disabled={unbanMutation.isPending}
                              data-testid={`button-unban-${user.id}`}
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              {t.admin.unban}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedUser(user);
                                setBanReason("");
                                setShowBanDialog(true);
                              }}
                              data-testid={`button-ban-${user.id}`}
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              {t.admin.ban}
                            </Button>
                          )}
                          {/* Delete account */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-700 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => {
                              setDeleteTarget(user);
                              setShowDeleteDialog(true);
                            }}
                            data-testid={`button-delete-${user.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredUsers?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {userFilter === "premium"
                      ? "No hay usuarios Premium"
                      : userFilter === "banned"
                      ? "No hay usuarios baneados"
                      : t.admin.noUsersFound}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "reports" && (
          <>
            {reportsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : reports && reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card key={report.id} className={report.status === "resolved" ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-orange-500/10 p-2 rounded-full">
                          <FileWarning className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{report.reason}</Badge>
                            {report.status === "resolved" && (
                              <Badge variant="secondary">{t.admin.resolved}</Badge>
                            )}
                          </div>
                          <p className="text-sm">
                            <span className="text-muted-foreground">{t.admin.reportedBy}:</span>{" "}
                            {report.reporterName || report.reporterId}
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">{t.admin.reportedUser}:</span>{" "}
                            {report.reportedName || report.reportedUserId}
                          </p>
                          {report.details && (
                            <p className="text-sm text-muted-foreground mt-2">{report.details}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(report.createdAt || "").toLocaleDateString()}
                          </p>
                        </div>
                        {report.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveReportMutation.mutate(report.id)}
                            disabled={resolveReportMutation.isPending}
                            data-testid={`button-resolve-${report.id}`}
                          >
                            {t.admin.resolve}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t.admin.noReports}
              </div>
            )}
          </>
        )}

        {activeTab === "verifications" && (
          <>
            {verificationsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : !verifications?.length ? (
              <div className="text-center py-10">
                <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground">No hay solicitudes de verificación</p>
              </div>
            ) : (
              <div className="space-y-4">
                {verifications.map((v) => (
                  <Card key={v.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Selfie image */}
                      {v.verificationSelfieUrl && (
                        <div className="relative">
                          <img
                            src={v.verificationSelfieUrl}
                            alt="Selfie"
                            className="w-full h-52 object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            {v.verificationStatus === "pending" && (
                              <Badge className="bg-amber-500 text-black font-bold">Pendiente</Badge>
                            )}
                            {v.verificationStatus === "approved" && (
                              <Badge className="bg-blue-500 text-white font-bold">Aprobado ✓</Badge>
                            )}
                            {v.verificationStatus === "rejected" && (
                              <Badge variant="destructive">Rechazado</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={v.profileImageUrl || ""} />
                            <AvatarFallback>{(v.firstName || "?")[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm">{v.firstName} {v.lastName}</p>
                            <p className="text-xs text-muted-foreground">{v.email}</p>
                            {v.verificationRequestedAt && (
                              <p className="text-xs text-muted-foreground">
                                Solicitado: {new Date(v.verificationRequestedAt).toLocaleDateString("es")}
                              </p>
                            )}
                          </div>
                        </div>

                        {v.verificationRejectedReason && (
                          <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2">
                            <p className="text-xs text-red-600 dark:text-red-400">Motivo: {v.verificationRejectedReason}</p>
                          </div>
                        )}

                        {v.verificationStatus === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => approveVerificationMutation.mutate(v.id)}
                              disabled={approveVerificationMutation.isPending}
                              data-testid={`button-approve-verification-${v.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => { setRejectTarget(v); setShowRejectDialog(true); }}
                              data-testid={`button-reject-verification-${v.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── DEALS TAB ─────────────────────────────────────── */}
        {activeTab === "deals" && (
          <div className="space-y-6">
            {/* Partners section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2"><Store className="w-4 h-4 text-green-600" /> Socios ({partners?.length ?? 0})</h3>
                <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white" onClick={() => setShowAddPartner(true)} data-testid="button-add-partner">
                  <Plus className="w-4 h-4 mr-1" /> Añadir socio
                </Button>
              </div>
              {showAddPartner && (
                <Card className="mb-4 border-green-200">
                  <CardContent className="pt-4 space-y-3">
                    <p className="font-semibold text-sm">Nuevo socio</p>
                    <Input placeholder="Nombre del negocio *" value={partnerForm.name} onChange={e => setPartnerForm(f => ({ ...f, name: e.target.value }))} data-testid="input-partner-name" />
                    <Input placeholder="Ciudad *" value={partnerForm.city} onChange={e => setPartnerForm(f => ({ ...f, city: e.target.value }))} data-testid="input-partner-city" />
                    <Input placeholder="Categoría * (restaurante, spa, hotel...)" value={partnerForm.category} onChange={e => setPartnerForm(f => ({ ...f, category: e.target.value }))} data-testid="input-partner-category" />
                    <Input placeholder="Email de contacto *" value={partnerForm.contactEmail} onChange={e => setPartnerForm(f => ({ ...f, contactEmail: e.target.value }))} data-testid="input-partner-email" />
                    <Input placeholder="Descripción" value={partnerForm.description} onChange={e => setPartnerForm(f => ({ ...f, description: e.target.value }))} />
                    <Input placeholder="URL del logo" value={partnerForm.logoUrl} onChange={e => setPartnerForm(f => ({ ...f, logoUrl: e.target.value }))} />
                    <Input placeholder="Website" value={partnerForm.website} onChange={e => setPartnerForm(f => ({ ...f, website: e.target.value }))} />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowAddPartner(false)}>Cancelar</Button>
                      <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white" onClick={() => createPartnerMutation.mutate(partnerForm)} disabled={!partnerForm.name || !partnerForm.city || !partnerForm.category || !partnerForm.contactEmail || createPartnerMutation.isPending} data-testid="button-submit-partner">
                        {createPartnerMutation.isPending ? "Guardando..." : "Guardar socio"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                {partners?.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      {p.logoUrl ? <img src={p.logoUrl} className="w-full h-full object-cover rounded-full" /> : <Store className="w-4 h-4 text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.city} · {p.category}</p>
                    </div>
                    <Badge className={p.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Offers section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2"><Tag className="w-4 h-4 text-green-600" /> Ofertas ({adminOffers?.length ?? 0})</h3>
                <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white" onClick={() => setShowAddOffer(true)} disabled={!partners || partners.length === 0} data-testid="button-add-offer">
                  <Plus className="w-4 h-4 mr-1" /> Nueva oferta
                </Button>
              </div>
              {showAddOffer && (
                <Card className="mb-4 border-green-200">
                  <CardContent className="pt-4 space-y-3">
                    <p className="font-semibold text-sm">Nueva oferta</p>
                    <select className="w-full border rounded-md p-2 text-sm bg-background" value={offerForm.partnerId} onChange={e => setOfferForm(f => ({ ...f, partnerId: e.target.value }))} data-testid="select-offer-partner">
                      <option value="">Selecciona un socio *</option>
                      {partners?.map(p => <option key={p.id} value={p.id}>{p.name} – {p.city}</option>)}
                    </select>
                    <Input placeholder="Título de la oferta *" value={offerForm.title} onChange={e => setOfferForm(f => ({ ...f, title: e.target.value }))} data-testid="input-offer-title" />
                    <Textarea placeholder="Descripción *" value={offerForm.description} onChange={e => setOfferForm(f => ({ ...f, description: e.target.value }))} className="min-h-[70px]" data-testid="input-offer-description" />
                    <Input placeholder="Descuento (ej: 20%, 2x1, Copa gratis)" value={offerForm.discount} onChange={e => setOfferForm(f => ({ ...f, discount: e.target.value }))} data-testid="input-offer-discount" />
                    <Input placeholder="Código promocional (opcional)" value={offerForm.code} onChange={e => setOfferForm(f => ({ ...f, code: e.target.value }))} data-testid="input-offer-code" />
                    <div>
                      <label className="text-xs text-muted-foreground">Válido hasta (opcional)</label>
                      <Input type="date" value={offerForm.validUntil} onChange={e => setOfferForm(f => ({ ...f, validUntil: e.target.value }))} data-testid="input-offer-valid-until" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowAddOffer(false)}>Cancelar</Button>
                      <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white" onClick={() => createOfferMutation.mutate(offerForm)} disabled={!offerForm.partnerId || !offerForm.title || !offerForm.description || createOfferMutation.isPending} data-testid="button-submit-offer">
                        {createOfferMutation.isPending ? "Guardando..." : "Crear oferta"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                {adminOffers?.map(o => (
                  <div key={o.id} className="flex items-start gap-3 p-3 rounded-xl border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{o.title}</p>
                      <p className="text-xs text-muted-foreground">{o.partnerName} · {o.partnerCity}</p>
                      {o.discount && <Badge className="mt-1 bg-green-100 text-green-700 text-xs">{o.discount}</Badge>}
                      {o.code && <p className="text-xs font-mono text-green-700 mt-0.5">Código: {o.code}</p>}
                    </div>
                    <Button size="sm" variant={o.active ? "outline" : "default"} className={o.active ? "text-red-600 border-red-200 hover:bg-red-50" : "bg-green-700 hover:bg-green-800 text-white"} onClick={() => toggleOfferMutation.mutate({ id: o.id, active: !o.active })} data-testid={`button-toggle-offer-${o.id}`}>
                      {o.active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reject Verification Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar verificación</DialogTitle>
            <DialogDescription>
              Opcionalmente indica el motivo del rechazo a {rejectTarget?.firstName}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo del rechazo (opcional, ej: foto borrosa, no se ve el documento...)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[80px]"
            data-testid="input-reject-reason"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => rejectTarget && rejectVerificationMutation.mutate({ userId: rejectTarget.id, reason: rejectReason })}
              disabled={rejectVerificationMutation.isPending}
              data-testid="button-confirm-reject"
            >
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.admin.banUserTitle}</DialogTitle>
            <DialogDescription>
              {t.admin.banUserDesc} {selectedUser?.profile?.displayName || selectedUser?.firstName}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t.admin.banReasonPlaceholder}
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            className="min-h-[100px]"
            data-testid="input-ban-reason"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>
              {t.admin.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUser && banMutation.mutate({ userId: selectedUser.id, reason: banReason })}
              disabled={!banReason.trim() || banMutation.isPending}
              data-testid="button-confirm-ban"
            >
              {t.admin.confirmBan}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">⚠️ Eliminar cuenta permanentemente</DialogTitle>
            <DialogDescription>
              Estás a punto de eliminar la cuenta de{" "}
              <strong>{deleteTarget?.profile?.displayName || deleteTarget?.firstName || "este usuario"}</strong>.
              Esta acción es <strong>irreversible</strong>: se borrarán todos sus datos, fotos, matches y mensajes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.id)}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? "Eliminando..." : "Sí, eliminar cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Mensaje a {messageTarget?.profile?.displayName || messageTarget?.firstName || "usuario"}
            </DialogTitle>
            <DialogDescription>
              El mensaje llegará como notificación dentro de la app. El usuario lo verá en su campana de notificaciones.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Escribe tu mensaje aquí... (ej: Hola, tu perfil ha sido revisado y necesitamos que actualices tu foto de verificación.)"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="min-h-[120px]"
            data-testid="input-admin-message"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => messageTarget && sendMessageMutation.mutate({ userId: messageTarget.id, message: messageText })}
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              data-testid="button-send-admin-message"
            >
              {sendMessageMutation.isPending ? "Enviando..." : "Enviar mensaje"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
