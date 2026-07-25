import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useUser } from "@/hooks/use-user";

export const Route = createFileRoute("/app/withdrawal/capital")({
  head: () => ({ meta: [{ title: "Withdraw Capital · MWS" }, { name: "description", content: "Capital withdrawal after 6-month lock." }] }),
  component: WithdrawCapital,
});

function WithdrawCapital() {
  const { user } = useUser();
  if (!user) return null;
  const unlockAt = new Date(user.capitalLockedUntil);
  const remaining = Math.max(0, unlockAt.getTime() - Date.now());
  const days = Math.floor(remaining / 86400000);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Withdraw Capital</h1>
      <div className="glass-strong relative overflow-hidden rounded-3xl p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl [background:var(--gradient-primary)]" />
        <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl [background:var(--gradient-primary)] text-primary-foreground">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Locked capital</div>
              <div className="mt-1 font-display text-4xl font-bold">${user.totalInvestment.toFixed(2)}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Box label="DAYS LEFT" value={String(days)} />
            <Box label="UNLOCK" value={unlockAt.toLocaleDateString()} />
            <Box label="STATUS" value={user.capitalUnlocked ? "UNLOCKED" : "LOCKED"} />
          </div>
        </div>
        <div className="glass mt-6 rounded-2xl p-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">⚠ YOUR CAPITAL IS LOCKED FOR 6 MONTHS.</span> Only an admin can unlock capital. Once unlocked, you may withdraw the full principal to your wallet.
        </div>
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3 font-mono">
      <div className="text-lg font-bold">{value}</div>
      <div className="mt-1 text-[10px] tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}
