-- Phase 2: channel platform (identities, attachments, sync cursor support)

-- ---------------------------------------------------------------------------
-- contact_channel_identities — canonical external IDs per channel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_channel_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts (id) ON DELETE CASCADE,
  channel public.messaging_channel NOT NULL,
  external_id TEXT NOT NULL,
  display_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT contact_channel_identities_unique
    UNIQUE (business_id, channel, external_id)
);

CREATE INDEX IF NOT EXISTS contact_channel_identities_contact_id_idx
  ON public.contact_channel_identities (contact_id);

CREATE INDEX IF NOT EXISTS contact_channel_identities_business_channel_idx
  ON public.contact_channel_identities (business_id, channel);

CREATE TRIGGER set_contact_channel_identities_updated_at
BEFORE UPDATE ON public.contact_channel_identities
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.contact_channel_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_channel_identities_owner_access
ON public.contact_channel_identities
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

-- Backfill from legacy phone_number prefixes
INSERT INTO public.contact_channel_identities (
  business_id,
  contact_id,
  channel,
  external_id,
  display_label
)
SELECT
  c.business_id,
  c.id,
  c.channel,
  CASE
    WHEN c.channel = 'telegram' AND c.phone_number LIKE 'tg:%'
      THEN substring(c.phone_number FROM 4)
    WHEN c.channel = 'instagram' AND c.phone_number LIKE 'ig:%'
      THEN substring(c.phone_number FROM 4)
    ELSE c.phone_number
  END,
  c.name
FROM public.contacts AS c
WHERE c.phone_number IS NOT NULL
  AND length(trim(c.phone_number)) > 0
ON CONFLICT (business_id, channel, external_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- message_attachments — normalized media metadata
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_attachment_kind') THEN
    CREATE TYPE public.message_attachment_kind AS ENUM (
      'image',
      'audio',
      'video',
      'document'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_attachment_status') THEN
    CREATE TYPE public.message_attachment_status AS ENUM (
      'pending',
      'ready',
      'failed'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages (id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  kind public.message_attachment_kind NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_name TEXT NOT NULL DEFAULT 'attachment',
  storage_path TEXT,
  size_bytes BIGINT,
  duration_sec INTEGER,
  provider_media_id TEXT,
  status public.message_attachment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS message_attachments_message_id_idx
  ON public.message_attachments (message_id);

CREATE INDEX IF NOT EXISTS message_attachments_business_id_idx
  ON public.message_attachments (business_id);

CREATE INDEX IF NOT EXISTS message_attachments_status_idx
  ON public.message_attachments (status)
  WHERE status = 'pending';

CREATE TRIGGER set_message_attachments_updated_at
BEFORE UPDATE ON public.message_attachments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_attachments_owner_access
ON public.message_attachments
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

-- ---------------------------------------------------------------------------
-- conversation sync cursor (gap recovery after reconnect)
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_sync_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_message_id UUID;
