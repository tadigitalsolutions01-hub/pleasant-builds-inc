ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS payout_tx_hash text,
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payout_error text;