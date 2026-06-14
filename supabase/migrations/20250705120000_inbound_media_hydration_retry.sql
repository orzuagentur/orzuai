-- Inbound media hydration retry + durable worker support

ALTER TABLE public.message_attachments
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hydration_context JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS message_attachments_hydration_retry_idx
  ON public.message_attachments (next_retry_at)
  WHERE status IN ('pending', 'failed');
