-- Phase 4: Redis-ready cache, thumbnails, email/facebook channels

-- ---------------------------------------------------------------------------
-- Extend messaging_channel enum
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum AS e
    INNER JOIN pg_type AS t ON e.enumtypid = t.oid
    WHERE t.typname = 'messaging_channel'
      AND e.enumlabel = 'facebook_messenger'
  ) THEN
    ALTER TYPE public.messaging_channel ADD VALUE 'facebook_messenger';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum AS e
    INNER JOIN pg_type AS t ON e.enumtypid = t.oid
    WHERE t.typname = 'messaging_channel'
      AND e.enumlabel = 'email'
  ) THEN
    ALTER TYPE public.messaging_channel ADD VALUE 'email';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Attachment thumbnails
-- ---------------------------------------------------------------------------
ALTER TABLE public.message_attachments
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
  ADD COLUMN IF NOT EXISTS thumb_width INTEGER,
  ADD COLUMN IF NOT EXISTS thumb_height INTEGER;
