ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete'));

CREATE UNIQUE INDEX businesses_stripe_customer_id_idx
  ON public.businesses (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE public.voice_agent_config (
  business_id UUID PRIMARY KEY REFERENCES public.businesses (id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  provider TEXT NOT NULL DEFAULT 'twilio'
    CHECK (provider IN ('twilio', 'retell', 'vapi')),
  phone_number TEXT,
  outbound_enabled BOOLEAN NOT NULL DEFAULT true,
  inbound_enabled BOOLEAN NOT NULL DEFAULT true,
  callback_after_order BOOLEAN NOT NULL DEFAULT true,
  callback_delay_minutes INTEGER NOT NULL DEFAULT 5
    CHECK (callback_delay_minutes BETWEEN 0 AND 1440),
  outbound_script TEXT NOT NULL DEFAULT 'Hello! This is OrzuAI calling to confirm your order and answer any questions.',
  inbound_greeting TEXT NOT NULL DEFAULT 'Thank you for calling. How can we help you today?',
  retell_agent_id TEXT,
  vapi_assistant_id TEXT,
  twilio_phone_sid TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER set_voice_agent_config_updated_at
BEFORE UPDATE ON public.voice_agent_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.voice_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts (id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  provider TEXT NOT NULL,
  external_call_id TEXT,
  trigger_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX voice_call_logs_business_id_idx ON public.voice_call_logs (business_id);

CREATE TABLE public.voice_call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts (id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  trigger_reason TEXT NOT NULL DEFAULT 'order_callback',
  execute_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX voice_call_queue_execute_at_idx ON public.voice_call_queue (execute_at)
  WHERE status = 'pending';

ALTER TABLE public.voice_call_queue ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.voice_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own voice agent config"
ON public.voice_agent_config
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

CREATE POLICY "Users can view own voice call logs"
ON public.voice_call_logs
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));
