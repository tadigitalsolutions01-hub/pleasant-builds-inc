// Browser wallet helpers. Injected providers only (MetaMask / Trust / Coinbase / Brave).
export type WalletId = "MetaMask" | "Trust Wallet" | "Coinbase" | "WalletConnect";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isTrust?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: EthProvider[];
};

declare global {
  interface Window {
    ethereum?: EthProvider;
  }
}

export function pickProvider(id: WalletId): EthProvider | null {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const eth = window.ethereum;
  const list: EthProvider[] = eth.providers?.length ? eth.providers : [eth];
  const match = (p: EthProvider) => {
    if (id === "MetaMask") return !!p.isMetaMask && !p.isCoinbaseWallet;
    if (id === "Trust Wallet") return !!p.isTrust;
    if (id === "Coinbase") return !!p.isCoinbaseWallet;
    return false;
  };
  return list.find(match) ?? list[0] ?? null;
}

export async function connectAndSign(id: WalletId, message: string): Promise<{ address: string; signature: string }> {
  if (id === "WalletConnect") {
    throw new Error(
      "WalletConnect is not configured in this build. Please use MetaMask, Trust Wallet, or Coinbase Wallet, or install their browser extension / open the app in their in-app browser.",
    );
  }
  const provider = pickProvider(id);
  if (!provider) {
    throw new Error(
      `${id} not detected. Install the extension, or open this site inside the ${id} in-app browser.`,
    );
  }
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = (accounts?.[0] ?? "").toLowerCase();
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("Failed to read wallet address.");
  const signature = (await provider.request({
    method: "personal_sign",
    params: [message, address],
  })) as string;
  return { address, signature };
}

const BSC_CHAIN_ID = "0x38";
const BSC_PARAMS = {
  chainId: BSC_CHAIN_ID,
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc-dataseed.binance.org"],
  blockExplorerUrls: ["https://bscscan.com"],
};

function toHex(n: bigint) {
  return "0x" + n.toString(16);
}

/** ERC20 transfer(address,uint256) calldata for an 18-decimal token. */
function encodeTransfer(to: string, amount: number): string {
  const selector = "a9059cbb";
  const addr = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  // 18 decimals, avoid float drift by using integer cents math
  const units = (BigInt(Math.round(amount * 1e6)) * 10n ** 12n).toString(16).padStart(64, "0");
  return `0x${selector}${addr}${units}`;
}

async function ensureBsc(provider: EthProvider) {
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (chainId?.toLowerCase() === BSC_CHAIN_ID) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC_CHAIN_ID }] });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      await provider.request({ method: "wallet_addEthereumChain", params: [BSC_PARAMS] });
    } else {
      throw err;
    }
  }
}

/** Sends USDT (BEP20) from the user's connected wallet. Returns the tx hash. */
export async function sendUsdt(opts: { token: string; to: string; amount: number }): Promise<string> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet detected. Open this site in MetaMask / Trust Wallet, or install the extension.");
  }
  const list: EthProvider[] = window.ethereum.providers?.length ? window.ethereum.providers : [window.ethereum];
  const provider = list[0]!;
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const from = (accounts?.[0] ?? "").toLowerCase();
  if (!/^0x[0-9a-fA-F]{40}$/.test(from)) throw new Error("Failed to read wallet address.");
  if (!/^0x[0-9a-fA-F]{40}$/.test(opts.to)) throw new Error("Platform deposit wallet is not configured.");
  if (!/^0x[0-9a-fA-F]{40}$/.test(opts.token)) throw new Error("USDT contract is not configured.");
  await ensureBsc(provider);
  const hash = (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to: opts.token, data: encodeTransfer(opts.to, opts.amount), value: toHex(0n) }],
  })) as string;
  return hash;
}
