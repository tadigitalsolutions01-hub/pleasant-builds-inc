DROP POLICY IF EXISTS "settings read all" ON public.system_settings;
REVOKE SELECT ON public.system_settings FROM anon;
CREATE POLICY "settings read authenticated" ON public.system_settings FOR SELECT TO authenticated USING (true);