import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, History, ArrowDownToLine, Users, Settings, Bot,
  ChevronDown, LogOut, Menu, Wallet as WalletIcon, X,
} from "lucide-react";
import { Logo } from "@/components/mws/logo";
import { BgFx } from "@/components/mws/bg-fx";
import { useUser } from "@/hooks/use-user";
import { clearUser } from "@/lib/mock-store";

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
      { label: "Team Commission", to: "/app/history/team" },
      { label: "Direct Commission", to: "/app/history/direct" },
      { label: "Passive Income", to: "/app/history/passive" },
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
  { label: "Profile", icon: Settings, to: "/app/profile" },
  { label: "AI Robot", icon: Bot, to: "/app/ai-robot" },
];

function AppLayout() {
  const { user, hydrated } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !user) navigate({ to: "/login" });
  }, [hydrated, user, navigate]);

  if (!hydrated || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <BgFx />
        <div className="font-mono text-sm text-muted-foreground">Booting AI core…</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BgFx />
      <div className="mx-auto flex max-w-[1600px]">
        {/* Sidebar */}
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
          </nav>
          <div className="absolute inset-x-3 bottom-4">
            <div className="glass rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full [background:var(--gradient-primary)] text-xs font-bold text-primary-foreground">
                  {user.username.slice(-2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{user.username}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">{user.wallet.slice(0,6)}…{user.wallet.slice(-4)}</div>
                </div>
                <button onClick={() => { clearUser(); navigate({ to: "/" }); }} className="text-muted-foreground hover:text-foreground">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-[oklch(0.14_0.03_265)/75%] px-4 py-3 backdrop-blur-xl lg:px-8">
            <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="hidden items-center gap-3 lg:flex">
              <span className="flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-[oklch(0.87_0.22_145)] animate-pulse" />
                <span className="text-muted-foreground">AI Core</span>
                <span className="font-mono">ONLINE</span>
              </span>
              <span className="font-mono text-xs text-muted-foreground">CYCLE #48,214</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="glass hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs sm:flex">
                <WalletIcon className="h-3.5 w-3.5 text-[oklch(0.85_0.19_210)]" />
                <span className="font-mono">{user.wallet.slice(0,6)}…{user.wallet.slice(-4)}</span>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full [background:var(--gradient-primary)] text-xs font-bold text-primary-foreground">
                {user.username.slice(-2).toUpperCase()}
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
      activeProps={{ className: "!text-foreground !bg-white/5 relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-0.5 before:rounded-r before:[background:var(--gradient-primary)]" }}
      activeOptions={{ exact: true }}
    >
      <Icon className="h-4 w-4" /> {item.label}
    </Link>
  );
}
