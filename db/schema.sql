-- Meta World Space — full PostgreSQL schema (Supabase-compatible)
-- Generated Tue Aug 18 06:38:45 UTC 2026 — run in order on a fresh Postgres/Supabase database.
-- NOTE: This is PostgreSQL, not Microsoft SQL Server. Run with psql or the Supabase SQL editor.

-- ============================================================
-- migration: 20260725104749_14d22723-af36-4d03-9eac-52e89c5c895f.sql
-- ============================================================

-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.ledger_kind AS ENUM (
  'package_activation','deposit','passive','direct_commission','level_commission',
  'salary','claim_debit','withdrawal_hold','withdrawal_refund','capital_withdrawal','reinvest'
);
CREATE TYPE public.withdrawal_kind AS ENUM ('income','capital');
CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.investment_status AS ENUM ('active','capped');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL UNIQUE,
  username text NOT NULL,
  avatar_url text,
  sponsor_id uuid REFERENCES public.profiles(id),
  sponsor_code text NOT NULL UNIQUE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.profiles(sponsor_id);
CREATE INDEX ON public.profiles(wallet_address);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profile policies (after has_role exists)
CREATE POLICY "profiles read own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
-- Anonymous can look up minimal profile by sponsor_code (for register lookup) — we still return via server fn only.
CREATE POLICY "profiles read public sponsor code" ON public.profiles FOR SELECT TO anon USING (false);
CREATE POLICY "profiles update own username/avatar" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles admin all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "user_roles read own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ AUTH NONCES ============
CREATE TABLE public.auth_nonces (
  wallet_address text NOT NULL,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet_address, nonce)
);
GRANT ALL ON public.auth_nonces TO service_role;
ALTER TABLE public.auth_nonces ENABLE ROW LEVEL SECURITY;

-- ============ PACKAGES ============
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(20,4) NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.packages TO authenticated, anon;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages read all" ON public.packages FOR SELECT USING (true);
CREATE POLICY "packages admin write" ON public.packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ INVESTMENTS ============
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(20,4) NOT NULL,
  cap_amount numeric(20,4) NOT NULL,
  earned_passive numeric(20,4) NOT NULL DEFAULT 0,
  status public.investment_status NOT NULL DEFAULT 'active',
  activated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.investments(user_id);
GRANT SELECT ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv read own" ON public.investments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ CAPITAL LOCKS ============
CREATE TABLE public.capital_locks (
  investment_id uuid PRIMARY KEY REFERENCES public.investments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  unlock_at timestamptz NOT NULL,
  unlocked_at timestamptz,
  unlocked_by uuid
);
CREATE INDEX ON public.capital_locks(user_id);
GRANT SELECT ON public.capital_locks TO authenticated;
GRANT ALL ON public.capital_locks TO service_role;
ALTER TABLE public.capital_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locks read own" ON public.capital_locks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ LEDGER ============
CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.ledger_kind NOT NULL,
  amount numeric(20,4) NOT NULL,
  ref_investment_id uuid,
  ref_user_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ledger_entries(user_id, created_at DESC);
CREATE INDEX ON public.ledger_entries(user_id, kind);
GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger read own" ON public.ledger_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ CLAIM STATE ============
CREATE TABLE public.claim_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_claim_at timestamptz
);
GRANT SELECT ON public.claim_state TO authenticated;
GRANT ALL ON public.claim_state TO service_role;
ALTER TABLE public.claim_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claim read own" ON public.claim_state FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ WITHDRAWALS ============
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.withdrawal_kind NOT NULL,
  amount numeric(20,4) NOT NULL,
  wallet_address text NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.withdrawals(user_id, created_at DESC);
CREATE INDEX ON public.withdrawals(status);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd read own" ON public.withdrawals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- nullable = broadcast
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif read own or broadcast" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "notif mark read own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ SETTINGS ============
CREATE TABLE public.system_settings (
  id int PRIMARY KEY DEFAULT 1,
  daily_pct numeric(5,3) NOT NULL DEFAULT 1.5,
  l1_pct numeric(5,2) NOT NULL DEFAULT 15,
  l2_pct numeric(5,2) NOT NULL DEFAULT 10,
  l3_pct numeric(5,2) NOT NULL DEFAULT 7,
  min_directs_for_all_levels int NOT NULL DEFAULT 3,
  capital_lock_days int NOT NULL DEFAULT 180,
  claim_interval_hours int NOT NULL DEFAULT 24,
  maintenance_mode boolean NOT NULL DEFAULT false,
  announcement text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id = 1)
);
GRANT SELECT ON public.system_settings TO authenticated, anon;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read all" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SALARY ============
CREATE TABLE public.salary_levels (
  level int PRIMARY KEY,
  self_invest_min numeric(20,4) NOT NULL,
  direct_min int NOT NULL,
  team_min int NOT NULL,
  team_invest_min numeric(20,4) NOT NULL,
  weekly_amount numeric(20,4) NOT NULL,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.salary_levels TO authenticated, anon;
GRANT ALL ON public.salary_levels TO service_role;
ALTER TABLE public.salary_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salary levels read all" ON public.salary_levels FOR SELECT USING (true);
CREATE POLICY "salary levels admin write" ON public.salary_levels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.salary_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level int NOT NULL,
  week_start date NOT NULL,
  amount numeric(20,4) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, level, week_start)
);
GRANT SELECT ON public.salary_payouts TO authenticated;
GRANT ALL ON public.salary_payouts TO service_role;
ALTER TABLE public.salary_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salary payouts read own" ON public.salary_payouts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.get_user_stats(_user_id uuid)
RETURNS TABLE (
  total_investment numeric,
  total_earnings numeric,
  passive_income numeric,
  direct_income numeric,
  team_income numeric,
  salary_income numeric,
  last_24h_earnings numeric,
  total_claimed numeric,
  available_balance numeric,
  total_team int,
  direct_partners int
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH inv AS (
    SELECT COALESCE(SUM(amount),0) AS t FROM investments WHERE user_id=_user_id
  ),
  earn_kinds AS (
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE kind='passive'),0) AS passive,
      COALESCE(SUM(amount) FILTER (WHERE kind='direct_commission'),0) AS direct,
      COALESCE(SUM(amount) FILTER (WHERE kind='level_commission'),0) AS team,
      COALESCE(SUM(amount) FILTER (WHERE kind='salary'),0) AS salary,
      COALESCE(SUM(amount) FILTER (WHERE kind IN ('passive','direct_commission','level_commission','salary')
                                     AND created_at > now() - interval '24 hours'),0) AS last24,
      COALESCE(SUM(amount) FILTER (WHERE kind='passive'),0) AS claimed,
      COALESCE(SUM(amount) FILTER (WHERE kind IN ('passive','direct_commission','level_commission','salary')),0)
        - COALESCE(SUM(amount) FILTER (WHERE kind IN ('withdrawal_hold','capital_withdrawal')),0)
        + COALESCE(SUM(amount) FILTER (WHERE kind='withdrawal_refund'),0) AS avail
    FROM ledger_entries WHERE user_id=_user_id
  ),
  directs AS (
    SELECT COUNT(*)::int AS c FROM profiles WHERE sponsor_id=_user_id
  ),
  team AS (
    WITH RECURSIVE t AS (
      SELECT id, 1 AS lvl FROM profiles WHERE sponsor_id=_user_id
      UNION ALL
      SELECT p.id, t.lvl+1 FROM profiles p JOIN t ON p.sponsor_id=t.id WHERE t.lvl<10
    ) SELECT COUNT(*)::int AS c FROM t
  )
  SELECT inv.t, (earn_kinds.passive+earn_kinds.direct+earn_kinds.team+earn_kinds.salary),
         earn_kinds.passive, earn_kinds.direct, earn_kinds.team, earn_kinds.salary,
         earn_kinds.last24, earn_kinds.claimed, GREATEST(earn_kinds.avail,0),
         team.c, directs.c
  FROM inv, earn_kinds, directs, team;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_team_by_level(_user_id uuid, _level int)
RETURNS TABLE (id uuid, username text, wallet_address text, joined_at timestamptz, investment numeric, earnings numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH RECURSIVE t AS (
    SELECT id, 1 AS lvl FROM profiles WHERE sponsor_id=_user_id
    UNION ALL
    SELECT p.id, t.lvl+1 FROM profiles p JOIN t ON p.sponsor_id=t.id WHERE t.lvl < _level
  )
  SELECT p.id, p.username, p.wallet_address, p.joined_at,
    COALESCE((SELECT SUM(amount) FROM investments WHERE user_id=p.id),0),
    COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE user_id=p.id AND kind IN ('passive','direct_commission','level_commission','salary')),0)
  FROM t JOIN profiles p ON p.id=t.id WHERE t.lvl=_level;
$$;
GRANT EXECUTE ON FUNCTION public.get_team_by_level(uuid,int) TO authenticated;

-- ============ SEED ============
INSERT INTO public.system_settings(id) VALUES (1);
INSERT INTO public.packages(amount) VALUES (10),(20),(40),(80),(160),(320),(640),(1280),(2560);
INSERT INTO public.salary_levels(level,self_invest_min,direct_min,team_min,team_invest_min,weekly_amount) VALUES
  (1, 10,  5,  25,  100,   3),
  (2, 50,  10, 50,  500,   7.5),
  (3, 150, 15, 100, 2500,  15),
  (4, 500, 25, 150, 10000, 100);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_entries;

-- ============================================================
-- migration: 20260725104829_26618ba0-a547-407a-9bf6-ab95d3cd1f0d.sql
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_user_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_team_by_level(uuid,int) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_user_stats(_user_id uuid)
RETURNS TABLE (
  total_investment numeric, total_earnings numeric, passive_income numeric,
  direct_income numeric, team_income numeric, salary_income numeric,
  last_24h_earnings numeric, total_claimed numeric, available_balance numeric,
  total_team int, direct_partners int
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF _user_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH inv AS (SELECT COALESCE(SUM(amount),0) AS t FROM investments WHERE user_id=_user_id),
  earn_kinds AS (
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE kind='passive'),0) AS passive,
      COALESCE(SUM(amount) FILTER (WHERE kind='direct_commission'),0) AS direct,
      COALESCE(SUM(amount) FILTER (WHERE kind='level_commission'),0) AS team,
      COALESCE(SUM(amount) FILTER (WHERE kind='salary'),0) AS salary,
      COALESCE(SUM(amount) FILTER (WHERE kind IN ('passive','direct_commission','level_commission','salary')
                                     AND created_at > now() - interval '24 hours'),0) AS last24,
      COALESCE(SUM(amount) FILTER (WHERE kind='passive'),0) AS claimed,
      COALESCE(SUM(amount) FILTER (WHERE kind IN ('passive','direct_commission','level_commission','salary')),0)
        - COALESCE(SUM(amount) FILTER (WHERE kind IN ('withdrawal_hold','capital_withdrawal')),0)
        + COALESCE(SUM(amount) FILTER (WHERE kind='withdrawal_refund'),0) AS avail
    FROM ledger_entries WHERE user_id=_user_id
  ),
  directs AS (SELECT COUNT(*)::int AS c FROM profiles WHERE sponsor_id=_user_id),
  team AS (
    WITH RECURSIVE t AS (
      SELECT id, 1 AS lvl FROM profiles WHERE sponsor_id=_user_id
      UNION ALL SELECT p.id, t.lvl+1 FROM profiles p JOIN t ON p.sponsor_id=t.id WHERE t.lvl<10
    ) SELECT COUNT(*)::int AS c FROM t
  )
  SELECT inv.t, (earn_kinds.passive+earn_kinds.direct+earn_kinds.team+earn_kinds.salary),
         earn_kinds.passive, earn_kinds.direct, earn_kinds.team, earn_kinds.salary,
         earn_kinds.last24, earn_kinds.claimed, GREATEST(earn_kinds.avail,0),
         team.c, directs.c FROM inv, earn_kinds, directs, team;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_team_by_level(_user_id uuid, _level int)
RETURNS TABLE (id uuid, username text, wallet_address text, joined_at timestamptz, investment numeric, earnings numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF _user_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH RECURSIVE t AS (
    SELECT p.id, 1 AS lvl FROM profiles p WHERE p.sponsor_id=_user_id
    UNION ALL SELECT p.id, t.lvl+1 FROM profiles p JOIN t ON p.sponsor_id=t.id WHERE t.lvl < _level
  )
  SELECT p.id, p.username, p.wallet_address, p.joined_at,
    COALESCE((SELECT SUM(i.amount) FROM investments i WHERE i.user_id=p.id),0),
    COALESCE((SELECT SUM(l.amount) FROM ledger_entries l WHERE l.user_id=p.id AND l.kind IN ('passive','direct_commission','level_commission','salary')),0)
  FROM t JOIN profiles p ON p.id=t.id WHERE t.lvl=_level;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_team_by_level(uuid,int) TO authenticated;

-- Add explicit deny policy on auth_nonces (service role bypasses RLS)
CREATE POLICY "nonces deny all" ON public.auth_nonces FOR ALL USING (false) WITH CHECK (false);

-- ============================================================
-- migration: 20260725110324_bb5359a9-cda7-4f28-9a20-c0c76f997b62.sql
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_user_stats(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_team_by_level(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public, authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_by_level(uuid, integer) TO authenticated;

-- ============================================================
-- migration: 20260725112914_71da5eac-62e7-4b31-89a5-3197a577b0b6.sql
-- ============================================================
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
-- ============================================================
-- migration: 20260725123352_0df08e9f-3e7b-41e0-872c-c67a86f2f149.sql
-- ============================================================

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS demo_deposit_mode boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deposit_wallet_address text,
  ADD COLUMN IF NOT EXISTS deposit_min_confirmations integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS deposit_token_contract text NOT NULL DEFAULT '0x55d398326f99059ff775485246999027b3197955';

CREATE TABLE IF NOT EXISTS public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_amount numeric(20,4) NOT NULL,
  amount numeric(20,4) NOT NULL,
  tx_hash text NOT NULL UNIQUE,
  from_address text,
  to_address text,
  block_number bigint,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  investment_id uuid REFERENCES public.investments(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

CREATE INDEX IF NOT EXISTS deposits_user_created_idx ON public.deposits (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deposits_status_idx ON public.deposits (status);

GRANT SELECT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deposits read own" ON public.deposits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- migration: 20260727081736_3fbeeb55-bb93-4f00-87d4-0c2d863e2a06.sql
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
-- ============================================================
-- migration: 20260813054741_c8d6c04e-9b1c-4252-8329-8eb5e32e0bc4.sql
-- ============================================================
DROP POLICY IF EXISTS "settings read all" ON public.system_settings;
REVOKE SELECT ON public.system_settings FROM anon;
CREATE POLICY "settings read authenticated" ON public.system_settings FOR SELECT TO authenticated USING (true);
-- ============================================================
-- migration: 20260813063350_245dfcb5-1b4b-4cbc-8595-c9740a3e23e2.sql
-- ============================================================
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS payout_tx_hash text,
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payout_error text;
