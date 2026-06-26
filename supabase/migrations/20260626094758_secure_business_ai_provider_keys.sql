ALTER TABLE public.business_ai_provider_keys
  ALTER COLUMN api_key DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS secret_key_name TEXT,
  ADD COLUMN IF NOT EXISTS api_key_preview TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS business_ai_provider_keys_secret_key_name_idx
  ON public.business_ai_provider_keys (secret_key_name)
  WHERE secret_key_name IS NOT NULL;

UPDATE public.business_ai_provider_keys
SET api_key_preview = CASE
    WHEN api_key IS NULL OR btrim(api_key) = '' THEN api_key_preview
    WHEN length(btrim(api_key)) <= 8 THEN '********'
    ELSE left(btrim(api_key), 4) || '****' || right(btrim(api_key), 4)
  END
WHERE api_key_preview IS NULL
  AND api_key IS NOT NULL;

COMMENT ON COLUMN public.business_ai_provider_keys.api_key IS
  'Deprecated legacy plaintext column. New values are stored encrypted in app_secrets via secret_key_name.';
COMMENT ON COLUMN public.business_ai_provider_keys.secret_key_name IS
  'Reference to encrypted app_secrets.key_name for the provider API key.';
COMMENT ON COLUMN public.business_ai_provider_keys.api_key_preview IS
  'Masked preview only; safe to display in settings UI.';

DROP POLICY IF EXISTS "Users can manage own AI provider keys"
  ON public.business_ai_provider_keys;

REVOKE ALL ON public.business_ai_provider_keys FROM anon;
REVOKE ALL ON public.business_ai_provider_keys FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_ai_provider_keys TO service_role;

ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS meta_access_token_secret_key_name TEXT;

ALTER TABLE public.instagram_connections
  ADD COLUMN IF NOT EXISTS meta_access_token_secret_key_name TEXT;

ALTER TABLE public.telegram_connections
  ADD COLUMN IF NOT EXISTS bot_token_secret_key_name TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret_secret_key_name TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret_hash TEXT;

ALTER TABLE public.email_connections
  ADD COLUMN IF NOT EXISTS access_token_secret_key_name TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_secret_key_name TEXT;

ALTER TABLE public.google_calendar_connections
  ADD COLUMN IF NOT EXISTS access_token_secret_key_name TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_secret_key_name TEXT;

CREATE INDEX IF NOT EXISTS whatsapp_connections_access_token_secret_idx
  ON public.whatsapp_connections (meta_access_token_secret_key_name)
  WHERE meta_access_token_secret_key_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS telegram_connections_bot_token_secret_idx
  ON public.telegram_connections (bot_token_secret_key_name)
  WHERE bot_token_secret_key_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS telegram_connections_webhook_secret_hash_idx
  ON public.telegram_connections (webhook_secret_hash)
  WHERE webhook_secret_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_connections_access_token_secret_idx
  ON public.email_connections (access_token_secret_key_name)
  WHERE access_token_secret_key_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS google_calendar_connections_access_token_secret_idx
  ON public.google_calendar_connections (access_token_secret_key_name)
  WHERE access_token_secret_key_name IS NOT NULL;

COMMENT ON COLUMN public.whatsapp_connections.meta_access_token IS
  'Deprecated legacy plaintext column. New values are stored encrypted in app_secrets via meta_access_token_secret_key_name.';
COMMENT ON COLUMN public.telegram_connections.bot_token IS
  'Deprecated legacy plaintext column. New values are stored encrypted in app_secrets via bot_token_secret_key_name.';
COMMENT ON COLUMN public.telegram_connections.webhook_secret IS
  'Deprecated legacy plaintext column. New values are stored encrypted in app_secrets via webhook_secret_secret_key_name.';
COMMENT ON COLUMN public.email_connections.access_token IS
  'Deprecated legacy plaintext column. New values are stored encrypted in app_secrets via access_token_secret_key_name.';
COMMENT ON COLUMN public.email_connections.refresh_token IS
  'Deprecated legacy plaintext column. New values are stored encrypted in app_secrets via refresh_token_secret_key_name.';
COMMENT ON COLUMN public.google_calendar_connections.access_token IS
  'Deprecated legacy plaintext column. New values are stored encrypted in app_secrets via access_token_secret_key_name.';
COMMENT ON COLUMN public.google_calendar_connections.refresh_token IS
  'Deprecated legacy plaintext column. New values are stored encrypted in app_secrets via refresh_token_secret_key_name.';
