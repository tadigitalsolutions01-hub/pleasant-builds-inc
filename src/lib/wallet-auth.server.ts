// Server-only helpers for wallet-signature authentication. Never import from client.
import { verifyMessage } from "ethers";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const NONCE_TTL_MINUTES = 5;

export function loginMessage(nonce: string) {
  return `Meta Word Space login\n\nNonce: ${nonce}`;
}

export function walletEmail(address: string) {
  return `${address.toLowerCase()}@wallet.meta-world-space.app`;
}

function makeNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function makeSponsorCode() {
  // Short readable code, uppercase base32-ish
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "MWS-";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function createNonce(address: string) {
  const wallet = address.toLowerCase();
  const nonce = makeNonce();
  const expires = new Date(Date.now() + NONCE_TTL_MINUTES * 60_000).toISOString();
  const { error } = await supabaseAdmin
    .from("auth_nonces")
    .insert({ wallet_address: wallet, nonce, expires_at: expires });
  if (error) throw new Error(error.message);
  return { nonce, message: loginMessage(nonce) };
}

export async function consumeAndVerifySignature(address: string, signature: string) {
  const wallet = address.toLowerCase();
  // Fetch newest unexpired nonce for this wallet
  const { data: rows, error } = await supabaseAdmin
    .from("auth_nonces")
    .select("nonce, expires_at")
    .eq("wallet_address", wallet)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  if (!rows?.length) throw new Error("Nonce expired or missing. Please request a new signature.");

  let matched: string | null = null;
  for (const r of rows) {
    try {
      const recovered = verifyMessage(loginMessage(r.nonce), signature);
      if (recovered.toLowerCase() === wallet) {
        matched = r.nonce;
        break;
      }
    } catch {
      // continue
    }
  }
  if (!matched) throw new Error("Signature verification failed.");

  await supabaseAdmin.from("auth_nonces").delete().eq("wallet_address", wallet).eq("nonce", matched);
  return { wallet };
}

export async function mintSessionForEmail(email: string) {
  // generateLink returns a hashed token the browser can consume with verifyOtp
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw new Error(error.message);
  const tokenHash =
    (data as unknown as { properties?: { hashed_token?: string } }).properties?.hashed_token;
  if (!tokenHash) throw new Error("Failed to mint session token.");
  return { email, tokenHash };
}

export async function findProfileByWallet(wallet: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, wallet_address, username, sponsor_code")
    .eq("wallet_address", wallet.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function findProfileBySponsorCode(code: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, sponsor_code, username")
    .eq("sponsor_code", code.toUpperCase().trim())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function registerNewWallet(params: {
  wallet: string;
  sponsorCode: string;
}) {
  const wallet = params.wallet.toLowerCase();
  const email = walletEmail(wallet);

  // Resolve sponsor
  let sponsorId: string | null = null;
  const sponsor = await findProfileBySponsorCode(params.sponsorCode);
  if (sponsor) sponsorId = sponsor.id;
  // If sponsor code isn't found and there are no users yet, allow (first user)
  const { count: existingCount } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (!sponsor && (existingCount ?? 0) > 0) {
    throw new Error("Invalid sponsor code.");
  }

  // Create auth user
  const password = crypto.randomUUID() + crypto.randomUUID();
  const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { wallet_address: wallet },
  });
  if (cErr || !created?.user) throw new Error(cErr?.message || "Failed to create user");

  const userId = created.user.id;
  const username = "Astronaut_" + wallet.slice(2, 8).toUpperCase();
  let sponsorCode = makeSponsorCode();
  // ensure uniqueness (few tries)
  for (let i = 0; i < 5; i++) {
    const { data: exists } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("sponsor_code", sponsorCode)
      .maybeSingle();
    if (!exists) break;
    sponsorCode = makeSponsorCode();
  }

  const { error: pErr } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    wallet_address: wallet,
    username,
    sponsor_id: sponsorId,
    sponsor_code: sponsorCode,
  });
  if (pErr) {
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    throw new Error(pErr.message);
  }

  // Auto-admin the first user
  const { count: roleCount } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true });
  if ((roleCount ?? 0) === 0) {
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
  } else {
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "user" });
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    type: "welcome",
    title: "Account successfully created",
    body: "Welcome to Meta Word Space. Your grid identity is online.",
  });

  return { userId, email, username, sponsorCode };
}
