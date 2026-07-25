// Admin server functions. Every handler re-checks admin role via user_roles.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string, supabase: import("@supabase/supabase-js").SupabaseClient) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const adminGetSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [users, invs, wds, pending] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("investments").select("amount"),
      supabaseAdmin.from("withdrawals").select("amount, status"),
      supabaseAdmin.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    const totalInv = (invs.data ?? []).reduce((s, i) => s + Number(i.amount), 0);
    const paidOut = (wds.data ?? []).filter((w) => w.status === "approved").reduce((s, w) => s + Number(w.amount), 0);
    return {
      users: users.count ?? 0,
      totalInvestment: totalInv,
      totalPaidOut: paidOut,
      pendingWithdrawals: pending.count ?? 0,
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, username, wallet_address, sponsor_code, joined_at")
      .order("joined_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const adminListPendingWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: wds } = await supabaseAdmin
      .from("withdrawals")
      .select("id, user_id, kind, amount, wallet_address, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = wds ?? [];
    const ids = Array.from(new Set(rows.map((w) => w.user_id)));
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, username, wallet_address").in("id", ids)
      : { data: [] as { id: string; username: string; wallet_address: string }[] };
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    return rows.map((w) => ({ ...w, profiles: map.get(w.user_id) ?? { username: "—", wallet_address: w.wallet_address } }));
  });


export const adminReviewWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), action: z.enum(["approve", "reject"]), note: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { reviewWithdrawal } = await import("./mws-engine.server");
    return reviewWithdrawal(context.userId, data);
  });

export const adminListLocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("capital_locks")
      .select("investment_id, user_id, unlock_at, unlocked_at, investments!inner(amount), profiles:profiles!capital_locks_user_id_fkey(username)")
      .order("unlock_at", { ascending: true })
      .limit(200);
    return data ?? [];
  });

export const adminUnlockCapital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ investmentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { unlockCapital } = await import("./mws-engine.server");
    return unlockCapital(context.userId, data.investmentId);
  });

export const adminUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        daily_pct: z.number().min(0).max(10).optional(),
        l1_pct: z.number().min(0).max(100).optional(),
        l2_pct: z.number().min(0).max(100).optional(),
        l3_pct: z.number().min(0).max(100).optional(),
        min_directs_for_all_levels: z.number().int().min(0).max(50).optional(),
        maintenance_mode: z.boolean().optional(),
        announcement: z.string().max(2000).optional(),
        demo_deposit_mode: z.boolean().optional(),
        deposit_wallet_address: z
          .string()
          .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid BEP20 wallet")
          .or(z.literal(""))
          .optional(),
        deposit_min_confirmations: z.number().int().min(1).max(50).optional(),
        deposit_token_contract: z
          .string()
          .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid contract address")
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
    if (patch.deposit_wallet_address === "") patch.deposit_wallet_address = null;
    if (typeof patch.deposit_wallet_address === "string") {
      patch.deposit_wallet_address = (patch.deposit_wallet_address as string).toLowerCase();
    }
    if (typeof patch.deposit_token_contract === "string") {
      patch.deposit_token_contract = (patch.deposit_token_contract as string).toLowerCase();
    }
    const { error } = await supabaseAdmin.from("system_settings").update(patch as never).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("deposits")
      .select("id, user_id, package_amount, amount, tx_hash, status, block_number, from_address, note, created_at, verified_at, profiles:profiles!inner(username, wallet_address)")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const adminRunSalary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { runWeeklySalary } = await import("./mws-engine.server");
    return runWeeklySalary();
  });

export const adminBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ title: z.string().min(1).max(120), body: z.string().max(2000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications").insert({
      user_id: null,
      type: "announcement",
      title: data.title,
      body: data.body,
    } as never);
    return { ok: true };
  });
