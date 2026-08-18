// Server-only: automatic USDT (BEP20) payouts from the platform hot wallet on BSC.
const BSC_RPC = "https://bsc-dataseed.binance.org";
const BSC_CHAIN_ID = 56;

type PayoutResult = { txHash: string };

function encodeTransfer(to: string, amount: number): string {
  const selector = "a9059cbb";
  const addr = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  // USDT on BEP20 has 18 decimals; go through 6-decimal integers to avoid float drift.
  const units = (BigInt(Math.round(amount * 1e6)) * 10n ** 12n).toString(16).padStart(64, "0");
  return `0x${selector}${addr}${units}`;
}

/**
 * Sends `amount` USDT to `to` from the treasury hot wallet.
 * Requires TREASURY_PRIVATE_KEY (BSC wallet funded with USDT + BNB for gas).
 */
export async function sendUsdtPayout(input: { to: string; amount: number; token: string }): Promise<PayoutResult> {
  const pk = process.env["TREASURY_PRIVATE_KEY"];
  if (!pk) throw new Error("Hot wallet is not configured (TREASURY_PRIVATE_KEY missing).");
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.to)) throw new Error("Invalid destination wallet.");
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.token)) throw new Error("Invalid USDT contract address.");
  if (!(input.amount > 0)) throw new Error("Invalid payout amount.");

  const { JsonRpcProvider, Wallet, Contract } = await import("ethers");
  const provider = new JsonRpcProvider(BSC_RPC, BSC_CHAIN_ID);
  const wallet = new Wallet(pk.startsWith("0x") ? pk : `0x${pk}`, provider);

  const erc20 = new Contract(
    input.token,
    ["function balanceOf(address) view returns (uint256)", "function transfer(address,uint256) returns (bool)"],
    wallet,
  );

  const units = BigInt(Math.round(input.amount * 1e6)) * 10n ** 12n;
  const balance: bigint = await erc20.balanceOf!(wallet.address);
  if (balance < units) throw new Error("Treasury USDT balance is insufficient for this payout.");

  const gas = await provider.getBalance(wallet.address);
  if (gas === 0n) throw new Error("Treasury wallet has no BNB for gas.");

  const tx = await wallet.sendTransaction({
    to: input.token,
    data: encodeTransfer(input.to, input.amount),
    chainId: BSC_CHAIN_ID,
  });
  await tx.wait(1);
  return { txHash: tx.hash };
}
