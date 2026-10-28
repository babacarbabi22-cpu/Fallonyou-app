import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plane, Plus, Loader2, MapPin, Clock, Pencil, Trash2, ShieldCheck, Dumbbell, Droplets, Moon, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BottomNav } from "@/components/BottomNav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const activities = ["coffee", "meal", "sightseeing", "workout", "shopping", "nightlife", "rest", "other"] as const;
type Layover = { id: number; city: string; startsAt: string; endsAt: string; activityType: typeof activities[number]; user?: { firstName: string | null; profileImageUrl: string | null; aviationRole: string | null } };
type Form = { city: string; startsAt: string; endsAt: string; activityType: typeof activities[number] };
const blank: Form = { city: "", startsAt: "", endsAt: "", activityType: "coffee" };
const wellbeingIcons = [Dumbbell, Droplets, Moon, Apple];
const local = (iso: string) => {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function LayoversPage() {
  const t = useTranslation() as any;
  const l = t.layovers;
  const { toast } = useToast();
  const { user, isLoading: isUserLoading } = useAuth();
  const aviationEnabled = !!user?.profile?.aviationOptIn && !!user?.profile?.aviationRole;
  const [tab, setTab] = useState<"discover" | "mine">("discover");
  const [city, setCity] = useState("");
  const [activity, setActivity] = useState("");
  const [form, setForm] = useState<Form>(blank);
  const [editing, setEditing] = useState<Layover | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Layover | null>(null);
  const query = tab === "discover" ? `/api/layovers?${new URLSearchParams(city ? { city, ...(activity ? { activityType: activity } : {}) } : activity ? { activityType: activity } : {})}` : "/api/layovers/mine";
  const { data = [], isLoading, isError } = useQuery<Layover[]>({
    queryKey: [query],
    enabled: aviationEnabled,
  });
  const refresh = () => queryClient.invalidateQueries({
    predicate: query => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/layovers"),
  });
  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() };
      return editing ? apiRequest("PATCH", `/api/layovers/${editing.id}`, payload) : apiRequest("POST", "/api/layovers", payload);
    },
    onSuccess: () => { refresh(); setOpen(false); setEditing(null); setForm(blank); toast({ title: l.saved }); },
    onError: () => toast({ title: l.saveError, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/layovers/${id}`),
    onSuccess: () => { refresh(); setDeleting(null); },
    onError: () => toast({ title: l.saveError, variant: "destructive" }),
  });
  const showForm = (item?: Layover) => {
    setEditing(item ?? null);
    setForm(item ? { city: item.city, startsAt: local(item.startsAt), endsAt: local(item.endsAt), activityType: item.activityType } : blank);
    setOpen(true);
  };
  if (isUserLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (!aviationEnabled) {
    return <div className="min-h-screen bg-background pb-24">
      <header className="px-4 pt-7 pb-4 bg-gradient-to-br from-sky-600 to-indigo-700 text-white">
        <div className="max-w-md mx-auto"><div className="flex gap-2 items-center"><Plane className="w-5 h-5" /><h1 className="font-black text-2xl">{l.title}</h1></div><p className="text-sm text-white/80 mt-1">{l.subtitle}</p></div>
      </header>
      <main className="max-w-md mx-auto p-4">
        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          <ShieldCheck className="w-10 h-10 mx-auto text-sky-600 mb-3" />
          <h2 className="font-bold text-lg">{l.activateTitle}</h2>
          <p className="text-sm text-muted-foreground mt-2">{l.activateDescription}</p>
          <Link href="/profile"><Button className="mt-5 w-full">{l.goToProfile}</Button></Link>
        </div>
      </main>
      <BottomNav />
    </div>;
  }

  return <div className="min-h-screen bg-background pb-24">
    <header className="px-4 pt-7 pb-4 bg-gradient-to-br from-sky-600 to-indigo-700 text-white">
      <div className="max-w-md mx-auto flex justify-between gap-3"><div><div className="flex gap-2 items-center"><Plane className="w-5 h-5" /><h1 className="font-black text-2xl">{l.title}</h1></div><p className="text-sm text-white/80 mt-1">{l.subtitle}</p></div><Button size="sm" variant="secondary" onClick={() => showForm()}><Plus className="w-4 h-4 mr-1" />{l.add}</Button></div>
    </header>
    <main className="max-w-md mx-auto p-4 space-y-4">
      <div className="grid grid-cols-2 bg-muted p-1 rounded-xl"><button onClick={() => setTab("discover")} className={`py-2 rounded-lg text-sm font-semibold ${tab === "discover" ? "bg-background shadow" : ""}`}>{l.discover}</button><button onClick={() => setTab("mine")} className={`py-2 rounded-lg text-sm font-semibold ${tab === "mine" ? "bg-background shadow" : ""}`}>{l.mine}</button></div>
      {tab === "discover" && <div className="flex gap-2"><Input value={city} onChange={e => setCity(e.target.value)} placeholder={l.cityFilter} /><select value={activity} onChange={e => setActivity(e.target.value)} className="rounded-md border bg-background px-2 text-sm"><option value="">{l.allActivities}</option>{activities.map(a => <option key={a} value={a}>{l.activities[a]}</option>)}</select></div>}
      {isLoading ? <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> : isError ? <p className="text-center text-destructive py-12">{l.loadError}</p> : data.length === 0 ? <div className="space-y-4">
        <div className="text-center border border-dashed rounded-2xl py-10 px-5"><Plane className="mx-auto text-muted-foreground mb-3" /><p className="font-semibold">{l.empty}</p><p className="text-sm text-muted-foreground mt-1">{tab === "mine" ? l.emptyMine : l.emptyDiscover}</p></div>
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-300">{l.wellbeingLabel}</p>
            <h2 className="font-bold text-lg mt-1">{l.wellbeingTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1">{l.wellbeingDescription}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {l.wellbeingTips.map((tip: { title: string; description: string }, index: number) => {
              const Icon = wellbeingIcons[index];
              return <article key={tip.title} className="rounded-xl bg-sky-600/[0.06] border border-sky-600/15 p-3">
                <div className="w-9 h-9 rounded-xl bg-sky-600/10 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-sky-700 dark:text-sky-300" />
                </div>
                <h3 className="text-sm font-bold">{tip.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground mt-1">{tip.description}</p>
              </article>;
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground mt-4">{l.wellbeingNote}</p>
        </section>
      </div> : data.map(item => <article key={item.id} className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex gap-3"><img className="w-11 h-11 rounded-full object-cover bg-muted" src={item.user?.profileImageUrl || "/favicon.ico"} alt="" /><div className="flex-1 min-w-0"><div className="flex justify-between gap-2"><div>{item.user ? <Link href="/discover" className="font-bold hover:underline">{item.user.firstName || l.member}</Link> : <span className="font-bold">{l.myLayover}</span>}<p className="text-xs text-primary capitalize">{item.user?.aviationRole ? l.roles[item.user.aviationRole] : ""}</p></div>{tab === "mine" && <span className="flex gap-1"><button onClick={() => showForm(item)} aria-label={l.edit}><Pencil className="w-4 h-4" /></button><button onClick={() => setDeleting(item)} aria-label={l.delete}><Trash2 className="w-4 h-4 text-destructive" /></button></span>}</div><p className="font-semibold mt-2 flex gap-1 items-center"><MapPin className="w-4 h-4 text-primary" />{item.city}</p><p className="text-sm text-muted-foreground flex gap-1 items-center mt-1"><Clock className="w-4 h-4" />{new Date(item.startsAt).toLocaleString()} – {new Date(item.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p><span className="inline-block mt-2 rounded-full bg-primary/10 text-primary px-2 py-1 text-xs font-medium">{l.activities[item.activityType]}</span></div></div>
      </article>)}
    </main><BottomNav />
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? l.edit : l.add}</DialogTitle></DialogHeader><div className="space-y-3"><div className="rounded-lg bg-sky-500/10 p-3 text-xs flex gap-2"><ShieldCheck className="w-4 h-4 shrink-0 text-sky-600" />{l.privacy}</div><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder={l.city} /><label className="text-sm">{l.start}<input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} className="mt-1 w-full rounded-md border bg-background p-2" /></label><label className="text-sm">{l.end}<input type="datetime-local" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} className="mt-1 w-full rounded-md border bg-background p-2" /></label><select value={form.activityType} onChange={e => setForm({ ...form, activityType: e.target.value as Form["activityType"] })} className="w-full rounded-md border bg-background p-2">{activities.map(a => <option key={a} value={a}>{l.activities[a]}</option>)}</select><Button className="w-full" disabled={!form.city || !form.startsAt || !form.endsAt || save.isPending} onClick={() => save.mutate()}>{save.isPending ? <Loader2 className="animate-spin" /> : l.save}</Button></div></DialogContent></Dialog>
    <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{l.delete}</AlertDialogTitle><AlertDialogDescription>{l.deleteConfirm}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.common.cancel}</AlertDialogCancel><AlertDialogAction onClick={() => deleting && remove.mutate(deleting.id)}>{l.delete}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}