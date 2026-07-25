import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyCapitalLocks, requestWithdrawalFn } from "@/lib/mws.functions";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/app/withdrawal/capital")({
  head: () => ({ meta: [{ title: "Withdraw Capital · Meta Word Space" }, { name: "description", content: "Withdraw unlocked capital." }] }),
  component: CapitalPage,
});

function CapitalPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const fn = useServerFn(getMyCapitalLocks);
  const submit = useServerFn(requestWithdrawalFn);
  const { data: locks } = useQuery({ queryKey: ["locks"], queryFn: () => fn() });
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  useEffect(() => { if (profile && !wallet) setWallet(profile.wallet_address); }, [profile, wallet]);

  const mut = useMutation({
    mutationFn: () => submit({ data: { kind: "capital", amount: Number(amount), wallet } }),
    onSuccess: () => {
      toast.success("Capital withdrawal submitted");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const now = Date.now();
  const totalUnlocked = (locks ?? [])
    .filter((l) => l.unlocked_at || new Date(l.unlock_at).getTime() <= now)
    .reduce((s, l) => s + Number((l as { investments: { amount: number } }).investments.amount), 0);
  const totalLocked = (locks ?? [])
    .filter((l) => !l.unlocked_at && new Date(l.unlock_at).getTime() > now)
    .reduce((s, l) => s + Number((l as { investments: { amount: number } }).investments.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Withdraw Capital</h1>

      <div className="glass-strong rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-300" />
          <div className="font-display text-lg font-semibold">YOUR CAPITAL IS LOCKED FOR 6 MONTHS</div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="glass rounded-2xl p-4">
            <div className="text-xs uppercase text-muted-foreground">Locked</div>
            <div className="mt-1 font-display text-2xl font-bold">${totalLocked.toFixed(2)}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-xs uppercase text-muted-foreground">Unlocked</div>
            <div className="mt-1 font-display text-2xl font-bold text-[oklch(0.87_0.22_145)]">${totalUnlocked.toFixed(2)}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-xs uppercase text-muted-foreground">Investments</div>
            <div className="mt-1 font-display text-2xl font-bold">{locks?.length ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="glass-strong overflow-hidden rounded-3xl">
        <div className="border-b border-border/60 px-5 py-4 font-display text-lg font-semibold">Lock Details</div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Unlock At</th><th className="px-5 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {(locks ?? []).length === 0 && (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">No investments yet.</td></tr>
            )}
            {(locks ?? []).map((l) => {
              const unlocked = l.unlocked_at || new Date(l.unlock_at).getTime() <= now;
              return (
                <tr key={l.investment_id}>
                  <td className="px-5 py-3 font-mono">${Number((l as { investments: { amount: number } }).investments.amount).toFixed(2)}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(l.unlock_at).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    {unlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300"><Unlock className="h-3 w-3" /> UNLOCKED</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300"><Lock className="h-3 w-3" /> LOCKED</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="glass-strong rounded-3xl p-6 max-w-xl">
        <h2 className="font-display text-lg font-semibold">Request Capital Withdrawal</h2>
        <p className="mt-1 text-xs text-muted-foreground">Only unlocked capital can be withdrawn. Admin approval required.</p>
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">Amount ($)</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={1} className="mt-2 w-full rounded-xl border border-border bg-white/5 px-4 py-3 font-mono text-sm outline-none focus:border-primary" />
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">Wallet</label>
        <input value={wallet} onChange={(e) => setWallet(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-white/5 px-4 py-3 font-mono text-sm outline-none focus:border-primary" />
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !amount || totalUnlocked <= 0}
          className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60"
        >
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request Withdrawal"}
        </button>
      </div>
    </div>
  );
}
