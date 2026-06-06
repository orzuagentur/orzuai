ALTER TABLE public.business_ai_config
  ADD COLUMN IF NOT EXISTS follow_up_agent_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent'
    CHECK (role IN ('owner', 'admin', 'manager', 'agent', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX business_members_business_email_idx
  ON public.business_members (business_id, invited_email);

CREATE INDEX business_members_business_id_idx
  ON public.business_members (business_id);

CREATE TRIGGER set_business_members_updated_at
BEFORE UPDATE ON public.business_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN ('new_message', 'form_submit', 'no_reply_24h', 'tag_added')),
  action_type TEXT NOT NULL
    CHECK (action_type IN ('send_message', 'create_task', 'update_stage', 'notify')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX automations_business_id_idx ON public.automations (business_id);

CREATE TRIGGER set_automations_updated_at
BEFORE UPDATE ON public.automations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own business members"
ON public.business_members
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

CREATE POLICY "Users can manage own automations"
ON public.automations
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
