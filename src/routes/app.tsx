import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Package, History, ArrowDownToLine, Users, Settings, Bot,
  ChevronDown, LogOut, Menu, Wallet as WalletIcon, X, Bell, ShieldAlert, Trophy,
  Loader2, AlertTriangle,
} from "lucide-react";
import { Logo } from "@/components/mws/logo";
import { BgFx } from "@/components/mws/bg-fx";
import { supabase } from "@/integrations/backend/client";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  children?: { label: string; to: string }[];
};

const NAV: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/app" },
  { label: "Packages", icon: Package, to: "/app/packages" },
  {
    label: "History", icon: History, children: [
      { label: "Passive Income", to: "/app/history/passive" },
      { label: "Direct Commission", to: "/app/history/direct" },
      { label: "Team Commission", to: "/app/history/team" },
    ]
  },
  {
    label: "Withdrawal", icon: ArrowDownToLine, children: [
      { label: "Withdraw Income", to: "/app/withdrawal/income" },
      { label: "Withdraw Capital", to: "/app/withdrawal/capital" },
    ]
  },
  {
    label: "Team", icon: Users, children: [
      { label: "Direct Members", to: "/app/team/direct" },
      { label: "Level 1", to: "/app/team/level-1" },
      { label: "Level 2", to: "/app/team/level-2" },
      { label: "Level 3", to: "/app/team/level-3" },
    ]
  },
  { label: "Weekly Salary", icon: Trophy, to: "/app/salary" },
  { label: "Notifications", icon: Bell, to: "/app/notifications" },
  { label: "Profile", icon: Settings, to: "/app/profile" },
  { label: "AI Robot", icon: Bot, to: "/app/ai-robot" },
];

function AppLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data: profile, isLoading, hydrated, error, refetch, userId } = useProfile();

  useEffect(() => {
    if (hydrated && !userId) {
      navigate({ to: "/auth", replace: true });
    }
  }, [hydrated, userId, navigate]);

  // Realtime notifications
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel("mws-user-" + profile.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["stats"] });
          qc.invalidateQueries({ queryKey: ["activities"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ledger_entries", filter: `user_id=eq.${profile.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["stats"] });
          qc.invalidateQueries({ queryKey: ["activities"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, qc]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!hydrated || (userId && (isLoading || (!profile && !error)))) {
    return <BootOverlay />;
  }

  if (userId && error) {
    return <BootOverlay error={error as Error} onRetry={() => refetch()} onSignOut={handleSignOut} />;
  }

  if (!profile) {
    // Session gone — the effect above will redirect; render overlay in the meantime.
    return <BootOverlay />;
  }

  const initials = profile.username.slice(-2).toUpperCase();
  const shortWallet = `${profile.wallet_address.slice(0, 6)}…${profile.wallet_address.slice(-4)}`;

  return (
    <div className="relative min-h-screen">
      <BgFx />
      <div className="mx-auto flex max-w-[1600px]">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-border/60 bg-[oklch(0.12_0.03_265)/95%] backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-5">
            <Logo to="/app" />
            <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {NAV.map((item) => <SidebarItem key={item.label} item={item} onNavigate={() => setOpen(false)} />)}
            {profile.isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                activeProps={{ className: "!text-foreground !bg-white/5" }}
              >
                <ShieldAlert className="h-4 w-4" /> Admin Panel
              </Link>
            )}
          </nav>
          <div className="absolute inset-x-3 bottom-4">
            <div className="glass rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full [background:var(--gradient-primary)] text-xs font-bold text-primary-foreground overflow-hidden">
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{profile.username}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">{shortWallet}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-[oklch(0.14_0.03_265)/75%] px-4 py-3 backdrop-blur-xl lg:px-8">
            <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="hidden items-center gap-3 lg:flex">
              <span className="flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-[oklch(0.87_0.22_145)] animate-pulse" />
                <span className="text-muted-foreground">AI Core</span>
                <span className="font-mono">ONLINE</span>
              </span>
              <span className="font-mono text-xs text-muted-foreground">SPONSOR {profile.sponsor_code}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/app/notifications"
                className="glass grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
              </Link>
              <div className="glass hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs sm:flex">
                <WalletIcon className="h-3.5 w-3.5 text-[oklch(0.85_0.19_210)]" />
                <span className="font-mono">{shortWallet}</span>
              </div>
              <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full [background:var(--gradient-primary)] text-xs font-bold text-primary-foreground">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
              </div>
            </div>
          </header>
          <main className="px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>

      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}

function SidebarItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = item.to === pathname || (item.children?.some(c => c.to === pathname) ?? false);
  const [open, setOpen] = useState(active);

  useEffect(() => { if (active) setOpen(true); }, [active]);

  const Icon = item.icon;
  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
            active ? "bg-white/5 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-3"><Icon className="h-4 w-4" /> {item.label}</span>
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border/60 pl-3">
            {item.children.map(c => (
              <Link
                key={c.to} to={c.to} onClick={onNavigate}
                className="rounded-lg px-3 py-2 text-xs text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                activeProps={{ className: "bg-white/5 text-foreground" }}
              >
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.to!} onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
      activeProps={{ className: "!text-foreground !bg-white/5" }}
      activeOptions={{ exact: true }}
    >
      <Icon className="h-4 w-4" /> {item.label}
    </Link>
  );
}

function BootOverlay({
  error,
  onRetry,
  onSignOut,
}: {
  error?: Error;
  onRetry?: () => void;
  onSignOut?: () => void;
}) {
  const [dots, setDots] = useState(0);
  const [step, setStep] = useState(0);
  const steps = [
    "Verifying wallet signature",
    "Syncing on-chain identity",
    "Loading grid profile",
    "Booting AI core",
  ];

  useEffect(() => {
    if (error) return;
    const d = setInterval(() => setDots((n) => (n + 1) % 4), 400);
    const s = setInterval(
      () => setStep((n) => Math.min(n + 1, steps.length - 1)),
      900,
    );
    return () => {
      clearInterval(d);
      clearInterval(s);
    };
  }, [error, steps.length]);

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <BgFx />
      <div className="glass-strong relative w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl">
        {error ? (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-300">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="mt-5 font-display text-lg font-semibold">
              Couldn't reach the grid
            </h2>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {error.message || "Something went wrong loading your profile."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={onRetry}
                className="rounded-full py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow"
              >
                Try again
              </button>
              <button
                onClick={onSignOut}
                className="rounded-full py-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative mx-auto grid h-24 w-24 place-items-center">
              <span className="absolute inset-0 animate-spin-slow rounded-full [background:var(--gradient-ring)] opacity-70 blur-md" />
              <span className="relative grid h-20 w-20 place-items-center rounded-full bg-background">
                <Loader2 className="h-7 w-7 animate-spin text-[oklch(0.85_0.19_210)]" />
              </span>
            </div>
            <div className="mt-6 font-display text-lg">
              {steps[step]}
              <span className="inline-block w-6 text-left font-mono text-[oklch(0.85_0.19_210)]">
                {".".repeat(dots)}
              </span>
            </div>
            <div className="mt-4 flex justify-center gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 w-6 rounded-full transition ${
                    i <= step
                      ? "bg-[oklch(0.85_0.19_210)]"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Meta Word Space · Secure Uplink
            </p>
          </>
        )}
      </div>
    </div>
  );
}
