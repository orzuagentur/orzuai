-- Phase 3: scale (team access, per-agent reads, webhook queue, tenant realtime)

-- ---------------------------------------------------------------------------
-- Team-aware business access
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_can_access_business(business_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses AS b
    WHERE b.id = business_uuid
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.business_members AS m
    WHERE m.business_id = business_uuid
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

-- Members can read their own membership rows
DROP POLICY IF EXISTS "Users can manage own business members" ON public.business_members;

CREATE POLICY business_members_owner_manage
ON public.business_members
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

CREATE POLICY business_members_self_read
ON public.business_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND status = 'active');

-- Messaging tables: owner + active team members
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;
CREATE POLICY contacts_team_access
ON public.contacts
FOR ALL
TO authenticated
USING (public.user_can_access_business(business_id))
WITH CHECK (public.user_can_access_business(business_id));

DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversations;
CREATE POLICY conversations_team_access
ON public.conversations
FOR ALL
TO authenticated
USING (public.user_can_access_business(business_id))
WITH CHECK (public.user_can_access_business(business_id));

DROP POLICY IF EXISTS "Users can manage own messages" ON public.messages;
CREATE POLICY messages_team_access
ON public.messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations AS conversation
    WHERE conversation.id = conversation_id
      AND public.user_can_access_business(conversation.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations AS conversation
    WHERE conversation.id = conversation_id
      AND public.user_can_access_business(conversation.business_id)
  )
);

DROP POLICY IF EXISTS message_deliveries_owner_access ON public.message_deliveries;
CREATE POLICY message_deliveries_team_access
ON public.message_deliveries
FOR ALL
TO authenticated
USING (public.user_can_access_business(business_id))
WITH CHECK (public.user_can_access_business(business_id));

DROP POLICY IF EXISTS message_attachments_owner_access ON public.message_attachments;
CREATE POLICY message_attachments_team_access
ON public.message_attachments
FOR ALL
TO authenticated
USING (public.user_can_access_business(business_id))
WITH CHECK (public.user_can_access_business(business_id));

DROP POLICY IF EXISTS contact_channel_identities_owner_access ON public.contact_channel_identities;
CREATE POLICY contact_channel_identities_team_access
ON public.contact_channel_identities
FOR ALL
TO authenticated
USING (public.user_can_access_business(business_id))
WITH CHECK (public.user_can_access_business(business_id));

-- ---------------------------------------------------------------------------
-- Per-agent conversation reads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT conversation_reads_unique UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_reads_user_business_idx
  ON public.conversation_reads (user_id, business_id);

CREATE INDEX IF NOT EXISTS conversation_reads_conversation_id_idx
  ON public.conversation_reads (conversation_id);

CREATE TRIGGER set_conversation_reads_updated_at
BEFORE UPDATE ON public.conversation_reads
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_reads_self_access
ON public.conversation_reads
FOR ALL
TO authenticated
USING (user_id = auth.uid() AND public.user_can_access_business(business_id))
WITH CHECK (user_id = auth.uid() AND public.user_can_access_business(business_id));

-- Backfill owner read state from conversations.last_read_at
INSERT INTO public.conversation_reads (
  business_id,
  conversation_id,
  user_id,
  last_read_at,
  unread_count
)
SELECT
  c.business_id,
  c.id,
  b.user_id,
  c.last_read_at,
  c.unread_count
FROM public.conversations AS c
INNER JOIN public.businesses AS b ON b.id = c.business_id
ON CONFLICT (conversation_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.increment_conversation_reads_on_client_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
BEGIN
  IF NEW.sender_type <> 'client'
     OR NEW.hidden_for_business
     OR NEW.deleted_for_all_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT business_id
  INTO v_business_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF v_business_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.conversation_reads (
    business_id,
    conversation_id,
    user_id,
    unread_count
  )
  SELECT
    v_business_id,
    NEW.conversation_id,
    b.user_id,
    1
  FROM public.businesses AS b
  WHERE b.id = v_business_id
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET
    unread_count = public.conversation_reads.unread_count + 1,
    updated_at = timezone('utc', now());

  INSERT INTO public.conversation_reads (
    business_id,
    conversation_id,
    user_id,
    unread_count
  )
  SELECT
    v_business_id,
    NEW.conversation_id,
    m.user_id,
    1
  FROM public.business_members AS m
  WHERE m.business_id = v_business_id
    AND m.status = 'active'
    AND m.user_id IS NOT NULL
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET
    unread_count = public.conversation_reads.unread_count + 1,
    updated_at = timezone('utc', now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_increment_conversation_reads_trigger ON public.messages;

CREATE TRIGGER messages_increment_conversation_reads_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.increment_conversation_reads_on_client_message();

-- ---------------------------------------------------------------------------
-- messages.business_id — tenant-scoped realtime filter
-- ---------------------------------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses (id) ON DELETE CASCADE;

UPDATE public.messages AS m
SET business_id = c.business_id
FROM public.conversations AS c
WHERE m.conversation_id = c.id
  AND m.business_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_message_business_id_from_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.business_id IS NULL THEN
    SELECT business_id
    INTO NEW.business_id
    FROM public.conversations
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_set_business_id_trigger ON public.messages;

CREATE TRIGGER messages_set_business_id_trigger
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_message_business_id_from_conversation();

CREATE INDEX IF NOT EXISTS messages_business_id_created_at_idx
  ON public.messages (business_id, created_at DESC)
  WHERE business_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Inbound webhook queue (async processing)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_queue_status') THEN
    CREATE TYPE public.webhook_queue_status AS ENUM (
      'pending',
      'processing',
      'completed',
      'failed'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.inbound_webhook_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel public.messaging_channel NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.webhook_queue_status NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT inbound_webhook_queue_idempotency UNIQUE (channel, idempotency_key)
);

CREATE INDEX IF NOT EXISTS inbound_webhook_queue_pending_idx
  ON public.inbound_webhook_queue (next_attempt_at)
  WHERE status = 'pending';

CREATE TRIGGER set_inbound_webhook_queue_updated_at
BEFORE UPDATE ON public.inbound_webhook_queue
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Signed URL cache (DB fallback when Redis is unavailable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_signed_url_cache (
  storage_path TEXT PRIMARY KEY,
  signed_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS media_signed_url_cache_expires_at_idx
  ON public.media_signed_url_cache (expires_at);
