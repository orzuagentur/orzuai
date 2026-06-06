ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'gemini'
    CHECK (provider IN ('gemini', 'openai', 'claude'));

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_plan IN ('free', 'starter', 'pro', 'agency'));

CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations (id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX ai_usage_logs_business_id_idx ON public.ai_usage_logs (business_id);
CREATE INDEX ai_usage_logs_created_at_idx ON public.ai_usage_logs (created_at);

CREATE TABLE public.business_ai_config (
  business_id UUID PRIMARY KEY REFERENCES public.businesses (id) ON DELETE CASCADE,
  sales_agent_enabled BOOLEAN NOT NULL DEFAULT false,
  bant_threshold INTEGER NOT NULL DEFAULT 70 CHECK (bant_threshold BETWEEN 0 AND 100),
  auto_qualify_pipeline BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER set_business_ai_config_updated_at
BEFORE UPDATE ON public.business_ai_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI usage logs"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));

CREATE POLICY "Users can manage own business AI config"
ON public.business_ai_config
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
