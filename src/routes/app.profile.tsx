import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { saveUser } from "@/lib/mock-store";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile · Meta World Space" }, { name: "description", content: "Update your Meta World Space profile." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useUser();
  const [username, setUsername] = useState(user?.username ?? "");
  const [seed, setSeed] = useState(user?.avatarSeed ?? "");

  if (!user) return null;

  function save() {
    if (!user) return;
    saveUser({ ...user, username, avatarSeed: seed });
    toast.success("Profile updated");
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Profile Settings</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="glass-strong flex flex-col items-center rounded-3xl p-6">
          <div className="relative">
            <div className="absolute inset-0 animate-spin-slow rounded-full [background:var(--gradient-ring)] opacity-70 blur-sm" />
            <div className="relative grid h-32 w-32 place-items-center rounded-full bg-background font-display text-4xl font-bold">
              {username.slice(-2).toUpperCase()}
            </div>
          </div>
          <button className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs">
            <Camera className="h-3.5 w-3.5" /> Change picture
          </button>
          <div className="mt-4 font-mono text-[11px] text-muted-foreground">{user.wallet}</div>
        </div>

        <div className="glass-strong rounded-3xl p-6">
          <Field label="Username">
            <input value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-border bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary" />
          </Field>
          <Field label="Avatar seed">
            <input value={seed} onChange={(e) => setSeed(e.target.value)}
              className="w-full rounded-xl border border-border bg-white/5 px-4 py-3 font-mono text-sm outline-none focus:border-primary" />
          </Field>
          <Field label="Sponsor ID">
            <input value={user.sponsorId} readOnly
              className="w-full rounded-xl border border-border bg-white/5 px-4 py-3 font-mono text-sm text-muted-foreground" />
          </Field>
          <Field label="Wallet Provider">
            <input value={user.walletProvider} readOnly
              className="w-full rounded-xl border border-border bg-white/5 px-4 py-3 text-sm text-muted-foreground" />
          </Field>
          <button onClick={save} className="mt-4 rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow">
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
