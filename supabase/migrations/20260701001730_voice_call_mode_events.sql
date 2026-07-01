-- Enterprise voice foundation: explicit call mode and append-only event log.

ALTER TABLE public.voice_call_logs
  ADD COLUMN IF NOT EXISTS call_mode TEXT NOT NULL DEFAULT 'unknown'
    CHECK (call_mode IN ('ai', 'human', 'handoff', 'unknown')),
  ADD COLUMN IF NOT EXISTS operator_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

UPDATE public.voice_call_logs
SET call_mode = CASE
  WHEN human_handled THEN 'human'
  WHEN ai_handled THEN 'ai'
  WHEN trigger_reason = 'browser_call' THEN 'human'
  WHEN trigger_reason = 'contact_call' THEN 'ai'
  ELSE call_mode
END;

CREATE INDEX IF NOT EXISTS voice_call_logs_business_mode_created_idx
  ON public.voice_call_logs (business_id, call_mode, created_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  call_log_id UUID REFERENCES public.voice_call_logs (id) ON DELETE CASCADE,
  call_sid TEXT,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system'
    CHECK (actor_type IN ('system', 'ai', 'customer', 'operator', 'twilio')),
  actor_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS voice_call_events_business_created_idx
  ON public.voice_call_events (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS voice_call_events_call_log_created_idx
  ON public.voice_call_events (call_log_id, created_at DESC)
  WHERE call_log_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS voice_call_events_call_sid_idx
  ON public.voice_call_events (call_sid)
  WHERE call_sid IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.voice_post_call_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  call_log_id UUID NOT NULL REFERENCES public.voice_call_logs (id) ON DELETE CASCADE,
  job_type TEXT NOT NULL
    CHECK (job_type IN ('transcribe', 'summarize', 'extract_actions', 'sync_crm', 'booking')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT voice_post_call_jobs_unique UNIQUE (call_log_id, job_type)
);

CREATE INDEX IF NOT EXISTS voice_post_call_jobs_pending_idx
  ON public.voice_post_call_jobs (next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS voice_post_call_jobs_processing_idx
  ON public.voice_post_call_jobs (processing_started_at)
  WHERE status = 'processing';

DROP TRIGGER IF EXISTS set_voice_post_call_jobs_updated_at
ON public.voice_post_call_jobs;

CREATE TRIGGER set_voice_post_call_jobs_updated_at
BEFORE UPDATE ON public.voice_post_call_jobs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.voice_call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_post_call_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own voice call events"
ON public.voice_call_events;

CREATE POLICY "Users can view own voice call events"
ON public.voice_call_events
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));

DROP POLICY IF EXISTS "Service role manages voice call events"
ON public.voice_call_events;

CREATE POLICY "Service role manages voice call events"
ON public.voice_call_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own voice post call jobs"
ON public.voice_post_call_jobs;

CREATE POLICY "Users can view own voice post call jobs"
ON public.voice_post_call_jobs
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));

DROP POLICY IF EXISTS "Service role manages voice post call jobs"
ON public.voice_post_call_jobs;

CREATE POLICY "Service role manages voice post call jobs"
ON public.voice_post_call_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.claim_voice_post_call_jobs(p_limit INTEGER DEFAULT 10)
RETURNS SETOF public.voice_post_call_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.voice_post_call_jobs AS q
  SET
    status = 'processing',
    attempt_count = q.attempt_count + 1,
    processing_started_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  FROM (
    SELECT id
    FROM public.voice_post_call_jobs
    WHERE status = 'pending'
      AND next_attempt_at <= timezone('utc', now())
      AND attempt_count < max_attempts
    ORDER BY next_attempt_at ASC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ) AS candidate
  WHERE q.id = candidate.id
  RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_voice_post_call_jobs(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_voice_post_call_jobs(INTEGER) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'voice_call_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_call_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'voice_post_call_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_post_call_jobs;
  END IF;
END $$;
