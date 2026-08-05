ALTER TABLE public.ai_assistant_profile
  ADD COLUMN IF NOT EXISTS ai_intensity text NOT NULL DEFAULT 'light';

ALTER TABLE public.ai_assistant_profile
  DROP CONSTRAINT IF EXISTS ai_assistant_profile_ai_intensity_check;

ALTER TABLE public.ai_assistant_profile
  ADD CONSTRAINT ai_assistant_profile_ai_intensity_check
  CHECK (ai_intensity IN ('light', 'full'));

CREATE INDEX IF NOT EXISTS ai_usage_logs_business_created_at_idx
  ON public.ai_usage_logs (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_human_requests_status_business_idx
  ON public.ai_human_requests (status, business_id);

CREATE INDEX IF NOT EXISTS agent_runs_business_success_created_idx
  ON public.agent_runs (business_id, success, created_at DESC);
