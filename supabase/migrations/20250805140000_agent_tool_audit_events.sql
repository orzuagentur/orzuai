CREATE TABLE IF NOT EXISTS public.agent_tool_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations (id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts (id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  label text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_tool_audit_events_business_created_idx
  ON public.agent_tool_audit_events (business_id, created_at DESC);

ALTER TABLE public.agent_tool_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_tool_audit_events_service_role"
  ON public.agent_tool_audit_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
