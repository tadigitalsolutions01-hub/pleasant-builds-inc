import { createFileRoute } from "@tanstack/react-router";
import { Check, Zap } from "lucide-react";
import { toast } from "sonner";
import { PACKAGES, packageDaily, addActivity, saveUser } from "@/lib/mock-store";
import { useUser } from "@/hooks/use-user";

export const Route = createFileRoute("/app/packages")({
  head: () => ({ meta: [{ title: "Packages · Meta World Space" }, { name: "description", content: "AI investment packages from $10 to $2560." }] }),
  component: PackagesPage,
});

function PackagesPage() {
  const { user } = useUser();
  if (!user) return null;

  function activate(amount: number) {
    if (!user) return;
    const updated = { ...user, currentPackage: amount, totalInvestment: user.totalInvestment + amount };
    saveUser(updated);
    addActivity({ type: "Package Activation", amount, note: `Package $${amount} activated` });
    addActivity({ type: "Deposit", amount });
    toast.success(`Package $${amount} activated`);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold">AI Investment Packages</h1>
        <p className="text-sm text-muted-foreground">
          Every package earns 1%–2% daily. Capital locked 6 months. Max return 2× investment.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PACKAGES.map((amount, i) => {
          const daily = packageDaily(amount);
          const featured = amount === user.currentPackage;
          const highlight = i === 4;
          return (
            <div
              key={amount}
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
                <div className="mt-2 font-mono text-xs text-muted-foreground">Daily · ${daily}</div>

                <ul className="mt-5 space-y-2 text-sm">
                  <Feat text={`${daily.toFixed(3)}/day passive`} />
                  <Feat text={`Max earnings $${amount * 2}`} />
                  <Feat text="AI Robot access" />
                  <Feat text="6-month capital lock" />
                </ul>

                <button
                  onClick={() => activate(amount)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow"
                >
                  <Zap className="h-4 w-4" /> Activate
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
