ALTER TABLE public.voice_call_logs
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS ai_handled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS voice_call_logs_business_created_idx
  ON public.voice_call_logs (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS voice_call_logs_external_call_id_idx
  ON public.voice_call_logs (external_call_id)
  WHERE external_call_id IS NOT NULL;
