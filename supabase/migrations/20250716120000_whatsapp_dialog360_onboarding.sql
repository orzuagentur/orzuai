-- 360dialog Integrated Onboarding (channel + client IDs from Partner Hub)

ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS dialog360_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS dialog360_client_id TEXT;

CREATE INDEX IF NOT EXISTS whatsapp_connections_dialog360_channel_id_idx
  ON public.whatsapp_connections (dialog360_channel_id);
