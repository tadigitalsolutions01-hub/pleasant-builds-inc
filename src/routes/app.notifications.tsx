import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check } from "lucide-react";
import { getMyNotifications, markNotificationRead } from "@/lib/mws.functions";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Meta Word Space" }, { name: "description", content: "Your real-time system notifications." }] }),
  component: Notifications,
});

function Notifications() {
  const qc = useQueryClient();
  const listFn = useServerFn(getMyNotifications);
  const markFn = useServerFn(markNotificationRead);
  const { data } = useQuery({ queryKey: ["notifications"], queryFn: () => listFn(), refetchInterval: 20_000 });
  const mut = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-[oklch(0.85_0.19_210)]" />
        <h1 className="font-display text-3xl font-bold">Notifications</h1>
      </header>

      <div className="glass-strong divide-y divide-border/60 overflow-hidden rounded-3xl">
        {(data ?? []).length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No notifications yet.</div>
        )}
        {(data ?? []).map((n) => (
          <div key={n.id} className={`flex items-start gap-4 p-5 ${!n.read_at ? "bg-primary/5" : ""}`}>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5">
              <Bell className="h-4 w-4 text-[oklch(0.85_0.19_210)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold">{n.title}</div>
                {!n.read_at && <span className="rounded-full bg-[oklch(0.85_0.19_210)]/20 px-2 py-0.5 font-mono text-[9px] uppercase text-[oklch(0.85_0.19_210)]">NEW</span>}
              </div>
              {n.body && <div className="mt-1 text-sm text-muted-foreground">{n.body}</div>}
              <div className="mt-2 font-mono text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            {!n.read_at && n.user_id && (
              <button onClick={() => mut.mutate(n.id)} className="text-muted-foreground hover:text-foreground">
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
