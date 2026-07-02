-- Platform AI credentials vault (metadata) + per use-case routing.
-- Actual API keys live encrypted in app_secrets (secret_key_name).

CREATE TABLE public.platform_ai_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (
    provider IN ('gemini', 'openai', 'claude', 'elevenlabs', 'deepgram')
  ),
  secret_key_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT platform_ai_credentials_secret_key_format CHECK (
    secret_key_name ~ '^[A-Z][A-Z0-9_]*$'
  )
);

CREATE UNIQUE INDEX platform_ai_credentials_secret_key_uidx
ON public.platform_ai_credentials (secret_key_name);

CREATE INDEX platform_ai_credentials_provider_idx
ON public.platform_ai_credentials (provider, is_active);

CREATE TRIGGER set_platform_ai_credentials_updated_at
BEFORE UPDATE ON public.platform_ai_credentials
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.platform_ai_use_case_config (
  use_case_id TEXT PRIMARY KEY,
  credential_id UUID REFERENCES public.platform_ai_credentials (id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (
    provider IN ('gemini', 'openai', 'claude', 'elevenlabs', 'deepgram')
  ),
  model TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER set_platform_ai_use_case_config_updated_at
BEFORE UPDATE ON public.platform_ai_use_case_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.platform_ai_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_ai_use_case_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage AI credentials"
ON public.platform_ai_credentials
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Platform admins manage AI use case config"
ON public.platform_ai_use_case_config
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Seed default use-case rows (provider/model can be changed in admin UI).
INSERT INTO public.platform_ai_use_case_config (use_case_id, provider, model)
VALUES
  ('channel_messages', 'gemini', 'gemini-2.5-flash'),
  ('follow_up', 'gemini', 'gemini-2.5-flash'),
  ('voice_message_stt', 'openai', 'gpt-4o-mini'),
  ('voice_message_tts', 'elevenlabs', NULL),
  ('ai_phone_call', 'openai', 'gpt-4o-mini'),
  ('phone_call_stt', 'deepgram', NULL),
  ('orchestrator', 'gemini', 'gemini-2.5-flash'),
  ('background_ai', 'gemini', 'gemini-2.5-flash'),
  ('knowledge_embeddings', 'gemini', 'text-embedding-004')
ON CONFLICT (use_case_id) DO NOTHING;
