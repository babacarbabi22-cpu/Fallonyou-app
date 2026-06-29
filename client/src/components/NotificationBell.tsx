import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, X, Check, Eye, Users, MessageCircle, CalendarDays, Tag, Sparkles, ChevronRight, ShieldCheck, Plane } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const typeIcon: Record<string, any> = {
  match:        { Icon: Users,          color: "text-amber-500",  bg: "bg-amber-500/10" },
  message:      { Icon: MessageCircle,  color: "text-blue-500",   bg: "bg-blue-500/10" },
  like:         { Icon: Plane,          color: "text-sky-500",    bg: "bg-sky-500/10" },
  view:         { Icon: Eye,            color: "text-amber-500",  bg: "bg-amber-500/10" },
  event:        { Icon: CalendarDays,   color: "text-green-600",  bg: "bg-green-500/10" },
  new_event:    { Icon: CalendarDays,   color: "text-green-600",  bg: "bg-green-500/10" },
  offer:        { Icon: Tag,            color: "text-amber-600",  bg: "bg-amber-500/10" },
  new_traveler: { Icon: Plane,          color: "text-sky-500",    bg: "bg-sky-500/10" },
  system:       { Icon: Sparkles,       color: "text-purple-500", bg: "bg-purple-500/10" },
  admin_message:{ Icon: ShieldCheck,    color: "text-blue-600",   bg: "bg-blue-600/10" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const { data: notifs = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: open,
  });

  const readAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const readOneMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = unreadData?.count ?? 0;

  function handleNotifClick(n: Notification) {
    if (!n.read) readOneMutation.mutate(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center bg-card border hover:bg-accent transition-colors"
        data-testid="button-notification-bell"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-[92vw] max-w-sm rounded-2xl shadow-xl border bg-card z-50 overflow-hidden"
            data-testid="panel-notifications"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-bold text-sm">Notificaciones</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => readAllMutation.mutate()}
                    className="text-xs text-amber-600 hover:underline flex items-center gap-1"
                    data-testid="button-read-all"
                  >
                    <Check className="w-3 h-3" /> Marcar todo leído
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[70vh] overflow-y-auto divide-y">
              {notifs.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Sin notificaciones aún
                </div>
              ) : (
                notifs.map(n => {
                  const { Icon, color, bg } = typeIcon[n.type] ?? typeIcon.system;
                  return (
                    <button
                      key={n.id}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-accent/50 transition-colors ${!n.read ? "bg-amber-500/5" : ""}`}
                      onClick={() => handleNotifClick(n)}
                      data-testid={`notif-item-${n.id}`}
                    >
                      <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-4 whitespace-pre-wrap break-words">{n.body}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
