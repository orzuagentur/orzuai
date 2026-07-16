-- Durable follow-up job queue: schedule at reply time, cron claims due rows only.

CREATE TABLE IF NOT EXISTS public.follow_up_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  channel public.messaging_channel NOT NULL,
  follow_up_day SMALLINT NOT NULL CHECK (follow_up_day IN (1, 2)),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed')),
  last_outbound_content TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT 'there',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT follow_up_jobs_conversation_day UNIQUE (conversation_id, follow_up_day)
);

CREATE INDEX IF NOT EXISTS follow_up_jobs_due_idx
  ON public.follow_up_jobs (scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS follow_up_jobs_business_idx
  ON public.follow_up_jobs (business_id);

CREATE INDEX IF NOT EXISTS follow_up_jobs_conversation_idx
  ON public.follow_up_jobs (conversation_id);

CREATE OR REPLACE FUNCTION public.set_follow_up_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_follow_up_jobs_updated_at ON public.follow_up_jobs;
CREATE TRIGGER set_follow_up_jobs_updated_at
BEFORE UPDATE ON public.follow_up_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_follow_up_jobs_updated_at();

ALTER TABLE public.follow_up_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_follow_up_jobs ON public.follow_up_jobs;
CREATE POLICY service_role_follow_up_jobs
  ON public.follow_up_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.claim_follow_up_jobs(p_limit INTEGER DEFAULT 50)
RETURNS SETOF public.follow_up_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.follow_up_jobs AS j
  SET
    status = 'processing',
    updated_at = timezone('utc', now())
  FROM (
    SELECT id
    FROM public.follow_up_jobs
    WHERE status = 'pending'
      AND scheduled_at <= timezone('utc', now())
    ORDER BY scheduled_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(p_limit, 0)
  ) AS picked
  WHERE j.id = picked.id
  RETURNING j.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_follow_up_jobs(INTEGER)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_follow_up_jobs(INTEGER)
  TO service_role;
