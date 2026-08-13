import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Trophy } from "lucide-react";
import {
  adminDeleteSalaryLevel,
  adminListSalaryLevels,
  adminRunSalary,
  adminUpsertSalaryLevel,
} from "@/lib/admin.functions";

type Level = {
  level: number;
  self_invest_min: number;
  direct_min: number;
  team_min: number;
  team_invest_min: number;
  weekly_amount: number;
  active: boolean;
};

const EMPTY: Level = {
  level: 1,
  self_invest_min: 0,
  direct_min: 0,
  team_min: 0,
  team_invest_min: 0,
  weekly_amount: 0,
  active: true,
};

export function SalaryTab() {
  const listFn = useServerFn(adminListSalaryLevels);
  const upsertFn = useServerFn(adminUpsertSalaryLevel);
  const delFn = useServerFn(adminDeleteSalaryLevel);
  const runFn = useServerFn(adminRunSalary);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["admin", "salary"], queryFn: () => listFn() });
  const [rows, setRows] = useState<Level[]>([]);

  useEffect(() => {
    if (data) {
      setRows(
        (data.levels as Level[]).map((l) => ({
          level: Number(l.level),
          self_invest_min: Number(l.self_invest_min),
          direct_min: Number(l.direct_min),
          team_min: Number(l.team_min),
          team_invest_min: Number(l.team_invest_min),
          weekly_amount: Number(l.weekly_amount),
          active: !!l.active,
        })),
      );
    }
  }, [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "salary"] });

  const save = useMutation({
    mutationFn: (lvl: Level) => upsertFn({ data: lvl }),
    onSuccess: () => { toast.success("Tier saved"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (level: number) => delFn({ data: { level } }),
    onSuccess: () => { toast.success("Tier removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const run = useMutation({
    mutationFn: () => runFn(),
    onSuccess: (r: { paid: number }) => { toast.success(`Salary run: ${r.paid} paid`); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = (i: number, p: Partial<Level>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const addTier = () => {
    const next = rows.length ? Math.max(...rows.map((r) => r.level)) + 1 : 1;
    setRows((r) => [...r, { ...EMPTY, level: next }]);
  };

  return (
    <div className="space-y-5">
      <div className="glass-strong flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-300" />
          <div>
            <h2 className="font-display text-lg font-semibold">Weekly Salary Rules</h2>
            <p className="text-xs text-muted-foreground">
              A member qualifies for the highest tier whose requirements they meet. Payouts run once per ISO week and de-duplicate automatically.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addTier}
            className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs hover:bg-white/10"
          >
            <Plus className="h-3.5 w-3.5" /> Add tier
          </button>
          <button
            onClick={() => run.mutate()}
            disabled={run.isPending}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60"
          >
            {run.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Run payout now"}
          </button>
        </div>
      </div>

      <div className="glass-strong overflow-x-auto rounded-3xl">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Self invest $</th>
              <th className="px-4 py-3">Directs</th>
              <th className="px-4 py-3">Team size</th>
              <th className="px-4 py-3">Team invest $</th>
              <th className="px-4 py-3">Weekly $</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r, i) => (
              <tr key={`${r.level}-${i}`}>
                <td className="px-4 py-3"><Cell value={r.level} onChange={(v) => patch(i, { level: Math.round(v) })} w="w-16" /></td>
                <td className="px-4 py-3"><Cell value={r.self_invest_min} onChange={(v) => patch(i, { self_invest_min: v })} /></td>
                <td className="px-4 py-3"><Cell value={r.direct_min} onChange={(v) => patch(i, { direct_min: Math.round(v) })} w="w-20" /></td>
                <td className="px-4 py-3"><Cell value={r.team_min} onChange={(v) => patch(i, { team_min: Math.round(v) })} w="w-20" /></td>
                <td className="px-4 py-3"><Cell value={r.team_invest_min} onChange={(v) => patch(i, { team_invest_min: v })} /></td>
                <td className="px-4 py-3"><Cell value={r.weekly_amount} onChange={(v) => patch(i, { weekly_amount: v })} /></td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => patch(i, { active: !r.active })}
                    className={`rounded-full px-3 py-1 text-[11px] ${r.active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-muted-foreground"}`}
                  >
                    {r.active ? "Active" : "Paused"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className="flex justify-end gap-2">
                    <button
                      onClick={() => save.mutate(r)}
                      disabled={save.isPending}
                      className="rounded-full bg-primary/20 px-3 py-1 text-[11px] text-primary hover:bg-primary/30 disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => remove.mutate(r.level)}
                      className="rounded-full bg-red-500/20 px-2 py-1 text-red-300 hover:bg-red-500/30"
                      aria-label={`Delete tier ${r.level}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">No salary tiers configured.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="glass-strong overflow-x-auto rounded-3xl">
        <div className="px-5 pt-5 font-display text-sm font-semibold">Recent Payouts</div>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Paid</th>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Tier</th>
              <th className="px-5 py-3">Week</th>
              <th className="px-5 py-3">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {(data?.payouts ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(p.paid_at).toLocaleString()}</td>
                <td className="px-5 py-3">{p.username}</td>
                <td className="px-5 py-3">L{p.level}</td>
                <td className="px-5 py-3 text-xs">{p.week_start}</td>
                <td className="px-5 py-3 font-mono">${Number(p.amount).toFixed(2)}</td>
              </tr>
            ))}
            {(data?.payouts ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No payouts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ value, onChange, w = "w-24" }: { value: number; onChange: (v: number) => void; w?: string }) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`${w} rounded-lg border border-border bg-white/5 px-2 py-1.5 font-mono text-xs outline-none focus:border-primary`}
    />
  );
}
