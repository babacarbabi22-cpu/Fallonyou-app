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
import { ArrowLeft, Search, Ban, UserCheck, AlertTriangle, Flag, Shield, Users, FileWarning } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"users" | "reports">("users");

  const { data: users, isLoading: usersLoading } = useQuery<UserWithProfile[]>({
    queryKey: ["/api/admin/users", searchQuery],
  });

  const { data: reports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/admin/reports"],
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

  const resolveReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return apiRequest("POST", `/api/admin/reports/${reportId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({ title: t.admin.reportResolved });
    },
  });

  const filteredUsers = users?.filter(user => {
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
        <div className="flex gap-2">
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

            {usersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredUsers?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t.admin.noUsersFound}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "reports" && (
          <>
            {reportsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
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
      </div>

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

      <BottomNav />
    </div>
  );
}
