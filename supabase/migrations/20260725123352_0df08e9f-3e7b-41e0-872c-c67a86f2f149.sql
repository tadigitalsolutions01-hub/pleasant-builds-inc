
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
