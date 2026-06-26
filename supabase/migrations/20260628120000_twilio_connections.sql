-- Twilio Connect integration (per-business authorized subaccount)

CREATE TYPE public.twilio_connection_status AS ENUM (
  'disconnected',
  'authorized',
  'connected'
);

CREATE TABLE public.twilio_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  twilio_status public.twilio_connection_status NOT NULL DEFAULT 'disconnected',
  connected_account_sid TEXT,
  account_friendly_name TEXT,
  phone_number TEXT,
  phone_sid TEXT,
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX twilio_connections_business_id_unique_idx
  ON public.twilio_connections (business_id);

CREATE INDEX twilio_connections_account_sid_idx
  ON public.twilio_connections (connected_account_sid)
  WHERE connected_account_sid IS NOT NULL;

ALTER TABLE public.twilio_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own twilio connections"
ON public.twilio_connections
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
