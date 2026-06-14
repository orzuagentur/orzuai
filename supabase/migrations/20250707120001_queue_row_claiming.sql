-- Concurrent queue processing: atomic row claiming with SKIP LOCKED
-- Requires 20250707120000_queue_processing_enum.sql (processing enum values).

-- ---------------------------------------------------------------------------
-- Indexes for stale processing recovery
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS message_deliveries_processing_idx
  ON public.message_deliveries (updated_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS message_attachments_processing_idx
  ON public.message_attachments (updated_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS inbound_webhook_queue_processing_idx
  ON public.inbound_webhook_queue (updated_at)
  WHERE status = 'processing';

-- ---------------------------------------------------------------------------
-- Claim inbound webhook jobs (SKIP LOCKED)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_inbound_webhook_jobs(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.inbound_webhook_queue
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.inbound_webhook_queue AS q
  SET
    status = 'processing',
    updated_at = timezone('utc', now())
  FROM (
    SELECT id
    FROM public.inbound_webhook_queue
    WHERE status = 'pending'
      AND next_attempt_at <= timezone('utc', now())
    ORDER BY next_attempt_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(p_limit, 0)
  ) AS picked
  WHERE q.id = picked.id
  RETURNING q.*;
END;
$$;

-- ---------------------------------------------------------------------------
-- Claim outbound message delivery jobs (SKIP LOCKED)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_message_delivery_jobs(p_limit INTEGER DEFAULT 25)
RETURNS SETOF public.message_deliveries
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.message_deliveries AS d
  SET
    status = 'processing',
    updated_at = timezone('utc', now())
  FROM (
    SELECT id
    FROM public.message_deliveries
    WHERE status = 'pending'
      AND next_attempt_at <= timezone('utc', now())
    ORDER BY next_attempt_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(p_limit, 0)
  ) AS picked
  WHERE d.id = picked.id
  RETURNING d.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_message_delivery_job(p_message_id UUID)
RETURNS SETOF public.message_deliveries
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.message_deliveries AS d
  SET
    status = 'processing',
    updated_at = timezone('utc', now())
  WHERE d.message_id = p_message_id
    AND d.status = 'pending'
    AND d.next_attempt_at <= timezone('utc', now())
  RETURNING d.*;
END;
$$;

-- ---------------------------------------------------------------------------
-- Claim inbound media hydration jobs (SKIP LOCKED)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_inbound_media_hydration_jobs(p_limit INTEGER DEFAULT 15)
RETURNS SETOF public.message_attachments
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.message_attachments AS a
  SET
    status = 'processing',
    updated_at = timezone('utc', now())
  FROM (
    SELECT message_id
    FROM public.message_attachments
    WHERE storage_path IS NULL
      AND (
        status = 'pending'
        OR (
          status = 'failed'
          AND retry_count < max_retries
          AND (
            next_retry_at IS NULL
            OR next_retry_at <= timezone('utc', now())
          )
        )
      )
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(p_limit, 0)
  ) AS picked
  WHERE a.message_id = picked.message_id
  RETURNING a.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_inbound_media_hydration_job(p_message_id UUID)
RETURNS SETOF public.message_attachments
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.message_attachments AS a
  SET
    status = 'processing',
    updated_at = timezone('utc', now())
  WHERE a.message_id = p_message_id
    AND a.storage_path IS NULL
    AND (
      a.status = 'pending'
      OR (
        a.status = 'failed'
        AND a.retry_count < a.max_retries
        AND (
          a.next_retry_at IS NULL
          OR a.next_retry_at <= timezone('utc', now())
        )
      )
    )
  RETURNING a.*;
END;
$$;
