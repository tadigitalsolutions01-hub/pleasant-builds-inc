import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trophy, Check, Loader2 } from "lucide-react";
import { getSalaryOverview } from "@/lib/mws.functions";

export const Route = createFileRoute("/app/salary")({
  head: () => ({
    meta: [
      { title: "Weekly Salary · Meta Word Space" },
      { name: "description", content: "Track your weekly salary tier, qualification progress and payout history." },
      { property: "og:title", content: "Weekly Salary · Meta Word Space" },
      { property: "og:description", content: "Track your weekly salary tier, qualification progress and payout history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalaryPage,
});

const money = (n: number) => `$${Number(n ?? 0).toFixed(2)}`;

function SalaryPage() {
  const fn = useServerFn(getSalaryOverview);
  const { data, isLoading } = useQuery({ queryKey: ["salary"], queryFn: () => fn() });

  const m = data?.metrics;
  const levels = data?.levels ?? [];

  const qualifies = (lv: (typeof levels)[number]) =>
    !!m &&
    m.self_invest >= Number(lv.self_invest_min) &&
    m.directs >= lv.direct_min &&
    m.team >= lv.team_min &&
    m.team_invest >= Number(lv.team_invest_min);

  const current = [...levels].reverse().find(qualifies) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Weekly Salary</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Salary is paid once per ISO week at your highest qualified tier.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat label="Current Tier" value={current ? `L${current.level}` : "—"} />
        <Stat label="Weekly Amount" value={current ? money(Number(current.weekly_amount)) : "$0.00"} />
        <Stat label="Salary Earned" value={money(m?.salary_income ?? 0)} />
        <Stat label="Team Investment" value={money(m?.team_invest ?? 0)} />
      </div>

      {isLoading && (
        <div className="glass-strong flex items-center gap-2 rounded-3xl p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading salary data…
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {levels.map((lv) => {
          const ok = qualifies(lv);
          return (
            <div
              key={lv.level}
              className={`glass-strong rounded-3xl p-6 ${ok ? "border border-primary/40 glow" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className={`h-5 w-5 ${ok ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-display text-lg font-semibold">Salary Level {lv.level}</span>
                </div>
                <span className="font-mono text-lg font-bold">{money(Number(lv.weekly_amount))}/wk</span>
              </div>

              <div className="mt-4 space-y-3">
                <Req label="Self investment" have={m?.self_invest ?? 0} need={Number(lv.self_invest_min)} money />
                <Req label="Direct partners" have={m?.directs ?? 0} need={lv.direct_min} />
                <Req label="Team members" have={m?.team ?? 0} need={lv.team_min} />
                <Req label="Team investment" have={m?.team_invest ?? 0} need={Number(lv.team_invest_min)} money />
              </div>

              <div className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${ok ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-muted-foreground"}`}>
                {ok && <Check className="h-3 w-3" />} {ok ? "Qualified" : "Not qualified"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-strong overflow-hidden rounded-3xl">
        <div className="border-b border-border/60 px-5 py-4 font-display text-lg font-semibold">Payout History</div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Week</th>
              <th className="px-5 py-3">Level</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {(data?.payouts ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                  No salary payouts yet.
                </td>
              </tr>
            )}
            {(data?.payouts ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3 font-mono text-xs">{p.week_start}</td>
                <td className="px-5 py-3">L{p.level}</td>
                <td className="px-5 py-3 font-mono">{money(Number(p.amount))}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(p.paid_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-xl font-bold">{value}</div>
    </div>
  );
}

function Req({ label, have, need, money: isMoney }: { label: string; have: number; need: number; money?: boolean }) {
  const pct = need <= 0 ? 100 : Math.min(100, (have / need) * 100);
  const fmt = (n: number) => (isMoney ? `$${n.toFixed(0)}` : String(n));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{fmt(have)} / {fmt(need)}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full [background:var(--gradient-primary)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
