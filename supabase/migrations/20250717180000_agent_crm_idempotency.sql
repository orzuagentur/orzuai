-- Idempotency keys for CRM executor actions (orchestration job retries).

CREATE TABLE IF NOT EXISTS public.agent_crm_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT agent_crm_idempotency_unique UNIQUE (business_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS agent_crm_idempotency_business_created_idx
  ON public.agent_crm_idempotency (business_id, created_at DESC);
