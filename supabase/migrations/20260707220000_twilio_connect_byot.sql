-- Twilio Connect BYOT: customer pays Twilio directly (not platform wallet)

CREATE TYPE public.twilio_billing_owner AS ENUM ('customer', 'platform');

ALTER TABLE public.twilio_connections
  ADD COLUMN IF NOT EXISTS billing_owner public.twilio_billing_owner NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS parent_account_sid TEXT;

COMMENT ON COLUMN public.twilio_connections.billing_owner IS
  'customer = usage billed to user Twilio account; platform = legacy ISV wallet model';
COMMENT ON COLUMN public.twilio_connections.parent_account_sid IS
  'Parent Twilio account SID (user main account) when connected_account_sid is a Connect subaccount';
