-- Durable AI auto-reply debounce queue + background orchestration jobs.
-- Replaces in-memory debounce Map and after() for CRM orchestration.

-- ---------------------------------------------------------------------------
-- Auto-reply jobs (one row per conversation, debounced)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_reply_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  channel public.messaging_channel NOT NULL,
  pending_messages TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  status public.webhook_queue_status NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  needs_reprocess BOOLEAN NOT NULL DEFAULT false,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT ai_reply_jobs_conversation UNIQUE (business_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS ai_reply_jobs_pending_idx
  ON public.ai_reply_jobs (next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ai_reply_jobs_processing_idx
  ON public.ai_reply_jobs (updated_at)
  WHERE status = 'processing';

CREATE TRIGGER set_ai_reply_jobs_updated_at
BEFORE UPDATE ON public.ai_reply_jobs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Background orchestration jobs (CRM + human handoff)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_orchestration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  channel public.messaging_channel NOT NULL,
  client_message TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status public.webhook_queue_status NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT ai_orchestration_jobs_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS ai_orchestration_jobs_pending_idx
  ON public.ai_orchestration_jobs (next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ai_orchestration_jobs_processing_idx
  ON public.ai_orchestration_jobs (updated_at)
  WHERE status = 'processing';

CREATE TRIGGER set_ai_orchestration_jobs_updated_at
BEFORE UPDATE ON public.ai_orchestration_jobs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Upsert debounced auto-reply job (extends timer on each inbound message)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_ai_reply_job(
  p_business_id UUID,
  p_conversation_id UUID,
  p_channel public.messaging_channel,
  p_message TEXT
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_trimmed TEXT;
BEGIN
  v_trimmed := NULLIF(btrim(p_message), '');

  IF v_trimmed IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.ai_reply_jobs (
    business_id,
    conversation_id,
    channel,
    pending_messages,
    next_attempt_at,
    status
  ) VALUES (
    p_business_id,
    p_conversation_id,
    p_channel,
    ARRAY[v_trimmed],
    timezone('utc', now()) + interval '1.5 seconds',
    'pending'
  )
  ON CONFLICT (business_id, conversation_id) DO UPDATE SET
    channel = EXCLUDED.channel,
    pending_messages = public.ai_reply_jobs.pending_messages || ARRAY[v_trimmed],
    next_attempt_at = timezone('utc', now()) + interval '1.5 seconds',
    needs_reprocess = CASE
      WHEN public.ai_reply_jobs.status = 'processing' THEN true
      ELSE public.ai_reply_jobs.needs_reprocess
    END,
    status = CASE
      WHEN public.ai_reply_jobs.status = 'processing' THEN 'processing'
      ELSE 'pending'
    END,
    updated_at = timezone('utc', now())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Claim auto-reply jobs ready after debounce (SKIP LOCKED)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_ai_reply_jobs(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.ai_reply_jobs
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.ai_reply_jobs AS j
  SET
    status = 'processing',
    updated_at = timezone('utc', now())
  FROM (
    SELECT id
    FROM public.ai_reply_jobs
    WHERE status = 'pending'
      AND next_attempt_at <= timezone('utc', now())
      AND cardinality(pending_messages) > 0
    ORDER BY next_attempt_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(p_limit, 0)
  ) AS picked
  WHERE j.id = picked.id
  RETURNING j.*;
END;
$$;

-- ---------------------------------------------------------------------------
-- Claim orchestration jobs (SKIP LOCKED)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_ai_orchestration_jobs(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.ai_orchestration_jobs
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.ai_orchestration_jobs AS j
  SET
    status = 'processing',
    updated_at = timezone('utc', now())
  FROM (
    SELECT id
    FROM public.ai_orchestration_jobs
    WHERE status = 'pending'
      AND next_attempt_at <= timezone('utc', now())
    ORDER BY next_attempt_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(p_limit, 0)
  ) AS picked
  WHERE j.id = picked.id
  RETURNING j.*;
END;
$$;
