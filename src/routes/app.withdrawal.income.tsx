import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { addActivity, saveUser } from "@/lib/mock-store";

export const Route = createFileRoute("/app/withdrawal/income")({
  head: () => ({ meta: [{ title: "Withdraw Income · MWS" }, { name: "description", content: "Withdraw your AI yield income." }] }),
  component: WithdrawIncome,
});

function WithdrawIncome() {
  const { user } = useUser();
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState(user?.wallet ?? "");

  if (!user) return null;
  const available = +(user.totalEarnings - user.totalClaimed * 0).toFixed(2);

  function submit() {
    const n = Number(amount);
    if (!n || n <= 0 || n > available) { toast.error("Invalid amount"); return; }
    if (!user) return;
    saveUser({ ...user, totalEarnings: user.totalEarnings - n });
    addActivity({ type: "Withdrawal", amount: n, note: `To ${address.slice(0,6)}…${address.slice(-4)}` });
    toast.success(`Withdrawal of $${n} submitted`);
    setAmount("");
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Withdraw Income</h1>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-strong rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Available balance</div>
              <div className="mt-1 font-display text-3xl font-bold gradient-text">${available.toFixed(2)}</div>
            </div>
            <ArrowDownToLine className="h-8 w-8 text-primary/60" />
          </div>
          <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">Amount (USDT)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            className="mt-2 w-full rounded-xl border border-border bg-white/5 px-4 py-3 font-mono text-sm outline-none focus:border-primary" />
          <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">Wallet address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-white/5 px-4 py-3 font-mono text-xs outline-none focus:border-primary" />
          <button onClick={submit} className="mt-6 rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow">
            Request withdrawal
          </button>
        </div>
        <div className="glass-strong rounded-3xl p-6">
          <h3 className="font-display text-base font-semibold">Withdrawal History</h3>
          <div className="mt-3 divide-y divide-border/50">
            {user.activities.filter(a => a.type === "Withdrawal").length === 0 && (
              <div className="py-6 text-sm text-muted-foreground">No withdrawals yet.</div>
            )}
            {user.activities.filter(a => a.type === "Withdrawal").map(a => (
              <div key={a.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div>${a.amount.toFixed(2)}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{new Date(a.at).toLocaleString()}</div>
                </div>
                <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">PENDING</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
