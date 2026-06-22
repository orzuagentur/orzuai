-- Gmail integration (OAuth + inbox sync)

CREATE TYPE public.email_connection_status AS ENUM (
  'connected',
  'disconnected',
  'pending'
);

CREATE TABLE public.email_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  email_status public.email_connection_status NOT NULL DEFAULT 'pending',
  gmail_address TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  history_id TEXT,
  last_synced_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX email_connections_business_id_unique_idx
  ON public.email_connections (business_id);

ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own email connections"
ON public.email_connections
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
