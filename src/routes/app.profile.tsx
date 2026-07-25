import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useProfile } from "@/hooks/use-profile";
import { updateMyProfile } from "@/lib/mws.functions";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile · Meta Word Space" }, { name: "description", content: "Update your Meta Word Space profile." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const qc = useQueryClient();
  const updateFn = useServerFn(updateMyProfile);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  const mut = useMutation({
    mutationFn: () => updateFn({ data: { username, avatar_url: avatarUrl } }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Profile Settings</h1>

      <div className="glass-strong grid gap-6 rounded-3xl p-6 lg:grid-cols-[240px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-full [background:var(--gradient-primary)] font-display text-3xl font-bold text-primary-foreground">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : username.slice(-2).toUpperCase()}
          </div>
          <div className="text-center font-mono text-[11px] text-muted-foreground">
            {profile.wallet_address.slice(0, 10)}…{profile.wallet_address.slice(-6)}
          </div>
          <div className="glass rounded-full px-3 py-1 font-mono text-[11px]">Sponsor {profile.sponsor_code}</div>
        </div>

        <div className="space-y-4">
          <Field label="Username">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-border bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary"
              maxLength={40}
            />
          </Field>
          <Field label="Avatar URL">
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full rounded-xl border border-border bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder="https://…"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">Paste any public image URL.</p>
          </Field>
          <Field label="Joined">
            <div className="rounded-xl border border-border/50 bg-white/5 px-4 py-3 font-mono text-xs text-muted-foreground">
              {new Date(profile.joined_at).toLocaleString()}
            </div>
          </Field>

          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground [background:var(--gradient-primary)] glow disabled:opacity-60"
          >
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
