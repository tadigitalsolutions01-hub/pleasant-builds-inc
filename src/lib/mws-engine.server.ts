// Server-only business logic. Never import from client.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ALLOWED_PACKAGES = [10, 20, 40, 80, 160, 320, 640, 1280, 2560];

type Settings = {
  daily_pct: number;
  l1_pct: number;
  l2_pct: number;
  l3_pct: number;
  min_directs_for_all_levels: number;
  capital_lock_days: number;
  claim_interval_hours: number;
  maintenance_mode: boolean;
};

async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin.from("system_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data as Settings;
}

async function notify(userId: string, type: string, title: string, body?: string) {
  await supabaseAdmin.from("notifications").insert({ user_id: userId, type, title, body } as never);
}

async function notifyAdmins(type: string, title: string, body?: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
  const ids = Array.from(new Set((data ?? []).map((r) => r.user_id))).filter(Boolean);
  if (!ids.length) return;
  await supabaseAdmin
    .from("notifications")
    .insert(ids.map((user_id) => ({ user_id, type, title, body })) as never);
}

async function getUsernameLabel(userId: string) {
  const { data } = await supabaseAdmin.from("profiles").select("username").eq("id", userId).maybeSingle();
  return data?.username ?? userId.slice(0, 8);
}

async function getSponsorChain(userId: string, depth: number) {
  const chain: string[] = [];
  let currentId: string | null = userId;
  for (let i = 0; i < depth; i++) {
    const { data }: { data: { sponsor_id: string | null } | null } = await supabaseAdmin
      .from("profiles")
      .select("sponsor_id")
      .eq("id", currentId!)
      .maybeSingle();
    if (!data?.sponsor_id) break;
    chain.push(data.sponsor_id);
    currentId = data.sponsor_id;
  }
  return chain;
}

async function directCountFor(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("sponsor_id", userId);
  return count ?? 0;
}

export async function activatePackage(userId: string, amount: number) {
  if (!ALLOWED_PACKAGES.includes(amount)) throw new Error("Invalid package amount.");
  const settings = await getSettings();
  if (settings.maintenance_mode) throw new Error("Maintenance mode enabled.");

  const capAmount = amount * 2;

  const { data: inv, error: invErr } = await supabaseAdmin
    .from("investments")
    .insert({ user_id: userId, amount, cap_amount: capAmount } as never)
    .select("id")
    .single();
  if (invErr) throw new Error(invErr.message);

  const unlockAt = new Date(Date.now() + settings.capital_lock_days * 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin.from("capital_locks").insert({
    investment_id: inv.id,
    user_id: userId,
    unlock_at: unlockAt,
  } as never);

  await supabaseAdmin.from("ledger_entries").insert([
    { user_id: userId, kind: "deposit", amount, ref_investment_id: inv.id, meta: { note: "Package deposit" } },
    { user_id: userId, kind: "package_activation", amount: 0, ref_investment_id: inv.id, meta: { activated: amount } },
  ] as never);

  await notify(userId, "package_activated", `Package $${amount} activated`, "AI robot is processing your investment.");

  // Referral commissions up 3 levels
  const chain = await getSponsorChain(userId, 3);
  const pcts = [settings.l1_pct, settings.l2_pct, settings.l3_pct];
  for (let i = 0; i < chain.length; i++) {
    const sponsorId = chain[i];
    const directs = await directCountFor(sponsorId);
    // Level 1 always paid; L2/L3 require min_directs_for_all_levels
    if (i > 0 && directs < settings.min_directs_for_all_levels) continue;
    const commAmount = Number(((amount * Number(pcts[i])) / 100).toFixed(4));
    if (commAmount <= 0) continue;
    const kind = i === 0 ? "direct_commission" : "level_commission";
    await supabaseAdmin.from("ledger_entries").insert({
      user_id: sponsorId,
      kind,
      amount: commAmount,
      ref_investment_id: inv.id,
      ref_user_id: userId,
      meta: { level: i + 1, source_amount: amount },
    } as never);
    await notify(
      sponsorId,
      "commission",
      `${i === 0 ? "Direct" : `Level ${i + 1}`} commission +$${commAmount}`,
      `From partner activation of $${amount}.`,
    );
  }

  return { investmentId: inv.id };
}

export async function claimDaily(userId: string) {
  const settings = await getSettings();
  if (settings.maintenance_mode) throw new Error("Maintenance mode enabled.");
  const intervalMs = settings.claim_interval_hours * 60 * 60 * 1000;

  const { data: claimRow } = await supabaseAdmin
    .from("claim_state")
    .select("last_claim_at")
    .eq("user_id", userId)
    .maybeSingle();

  const now = Date.now();
  const last = claimRow?.last_claim_at ? new Date(claimRow.last_claim_at).getTime() : 0;
  const { data: firstInv } = await supabaseAdmin
    .from("investments")
    .select("activated_at")
    .eq("user_id", userId)
    .order("activated_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const baseline = last || (firstInv ? new Date(firstInv.activated_at).getTime() : now);
  const elapsed = now - baseline;
  const cycles = elapsed >= intervalMs ? 1 : 0;
  if (cycles < 1) {
    const nextAt = new Date(baseline + intervalMs).toISOString();
    throw new Error(`Next claim available at ${nextAt}`);
  }

  // Load active investments
  const { data: invs, error: invErr } = await supabaseAdmin
    .from("investments")
    .select("id, amount, cap_amount, earned_passive, status")
    .eq("user_id", userId)
    .eq("status", "active");
  if (invErr) throw new Error(invErr.message);
  if (!invs?.length) throw new Error("No active investment.");

  const dailyRate = Number(settings.daily_pct) / 100;
  let totalCredited = 0;
  const ledgerRows: Array<{
    user_id: string;
    kind: "passive";
    amount: number;
    ref_investment_id: string;
    meta: Record<string, unknown>;
  }> = [];

  for (const inv of invs) {
    const remaining = Number(inv.cap_amount) - Number(inv.earned_passive);
    if (remaining <= 0) {
      await supabaseAdmin.from("investments").update({ status: "capped" }).eq("id", inv.id);
      continue;
    }
    const gross = Number(inv.amount) * dailyRate;
    const credit = Number(Math.min(gross, remaining).toFixed(4));
    if (credit <= 0) continue;
    totalCredited += credit;
    const newEarned = Number((Number(inv.earned_passive) + credit).toFixed(4));
    const capped = newEarned >= Number(inv.cap_amount);
    await supabaseAdmin
      .from("investments")
      .update({ earned_passive: newEarned, status: capped ? "capped" : "active" })
      .eq("id", inv.id);
    ledgerRows.push({
      user_id: userId,
      kind: "passive",
      amount: credit,
      ref_investment_id: inv.id,
      meta: { cycles, daily_pct: settings.daily_pct },
    });
  }

  if (!ledgerRows.length) throw new Error("All investments have reached their 2× limit.");

  await supabaseAdmin.from("ledger_entries").insert(ledgerRows as never);
  await supabaseAdmin
    .from("claim_state")
    .upsert({ user_id: userId, last_claim_at: new Date(now).toISOString() });
  await notify(userId, "claim", `Claimed $${totalCredited.toFixed(4)}`, `AI robot yield credited.`);

  return { credited: totalCredited, cycles };
}

export async function claimStatus(userId: string) {
  const settings = await getSettings();
  const intervalMs = settings.claim_interval_hours * 60 * 60 * 1000;
  const { data: claimRow } = await supabaseAdmin
    .from("claim_state")
    .select("last_claim_at")
    .eq("user_id", userId)
    .maybeSingle();
  const { data: firstInv } = await supabaseAdmin
    .from("investments")
    .select("activated_at")
    .eq("user_id", userId)
    .order("activated_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const last = claimRow?.last_claim_at ? new Date(claimRow.last_claim_at).getTime() : 0;
  const baseline = last || (firstInv ? new Date(firstInv.activated_at).getTime() : Date.now());
  const nextAt = baseline + intervalMs;
  return {
    daily_pct: Number(settings.daily_pct),
    intervalMs,
    nextAtIso: new Date(nextAt).toISOString(),
    hasInvestment: !!firstInv,
  };
}

async function availableIncome(userId: string) {
  const { data } = await supabaseAdmin
    .from("ledger_entries")
    .select("kind, amount")
    .eq("user_id", userId);
  let credit = 0;
  let hold = 0;
  for (const r of data ?? []) {
    const amt = Number(r.amount);
    if (["passive", "direct_commission", "level_commission", "salary"].includes(r.kind)) credit += amt;
    if (r.kind === "withdrawal_hold") hold += amt;
    if (r.kind === "withdrawal_refund") credit += amt;
  }
  return Math.max(0, credit - hold);
}

export async function requestWithdrawal(
  userId: string,
  input: { kind: "income" | "capital"; amount: number; wallet: string },
) {
  const settings = await getSettings();
  if (settings.maintenance_mode) throw new Error("Maintenance mode enabled.");
  if (input.amount <= 0) throw new Error("Amount must be positive.");
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.wallet)) throw new Error("Invalid wallet address.");

  if (input.kind === "income") {
    const avail = await availableIncome(userId);
    if (input.amount > avail) throw new Error(`Insufficient balance. Available $${avail.toFixed(2)}.`);
    const { error } = await supabaseAdmin.from("withdrawals").insert({
      user_id: userId,
      kind: "income",
      amount: input.amount,
      wallet_address: input.wallet.toLowerCase(),
    } as never);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("ledger_entries").insert({
      user_id: userId,
      kind: "withdrawal_hold",
      amount: input.amount,
      meta: { wallet: input.wallet.toLowerCase() },
    } as never);
    await notify(userId, "withdrawal", `Withdrawal request submitted`, `$${input.amount.toFixed(2)} pending admin approval.`);
    const uname = await getUsernameLabel(userId);
    await notifyAdmins(
      "admin_withdrawal",
      `New withdrawal request · $${input.amount.toFixed(2)}`,
      `${uname} requested an income withdrawal to ${input.wallet.toLowerCase()}.`,
    );
    return { ok: true };
  }

  // Capital: only unlocked investments count
  const { data: locks } = await supabaseAdmin
    .from("capital_locks")
    .select("investment_id, unlocked_at, unlock_at, investments!inner(amount)")
    .eq("user_id", userId);
  const unlocked = (locks ?? []).filter((l: unknown) => {
    const row = l as { unlocked_at: string | null; unlock_at: string };
    return !!row.unlocked_at || new Date(row.unlock_at).getTime() <= Date.now();
  });
  const totalUnlocked = unlocked.reduce(
    (s: number, l) => s + Number((l as { investments: { amount: number } }).investments.amount),
    0,
  );
  if (input.amount > totalUnlocked) throw new Error(`Only $${totalUnlocked.toFixed(2)} unlocked.`);
  const { error } = await supabaseAdmin.from("withdrawals").insert({
    user_id: userId,
    kind: "capital",
    amount: input.amount,
    wallet_address: input.wallet.toLowerCase(),
  } as never);
  if (error) throw new Error(error.message);
  await notify(userId, "withdrawal", `Capital withdrawal request submitted`, `$${input.amount.toFixed(2)} pending admin approval.`);
  const uname = await getUsernameLabel(userId);
  await notifyAdmins(
    "admin_withdrawal",
    `New capital withdrawal · $${input.amount.toFixed(2)}`,
    `${uname} requested a capital withdrawal to ${input.wallet.toLowerCase()}.`,
  );
  return { ok: true };
}

export async function reviewWithdrawal(
  adminId: string,
  input: { id: string; action: "approve" | "reject"; note?: string },
) {
  const { data: wd, error: fErr } = await supabaseAdmin
    .from("withdrawals")
    .select("*")
    .eq("id", input.id)
    .single();
  if (fErr || !wd) throw new Error(fErr?.message || "Not found");
  if (wd.status !== "pending") throw new Error("Already reviewed.");

  const newStatus = input.action === "approve" ? "approved" : "rejected";
  await supabaseAdmin
    .from("withdrawals")
    .update({ status: newStatus, reviewed_by: adminId, reviewed_at: new Date().toISOString(), note: input.note })
    .eq("id", input.id);

  if (wd.kind === "income") {
    if (input.action === "reject") {
      await supabaseAdmin.from("ledger_entries").insert({
        user_id: wd.user_id,
        kind: "withdrawal_refund",
        amount: Number(wd.amount),
        meta: { withdrawal_id: wd.id },
      } as never);
    }
  } else if (wd.kind === "capital" && input.action === "approve") {
    await supabaseAdmin.from("ledger_entries").insert({
      user_id: wd.user_id,
      kind: "capital_withdrawal",
      amount: Number(wd.amount),
      meta: { withdrawal_id: wd.id },
    } as never);
  }

  await notify(
    wd.user_id,
    "withdrawal",
    `Withdrawal ${newStatus}`,
    `$${Number(wd.amount).toFixed(2)} ${wd.kind} withdrawal ${newStatus}.`,
  );
  const uname = await getUsernameLabel(wd.user_id);
  await notifyAdmins(
    "admin_withdrawal",
    `Withdrawal ${newStatus} · $${Number(wd.amount).toFixed(2)}`,
    `${uname}'s ${wd.kind} withdrawal was ${newStatus}${input.note ? ` — ${input.note}` : ""}.`,
  );
  return { ok: true };
}

export async function unlockCapital(adminId: string, investmentId: string) {
  const { data: lock } = await supabaseAdmin
    .from("capital_locks")
    .select("user_id")
    .eq("investment_id", investmentId)
    .single();
  if (!lock) throw new Error("Lock not found");
  await supabaseAdmin
    .from("capital_locks")
    .update({ unlocked_at: new Date().toISOString(), unlocked_by: adminId })
    .eq("investment_id", investmentId);
  await notify(lock.user_id, "capital", "Capital unlocked", "You can now withdraw your unlocked capital.");
  return { ok: true };
}

function isoWeekStart(d: Date) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

export async function runWeeklySalary() {
  const weekStart = isoWeekStart(new Date());
  const { data: levels } = await supabaseAdmin
    .from("salary_levels")
    .select("*")
    .eq("active", true)
    .order("level", { ascending: true });
  const { data: users } = await supabaseAdmin.from("profiles").select("id");
  if (!levels?.length || !users?.length) return { paid: 0 };

  let paid = 0;
  for (const u of users) {
    const stats = await supabaseAdmin.rpc("get_user_stats", { _user_id: u.id });
    const s = stats.data?.[0];
    if (!s) continue;
    // total_investment is self
    const self = Number(s.total_investment);
    const directs = Number(s.direct_partners);
    const team = Number(s.total_team);
    // Sum team investment via lightweight query
    const { data: teamInvRows } = await supabaseAdmin.rpc("get_team_by_level", {
      _user_id: u.id,
      _level: 10,
    });
    // get_team_by_level returns only exact level rows; sum across all levels 1..10
    let teamInvest = 0;
    for (let lv = 1; lv <= 10; lv++) {
      const { data: rows } = await supabaseAdmin.rpc("get_team_by_level", {
        _user_id: u.id,
        _level: lv,
      });
      for (const r of rows ?? []) teamInvest += Number((r as { investment: number }).investment);
    }
    void teamInvRows;

    // Pay highest qualifying level only
    let bestLevel: (typeof levels)[number] | null = null;
    for (const lv of levels) {
      if (
        self >= Number(lv.self_invest_min) &&
        directs >= lv.direct_min &&
        team >= lv.team_min &&
        teamInvest >= Number(lv.team_invest_min)
      ) {
        bestLevel = lv;
      }
    }
    if (!bestLevel) continue;

    const { error: payErr } = await supabaseAdmin.from("salary_payouts").insert({
      user_id: u.id,
      level: bestLevel.level,
      week_start: weekStart,
      amount: bestLevel.weekly_amount,
    } as never);
    if (payErr) continue; // duplicate for the week
    await supabaseAdmin.from("ledger_entries").insert({
      user_id: u.id,
      kind: "salary",
      amount: Number(bestLevel.weekly_amount),
      meta: { level: bestLevel.level, week_start: weekStart },
    } as never);
    await notify(
      u.id,
      "salary",
      `Weekly salary L${bestLevel.level} +$${Number(bestLevel.weekly_amount).toFixed(2)}`,
      `Week of ${weekStart}.`,
    );
    paid++;
  }
  return { paid };
}
