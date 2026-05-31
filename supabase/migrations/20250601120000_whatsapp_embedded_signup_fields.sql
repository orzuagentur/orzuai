-- Meta Embedded Signup fields for WhatsApp connections

ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS meta_waba_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_business_account_id TEXT;

CREATE INDEX IF NOT EXISTS whatsapp_connections_meta_waba_id_idx
  ON public.whatsapp_connections (meta_waba_id);
