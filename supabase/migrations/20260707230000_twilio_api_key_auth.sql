-- Manual Twilio BYOT via customer API Key (full account access)

CREATE TYPE public.twilio_auth_mode AS ENUM ('connect', 'api_key');

ALTER TABLE public.twilio_connections
  ADD COLUMN IF NOT EXISTS auth_mode public.twilio_auth_mode NOT NULL DEFAULT 'connect',
  ADD COLUMN IF NOT EXISTS api_key_sid TEXT,
  ADD COLUMN IF NOT EXISTS api_key_secret_key_name TEXT;

COMMENT ON COLUMN public.twilio_connections.auth_mode IS
  'connect = Twilio Connect OAuth subaccount; api_key = customer main account API key';
COMMENT ON COLUMN public.twilio_connections.api_key_sid IS
  'Twilio API Key SID (SK...) for auth_mode=api_key; secret stored in app_secrets';
COMMENT ON COLUMN public.twilio_connections.api_key_secret_key_name IS
  'Encrypted app_secrets key name for the API key secret';
