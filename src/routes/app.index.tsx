import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight, Wallet, Users, TrendingUp, Coins, Trophy, Clock,
  ArrowDownRight, Package, Bot, Sparkles,
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import type { Activity } from "@/lib/mock-store";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard · Meta World Space" }, { name: "description", content: "Your AI investment dashboard." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useUser();
  if (!user) return null;

  const stats = [
    { label: "Total Earnings", value: `$${user.totalEarnings.toFixed(2)}`, icon: TrendingUp, trend: "+12.4%", tone: "cyan" as const },
    { label: "Last 24h", value: `$${user.last24hEarnings.toFixed(2)}`, icon: Clock, trend: "+1.6%", tone: "violet" as const },
    { label: "Total Investment", value: `$${user.totalInvestment.toFixed(2)}`, icon: Wallet, trend: "Locked", tone: "pink" as const },
    { label: "Team Members", value: user.totalTeam.toString(), icon: Users, trend: `+${user.directPartners} direct`, tone: "lime" as const },
    { label: "Direct Partners", value: user.directPartners.toString(), icon: Sparkles, trend: "L1", tone: "cyan" as const },
    { label: "Passive Income", value: `$${user.passiveIncome.toFixed(2)}`, icon: Coins, trend: "1.5%/day", tone: "violet" as const },
    { label: "Team Income", value: `$${user.teamIncome.toFixed(2)}`, icon: Users, trend: "L1 · L2 · L3", tone: "pink" as const },
    { label: "Salary Earnings", value: `$${user.salaryEarnings.toFixed(2)}`, icon: Trophy, trend: `Level ${user.salaryLevel}`, tone: "lime" as const },
  ];

  return (
    <div className="space-y-6">
      {/* Profile hero */}
      <section className="glass-strong relative overflow-hidden rounded-3xl p-6 lg:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl [background:var(--gradient-primary)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 animate-spin-slow rounded-full [background:var(--gradient-ring)] opacity-70 blur-sm" />
              <div className="relative grid h-20 w-20 place-items-center rounded-full bg-background font-display text-2xl font-bold">
                {user.username.slice(-2).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Welcome back</div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{user.username}</h1>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Chip label="Sponsor" value={user.sponsorId} />
                <Chip label="Joined" value={new Date(user.joinedAt).toLocaleDateString()} />
                <Chip label="Package" value={`$${user.currentPackage}`} />
                <Chip label="Level" value={`L${user.currentLevel}`} />
              </div>
            </div>
          </div>
          <div className="glass flex flex-col gap-1 rounded-2xl p-4 lg:min-w-[280px]">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.85_0.19_210)] animate-pulse" />
              Capital Status
            </div>
            <div className="font-display text-lg font-semibold">🔒 Locked for 6 months</div>
            <div className="font-mono text-xs text-muted-foreground">
              Unlocks {new Date(user.capitalLockedUntil).toLocaleDateString()}
            </div>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </section>

      {/* Recent + Quick actions */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="glass-strong rounded-3xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent Activities</h2>
            <span className="font-mono text-xs text-muted-foreground">LIVE</span>
          </div>
          <div className="flex flex-col divide-y divide-border/60">
            {user.activities.slice(0, 8).map((a) => <ActivityRow key={a.id} a={a} />)}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-strong rounded-3xl p-6">
            <h3 className="font-display text-base font-semibold">AI Robot</h3>
            <p className="mt-1 text-xs text-muted-foreground">Autonomous trader is running your cycle.</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl [background:var(--gradient-primary)] text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Next claim in</div>
                <div className="font-mono text-lg">01:14:22</div>
              </div>
            </div>
            <a href="/app/ai-robot" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow">
              Open Robot Portal <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display text-base font-semibold">Quick Actions</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <a href="/app/packages" className="glass rounded-xl p-3 hover:bg-white/10"><Package className="mb-1 h-4 w-4 text-[oklch(0.85_0.19_210)]" />Activate</a>
              <a href="/app/withdrawal/income" className="glass rounded-xl p-3 hover:bg-white/10"><ArrowDownRight className="mb-1 h-4 w-4 text-[oklch(0.7_0.24_295)]" />Withdraw</a>
              <a href="/app/team/direct" className="glass rounded-xl p-3 hover:bg-white/10"><Users className="mb-1 h-4 w-4 text-[oklch(0.72_0.25_340)]" />Team</a>
              <a href="/app/profile" className="glass rounded-xl p-3 hover:bg-white/10"><Sparkles className="mb-1 h-4 w-4 text-[oklch(0.87_0.22_145)]" />Profile</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="glass rounded-full px-3 py-1 font-mono text-[11px]">
      <span className="text-muted-foreground">{label}:</span> <span>{value}</span>
    </span>
  );
}

function StatCard({ label, value, icon: Icon, trend, tone }: { label: string; value: string; icon: any; trend: string; tone: "cyan" | "violet" | "pink" | "lime" }) {
  const toneColor = {
    cyan: "oklch(0.85 0.19 210)",
    violet: "oklch(0.7 0.24 295)",
    pink: "oklch(0.72 0.25 340)",
    lime: "oklch(0.87 0.22 145)",
  }[tone];
  return (
    <div className="glass group relative overflow-hidden rounded-2xl p-5 transition hover:-translate-y-1 hover:border-primary/40">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: toneColor }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-2xl font-bold">{value}</div>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5" style={{ color: toneColor }}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 font-mono text-[11px] text-muted-foreground">{trend}</div>
    </div>
  );
}

function ActivityRow({ a }: { a: Activity }) {
  const positive = !["Withdrawal"].includes(a.type);
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">
          {positive ? <ArrowUpRight className="h-4 w-4 text-[oklch(0.87_0.22_145)]" /> : <ArrowDownRight className="h-4 w-4 text-[oklch(0.72_0.25_340)]" />}
        </span>
        <div>
          <div className="text-sm font-medium">{a.type}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{new Date(a.at).toLocaleString()}{a.note ? ` · ${a.note}` : ""}</div>
        </div>
      </div>
      <div className={`font-mono text-sm ${positive ? "text-[oklch(0.87_0.22_145)]" : "text-[oklch(0.72_0.25_340)]"}`}>
        {positive ? "+" : "-"}${a.amount.toFixed(2)}
      </div>
    </div>
  );
}
