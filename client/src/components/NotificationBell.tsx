import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, X, Check, Eye, Users, UserRoundPlus, MessageCircle, CalendarDays, Tag, Sparkles, ShieldCheck, Plane } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { engagementCopy } from "@shared/engagement-copy";
import { localizeAutomaticNotice } from "@shared/communication-notices";
import { communicationLocale } from "@shared/communication-locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  connection_request: { Icon: UserRoundPlus, color: "text-amber-600", bg: "bg-amber-500/10" },
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

function timeAgo(dateStr: string, nowLabel: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return nowLabel;
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { language } = useI18n();
  const locale: "en" | "es" | "fr" | "sv" = communicationLocale(language);
  const copy = engagementCopy[locale];
  const aria = {
    en: { bell: "Open notifications", close: "Close notifications", read: "Mark all as read" },
    es: { bell: "Abrir notificaciones", close: "Cerrar notificaciones", read: "Marcar todas como leídas" },
    fr: { bell: "Ouvrir les notifications", close: "Fermer les notifications", read: "Tout marquer comme lu" },
    sv: { bell: "Öppna notiser", close: "Stäng notiser", read: "Markera alla som lästa" },
  }[language];
  const [, navigate] = useLocation();

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

  const unreadCount = unreadData?.count ?? 0;

  function handleNotifClick(n: Notification) {
    if (!n.read) readOneMutation.mutate(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative w-10 h-10 min-w-10 shrink-0 rounded-full flex items-center justify-center bg-card border hover:bg-accent transition-colors"
          data-testid="button-notification-bell"
          aria-label={aria.bell}
          aria-haspopup="dialog"
          aria-expanded={open}
          type="button"
        >
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        avoidCollisions
        aria-label={copy.notifications}
        data-testid="panel-notifications"
        className="z-50 flex max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border bg-card p-0 text-card-foreground shadow-xl outline-none"
        style={{
          width: "min(calc(100vw - 24px), 24rem, var(--radix-popover-content-available-width))",
          maxHeight: "min(70dvh, var(--radix-popover-content-available-height))",
        }}
      >
        {/* Header */}
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-4 sm:py-3">
          <h3 className="min-w-0 font-bold text-sm [overflow-wrap:anywhere]">{copy.notifications}</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => readAllMutation.mutate()}
                className="col-span-2 row-start-2 inline-flex min-h-10 min-w-0 items-center justify-start gap-1 justify-self-start rounded-md px-2 text-left text-xs text-amber-600 hover:bg-accent hover:underline sm:col-span-1 sm:col-start-2 sm:row-start-1"
                data-testid="button-read-all"
                aria-label={aria.read}
                type="button"
              >
                <Check className="h-3.5 w-3.5 shrink-0" /> {copy.readAll}
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="col-start-2 row-start-1 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground sm:col-start-3"
              aria-label={aria.close}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
          {notifs.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              {copy.empty}
            </div>
          ) : (
            notifs.map(n => {
              const { Icon, color, bg } = typeIcon[n.type] ?? typeIcon.system;
              const localized = localizeAutomaticNotice(
                { title: n.title, body: n.body ?? "" },
                locale,
              );
              return (
                <button
                  key={n.id}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${!n.read ? "bg-amber-500/5" : ""}`}
                  onClick={() => handleNotifClick(n)}
                  data-testid={`notif-item-${n.id}`}
                  type="button"
                >
                  <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug whitespace-pre-wrap [overflow-wrap:anywhere] ${!n.read ? "font-semibold" : "font-medium"}`}>{localized.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{localized.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt, copy.now)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
