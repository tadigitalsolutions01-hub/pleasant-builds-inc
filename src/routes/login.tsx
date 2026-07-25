import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/mws/logo";
import { BgFx } from "@/components/mws/bg-fx";
import { createUser, getUser, type Wallet } from "@/lib/mock-store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connect Wallet · Meta World Space" },
      { name: "description", content: "Wallet-only sign-in to Meta World Space. MetaMask, WalletConnect, Trust Wallet, Coinbase." },
      { property: "og:title", content: "Connect Wallet · Meta World Space" },
      { property: "og:description", content: "Wallet-only sign-in. No email. No password." },
    ],
  }),
  component: LoginPage,
});

const WALLETS: { name: Wallet; icon: string; hint: string }[] = [
  { name: "MetaMask", icon: "🦊", hint: "Most popular" },
  { name: "WalletConnect", icon: "🔗", hint: "300+ wallets" },
  { name: "Trust Wallet", icon: "🛡️", hint: "Mobile-first" },
  { name: "Coinbase", icon: "🅒", hint: "Coinbase Wallet" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"connect" | "register" | "connecting">("connect");
  const [selected, setSelected] = useState<Wallet | null>(null);
  const [sponsor, setSponsor] = useState("MWS-GENESIS");

  useEffect(() => {
    if (getUser()) navigate({ to: "/app" });
  }, [navigate]);

  async function handleConnect(w: Wallet) {
    setSelected(w);
    setStep("connecting");
    await new Promise((r) => setTimeout(r, 1400));
    // demo: no existing account -> register step
    setStep("register");
  }

  function handleRegister() {
    if (!selected) return;
    createUser({ provider: selected, sponsorId: sponsor });
    toast.success("Account created. Welcome to the grid.");
    navigate({ to: "/app" });
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <BgFx />
      <div className="absolute left-6 top-6"><Logo /></div>

      <div className="glass-strong w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-[oklch(0.87_0.22_145)]" />
          Non-custodial · Wallet-only access
        </div>

        {step === "connect" && (
          <>
            <h1 className="font-display text-3xl font-bold">Connect your wallet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No email, no password. Your wallet is your identity in the grid.
            </p>
            <div className="mt-6 grid gap-3">
              {WALLETS.map((w) => (
                <button
                  key={w.name}
                  onClick={() => handleConnect(w.name)}
                  className="glass group flex items-center justify-between rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-lg">{w.icon}</span>
                    <div>
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-muted-foreground">{w.hint}</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === "connecting" && (
          <div className="py-10 text-center">
            <div className="relative mx-auto grid h-24 w-24 place-items-center">
              <span className="absolute inset-0 animate-spin-slow rounded-full [background:var(--gradient-ring)] opacity-70 blur-md" />
              <span className="relative grid h-20 w-20 place-items-center rounded-full bg-background">
                <Loader2 className="h-7 w-7 animate-spin text-[oklch(0.85_0.19_210)]" />
              </span>
            </div>
            <div className="mt-6 font-display text-lg">Connecting to {selected}</div>
            <div className="mt-1 font-mono text-xs text-muted-foreground">Signing handshake · Verifying signature</div>
          </div>
        )}

        {step === "register" && (
          <>
            <h1 className="font-display text-2xl font-bold">Complete your registration</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn't find an existing account for this wallet. Enter your sponsor to activate.
            </p>
            <label className="mt-6 block text-xs uppercase tracking-widest text-muted-foreground">Sponsor ID</label>
            <input
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-white/5 px-4 py-3 font-mono text-sm outline-none focus:border-primary"
              placeholder="MWS-XXXXXX"
            />
            <button
              onClick={handleRegister}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow"
            >
              Register Account <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setStep("connect")}
              className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Use a different wallet
            </button>
          </>
        )}
      </div>
    </div>
  );
}
