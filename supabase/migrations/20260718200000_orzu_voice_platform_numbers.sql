-- HeyKiki-like model: OrzuX owns numbers on platform Twilio.
-- Wipe Connect/BYOT demo data; inventory lives in orzu_voice_numbers.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'orzu_voice_number_status'
  ) THEN
    CREATE TYPE public.orzu_voice_number_status AS ENUM (
      'provisioning',
      'active',
      'releasing',
      'released'
    );
  END IF;
END $$;

-- Allow platform-owned connection rows (no customer Twilio credentials).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'twilio_auth_mode'
      AND e.enumlabel = 'platform'
  ) THEN
    ALTER TYPE public.twilio_auth_mode ADD VALUE 'platform';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.orzu_voice_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_sid TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'DE',
  forward_to_e164 TEXT,
  forward_verified_at TIMESTAMPTZ,
  forwarding_wizard_completed_at TIMESTAMPTZ,
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents > 0),
  stripe_subscription_item_id TEXT,
  billing_status TEXT NOT NULL DEFAULT 'active'
    CHECK (billing_status IN ('active', 'canceled')),
  status public.orzu_voice_number_status NOT NULL DEFAULT 'provisioning',
  voice_url TEXT,
  sms_url TEXT,
  provisioned_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT orzu_voice_numbers_phone_sid_unique UNIQUE (phone_sid),
  CONSTRAINT orzu_voice_numbers_phone_number_unique UNIQUE (phone_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS orzu_voice_numbers_one_active_per_business_idx
  ON public.orzu_voice_numbers (business_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS orzu_voice_numbers_business_status_idx
  ON public.orzu_voice_numbers (business_id, status);

ALTER TABLE public.orzu_voice_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orzu_voice_numbers_select_own ON public.orzu_voice_numbers;
CREATE POLICY orzu_voice_numbers_select_own
  ON public.orzu_voice_numbers
  FOR SELECT
  TO authenticated
  USING (public.user_owns_business(business_id));

DROP POLICY IF EXISTS orzu_voice_numbers_service_role ON public.orzu_voice_numbers;
CREATE POLICY orzu_voice_numbers_service_role
  ON public.orzu_voice_numbers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Demo Connect/BYOT wipe (no production tenants to preserve).
DELETE FROM public.twilio_number_subscriptions;
DELETE FROM public.twilio_oauth_states;
DELETE FROM public.twilio_wallet_debits;
DELETE FROM public.twilio_balance_topups;
DELETE FROM public.twilio_connections;

UPDATE public.voice_agent_config
SET
  phone_number = NULL,
  twilio_phone_sid = NULL,
  updated_at = timezone('utc', now())
WHERE phone_number IS NOT NULL
   OR twilio_phone_sid IS NOT NULL;
