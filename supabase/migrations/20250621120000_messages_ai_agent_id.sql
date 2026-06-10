ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS ai_agent_id UUID REFERENCES public.ai_agents (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_ai_agent_id_idx ON public.messages (ai_agent_id);
