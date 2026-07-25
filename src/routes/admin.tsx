import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { BgFx } from "@/components/mws/bg-fx";
import { Logo } from "@/components/mws/logo";
import { useProfile } from "@/hooks/use-profile";
import { getSettings } from "@/lib/mws.functions";
import {
  adminBroadcast,
  adminGetSummary,
  adminListLocks,
  adminListPendingWithdrawals,
  adminListUsers,
  adminReviewWithdrawal,
  adminRunSalary,
  adminUnlockCapital,
  adminUpdateSettings,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Console · Meta Word Space" }, { name: "description", content: "Admin control panel." }] }),
  component: AdminPage,
});

const TABS = ["Overview", "Withdrawals", "Users", "Capital Locks", "Settings", "Announcements"] as const;
type Tab = (typeof TABS)[number];

function AdminPage() {
  const { data: profile, isLoading, hydrated } = useProfile();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Overview");

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

      <div className="mx-auto max-w-7xl px-6 pb-16">
        <div className="mb-6 flex flex-wrap gap-2">
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
        {tab === "Withdrawals" && <Withdrawals />}
        {tab === "Users" && <Users />}
        {tab === "Capital Locks" && <Locks />}
        {tab === "Settings" && <SettingsTab />}
        {tab === "Announcements" && <Announcements />}
      </div>
    </div>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    <div className="glass-strong overflow-hidden rounded-3xl">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">User</th><th className="px-5 py-3">Kind</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Wallet</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {(data ?? []).map((w: {
            id: string; created_at: string; kind: string; amount: number; wallet_address: string; status: string;
            profiles: { username: string };
          }) => (
            <tr key={w.id}>
              <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</td>
              <td className="px-5 py-3">{w.profiles?.username}</td>
              <td className="px-5 py-3 capitalize">{w.kind}</td>
              <td className="px-5 py-3 font-mono">${Number(w.amount).toFixed(2)}</td>
              <td className="px-5 py-3 font-mono text-[11px] text-muted-foreground">{w.wallet_address.slice(0, 10)}…{w.wallet_address.slice(-6)}</td>
              <td className="px-5 py-3 capitalize">{w.status}</td>
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
            <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No withdrawals.</td></tr>
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
    <div className="glass-strong overflow-hidden rounded-3xl">
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
    <div className="glass-strong overflow-hidden rounded-3xl">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Unlock At</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {(data ?? []).map((l: {
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
  const [form, setForm] = useState<{ daily_pct?: number; l1_pct?: number; l2_pct?: number; l3_pct?: number; min_directs_for_all_levels?: number; maintenance_mode?: boolean }>({});
  useEffect(() => { if (data) setForm({
    daily_pct: Number(data.daily_pct), l1_pct: Number(data.l1_pct), l2_pct: Number(data.l2_pct), l3_pct: Number(data.l3_pct),
    min_directs_for_all_levels: Number(data.min_directs_for_all_levels), maintenance_mode: !!data.maintenance_mode,
  }); }, [data]);
  const mut = useMutation({
    mutationFn: () => updFn({ data: form }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="glass-strong rounded-3xl p-6 max-w-2xl space-y-4">
      <h2 className="font-display text-lg font-semibold">System Settings</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumField label="Daily %" value={form.daily_pct} step={0.25} onChange={(v) => setForm({ ...form, daily_pct: v })} />
        <NumField label="L1 commission %" value={form.l1_pct} onChange={(v) => setForm({ ...form, l1_pct: v })} />
        <NumField label="L2 commission %" value={form.l2_pct} onChange={(v) => setForm({ ...form, l2_pct: v })} />
        <NumField label="L3 commission %" value={form.l3_pct} onChange={(v) => setForm({ ...form, l3_pct: v })} />
        <NumField label="Min directs for L2/L3" value={form.min_directs_for_all_levels} onChange={(v) => setForm({ ...form, min_directs_for_all_levels: v })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!form.maintenance_mode} onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })} />
        Maintenance mode (blocks activation / claim / withdrawals)
      </label>
      <button onClick={() => mut.mutate()} disabled={mut.isPending} className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60">
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Settings"}
      </button>
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
