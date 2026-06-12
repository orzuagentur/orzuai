-- Phase 1: messaging data integrity (idempotency, delivery outbox, unread denorm, indexes)

-- ---------------------------------------------------------------------------
-- messages.external_message_id (webhook dedup)
-- ---------------------------------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS external_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS messages_channel_external_message_id_idx
  ON public.messages (channel, external_message_id)
  WHERE external_message_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- conversations.unread_count (denormalized)
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0;

-- Backfill from last_read_at vs client messages
UPDATE public.conversations AS c
SET unread_count = COALESCE(
  (
    SELECT COUNT(*)::INTEGER
    FROM public.messages AS m
    WHERE m.conversation_id = c.id
      AND m.sender_type = 'client'
      AND m.hidden_for_business = FALSE
      AND m.deleted_for_all_at IS NULL
      AND (
        c.last_read_at IS NULL
        OR m.created_at > c.last_read_at
      )
  ),
  0
);

CREATE OR REPLACE FUNCTION public.increment_conversation_unread_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type = 'client'
     AND NOT NEW.hidden_for_business
     AND NEW.deleted_for_all_at IS NULL THEN
    UPDATE public.conversations
    SET unread_count = unread_count + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_increment_unread_trigger ON public.messages;

CREATE TRIGGER messages_increment_unread_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.increment_conversation_unread_on_message();

-- ---------------------------------------------------------------------------
-- message_deliveries (outbox)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_delivery_status') THEN
    CREATE TYPE public.message_delivery_status AS ENUM (
      'pending',
      'sent',
      'delivered',
      'failed'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL UNIQUE REFERENCES public.messages (id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  channel public.messaging_channel NOT NULL,
  status public.message_delivery_status NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_error TEXT,
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS message_deliveries_pending_idx
  ON public.message_deliveries (status, next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS message_deliveries_business_id_idx
  ON public.message_deliveries (business_id);

CREATE TRIGGER set_message_deliveries_updated_at
BEFORE UPDATE ON public.message_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.message_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_deliveries_owner_access
ON public.message_deliveries
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

-- ---------------------------------------------------------------------------
-- Hot-path index for message pagination
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC);
