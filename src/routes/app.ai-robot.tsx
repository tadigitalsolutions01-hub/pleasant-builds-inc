import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bot, Cpu, Zap, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import heroImg from "@/assets/ai-robot-portrait.jpg";
import { claimDailyFn, claimStatusFn } from "@/lib/mws.functions";
import { useStats } from "@/hooks/use-profile";

export const Route = createFileRoute("/app/ai-robot")({
  head: () => ({ meta: [{ title: "AI Robot · Meta Word Space" }, { name: "description", content: "Autonomous AI trading robot." }] }),
  component: AIRobotPage,
});

function AIRobotPage() {
  const qc = useQueryClient();
  const statusFn = useServerFn(claimStatusFn);
  const claimFn = useServerFn(claimDailyFn);
  const { data: stats } = useStats();
  const { data: status } = useQuery({
    queryKey: ["claim-status"],
    queryFn: () => statusFn(),
    refetchInterval: 15_000,
  });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = useMemo(() => {
    if (!status?.nextAtIso) return 0;
    return Math.max(0, new Date(status.nextAtIso).getTime() - now);
  }, [status?.nextAtIso, now]);

  const claim = useMutation({
    mutationFn: () => claimFn(),
    onSuccess: (r) => {
      toast.success(`Claimed $${Number(r.credited).toFixed(4)}`);
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["claim-status"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["investments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ready = status?.hasInvestment && remaining <= 0;
  const hh = Math.floor(remaining / 3600000);
  const mm = Math.floor((remaining % 3600000) / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const totalInv = Number(stats?.total_investment ?? 0);
  const dailyPct = Number(status?.daily_pct ?? 0);
  const daily = totalInv * (dailyPct / 100);

  return (
    <div className="space-y-6">
      <div className="glass-strong relative overflow-hidden rounded-3xl">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr] lg:p-8">
          <div className="relative">
            <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.87_0.22_145)] animate-pulse" />
              AI-01 · Neural Trader Online
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight lg:text-5xl">
              Autonomous <span className="gradient-text">Yield Engine</span>
            </h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              The AI robot compounds your daily profit at {dailyPct}%/day. Claim every 24 hours; earnings are capped at 2× your investment.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <MiniStat label="Total Investment" value={`$${totalInv.toFixed(2)}`} icon={<Cpu className="h-4 w-4" />} />
              <MiniStat label="Daily Profit" value={`$${daily.toFixed(4)}`} icon={<TrendingUp className="h-4 w-4" />} />
              <MiniStat label="Total Claimed" value={`$${Number(stats?.total_claimed ?? 0).toFixed(2)}`} icon={<Sparkles className="h-4 w-4" />} />
              <MiniStat label="Daily Rate" value={`${dailyPct}%`} icon={<Bot className="h-4 w-4" />} />
            </div>

            <div className="glass mt-6 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {!status?.hasInvestment ? "Activate a package to start" : ready ? "Cycle complete" : "Next claim in"}
                </div>
                {ready && <span className="rounded-full bg-[oklch(0.87_0.22_145)/20] px-2 py-0.5 font-mono text-[10px] text-[oklch(0.87_0.22_145)]">READY</span>}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[["HH", hh], ["MM", mm], ["SS", ss]].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl bg-black/40 p-3 font-mono">
                    <div className="text-3xl font-bold">{String(v).padStart(2, "0")}</div>
                    <div className="mt-1 text-[10px] tracking-widest text-muted-foreground">{l}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => claim.mutate()}
                disabled={!ready || claim.isPending}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition ${
                  ready ? "text-primary-foreground [background:var(--gradient-primary)] glow hover:scale-[1.01]" : "cursor-not-allowed bg-white/5 text-muted-foreground"
                }`}
              >
                {claim.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4" /> {ready ? "CLAIM NOW" : "Processing…"}</>}
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-3xl [background:var(--gradient-primary)] opacity-30 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl neon-border">
              <img src={heroImg} alt="AI robot" loading="lazy" width={1024} height={1024} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                <span>NEURAL LINK · STABLE</span>
                <span className="text-[oklch(0.87_0.22_145)]">SIGNAL 98%</span>
              </div>
            </div>
            <div className="pointer-events-none absolute -inset-4">
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20 animate-spin-slow" />
              <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10 animate-spin-slow" style={{ animationDirection: "reverse" }} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">AI Signal Preview</h2>
          <span className="font-mono text-xs text-muted-foreground">visualization</span>
        </div>
        <FakeChart />
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-[oklch(0.85_0.19_210)]">{icon}</span>{label}
      </div>
      <div className="mt-2 font-display text-xl font-bold">{value}</div>
    </div>
  );
}

function FakeChart() {
  const pts: number[] = [];
  let v = 50;
  for (let i = 0; i < 60; i++) {
    v += Math.sin(i * 0.6) * 4 + (i % 7 === 0 ? 6 : -1);
    pts.push(Math.max(10, Math.min(90, v)));
  }
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (pts.length - 1)) * 100} ${100 - p}`).join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;
  return (
    <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-black/30">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="a" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.85 0.19 210)" stopOpacity="0.5" />
            <stop offset="1" stopColor="oklch(0.85 0.19 210)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="s" x1="0" x2="1">
            <stop offset="0" stopColor="oklch(0.85 0.19 210)" />
            <stop offset="1" stopColor="oklch(0.7 0.24 295)" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="oklch(1 0 0 / 0.05)" strokeWidth="0.2" />)}
        <path d={area} fill="url(#a)" />
        <path d={path} fill="none" stroke="url(#s)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
