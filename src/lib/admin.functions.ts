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
    const { data } = await supabaseAdmin
      .from("withdrawals")
      .select("id, user_id, kind, amount, wallet_address, status, created_at, profiles:profiles!inner(username, wallet_address)")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const adminReviewWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
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
  .inputValidator((d: unknown) => z.object({ investmentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { unlockCapital } = await import("./mws-engine.server");
    return unlockCapital(context.userId, data.investmentId);
  });

export const adminUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        daily_pct: z.number().min(0).max(10).optional(),
        l1_pct: z.number().min(0).max(100).optional(),
        l2_pct: z.number().min(0).max(100).optional(),
        l3_pct: z.number().min(0).max(100).optional(),
        min_directs_for_all_levels: z.number().int().min(0).max(50).optional(),
        maintenance_mode: z.boolean().optional(),
        announcement: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("system_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
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
  .inputValidator((d: unknown) =>
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
    });
    return { ok: true };
  });
