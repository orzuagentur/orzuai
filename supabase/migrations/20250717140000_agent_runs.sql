CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations (id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts (id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.ai_agents (id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  client_message TEXT NOT NULL,
  routing_method TEXT,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX agent_runs_business_created_idx
ON public.agent_runs (business_id, created_at DESC);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent runs"
ON public.agent_runs
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));
