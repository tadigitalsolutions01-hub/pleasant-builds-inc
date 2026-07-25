import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Zap, Loader2, Wallet, Copy, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import {
  activatePackageFn,
  getMyInvestments,
  getPackages,
  getSettings,
  submitDepositFn,
} from "@/lib/mws.functions";
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
  const settingsFn = useServerFn(getSettings);
  const { data: stats } = useStats();
  const { data: packages } = useQuery({ queryKey: ["packages"], queryFn: () => pkgFn() });
  const { data: investments } = useQuery({ queryKey: ["investments"], queryFn: () => invFn() });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => settingsFn() });
  const currentPackage = investments?.[0]?.amount ? Number(investments[0].amount) : 0;
  const demoMode = !!(settings as any)?.demo_deposit_mode;
  const [depositFor, setDepositFor] = useState<number | null>(null);

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
        {demoMode ? (
          <div className="mt-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
            <strong>Demo deposit mode</strong> — activations skip on-chain payment. Turn this off in admin to require USDT (BEP20) deposits.
          </div>
        ) : (
          <div className="mt-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-200">
            <strong>Live mode</strong> — activations require a verified on-chain USDT (BEP20) transfer to the platform wallet.
          </div>
        )}
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

                {demoMode ? (
                  <button
                    onClick={() => mut.mutate(amount)}
                    disabled={mut.isPending}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60"
                  >
                    {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4" /> Activate</>}
                  </button>
                ) : (
                  <button
                    onClick={() => setDepositFor(amount)}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow"
                  >
                    <Wallet className="h-4 w-4" /> Deposit ${amount} USDT
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {depositFor !== null && (
        <DepositModal
          amount={depositFor}
          wallet={((settings as any)?.deposit_wallet_address ?? "") as string}
          onClose={() => setDepositFor(null)}
        />
      )}
    </div>
  );
}

function DepositModal({ amount, wallet, onClose }: { amount: number; wallet: string; onClose: () => void }) {
  const qc = useQueryClient();
  const submit = useServerFn(submitDepositFn);
  const [txHash, setTxHash] = useState("");
  const mut = useMutation({
    mutationFn: () => submit({ data: { txHash: txHash.trim(), packageAmount: amount } }),
    onSuccess: () => {
      toast.success(`Deposit verified — package $${amount} activated`);
      qc.invalidateQueries({ queryKey: ["investments"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["deposits"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="glass-strong relative w-full max-w-md rounded-3xl p-6">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Deposit USDT (BEP20)</div>
        <h2 className="mt-1 font-display text-2xl font-bold">
          Send exactly <span className="gradient-text">${amount}</span> USDT
        </h2>

        {!wallet ? (
          <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
            Deposit wallet not configured yet. Please contact admin.
          </div>
        ) : (
          <>
            <div className="mt-5 flex justify-center rounded-2xl bg-white p-4">
              <QRCodeSVG value={wallet} size={168} level="M" />
            </div>
            <div className="mt-4">
              <div className="text-xs uppercase text-muted-foreground">Platform wallet</div>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-white/5 px-3 py-2">
                <span className="flex-1 truncate font-mono text-[11px]">{wallet}</span>
                <button onClick={() => copy(wallet)} className="rounded-full p-1.5 hover:bg-white/10"><Copy className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <ol className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <li>1. Open your BEP20 wallet (BSC network).</li>
              <li>2. Send <strong className="text-foreground">exactly ${amount} USDT</strong> to the address above.</li>
              <li>3. Paste your transaction hash below.</li>
              <li>4. We verify on-chain and activate your package automatically.</li>
            </ol>

            <label className="mt-4 block">
              <div className="mb-1 text-xs uppercase text-muted-foreground">Transaction hash</div>
              <input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x…"
                className="w-full rounded-xl border border-border bg-white/5 px-3 py-2.5 font-mono text-[11px] outline-none focus:border-primary"
              />
            </label>
            {txHash.length > 10 && (
              <a
                href={`https://bscscan.com/tx/${txHash.trim()}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                View on BscScan <ExternalLink className="h-3 w-3" />
              </a>
            )}

            <button
              onClick={() => mut.mutate()}
              disabled={!txHash || mut.isPending}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60"
            >
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Activate"}
            </button>
          </>
        )}
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
