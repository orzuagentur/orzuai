-- Personal WhatsApp (Web/QR, Baileys multi-device) connection metadata.
-- The encrypted Baileys auth state (creds + signal keys) lives in the app
-- secret vault; only a reference key name is stored here. The latest QR code is
-- relayed through this row (Supabase Realtime) so the browser can render it.

CREATE TYPE public.whatsapp_web_status AS ENUM (
  'disconnected',
  'pending_qr',
  'connected'
);

CREATE TABLE public.whatsapp_web_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  status public.whatsapp_web_status NOT NULL DEFAULT 'disconnected',
  phone_number TEXT,
  qr_code TEXT,
  qr_expires_at TIMESTAMPTZ,
  creds_secret_key_name TEXT,
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX whatsapp_web_connections_business_id_unique_idx
  ON public.whatsapp_web_connections (business_id);

ALTER TABLE public.whatsapp_web_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own whatsapp web connections"
ON public.whatsapp_web_connections
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

-- Relay QR/status changes to the browser in real time (RLS still applies).
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_web_connections;
