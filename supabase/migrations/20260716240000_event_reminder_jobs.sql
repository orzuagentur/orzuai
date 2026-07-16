-- Proactive customer messaging permission + durable event reminder queue.

ALTER TABLE public.ai_assistant_profile
  ADD COLUMN IF NOT EXISTS can_send_proactive_message boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ai_assistant_profile.can_send_proactive_message IS
  'Allow AI orchestrator to send proactive customer messages (reminders, status updates).';

CREATE TABLE IF NOT EXISTS public.event_reminder_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts (id) ON DELETE SET NULL,
  event_id UUID NOT NULL REFERENCES public.calendar_events (id) ON DELETE CASCADE,
  channel public.messaging_channel NOT NULL,
  hours_before SMALLINT NOT NULL DEFAULT 24
    CHECK (hours_before >= 1 AND hours_before <= 168),
  scheduled_at TIMESTAMPTZ NOT NULL,
  message_body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT event_reminder_jobs_event_hours UNIQUE (event_id, hours_before)
);

CREATE INDEX IF NOT EXISTS event_reminder_jobs_due_idx
  ON public.event_reminder_jobs (scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS event_reminder_jobs_business_idx
  ON public.event_reminder_jobs (business_id);

CREATE OR REPLACE FUNCTION public.set_event_reminder_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_event_reminder_jobs_updated_at ON public.event_reminder_jobs;
CREATE TRIGGER set_event_reminder_jobs_updated_at
BEFORE UPDATE ON public.event_reminder_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_event_reminder_jobs_updated_at();

ALTER TABLE public.event_reminder_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_event_reminder_jobs ON public.event_reminder_jobs;
CREATE POLICY service_role_event_reminder_jobs
  ON public.event_reminder_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.claim_event_reminder_jobs(p_limit INTEGER DEFAULT 50)
RETURNS SETOF public.event_reminder_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.event_reminder_jobs AS j
  SET
    status = 'processing',
    updated_at = timezone('utc', now())
  FROM (
    SELECT id
    FROM public.event_reminder_jobs
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

REVOKE ALL ON FUNCTION public.claim_event_reminder_jobs(INTEGER)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_event_reminder_jobs(INTEGER)
  TO service_role;
