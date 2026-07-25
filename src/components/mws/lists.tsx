import { useUser } from "@/hooks/use-user";
import type { Activity } from "@/lib/mock-store";

export function HistoryList({ title, filter, description }: {
  title: string;
  description?: string;
  filter: (a: Activity) => boolean;
}) {
  const { user } = useUser();
  if (!user) return null;
  const items = user.activities.filter(filter);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </header>
      <div className="glass-strong overflow-hidden rounded-3xl">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 border-b border-border/60 px-6 py-3 text-xs uppercase tracking-widest text-muted-foreground">
          <div>Type</div><div className="hidden sm:block">Date</div><div className="text-right">Amount</div>
        </div>
        {items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">No records yet.</div>
        ) : items.map((a) => (
          <div key={a.id} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-4 border-b border-border/40 px-6 py-4 text-sm last:border-0">
            <div>
              <div className="font-medium">{a.type}</div>
              {a.note && <div className="text-xs text-muted-foreground">{a.note}</div>}
            </div>
            <div className="hidden font-mono text-xs text-muted-foreground sm:block">{new Date(a.at).toLocaleString()}</div>
            <div className="text-right font-mono text-[oklch(0.87_0.22_145)]">+${a.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamList({ title, count, level }: { title: string; count: number; level: string }) {
  const rows = Array.from({ length: count }).map((_, i) => ({
    id: i + 1,
    username: `Neo_${String(1000 + i * 17).slice(-4)}`,
    investment: [10, 20, 40, 80, 160, 320][i % 6],
    earnings: +(Math.random() * 8 + 1).toFixed(2),
    joined: new Date(Date.now() - (i + 1) * 86400000 * 3).toLocaleDateString(),
  }));

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Level: {level}</p>
        </div>
        <span className="glass rounded-full px-3 py-1 font-mono text-xs">{count} members</span>
      </header>
      <div className="glass-strong overflow-hidden rounded-3xl">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-border/60 px-6 py-3 text-xs uppercase tracking-widest text-muted-foreground sm:grid">
          <div>Username</div><div>Investment</div><div>Earnings</div><div>Joined</div>
        </div>
        {rows.map(r => (
          <div key={r.id} className="grid grid-cols-2 items-center gap-3 border-b border-border/40 px-6 py-4 text-sm last:border-0 sm:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full [background:var(--gradient-primary)] text-xs font-bold text-primary-foreground">
                {r.username.slice(-2)}
              </div>
              <div>
                <div className="font-medium">{r.username}</div>
                <div className="text-xs text-muted-foreground sm:hidden">{r.joined}</div>
              </div>
            </div>
            <div className="font-mono text-sm">${r.investment}</div>
            <div className="hidden font-mono text-sm text-[oklch(0.87_0.22_145)] sm:block">+${r.earnings}</div>
            <div className="hidden font-mono text-xs text-muted-foreground sm:block">{r.joined}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
