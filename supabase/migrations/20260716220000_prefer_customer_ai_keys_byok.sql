-- AI-P1-A08: Bring-your-own-key (BYOK) for Gemini/OpenAI
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS prefer_customer_ai_keys BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.prefer_customer_ai_keys IS
  'When true, try business-owned Gemini/OpenAI keys first; fall back to platform keys.';

CREATE TABLE IF NOT EXISTS public.business_ai_provider_keys (
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gemini', 'openai')),
  api_key_encrypted TEXT NOT NULL,
  api_key_preview TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (business_id, provider)
);

DROP TRIGGER IF EXISTS set_business_ai_provider_keys_updated_at
  ON public.business_ai_provider_keys;

CREATE TRIGGER set_business_ai_provider_keys_updated_at
BEFORE UPDATE ON public.business_ai_provider_keys
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.business_ai_provider_keys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.business_ai_provider_keys FROM anon;
REVOKE ALL ON public.business_ai_provider_keys FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_ai_provider_keys TO service_role;

COMMENT ON TABLE public.business_ai_provider_keys IS
  'Per-business LLM API keys. Accessible only via service_role; values stored via app_secrets.';
COMMENT ON COLUMN public.business_ai_provider_keys.api_key_encrypted IS
  'Secret key_name in app_secrets (integration-secrets pattern). Service_role only.';
COMMENT ON COLUMN public.business_ai_provider_keys.api_key_preview IS
  'Masked preview for settings UI; never stores the full key.';
