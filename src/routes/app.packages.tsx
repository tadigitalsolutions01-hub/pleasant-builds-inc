import { createFileRoute } from "@tanstack/react-router";
import { Check, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { activatePackageFn, getMyInvestments, getPackages } from "@/lib/mws.functions";
import { useStats } from "@/hooks/use-profile";

export const Route = createFileRoute("/app/packages")({
  head: () => ({ meta: [{ title: "Packages · Meta Word Space" }, { name: "description", content: "AI investment packages from $10 to $2560." }] }),
  component: PackagesPage,
});

function PackagesPage() {
  const qc = useQueryClient();
  const pkgFn = useServerFn(getPackages);
  const invFn = useServerFn(getMyInvestments);
  const activate = useServerFn(activatePackageFn);
  const { data: stats } = useStats();
  const { data: packages } = useQuery({ queryKey: ["packages"], queryFn: () => pkgFn() });
  const { data: investments } = useQuery({ queryKey: ["investments"], queryFn: () => invFn() });
  const currentPackage = investments?.[0]?.amount ? Number(investments[0].amount) : 0;

  const mut = useMutation({
    mutationFn: (amount: number) => activate({ data: { amount } }),
    onSuccess: (_d, amount) => {
      toast.success(`Package $${amount} activated`);
      qc.invalidateQueries({ queryKey: ["investments"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold">AI Investment Packages</h1>
        <p className="text-sm text-muted-foreground">
          Every package earns the admin-set daily percentage. Capital locked 6 months. Max return 2× investment.
        </p>
        <div className="mt-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
          Payment confirmation is admin-verified off-chain. Activating a package records your investment; contact your sponsor to complete the deposit.
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="glass rounded-full px-3 py-1 font-mono">Total Investment: ${Number(stats?.total_investment ?? 0).toFixed(2)}</span>
          <span className="glass rounded-full px-3 py-1 font-mono">Current Package: ${currentPackage.toFixed(0)}</span>
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(packages ?? []).map((p, i) => {
          const amount = Number(p.amount);
          const featured = amount === currentPackage;
          const highlight = i === 4;
          return (
            <div
              key={p.id}
              className={`group relative overflow-hidden rounded-3xl p-6 transition hover:-translate-y-1 ${
                highlight ? "glass-strong neon-border" : "glass"
              }`}
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-25 blur-3xl [background:var(--gradient-primary)]" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">PKG-{String(i+1).padStart(2,"0")}</span>
                  {featured && <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px]">CURRENT</span>}
                  {highlight && !featured && <span className="rounded-full [background:var(--gradient-primary)] px-2 py-0.5 font-mono text-[10px] text-primary-foreground">POPULAR</span>}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="gradient-text font-display text-5xl font-bold">${amount}</span>
                </div>
                <div className="mt-2 font-mono text-xs text-muted-foreground">Max earnings ${amount * 2}</div>

                <ul className="mt-5 space-y-2 text-sm">
                  <Feat text="Daily AI passive yield" />
                  <Feat text={`Max earnings $${amount * 2} (2×)`} />
                  <Feat text="Referral commissions to sponsor" />
                  <Feat text="6-month capital lock" />
                </ul>

                <button
                  onClick={() => mut.mutate(amount)}
                  disabled={mut.isPending}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60"
                >
                  {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4" /> Activate</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Feat({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-muted-foreground">
      <Check className="h-3.5 w-3.5 text-[oklch(0.87_0.22_145)]" /> {text}
    </li>
  );
}
