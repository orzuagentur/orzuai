-- Customer-owned Twilio Browser Phone provisioning.
-- API Key authenticates REST/Voice SDK token minting; Auth Token validates
-- Twilio webhooks and Media Stream upgrade signatures for that customer account.

ALTER TABLE public.twilio_connections
  ADD COLUMN IF NOT EXISTS auth_token_secret_key_name TEXT,
  ADD COLUMN IF NOT EXISTS browser_twiml_app_sid TEXT,
  ADD COLUMN IF NOT EXISTS browser_phone_status TEXT NOT NULL DEFAULT 'disabled',
  ADD COLUMN IF NOT EXISTS browser_phone_last_error TEXT,
  ADD COLUMN IF NOT EXISTS browser_phone_provisioned_at TIMESTAMPTZ;

ALTER TABLE public.twilio_connections
  DROP CONSTRAINT IF EXISTS twilio_connections_browser_phone_status_check;

ALTER TABLE public.twilio_connections
  ADD CONSTRAINT twilio_connections_browser_phone_status_check
  CHECK (browser_phone_status IN ('disabled', 'pending', 'ready', 'failed'));

CREATE INDEX IF NOT EXISTS twilio_connections_browser_twiml_app_sid_idx
  ON public.twilio_connections (browser_twiml_app_sid)
  WHERE browser_twiml_app_sid IS NOT NULL;

COMMENT ON COLUMN public.twilio_connections.auth_token_secret_key_name IS
  'Encrypted app_secrets key name for the customer Twilio Auth Token. Required for BYOT Browser Phone webhook validation.';
COMMENT ON COLUMN public.twilio_connections.browser_twiml_app_sid IS
  'Customer-account TwiML App SID used by the Twilio Voice SDK for BYOT Browser Phone.';
COMMENT ON COLUMN public.twilio_connections.browser_phone_status IS
  'disabled = unavailable, pending = provisioning in progress, ready = safe to use, failed = provisioning failed';
COMMENT ON COLUMN public.twilio_connections.browser_phone_last_error IS
  'Last BYOT Browser Phone provisioning error, sanitized for support diagnostics.';
COMMENT ON COLUMN public.twilio_connections.browser_phone_provisioned_at IS
  'Last successful customer-account TwiML App provisioning timestamp.';
