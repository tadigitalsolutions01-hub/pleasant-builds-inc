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
