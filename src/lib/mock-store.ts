// Simple client-only mock store for the Meta World Space demo.
// Persists to localStorage. No real Web3 / backend.

export type Wallet = "MetaMask" | "WalletConnect" | "Trust Wallet" | "Coinbase";

export type Activity = {
  id: string;
  type:
    | "Deposit"
    | "Withdrawal"
    | "Team Income"
    | "Passive Income"
    | "Salary"
    | "Package Activation"
    | "Reinvestment"
    | "Claim";
  amount: number;
  at: string; // iso
  note?: string;
};

export type UserData = {
  wallet: string;
  walletProvider: Wallet;
  username: string;
  sponsorId: string;
  joinedAt: string;
  avatarSeed: string;
  currentPackage: number;
  totalInvestment: number;
  totalEarnings: number;
  last24hEarnings: number;
  totalTeam: number;
  directPartners: number;
  passiveIncome: number;
  teamIncome: number;
  salaryEarnings: number;
  currentLevel: number;
  salaryLevel: number;
  capitalUnlocked: boolean;
  capitalLockedUntil: string;
  lastClaimAt: string;
  totalClaimed: number;
  activities: Activity[];
};

const KEY = "mws.user.v1";

function shortWallet(w: string) {
  return w.slice(0, 6) + "..." + w.slice(-4);
}

function randomWallet() {
  const hex = "0123456789abcdef";
  let s = "0x";
  for (let i = 0; i < 40; i++) s += hex[Math.floor(Math.random() * 16)];
  return s;
}

export function getUser(): UserData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserData) : null;
  } catch {
    return null;
  }
}

export function saveUser(u: UserData) {
  localStorage.setItem(KEY, JSON.stringify(u));
  window.dispatchEvent(new Event("mws:user"));
}

export function clearUser() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("mws:user"));
}

export function createUser(opts: {
  provider: Wallet;
  sponsorId: string;
  wallet?: string;
}): UserData {
  const wallet = opts.wallet ?? randomWallet();
  const now = new Date();
  const lockUntil = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 180);
  const u: UserData = {
    wallet,
    walletProvider: opts.provider,
    username: "Astronaut_" + shortWallet(wallet).replace(/\W/g, ""),
    sponsorId: opts.sponsorId || "MWS-GENESIS",
    joinedAt: now.toISOString(),
    avatarSeed: wallet,
    currentPackage: 80,
    totalInvestment: 80,
    totalEarnings: 12.4,
    last24hEarnings: 1.6,
    totalTeam: 14,
    directPartners: 4,
    passiveIncome: 8.2,
    teamIncome: 3.1,
    salaryEarnings: 1.1,
    currentLevel: 2,
    salaryLevel: 1,
    capitalUnlocked: false,
    capitalLockedUntil: lockUntil.toISOString(),
    lastClaimAt: new Date(now.getTime() - 1000 * 60 * 60 * 23).toISOString(),
    totalClaimed: 6.8,
    activities: seedActivities(),
  };
  saveUser(u);
  return u;
}

function seedActivities(): Activity[] {
  const now = Date.now();
  const items: Activity[] = [
    { id: "a1", type: "Package Activation", amount: 80, at: new Date(now - 1000 * 60 * 60 * 26).toISOString(), note: "Package $80 activated" },
    { id: "a2", type: "Deposit", amount: 80, at: new Date(now - 1000 * 60 * 60 * 26).toISOString() },
    { id: "a3", type: "Passive Income", amount: 1.2, at: new Date(now - 1000 * 60 * 60 * 20).toISOString() },
    { id: "a4", type: "Team Income", amount: 0.6, at: new Date(now - 1000 * 60 * 60 * 12).toISOString(), note: "L1 partner activation" },
    { id: "a5", type: "Claim", amount: 1.4, at: new Date(now - 1000 * 60 * 60 * 8).toISOString() },
    { id: "a6", type: "Salary", amount: 3, at: new Date(now - 1000 * 60 * 60 * 4).toISOString(), note: "Weekly salary L1" },
  ];
  return items;
}

export function addActivity(a: Omit<Activity, "id" | "at"> & { at?: string }) {
  const u = getUser();
  if (!u) return;
  const entry: Activity = {
    id: Math.random().toString(36).slice(2),
    at: a.at ?? new Date().toISOString(),
    ...a,
  };
  u.activities = [entry, ...u.activities].slice(0, 100);
  saveUser(u);
}

export const PACKAGES = [10, 20, 40, 80, 160, 320, 640, 1280, 2560];

export function packageDaily(amount: number, pctPerDay = 1.5) {
  return +(amount * (pctPerDay / 100)).toFixed(4);
}
