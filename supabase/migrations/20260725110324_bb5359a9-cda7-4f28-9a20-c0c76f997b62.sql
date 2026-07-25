
REVOKE EXECUTE ON FUNCTION public.get_user_stats(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_team_by_level(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public, authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_by_level(uuid, integer) TO authenticated;
