
# Meta Word Space — Production Rebuild Plan

Scope: full rebuild off the localStorage demo. Everything from schema → auth → ledgers → admin ships in this pass. Given size, expect a few follow-up iterations to polish UX after the first build boots green.

## 1. Backend (Lovable Cloud / Supabase)

Enable Lovable Cloud, then one migration creates the whole schema with grants + RLS.

Tables (all `public`):

- `profiles` — id (auth.users FK), wallet_address (unique, lowercased), username, avatar_url, sponsor_id (FK profiles.id, nullable), sponsor_code (unique short code), joined_at
- `user_roles` — (user_id, role enum `admin`/`user`) via `has_role()` security-definer (never on profiles)
- `auth_nonces` — wallet_address, nonce, expires_at (for signature login)
- `packages` — id, amount (numeric), daily_pct_override (nullable), is_active
- `investments` — id, user_id, amount, activated_at, cap_amount (2× amount), earned_passive (running), status (`active`/`capped`)
- `ledger_entries` — id, user_id, kind (`deposit`/`passive`/`direct_commission`/`level_commission`/`salary`/`claim_debit`/`withdrawal_debit`/`capital_withdrawal`/`reinvest`/`package_activation`), amount, ref_investment_id, ref_user_id, created_at, meta jsonb
- `claim_state` — user_id (PK), last_claim_at
- `withdrawals` — id, user_id, kind (`income`/`capital`), amount, wallet_address, status (`pending`/`approved`/`rejected`), reviewed_by, created_at
- `capital_locks` — investment_id (PK), unlock_at (activation + 6mo), unlocked_early_by (admin), unlocked_at
- `notifications` — id, user_id, type, title, body, read_at, created_at
- `system_settings` — singleton: daily_pct, l1_pct=15, l2_pct=10, l3_pct=7, min_directs_for_all_levels=3, maintenance_mode, announcement
- `salary_levels` — level, self_invest_min, direct_min, team_min, team_invest_min, weekly_amount, active
- `salary_payouts` — id, user_id, level, week_start, amount, paid_at (unique user_id+week_start+level)

Grants: `authenticated` gets SELECT/INSERT/UPDATE/DELETE per RLS, `service_role` gets ALL. `anon` only on `system_settings` (public announcement/maintenance).

RLS: users see only own rows for profiles/investments/ledger/withdrawals/notifications/claim_state. Admins (via `has_role`) can read/update all. All writes that affect money go through server functions with service role — client `INSERT` is forbidden on ledgers, investments, withdrawals-approval, etc.

Dashboard aggregates are computed via SQL views/RPCs (`get_user_stats`, `get_team_by_level`, `get_recent_activities`) so the frontend never trusts client math.

## 2. Wallet signature auth (real)

Client flow (`/auth`):
1. Connect wallet via `wagmi` + `@web3modal/wagmi` (MetaMask, WalletConnect, Coinbase, Trust via WC).
2. Client calls server fn `requestNonce({address})` → inserts `auth_nonces` row, returns nonce string.
3. User signs `"Meta Word Space login\n\nNonce: <n>"` with wallet.
4. Client calls server fn `verifyWalletSignature({address, signature})`:
   - Verifies with `ethers.verifyMessage`, ensures nonce fresh & unused, deletes it.
   - If profile exists → mints Supabase session (admin API `generateLink` / `signInWithPassword` using deterministic per-wallet email + service-role-set password stored server-side) → returns session.
   - If not → returns `{ needsRegistration: true }`. Client shows sponsor input → calls `registerWallet({address, signature, sponsorCode})` which creates auth user + profile with sponsor link, then returns session.
5. Client `supabase.auth.setSession(...)`.

Server-only helpers live in `src/lib/wallet-auth.server.ts`; server fns in `src/lib/wallet-auth.functions.ts` (thin wrappers, admin import inside handler).

Admin bootstrap: since no wallet was chosen, the first successfully registered wallet is auto-granted `admin` role (checked inside `registerWallet` — if `user_roles` empty, insert admin). Documented in a starter notification.

## 3. Money engines (all server-side)

- `activatePackage({amount})` — validates amount in allowed set, inserts `investments` + `capital_locks` + `ledger_entries(package_activation, deposit)`, triggers commissions:
  - Direct sponsor: 15% (or admin-configured L1) as `direct_commission` credited to sponsor + notification.
  - L2 sponsor: 10%, L3: 7%. If uplines have <3 directs, fall through per admin rule (skip level).
  - Each commission written as its own ledger row with `ref_user_id` and notification.
- `claimDaily()` — reads `claim_state`, computes full 24h cycles elapsed, sums `daily_pct × sum(active investments.amount)` capped by remaining `cap_amount - earned_passive` per investment; writes `passive` ledger row(s) + updates `investments.earned_passive`, flips status to `capped` when hit; updates `claim_state.last_claim_at`; notification.
- `requestWithdrawal({kind, amount, wallet})` — validates available balance from ledger view, inserts pending row + `withdrawal_debit` HOLD ledger reversible on rejection.
- Admin `reviewWithdrawal({id, action})` — approves/rejects; on reject, reverses hold.
- Admin `unlockCapital({investmentId})` — sets `capital_locks.unlocked_at`.
- `runWeeklySalary()` — admin-triggered (also usable via pg_cron later): for each active salary level a user qualifies for this ISO week (checks self invest, direct count, team count via recursive CTE on sponsor tree, team invest sum), inserts `salary_payouts` (unique constraint dedupes) + ledger + notification.

Balance view: `available_income = sum(passive) + sum(direct_commission) + sum(level_commission) + sum(salary) − sum(withdrawal_debit approved+pending) − sum(claim_debit)`. `capital` withdrawals go against unlocked investments only.

## 4. Frontend rebuild

Remove `src/lib/mock-store.ts`, `src/hooks/use-user.ts`, and all `saveUser/addActivity/createUser` calls. Replace with:

- `src/hooks/use-profile.ts` — reads current profile via TanStack Query + server fn.
- `src/hooks/use-stats.ts`, `use-activities.ts`, `use-notifications.ts` (realtime channel subscribe to `notifications` and `ledger_entries` for current user).

Route changes:
- `/login` → replaced by `/auth` (wallet connect + sign + sponsor). Old `/login` deleted.
- `_authenticated` layout gates all `/app/*` routes; managed integration layout kept.
- `/app` (dashboard) — 3D stat cards fed from `get_user_stats` RPC (all zeros for new users, no fake numbers).
- `/app/packages` — real activation via server fn; shows current investment aggregate.
- `/app/ai-robot` — timer computed from server `claim_state`, CLAIM button calls `claimDaily`.
- `/app/team/*` — real downline query per level.
- `/app/history/*` — reads `ledger_entries` filtered by kind.
- `/app/withdrawal/*` — real request forms.
- `/app/profile` — username + avatar upload to `avatars` storage bucket (public).
- `/app/notifications` — new bell + list, realtime.
- `/admin` — new gated subtree (`_authenticated/_admin` with `has_role('admin')` check) for: users list, withdrawal queue, capital unlock, daily % + commission % settings, salary levels editor, run weekly salary, announcement/maintenance toggles, notifications broadcast.

Landing page (`/`) stays but its "Start Now" now goes to `/auth`.

## 5. Dependencies

Add: `wagmi`, `viem`, `@web3modal/wagmi`, `ethers` (verify only), `@tanstack/react-query` (already present via TSS).

WalletConnect requires a project ID (free from cloud.walletconnect.com). I'll request it as a runtime secret `VITE_WC_PROJECT_ID` (publishable — safe in client) via the secrets tool so the connect modal actually opens.

## 6. Security posture

- All money mutations behind `requireSupabaseAuth` server fns; admin-only ones additionally check `has_role`.
- RLS: SELECT-own everywhere; no client INSERT/UPDATE on `investments`, `ledger_entries`, `withdrawals.status`, `salary_payouts`, `capital_locks.unlocked_at`, `user_roles`.
- Signature nonces single-use, 5-min TTL.
- Wallet addresses normalized lowercase.
- `admin` role stored only in `user_roles`.

## 7. What's demo/placeholder that gets DELETED

`mock-store.ts`, `use-user.ts`, seeded activities, hardcoded stats in dashboard, "Astronaut_" username seed, the fake `#48214` cycle number and `+1.62% ROI` label on AI robot, the deterministic `FakeChart` numbers (chart stays as decoration but labeled "AI signal preview" without fake metrics), any hardcoded team counts.

## 8. Known limitations after this pass

- No real on-chain deposit detection. "Activate package" credits the user assuming payment happened; production would need a payment intent / on-chain listener. I'll flag this in the UI as "Admin verifies on-chain deposits" until a real payment rail is chosen.
- Weekly salary is admin-triggered until pg_cron is set up.
- No real trading; AI robot yield is the admin-set daily %.
- Withdrawals are recorded as requests; actual on-chain payout is done off-app by admin.

Confirm and I'll start with enabling Cloud + shipping the schema, auth, and rebuilt frontend in one pass.
