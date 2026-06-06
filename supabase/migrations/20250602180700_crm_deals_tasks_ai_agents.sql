ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS deal_value NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS expected_close_date DATE;

CREATE TABLE public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_tasks_business_id_idx ON public.crm_tasks (business_id);
CREATE INDEX crm_tasks_contact_id_idx ON public.crm_tasks (contact_id);

CREATE TRIGGER set_crm_tasks_updated_at
BEFORE UPDATE ON public.crm_tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own CRM tasks"
ON public.crm_tasks
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  channels public.messaging_channel[] NOT NULL DEFAULT '{}',
  trigger_keywords TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX ai_agents_business_id_idx ON public.ai_agents (business_id);

CREATE TRIGGER set_ai_agents_updated_at
BEFORE UPDATE ON public.ai_agents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own AI agents"
ON public.ai_agents
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
