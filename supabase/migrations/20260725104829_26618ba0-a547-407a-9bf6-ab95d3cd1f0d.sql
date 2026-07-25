
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
