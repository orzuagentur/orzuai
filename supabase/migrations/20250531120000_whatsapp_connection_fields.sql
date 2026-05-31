-- WhatsApp connection fields for Meta Cloud API integration

ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
  ADD COLUMN IF NOT EXISTS verification_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS whatsapp_connections_meta_phone_number_id_idx
  ON public.whatsapp_connections (meta_phone_number_id);
