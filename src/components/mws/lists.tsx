import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyActivities, getTeamAtLevel } from "@/lib/mws.functions";

export function TeamList({ title, level, note }: { title: string; level: number; note?: string }) {
  const fn = useServerFn(getTeamAtLevel);
  const { data, isLoading } = useQuery({
    queryKey: ["team", level],
    queryFn: () => fn({ data: { level } }),
  });
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
      </header>
      <div className="glass-strong overflow-hidden rounded-3xl">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">Wallet</th>
              <th className="px-5 py-3">Investment</th>
              <th className="px-5 py-3">Earnings</th>
              <th className="px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No members at this level yet.</td></tr>
            )}
            {(data ?? []).map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3 font-medium">{m.username}</td>
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{m.wallet_address.slice(0,10)}…{m.wallet_address.slice(-6)}</td>
                <td className="px-5 py-3 font-mono">${Number(m.investment).toFixed(2)}</td>
                <td className="px-5 py-3 font-mono text-[oklch(0.87_0.22_145)]">${Number(m.earnings).toFixed(2)}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(m.joined_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HistoryList({ title, kinds, tone }: { title: string; kinds: string[]; tone?: string }) {
  const fn = useServerFn(getMyActivities);
  const { data, isLoading } = useQuery({
    queryKey: ["history", kinds.join(",")],
    queryFn: () => fn({ data: { limit: 100, kinds } }),
  });
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {tone && <p className="mt-1 text-sm text-muted-foreground">{tone}</p>}
      </header>
      <div className="glass-strong overflow-hidden rounded-3xl">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No entries yet.</td></tr>
            )}
            {(data ?? []).map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-5 py-3 capitalize">{r.kind.replace(/_/g, " ")}</td>
                <td className="px-5 py-3 font-mono text-[oklch(0.87_0.22_145)]">+${Number(r.amount).toFixed(4)}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{JSON.stringify(r.meta ?? {})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
