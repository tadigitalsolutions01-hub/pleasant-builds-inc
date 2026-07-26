// Server-only on-chain USDT (BEP20) deposit verification.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

const BSC_RPC = "https://bsc-dataseed.binance.org";
// ERC20 Transfer(address,address,uint256) signature
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ALLOWED_PACKAGES = [10, 20, 40, 80, 160, 320, 640, 1280, 2560];

type Settings = {
  demo_deposit_mode: boolean;
  deposit_wallet_address: string | null;
  deposit_min_confirmations: number;
  deposit_token_contract: string;
  maintenance_mode: boolean;
};

async function rpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} failed: ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`RPC ${method} error: ${json.error.message}`);
  return json.result as T;
}

function hexToBigInt(hex: string | null | undefined): bigint {
  if (!hex) return 0n;
  return BigInt(hex);
}

function topicToAddress(topic: string): string {
  return ("0x" + topic.slice(-40)).toLowerCase();
}

async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .select("demo_deposit_mode, deposit_wallet_address, deposit_min_confirmations, deposit_token_contract, maintenance_mode")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);
  return data as Settings;
}

export async function submitOnChainDeposit(
  userId: string,
  input: { txHash: string; packageAmount: number },
) {
  const settings = await getSettings();
  if (settings.maintenance_mode) throw new Error("Maintenance mode enabled.");
  if (!ALLOWED_PACKAGES.includes(input.packageAmount)) throw new Error("Invalid package amount.");
  if (!settings.deposit_wallet_address) throw new Error("Deposit wallet not configured. Contact admin.");
  if (!/^0x[0-9a-fA-F]{64}$/.test(input.txHash)) throw new Error("Invalid transaction hash.");

  const txHash = input.txHash.toLowerCase();

  // Reject duplicate immediately
  const { data: existing } = await supabaseAdmin
    .from("deposits")
    .select("id, status")
    .eq("tx_hash", txHash)
    .maybeSingle();
  if (existing) throw new Error("This transaction has already been submitted.");

  // Insert pending record so double-submits race safely
  const { error: insErr } = await supabaseAdmin.from("deposits").insert({
    user_id: userId,
    package_amount: input.packageAmount,
    amount: input.packageAmount,
    tx_hash: txHash,
    status: "pending",
  } as never);
  if (insErr) throw new Error(insErr.message);

  const uname = await getUsernameLabel(userId);
  await notifyAdmins(
    "deposit_detected",
    `New on-chain deposit detected — $${input.packageAmount}`,
    `${uname} submitted tx ${txHash.slice(0, 10)}…${txHash.slice(-6)} for verification.`,
  );

  try {
    const [receipt, latestHex] = await Promise.all([
      rpc<{
        status: string;
        blockNumber: string;
        from: string;
        to: string;
        logs: Array<{ address: string; topics: string[]; data: string }>;
      } | null>("eth_getTransactionReceipt", [txHash]),
      rpc<string>("eth_blockNumber", []),
    ]);

    if (!receipt) throw new Error("Transaction not found yet. Try again in a minute.");
    if (receipt.status !== "0x1") throw new Error("Transaction failed on-chain.");

    const confirmations = Number(hexToBigInt(latestHex) - hexToBigInt(receipt.blockNumber));
    if (confirmations < settings.deposit_min_confirmations) {
      throw new Error(
        `Only ${confirmations} confirmations — need ${settings.deposit_min_confirmations}. Try again in a few minutes.`,
      );
    }

    const tokenAddr = settings.deposit_token_contract.toLowerCase();
    const receiveAddr = settings.deposit_wallet_address.toLowerCase();

    const transfer = receipt.logs.find(
      (l) =>
        l.address.toLowerCase() === tokenAddr &&
        l.topics[0]?.toLowerCase() === TRANSFER_TOPIC &&
        topicToAddress(l.topics[2] ?? "") === receiveAddr,
    );
    if (!transfer) throw new Error("No USDT (BEP20) transfer to deposit wallet found in this transaction.");

    const fromAddr = topicToAddress(transfer.topics[1] ?? "");
    // USDT BEP20 has 18 decimals (unlike USDT on Ethereum)
    const rawValue = hexToBigInt(transfer.data);
    const value = Number(rawValue) / 1e18;
    const expected = input.packageAmount;
    if (Math.abs(value - expected) > 0.0001) {
      throw new Error(`Amount mismatch: on-chain ${value} USDT vs package $${expected}.`);
    }

    // All checks passed — activate package
    const { activatePackage } = await import("./mws-engine.server");
    const activation = await activatePackage(userId, expected);

    await supabaseAdmin
      .from("deposits")
      .update({
        status: "verified",
        from_address: fromAddr,
        to_address: receiveAddr,
        block_number: Number(hexToBigInt(receipt.blockNumber)),
        investment_id: activation.investmentId,
        verified_at: new Date().toISOString(),
      })
      .eq("tx_hash", txHash);

    return { ok: true, investmentId: activation.investmentId, amount: expected };
  } catch (err) {
    await supabaseAdmin
      .from("deposits")
      .update({ status: "rejected", note: err instanceof Error ? err.message : String(err) })
      .eq("tx_hash", txHash);
    throw err;
  }
}
