ALTER TABLE public.ai_agents
ADD COLUMN goal TEXT;

UPDATE public.ai_agents
SET goal = CASE icon
  WHEN 'target' THEN 'sales'
  WHEN 'headphones' THEN 'support'
  WHEN 'calendar' THEN 'booking'
  ELSE 'custom'
END
WHERE goal IS NULL;

ALTER TABLE public.ai_agents
ALTER COLUMN goal SET DEFAULT 'custom';

ALTER TABLE public.ai_agents
ALTER COLUMN goal SET NOT NULL;

ALTER TABLE public.ai_agents
ADD CONSTRAINT ai_agents_goal_check
CHECK (goal IN ('sales', 'support', 'booking', 'custom'));
