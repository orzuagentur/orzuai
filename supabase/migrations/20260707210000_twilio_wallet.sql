-- Per-business Twilio usage wallet (ISV model: platform pays Twilio master account)

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS twilio_wallet_balance_cents INTEGER NOT NULL DEFAULT 0
    CHECK (twilio_wallet_balance_cents >= 0);

ALTER TABLE public.twilio_balance_topups
  ADD COLUMN IF NOT EXISTS credited_cents INTEGER,
  ADD COLUMN IF NOT EXISTS fee_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charged_cents INTEGER;

UPDATE public.twilio_balance_topups
SET
  credited_cents = amount_cents,
  charged_cents = amount_cents
WHERE credited_cents IS NULL;

ALTER TABLE public.twilio_balance_topups
  ALTER COLUMN credited_cents SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.twilio_wallet_debits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  source_type TEXT NOT NULL,
  source_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX twilio_wallet_debits_business_idx
  ON public.twilio_wallet_debits (business_id, created_at DESC);

ALTER TABLE public.twilio_wallet_debits ENABLE ROW LEVEL SECURITY;

-- Backfill wallet balances from completed top-ups
UPDATE public.businesses b
SET twilio_wallet_balance_cents = COALESCE(totals.total_cents, 0)
FROM (
  SELECT business_id, SUM(amount_cents) AS total_cents
  FROM public.twilio_balance_topups
  WHERE status = 'completed'
  GROUP BY business_id
) AS totals
WHERE b.id = totals.business_id;
