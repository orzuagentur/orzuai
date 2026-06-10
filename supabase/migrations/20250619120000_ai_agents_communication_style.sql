ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS communication_style TEXT NOT NULL DEFAULT 'professional';
