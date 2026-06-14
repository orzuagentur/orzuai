-- Provider-ready signed URLs for outbound media delivery (no re-download from Storage)

ALTER TABLE public.message_attachments
  ADD COLUMN IF NOT EXISTS provider_media_url TEXT,
  ADD COLUMN IF NOT EXISTS provider_media_url_expires_at TIMESTAMPTZ;
