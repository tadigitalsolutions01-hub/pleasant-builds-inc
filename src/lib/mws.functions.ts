// Client-safe server-fn wrappers for Meta Word Space business logic.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, wallet_address, username, avatar_url, sponsor_id, sponsor_code, joined_at")
      .eq("id", context.userId)
      .single();
    if (error) throw new Error(error.message);
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (roleRows ?? []).map((r) => r.role);
    return { ...data, roles, isAdmin: roles.includes("admin") };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        username: z.string().min(2).max(40).optional(),
        avatar_url: z.string().url().optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: { username?: string; avatar_url?: string | null } = {};
    if (data.username !== undefined) patch.username = data.username;
    if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url || null;
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_user_stats", { _user_id: context.userId });
    if (error) throw new Error(error.message);
    return data?.[0] ?? null;
  });

export const getMyActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().min(1).max(200).default(30), kinds: z.array(z.string()).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("ledger_entries")
      .select("id, kind, amount, created_at, meta")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.kinds?.length) q = q.in("kind", data.kinds as never[]);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getMyInvestments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("investments")
      .select("id, amount, cap_amount, earned_passive, status, activated_at")
      .eq("user_id", context.userId)
      .order("activated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyCapitalLocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("capital_locks")
      .select("investment_id, unlock_at, unlocked_at, investments!inner(amount)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getTeamAtLevel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ level: z.number().int().min(1).max(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("get_team_by_level", {
      _user_id: context.userId,
      _level: data.level,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPackages = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.from("packages").select("id, amount, is_active").order("amount");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.from("system_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data;
});

export const activatePackageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ amount: z.number() }).parse(d))
  .handler(async ({ data, context }) => {
    const { activatePackage } = await import("./mws-engine.server");
    return activatePackage(context.userId, data.amount);
  });

export const claimDailyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { claimDaily } = await import("./mws-engine.server");
    return claimDaily(context.userId);
  });

export const claimStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { claimStatus } = await import("./mws-engine.server");
    return claimStatus(context.userId);
  });

export const requestWithdrawalFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        kind: z.enum(["income", "capital"]),
        amount: z.number().positive(),
        wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requestWithdrawal } = await import("./mws-engine.server");
    return requestWithdrawal(context.userId, data);
  });

export const getMyWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${context.userId},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });
