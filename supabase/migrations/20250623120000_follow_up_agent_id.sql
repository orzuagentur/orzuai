ALTER TABLE public.business_ai_config
  ADD COLUMN IF NOT EXISTS follow_up_agent_id UUID REFERENCES public.ai_agents (id) ON DELETE SET NULL;
