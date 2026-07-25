import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Cpu, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import heroImg from "@/assets/ai-robot-hero.jpg";
import { Logo } from "@/components/mws/logo";
import { BgFx } from "@/components/mws/bg-fx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meta World Space — Enter the AI Investment Grid" },
      { name: "description", content: "A futuristic AI-powered Web3 investment platform. Wallet-only access, robotic trading, and premium passive income." },
      { property: "og:title", content: "Meta World Space" },
      { property: "og:description", content: "Enter the AI investment grid. Wallet-only. Fully robotic." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <BgFx />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[oklch(0.87_0.22_145)] animate-pulse" /> AI Core Online</span>
          <span className="font-mono text-xs tracking-widest">v2.0.24 · MAINNET</span>
        </nav>
        <Link
          to="/auth"
          className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/5 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/10"
        >
          <Wallet className="h-4 w-4" /> Connect
        </Link>
      </header>

      <main className="mx-auto grid max-w-7xl gap-10 px-6 pb-24 pt-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-16">
        <section>
          <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[oklch(0.85_0.19_210)]" />
            AI-driven passive yield · Web3 native
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            The <span className="gradient-text">AI Operating System</span>
            <br /> for on-chain wealth.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Meta World Space is a fully autonomous investment grid — powered by a
            robotic AI trader, secured by your wallet, and engineered for the
            next generation of decentralized income.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              className="group relative inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow transition hover:scale-[1.02]"
            >
              Start Now
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a href="#how" className="rounded-full border border-border/70 bg-white/5 px-6 py-3 text-sm backdrop-blur hover:bg-white/10">
              How it works
            </a>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { k: "Wallet", v: "Only sign-in" },
              { k: "24h", v: "Claim Cycle" },
              { k: "2×", v: "Return Cap" },
            ].map((s) => (
              <div key={s.v} className="glass rounded-2xl p-4">
                <div className="gradient-text font-display text-2xl font-bold">{s.k}</div>
                <div className="mt-1 text-xs tracking-wide text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative">
          <div className="relative aspect-[3/2] overflow-hidden rounded-3xl neon-border">
            <img
              src={heroImg}
              alt="AI robot trading at holographic desk"
              width={1536}
              height={1024}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="glass-strong absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10">
                  <Bot className="h-4 w-4 text-[oklch(0.85_0.19_210)]" />
                </span>
                <div>
                  <div className="text-xs text-muted-foreground">AI-01 · Neural Trader</div>
                  <div className="font-mono text-sm">Awaiting your first cycle</div>
                </div>
              </div>
              <span className="rounded-full bg-[oklch(0.87_0.22_145)/20] px-2 py-1 font-mono text-[10px] text-[oklch(0.87_0.22_145)]">ONLINE</span>
            </div>
          </div>

          <div className="absolute -left-6 -top-6 hidden animate-float lg:block">
            <FloatingCard icon={<Cpu className="h-4 w-4" />} title="Neural Core" value="98.4%" />
          </div>
          <div className="absolute -right-4 bottom-24 hidden animate-float lg:block" style={{ animationDelay: "1.5s" }}>
            <FloatingCard icon={<ShieldCheck className="h-4 w-4" />} title="Wallet Secure" value="Locked" />
          </div>
        </section>
      </main>

      {/* Ticker */}
      <section className="border-y border-border/50 bg-white/[0.02] py-4">
        <div className="mx-auto max-w-7xl overflow-hidden">
          <div className="flex w-[200%] animate-ticker items-center gap-12 font-mono text-xs uppercase text-muted-foreground">
            {Array.from({ length: 2 }).flatMap((_, i) =>
              ["Wallet-only sign-in", "AI robot 24h cycle", "3-level referral grid", "Weekly salary tiers", "Capital lock 6 months", "2× return cap", "Non-custodial"].map((t) => (
                <span key={t + i} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full [background:var(--gradient-primary)]" /> {t}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Three modules. <span className="gradient-text">One grid.</span></h2>
          <span className="hidden font-mono text-xs text-muted-foreground md:block">// SYSTEM MODULES</span>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { t: "Wallet Entry", d: "Connect MetaMask, WalletConnect, Trust, or Coinbase. No email, no password." },
            { t: "AI Trader", d: "Autonomous robotic trader compounds daily yield into your wallet address." },
            { t: "Team Grid", d: "3-level referral protocol with weekly salary tiers and passive team income." },
          ].map((f, i) => (
            <div key={f.t} className="glass group relative overflow-hidden rounded-3xl p-6 transition hover:-translate-y-1">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full opacity-20 blur-2xl [background:var(--gradient-primary)]" />
              <div className="font-mono text-xs text-muted-foreground">0{i + 1}</div>
              <h3 className="mt-3 font-display text-xl font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Logo />
          <div className="font-mono text-[11px] tracking-widest text-muted-foreground">
            © 2026 META WORLD SPACE · AI CORE OPERATIONAL
          </div>
        </div>
      </footer>
    </div>
  );
}

function FloatingCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg [background:var(--gradient-primary)] text-primary-foreground">
        {icon}
      </span>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
        <div className="font-mono text-sm">{value}</div>
      </div>
    </div>
  );
}
