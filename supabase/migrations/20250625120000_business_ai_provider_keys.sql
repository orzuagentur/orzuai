CREATE TABLE public.business_ai_provider_keys (
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gemini', 'openai', 'claude')),
  api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (business_id, provider)
);

CREATE TRIGGER set_business_ai_provider_keys_updated_at
BEFORE UPDATE ON public.business_ai_provider_keys
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.business_ai_provider_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own AI provider keys"
ON public.business_ai_provider_keys
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS billing_source TEXT NOT NULL DEFAULT 'platform'
    CHECK (billing_source IN ('platform', 'customer'));

ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS use_custom_model BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ai_usage_logs_billing_source_idx
  ON public.ai_usage_logs (business_id, billing_source);
