import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { getMyDeposits, getMyWithdrawals } from "@/lib/mws.functions";

type Tab = "all" | "deposits" | "withdrawals";

type Row = {
  id: string;
  type: "deposit" | "withdrawal";
  kind: string;
  amount: number;
  status: string;
  created_at: string;
  tx_hash?: string | null;
  wallet_address?: string | null;
  note?: string | null;
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  verified: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function TransactionsCard() {
  const [tab, setTab] = useState<Tab>("all");
  const depFn = useServerFn(getMyDeposits);
  const wdFn = useServerFn(getMyWithdrawals);
  const { data: deposits } = useQuery({
    queryKey: ["deposits", "dashboard"],
    queryFn: () => depFn(),
    refetchInterval: 30_000,
  });
  const { data: withdrawals } = useQuery({
    queryKey: ["withdrawals", "dashboard"],
    queryFn: () => wdFn(),
    refetchInterval: 30_000,
  });

  const rows: Row[] = [
    ...(deposits ?? []).map((d) => ({
      id: `d-${d.id}`,
      type: "deposit" as const,
      kind: `Deposit · $${Number(d.package_amount).toFixed(0)}`,
      amount: Number(d.amount ?? d.package_amount),
      status: d.status,
      created_at: d.created_at,
      tx_hash: d.tx_hash,
      note: d.note,
    })),
    ...(withdrawals ?? []).map((w) => ({
      id: `w-${w.id}`,
      type: "withdrawal" as const,
      kind: `Withdraw · ${w.kind === "capital" ? "Capital" : "Income"}`,
      amount: Number(w.amount),
      status: w.status,
      created_at: w.created_at,
      wallet_address: w.wallet_address,
      note: w.note,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filtered = tab === "all" ? rows : rows.filter((r) => (tab === "deposits" ? r.type === "deposit" : r.type === "withdrawal"));

  return (
    <section className="glass-strong rounded-3xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Deposits &amp; Withdrawals</h2>
          <p className="text-xs text-muted-foreground">On-chain deposits and payout requests in one place.</p>
        </div>
        <div className="glass inline-flex rounded-full p-1 text-xs">
          {(["all", "deposits", "withdrawals"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 capitalize transition ${tab === t ? "[background:var(--gradient-primary)] text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">When</th>
              <th className="py-2">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No transactions yet.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const isDep = r.type === "deposit";
              const tone = STATUS_TONE[r.status] ?? "bg-white/5 text-muted-foreground border-border/60";
              return (
                <tr key={r.id} className="align-middle">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className={`grid h-8 w-8 place-items-center rounded-xl ${isDep ? "bg-emerald-500/10 text-emerald-300" : "bg-pink-500/10 text-pink-300"}`}>
                        {isDep ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </span>
                      <span className="text-sm">{r.kind}</span>
                    </div>
                  </td>
                  <td className={`py-3 pr-4 font-mono ${isDep ? "text-emerald-300" : "text-pink-300"}`}>
                    {isDep ? "+" : "-"}${r.amount.toFixed(2)}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    <time dateTime={r.created_at} title={new Date(r.created_at).toLocaleString()}>
                      {new Date(r.created_at).toLocaleString()}
                    </time>
                  </td>
                  <td className="py-3">
                    {r.tx_hash ? (
                      <a
                        href={`https://bscscan.com/tx/${r.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-[oklch(0.85_0.19_210)] hover:underline"
                      >
                        {r.tx_hash.slice(0, 8)}…{r.tx_hash.slice(-6)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : r.wallet_address ? (
                      <a
                        href={`https://bscscan.com/address/${r.wallet_address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                      >
                        {r.wallet_address.slice(0, 8)}…{r.wallet_address.slice(-6)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
