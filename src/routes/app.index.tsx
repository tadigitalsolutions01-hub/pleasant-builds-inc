import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowUpRight, Wallet, Users, TrendingUp, Coins, Trophy, Clock,
  ArrowDownRight, Package, Bot, Sparkles, Copy, Check, Link2, QrCode, Download, X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useProfile, useStats } from "@/hooks/use-profile";
import { getMyActivities, getMyCapitalLocks } from "@/lib/mws.functions";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard · Meta Word Space" }, { name: "description", content: "Your AI investment dashboard." }] }),
  component: Dashboard,
});

type Activity = { id: string; kind: string; amount: number; created_at: string; meta: Record<string, unknown> };

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: stats } = useStats();
  const actFn = useServerFn(getMyActivities);
  const lockFn = useServerFn(getMyCapitalLocks);
  const { data: activities } = useQuery({
    queryKey: ["activities", profile?.id],
    queryFn: () => actFn({ data: { limit: 12 } }),
    enabled: !!profile?.id,
    refetchInterval: 30_000,
  });
  const { data: locks } = useQuery({
    queryKey: ["locks", profile?.id],
    queryFn: () => lockFn(),
    enabled: !!profile?.id,
  });

  if (!profile) return null;

  const nextUnlock = locks
    ?.filter((l) => !l.unlocked_at)
    .sort((a, b) => new Date(a.unlock_at).getTime() - new Date(b.unlock_at).getTime())[0];

  const cards = [
    { label: "Total Earnings", value: money(stats?.total_earnings), icon: TrendingUp, tone: "cyan" },
    { label: "Last 24h", value: money(stats?.last_24h_earnings), icon: Clock, tone: "violet" },
    { label: "Total Investment", value: money(stats?.total_investment), icon: Wallet, tone: "pink" },
    { label: "Team Members", value: String(stats?.total_team ?? 0), icon: Users, tone: "lime" },
    { label: "Direct Partners", value: String(stats?.direct_partners ?? 0), icon: Sparkles, tone: "cyan" },
    { label: "Passive Income", value: money(stats?.passive_income), icon: Coins, tone: "violet" },
    { label: "Team Income", value: money(stats?.team_income), icon: Users, tone: "pink" },
    { label: "Salary Earnings", value: money(stats?.salary_income), icon: Trophy, tone: "lime" },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="glass-strong relative overflow-hidden rounded-3xl p-6 lg:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl [background:var(--gradient-primary)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 animate-spin-slow rounded-full [background:var(--gradient-ring)] opacity-70 blur-sm" />
              <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-background font-display text-2xl font-bold">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.username.slice(-2).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Welcome back</div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{profile.username}</h1>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Chip label="Sponsor" value={profile.sponsor_code} />
                <Chip label="Joined" value={new Date(profile.joined_at).toLocaleDateString()} />
                <Chip label="Available" value={money(stats?.available_balance)} />
              </div>
            </div>
          </div>
          <div className="glass flex flex-col gap-1 rounded-2xl p-4 lg:min-w-[280px]">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.85_0.19_210)] animate-pulse" />
              Capital Status
            </div>
            {nextUnlock ? (
              <>
                <div className="font-display text-lg font-semibold">🔒 Locked for 6 months</div>
                <div className="font-mono text-xs text-muted-foreground">
                  Next unlock {new Date(nextUnlock.unlock_at).toLocaleDateString()}
                </div>
              </>
            ) : (
              <>
                <div className="font-display text-lg font-semibold">No active lock</div>
                <div className="font-mono text-xs text-muted-foreground">Activate a package to begin</div>
              </>
            )}
          </div>
        </div>
      </section>

      <ReferralCard code={profile.sponsor_code} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s) => <StatCard key={s.label} {...s} />)}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="glass-strong rounded-3xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent Activities</h2>
            <span className="font-mono text-xs text-muted-foreground">LIVE</span>
          </div>
          <div className="flex flex-col divide-y divide-border/60">
            {(activities?.length ?? 0) === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">No activity yet. Activate a package to begin.</div>
            )}
            {(activities ?? []).map((a) => <ActivityRow key={a.id} a={a as Activity} />)}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-strong rounded-3xl p-6">
            <h3 className="font-display text-base font-semibold">AI Robot</h3>
            <p className="mt-1 text-xs text-muted-foreground">Claim your daily yield inside the robot portal.</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl [background:var(--gradient-primary)] text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Claimed</div>
                <div className="font-mono text-lg">{money(stats?.total_claimed)}</div>
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

function money(n?: number | string | null) {
  const v = Number(n ?? 0);
  return `$${v.toFixed(2)}`;
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="glass rounded-full px-3 py-1 font-mono text-[11px]">
      <span className="text-muted-foreground">{label}:</span> <span>{value}</span>
    </span>
  );
}

function ReferralCard({ code }: { code: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/auth?ref=${code}`;
  const copy = async (value: string, which: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      toast.success(which === "code" ? "Sponsor code copied" : "Referral link copied");
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <section className="glass-strong relative overflow-hidden rounded-3xl p-6">
      <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full opacity-25 blur-3xl [background:var(--gradient-primary)]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl [background:var(--gradient-primary)] text-primary-foreground">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Your Referral</div>
            <div className="font-display text-lg font-semibold">Invite &amp; earn commissions</div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[auto_1fr] lg:flex lg:items-center lg:gap-3">
          <button
            onClick={() => copy(code, "code")}
            className="glass inline-flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 font-mono text-sm hover:bg-white/10"
          >
            <span className="text-muted-foreground text-[11px] uppercase tracking-widest">Code</span>
            <span className="font-semibold tracking-wider">{code}</span>
            {copied === "code" ? <Check className="h-4 w-4 text-[oklch(0.87_0.22_145)]" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={() => copy(link, "link")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow"
          >
            {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy referral link
          </button>
        </div>
      </div>
      <div className="relative mt-4 truncate rounded-xl border border-border/60 bg-black/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">
        {link}
      </div>
    </section>
  );
}



function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: "cyan" | "violet" | "pink" | "lime" }) {
  const toneColor = { cyan: "oklch(0.85 0.19 210)", violet: "oklch(0.7 0.24 295)", pink: "oklch(0.72 0.25 340)", lime: "oklch(0.87 0.22 145)" }[tone];
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
    </div>
  );
}

function ActivityRow({ a }: { a: Activity }) {
  const positive = !["capital_withdrawal", "withdrawal_hold"].includes(a.kind);
  const label = LABELS[a.kind] ?? a.kind;
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">
          {positive ? <ArrowUpRight className="h-4 w-4 text-[oklch(0.87_0.22_145)]" /> : <ArrowDownRight className="h-4 w-4 text-[oklch(0.72_0.25_340)]" />}
        </span>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
        </div>
      </div>
      <div className={`font-mono text-sm ${positive ? "text-[oklch(0.87_0.22_145)]" : "text-[oklch(0.72_0.25_340)]"}`}>
        {positive ? "+" : "-"}${Number(a.amount).toFixed(4)}
      </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  deposit: "Deposit",
  package_activation: "Package Activated",
  passive: "Passive Income",
  direct_commission: "Direct Commission",
  level_commission: "Level Commission",
  salary: "Weekly Salary",
  withdrawal_hold: "Withdrawal (pending)",
  withdrawal_refund: "Withdrawal Refunded",
  capital_withdrawal: "Capital Withdrawal",
  reinvest: "Reinvestment",
};
