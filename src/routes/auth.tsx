import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Logo } from "@/components/mws/logo";
import { BgFx } from "@/components/mws/bg-fx";
import { supabase } from "@/integrations/supabase/client";
import { connectAndSign, type WalletId } from "@/lib/wallet-client";
import {
  registerWallet,
  requestWalletNonce,
  verifyWalletAndLogin,
} from "@/lib/wallet-auth.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connect Wallet · Meta Word Space" },
      { name: "description", content: "Sign in to Meta Word Space with your Web3 wallet. No email, no password." },
      { property: "og:title", content: "Connect Wallet · Meta Word Space" },
      { property: "og:description", content: "Wallet-only sign-in secured by on-chain signature." },
    ],
  }),
  component: AuthPage,
});

const WALLETS: { name: WalletId; icon: string; hint: string }[] = [
  { name: "MetaMask", icon: "🦊", hint: "Browser extension" },
  { name: "Trust Wallet", icon: "🛡️", hint: "Mobile app browser" },
  { name: "Coinbase", icon: "🅒", hint: "Coinbase Wallet" },
  { name: "WalletConnect", icon: "🔗", hint: "300+ wallets (soon)" },
];

type Step = "connect" | "connecting" | "register";

function AuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("connect");
  const [selected, setSelected] = useState<WalletId | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [sponsor, setSponsor] = useState("MWS-GENESIS");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nonceFn = useServerFn(requestWalletNonce);
  const verifyFn = useServerFn(verifyWalletAndLogin);
  const registerFn = useServerFn(registerWallet);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  async function afterSession(tokenHash?: string) {
    if (!tokenHash) throw new Error("Session token missing");
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
    if (error) throw new Error(error.message);
    toast.success("Signed in");
    navigate({ to: "/app" });
  }

  async function handleConnect(w: WalletId) {
    setError(null);
    setSelected(w);
    setStep("connecting");
    try {
      const nonceRes = await nonceFn({ data: { address: "0x0000000000000000000000000000000000000000" } })
        .catch(() => null); // preflight ignored — real nonce below
      void nonceRes;

      // 1. Ask wallet for a temporary address so we can request the real nonce
      // We do this by calling connectAndSign with a placeholder — but personal_sign requires the account.
      // Simpler: call eth_requestAccounts first via connectAndSign after we know the nonce.
      // So: get address without signing first.
      const provider = (await import("@/lib/wallet-client")).pickProvider(w);
      if (!provider) throw new Error(`${w} not detected. Install it or use its in-app browser.`);
      if (w === "WalletConnect")
        throw new Error("WalletConnect is not yet enabled. Use MetaMask, Trust, or Coinbase.");
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const addr = (accounts?.[0] ?? "").toLowerCase();
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) throw new Error("Failed to read wallet address");

      const { message } = await nonceFn({ data: { address: addr } });
      const sig = (await provider.request({
        method: "personal_sign",
        params: [message, addr],
      })) as string;

      setAddress(addr);
      setSignature(sig);

      const result = await verifyFn({ data: { address: addr, signature: sig } });
      if (result.needsRegistration) {
        setStep("register");
      } else {
        await afterSession(result.tokenHash);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setError(msg);
      toast.error(msg);
      setStep("connect");
    }
  }

  async function handleRegister() {
    if (!address || !signature) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await registerFn({
        data: { address, signature, sponsorCode: sponsor.trim() },
      });
      await afterSession(result.tokenHash);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <BgFx />
      <div className="absolute left-6 top-6"><Logo /></div>

      <div className="glass-strong w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-[oklch(0.87_0.22_145)]" />
          Non-custodial · On-chain signature verified
        </div>

        {step === "connect" && (
          <>
            <h1 className="font-display text-3xl font-bold">Connect your wallet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign a message with your wallet to prove ownership. No email. No password.
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
            {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}
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
            <div className="mt-1 font-mono text-xs text-muted-foreground">Requesting signature · verifying on-chain</div>
          </div>
        )}

        {step === "register" && (
          <>
            <h1 className="font-display text-2xl font-bold">Complete your registration</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your sponsor code to activate your account on Meta Word Space.
            </p>
            <div className="mt-4 rounded-xl bg-white/5 p-3 font-mono text-[11px] text-muted-foreground">
              Wallet: {address}
            </div>
            <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">Sponsor Code</label>
            <input
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value.toUpperCase())}
              className="mt-2 w-full rounded-xl border border-border bg-white/5 px-4 py-3 font-mono text-sm outline-none focus:border-primary"
              placeholder="MWS-XXXXXX"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              First user of the platform is auto-granted admin and can use any code.
            </p>
            <button
              onClick={handleRegister}
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Register Account <ArrowRight className="h-4 w-4" /></>}
            </button>
            {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}
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
