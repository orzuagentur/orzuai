-- Google Calendar OAuth integration

CREATE TYPE public.google_calendar_status AS ENUM (
  'connected',
  'disconnected',
  'pending'
);

CREATE TABLE public.google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  google_calendar_status public.google_calendar_status NOT NULL DEFAULT 'pending',
  google_account_email TEXT,
  calendar_id TEXT,
  calendar_summary TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX google_calendar_connections_business_id_unique_idx
  ON public.google_calendar_connections (business_id);

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own google calendar connections"
ON public.google_calendar_connections
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
