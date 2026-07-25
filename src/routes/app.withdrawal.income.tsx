import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useProfile, useStats } from "@/hooks/use-profile";
import { getMyWithdrawals, requestWithdrawalFn } from "@/lib/mws.functions";

export const Route = createFileRoute("/app/withdrawal/income")({
  head: () => ({ meta: [{ title: "Withdraw Income · Meta Word Space" }, { name: "description", content: "Request an income withdrawal." }] }),
  component: WithdrawIncome,
});

function WithdrawIncome() {
  const { data: profile } = useProfile();
  const { data: stats } = useStats();
  const qc = useQueryClient();
  const listFn = useServerFn(getMyWithdrawals);
  const submitFn = useServerFn(requestWithdrawalFn);
  const { data: wds } = useQuery({ queryKey: ["withdrawals"], queryFn: () => listFn() });
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");

  useEffect(() => {
    if (profile && !wallet) setWallet(profile.wallet_address);
  }, [profile, wallet]);

  const mut = useMutation({
    mutationFn: () => submitFn({ data: { kind: "income", amount: Number(amount), wallet } }),
    onSuccess: () => {
      toast.success("Withdrawal submitted");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const available = Number(stats?.available_balance ?? 0);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Withdraw Income</h1>

      <div className="glass-strong grid gap-4 rounded-3xl p-6 lg:grid-cols-3">
        <Stat label="Available Balance" value={`$${available.toFixed(2)}`} />
        <Stat label="Total Earnings" value={`$${Number(stats?.total_earnings ?? 0).toFixed(2)}`} />
        <Stat label="Total Claimed" value={`$${Number(stats?.total_claimed ?? 0).toFixed(2)}`} />
      </div>

      <div className="glass-strong rounded-3xl p-6 max-w-xl">
        <h2 className="font-display text-lg font-semibold">Request Withdrawal</h2>
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">Amount ($)</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          min={1}
          className="mt-2 w-full rounded-xl border border-border bg-white/5 px-4 py-3 font-mono text-sm outline-none focus:border-primary"
        />
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">Wallet Address</label>
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-white/5 px-4 py-3 font-mono text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !amount}
          className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60"
        >
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
        </button>
      </div>

      <div className="glass-strong overflow-hidden rounded-3xl">
        <div className="border-b border-border/60 px-5 py-4 font-display text-lg font-semibold">Withdrawal History</div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Kind</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {(wds ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No withdrawals yet.</td></tr>
            )}
            {(wds ?? []).map((w) => (
              <tr key={w.id}>
                <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</td>
                <td className="px-5 py-3 capitalize">{w.kind}</td>
                <td className="px-5 py-3 font-mono">${Number(w.amount).toFixed(2)}</td>
                <td className="px-5 py-3"><StatusPill status={w.status} /></td>
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
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-300",
    approved: "bg-emerald-500/20 text-emerald-300",
    rejected: "bg-red-500/20 text-red-300",
  };
  return <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${map[status] ?? "bg-white/10"}`}>{status}</span>;
}
