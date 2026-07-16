-- Human handoff SLA: track accept/decline and escalation retries.

ALTER TABLE public.ai_human_requests
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'escalated')),
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_by UUID,
  ADD COLUMN IF NOT EXISTS escalate_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ai_human_requests_pending_sla_idx
  ON public.ai_human_requests (created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ai_human_requests_business_status_idx
  ON public.ai_human_requests (business_id, status);
