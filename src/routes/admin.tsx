import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldAlert, ArrowLeft, AlertTriangle, Wallet, ExternalLink } from "lucide-react";
import { BgFx } from "@/components/mws/bg-fx";
import { Logo } from "@/components/mws/logo";
import { useProfile } from "@/hooks/use-profile";
import { getSettings } from "@/lib/mws.functions";
import {
  adminBroadcast,
  adminGetSummary,
  adminListDeposits,
  adminListLocks,
  adminListPendingWithdrawals,
  adminListUsers,
  adminReviewWithdrawal,
  adminRunSalary,
  adminUnlockCapital,
  adminUpdateSettings,
} from "@/lib/admin.functions";
import { SalaryTab } from "@/components/mws/admin-salary";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Console · Meta Word Space" }, { name: "description", content: "Admin control panel." }] }),
  component: AdminPage,
});

const TABS = ["Overview", "Deposits", "Withdrawals", "Users", "Capital Locks", "Salary", "Settings", "Announcements"] as const;
type Tab = (typeof TABS)[number];

function AdminPage() {
  const { data: profile, isLoading, hydrated } = useProfile();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Overview");
  const settingsFn = useServerFn(getSettings);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => settingsFn() });

  useEffect(() => {
    if (hydrated && !isLoading && !profile) navigate({ to: "/auth" });
    if (profile && !profile.isAdmin) navigate({ to: "/app" });
  }, [profile, isLoading, hydrated, navigate]);

  if (!profile?.isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center">
        <BgFx /><div className="font-mono text-sm text-muted-foreground">Verifying admin…</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BgFx />
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-4">
          <Logo to="/app" />
          <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-300" /> ADMIN
          </span>
        </div>
        <Link to="/app" className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to app
        </Link>
      </header>

      <div className="mx-auto max-w-7xl px-6 pb-16 space-y-5">
        <SystemBanner settings={settings} />

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-xs transition ${
                tab === t ? "text-primary-foreground [background:var(--gradient-primary)] glow" : "glass hover:bg-white/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && <Overview />}
        {tab === "Deposits" && <Deposits />}
        {tab === "Withdrawals" && <Withdrawals />}
        {tab === "Users" && <Users />}
        {tab === "Capital Locks" && <Locks />}
        {tab === "Salary" && <SalaryTab />}
        {tab === "Settings" && <SettingsTab />}
        {tab === "Announcements" && <Announcements />}
      </div>
    </div>
  );
}

function SystemBanner({ settings }: { settings: Record<string, unknown> | undefined }) {
  const qc = useQueryClient();
  const upd = useServerFn(adminUpdateSettings);
  const toggle = useMutation({
    mutationFn: (patch: { maintenance_mode?: boolean; demo_deposit_mode?: boolean }) => upd({ data: patch }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!settings) return null;
  const maintenance = !!settings.maintenance_mode;
  const demo = !!settings.demo_deposit_mode;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className={`glass-strong flex items-center justify-between rounded-2xl p-4 ${maintenance ? "border border-red-500/40" : ""}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`h-5 w-5 ${maintenance ? "text-red-400" : "text-muted-foreground"}`} />
          <div>
            <div className="text-sm font-semibold">Maintenance Mode</div>
            <div className="text-xs text-muted-foreground">Blocks activations, claims and withdrawals.</div>
          </div>
        </div>
        <Toggle checked={maintenance} onChange={(v) => toggle.mutate({ maintenance_mode: v })} />
      </div>
      <div className={`glass-strong flex items-center justify-between rounded-2xl p-4 ${demo ? "border border-amber-500/40" : "border border-emerald-500/40"}`}>
        <div className="flex items-center gap-3">
          <Wallet className={`h-5 w-5 ${demo ? "text-amber-300" : "text-emerald-300"}`} />
          <div>
            <div className="text-sm font-semibold">Demo Deposit Mode</div>
            <div className="text-xs text-muted-foreground">
              {demo ? "One-click package activation (testing)." : "On-chain USDT (BEP20) required."}
            </div>
          </div>
        </div>
        <Toggle checked={demo} onChange={(v) => toggle.mutate({ demo_deposit_mode: v })} />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${checked ? "[background:var(--gradient-primary)]" : "bg-white/10"}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Overview() {
  const fn = useServerFn(adminGetSummary);
  const salaryFn = useServerFn(adminRunSalary);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "summary"], queryFn: () => fn() });
  const mut = useMutation({
    mutationFn: () => salaryFn(),
    onSuccess: (r) => { toast.success(`Salary run: ${r.paid} paid`); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card label="Users" value={String(data?.users ?? 0)} />
        <Card label="Total Investment" value={`$${Number(data?.totalInvestment ?? 0).toFixed(2)}`} />
        <Card label="Total Paid Out" value={`$${Number(data?.totalPaidOut ?? 0).toFixed(2)}`} />
        <Card label="Pending Withdrawals" value={String(data?.pendingWithdrawals ?? 0)} />
      </div>
      <div className="glass-strong rounded-3xl p-6">
        <h2 className="font-display text-lg font-semibold">Weekly Salary</h2>
        <p className="mt-1 text-xs text-muted-foreground">Runs the automated salary payout for the current ISO week. Deduplicates automatically.</p>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60"
        >
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run Weekly Salary"}
        </button>
      </div>
    </div>
  );
}

function Deposits() {
  const fn = useServerFn(adminListDeposits);
  const { data } = useQuery({ queryKey: ["admin", "deposits"], queryFn: () => fn() });
  return (
    <div className="glass-strong overflow-x-auto rounded-3xl">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="px-5 py-3">Date</th>
            <th className="px-5 py-3">User</th>
            <th className="px-5 py-3">Package</th>
            <th className="px-5 py-3">Tx Hash</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {((data as any) ?? []).map((d: {
            id: string; created_at: string; package_amount: number; tx_hash: string;
            status: string; note: string | null; profiles: { username: string };
          }) => (
            <tr key={d.id}>
              <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</td>
              <td className="px-5 py-3">{d.profiles?.username}</td>
              <td className="px-5 py-3 font-mono">${Number(d.package_amount).toFixed(0)}</td>
              <td className="px-5 py-3">
                <a
                  href={`https://bscscan.com/tx/${d.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                >
                  {d.tx_hash.slice(0, 10)}…{d.tx_hash.slice(-6)} <ExternalLink className="h-3 w-3" />
                </a>
              </td>
              <td className="px-5 py-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${
                  d.status === "verified" ? "bg-emerald-500/20 text-emerald-300"
                    : d.status === "pending" ? "bg-amber-500/20 text-amber-300"
                    : "bg-red-500/20 text-red-300"
                }`}>{d.status}</span>
              </td>
              <td className="px-5 py-3 text-xs text-muted-foreground max-w-xs truncate">{d.note}</td>
            </tr>
          ))}
          {(data ?? []).length === 0 && (
            <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No deposits yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Withdrawals() {
  const fn = useServerFn(adminListPendingWithdrawals);
  const reviewFn = useServerFn(adminReviewWithdrawal);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "withdrawals"], queryFn: () => fn() });
  const mut = useMutation({
    mutationFn: (v: { id: string; action: "approve" | "reject" }) => reviewFn({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin", "withdrawals"] }); qc.invalidateQueries({ queryKey: ["admin", "summary"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="glass-strong overflow-x-auto rounded-3xl">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">User</th><th className="px-5 py-3">Kind</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Wallet</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Payout</th><th className="px-5 py-3"></th></tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {(data as any ?? []).map((w: {
            id: string; created_at: string; kind: string; amount: number; wallet_address: string; status: string;
            payout_tx_hash: string | null; payout_status: string | null; payout_error: string | null;
            profiles: { username: string };
          }) => (
            <tr key={w.id}>
              <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</td>
              <td className="px-5 py-3">{w.profiles?.username}</td>
              <td className="px-5 py-3 capitalize">{w.kind}</td>
              <td className="px-5 py-3 font-mono">${Number(w.amount).toFixed(2)}</td>
              <td className="px-5 py-3 font-mono text-[11px] text-muted-foreground">{w.wallet_address.slice(0, 10)}…{w.wallet_address.slice(-6)}</td>
              <td className="px-5 py-3 capitalize">{w.status}</td>
              <td className="px-5 py-3 text-xs">
                {w.payout_tx_hash ? (
                  <a href={`https://bscscan.com/tx/${w.payout_tx_hash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-300 hover:underline">
                    {w.payout_tx_hash.slice(0, 10)}…{w.payout_tx_hash.slice(-6)} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : w.payout_status === "failed" ? (
                  <span className="text-red-300" title={w.payout_error ?? ""}>Failed</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-5 py-3 text-right">
                {w.status === "pending" && (
                  <span className="flex justify-end gap-2">
                    <button onClick={() => mut.mutate({ id: w.id, action: "approve" })} className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/30">Approve</button>
                    <button onClick={() => mut.mutate({ id: w.id, action: "reject" })} className="rounded-full bg-red-500/20 px-3 py-1 text-[11px] text-red-300 hover:bg-red-500/30">Reject</button>
                  </span>
                )}
              </td>
            </tr>
          ))}
          {(data ?? []).length === 0 && (
            <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">No withdrawals.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Users() {
  const fn = useServerFn(adminListUsers);
  const { data } = useQuery({ queryKey: ["admin", "users"], queryFn: () => fn() });
  return (
    <div className="glass-strong overflow-x-auto rounded-3xl">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr><th className="px-5 py-3">Username</th><th className="px-5 py-3">Wallet</th><th className="px-5 py-3">Sponsor Code</th><th className="px-5 py-3">Joined</th></tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {(data ?? []).map((u: { id: string; username: string; wallet_address: string; sponsor_code: string; joined_at: string }) => (
            <tr key={u.id}>
              <td className="px-5 py-3">{u.username}</td>
              <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{u.wallet_address}</td>
              <td className="px-5 py-3 font-mono text-xs">{u.sponsor_code}</td>
              <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(u.joined_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Locks() {
  const fn = useServerFn(adminListLocks);
  const unlockFn = useServerFn(adminUnlockCapital);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "locks"], queryFn: () => fn() });
  const mut = useMutation({
    mutationFn: (id: string) => unlockFn({ data: { investmentId: id } }),
    onSuccess: () => { toast.success("Capital unlocked"); qc.invalidateQueries({ queryKey: ["admin", "locks"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const now = Date.now();
  return (
    <div className="glass-strong overflow-x-auto rounded-3xl">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Unlock At</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {(data as any ?? []).map((l: {
            investment_id: string; user_id: string; unlock_at: string; unlocked_at: string | null;
            investments: { amount: number }; profiles: { username: string } | null;
          }) => {
            const unlocked = !!l.unlocked_at || new Date(l.unlock_at).getTime() <= now;
            return (
              <tr key={l.investment_id}>
                <td className="px-5 py-3">{l.profiles?.username ?? l.user_id.slice(0, 6)}</td>
                <td className="px-5 py-3 font-mono">${Number(l.investments.amount).toFixed(2)}</td>
                <td className="px-5 py-3 text-xs">{new Date(l.unlock_at).toLocaleString()}</td>
                <td className="px-5 py-3">{unlocked ? "Unlocked" : "Locked"}</td>
                <td className="px-5 py-3 text-right">
                  {!l.unlocked_at && new Date(l.unlock_at).getTime() > now && (
                    <button onClick={() => mut.mutate(l.investment_id)} className="rounded-full bg-amber-500/20 px-3 py-1 text-[11px] text-amber-300 hover:bg-amber-500/30">Unlock early</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SettingsTab() {
  const fn = useServerFn(getSettings);
  const updFn = useServerFn(adminUpdateSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => fn() });
  const [form, setForm] = useState<{
    daily_pct?: number; l1_pct?: number; l2_pct?: number; l3_pct?: number;
    min_directs_for_all_levels?: number; maintenance_mode?: boolean;
    demo_deposit_mode?: boolean; deposit_wallet_address?: string;
    deposit_min_confirmations?: number; deposit_token_contract?: string;
  }>({});
  useEffect(() => { if (data) setForm({
    daily_pct: Number((data as any).daily_pct),
    l1_pct: Number((data as any).l1_pct),
    l2_pct: Number((data as any).l2_pct),
    l3_pct: Number((data as any).l3_pct),
    min_directs_for_all_levels: Number((data as any).min_directs_for_all_levels),
    maintenance_mode: !!(data as any).maintenance_mode,
    demo_deposit_mode: !!(data as any).demo_deposit_mode,
    deposit_wallet_address: (data as any).deposit_wallet_address ?? "",
    deposit_min_confirmations: Number((data as any).deposit_min_confirmations ?? 5),
    deposit_token_contract: (data as any).deposit_token_contract ?? "",
  }); }, [data]);
  const mut = useMutation({
    mutationFn: () => updFn({ data: form }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="glass-strong rounded-3xl p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Yield & Commissions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumField label="Daily %" value={form.daily_pct} step={0.25} onChange={(v) => setForm({ ...form, daily_pct: v })} />
          <NumField label="L1 commission %" value={form.l1_pct} onChange={(v) => setForm({ ...form, l1_pct: v })} />
          <NumField label="L2 commission %" value={form.l2_pct} onChange={(v) => setForm({ ...form, l2_pct: v })} />
          <NumField label="L3 commission %" value={form.l3_pct} onChange={(v) => setForm({ ...form, l3_pct: v })} />
          <NumField label="Min directs for L2/L3" value={form.min_directs_for_all_levels} onChange={(v) => setForm({ ...form, min_directs_for_all_levels: v })} />
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">On-chain Deposits (USDT BEP20)</h2>
        <label className="flex items-center gap-3 text-sm">
          <Toggle checked={!!form.demo_deposit_mode} onChange={(v) => setForm({ ...form, demo_deposit_mode: v })} />
          <span>Demo mode <span className="text-xs text-muted-foreground">(one-click activate; skip on-chain check)</span></span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <Toggle checked={!!form.maintenance_mode} onChange={(v) => setForm({ ...form, maintenance_mode: v })} />
          <span>Maintenance mode</span>
        </label>
        <TextField
          label="Deposit wallet (BEP20)"
          value={form.deposit_wallet_address ?? ""}
          onChange={(v) => setForm({ ...form, deposit_wallet_address: v })}
          placeholder="0x…"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumField
            label="Min confirmations"
            value={form.deposit_min_confirmations}
            onChange={(v) => setForm({ ...form, deposit_min_confirmations: v })}
          />
          <TextField
            label="USDT contract (BEP20)"
            value={form.deposit_token_contract ?? ""}
            onChange={(v) => setForm({ ...form, deposit_token_contract: v })}
            placeholder="0x55d398326f99059ff775485246999027b3197955"
          />
        </div>
      </div>

      <div className="lg:col-span-2 flex justify-end">
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60">
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function Announcements() {
  const fn = useServerFn(adminBroadcast);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const mut = useMutation({
    mutationFn: () => fn({ data: { title, body } }),
    onSuccess: () => { toast.success("Announcement broadcast"); setTitle(""); setBody(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="glass-strong rounded-3xl p-6 max-w-xl space-y-3">
      <h2 className="font-display text-lg font-semibold">Broadcast Announcement</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border border-border bg-white/5 px-4 py-3 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body (optional)" rows={4} className="w-full rounded-xl border border-border bg-white/5 px-4 py-3 text-sm" />
      <button onClick={() => mut.mutate()} disabled={!title || mut.isPending} className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60">
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Broadcast"}
      </button>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function NumField({ label, value, step = 1, onChange }: { label: string; value?: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-sm">
      <div className="mb-2 text-xs uppercase text-muted-foreground">{label}</div>
      <input type="number" step={step} value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-xl border border-border bg-white/5 px-4 py-2.5 font-mono text-sm outline-none focus:border-primary" />
    </label>
  );
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <div className="mb-2 text-xs uppercase text-muted-foreground">{label}</div>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-border bg-white/5 px-4 py-2.5 font-mono text-xs outline-none focus:border-primary" />
    </label>
  );
}
