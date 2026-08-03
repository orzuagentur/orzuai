-- Microsoft Outlook / Microsoft 365 mailbox connections (Graph OAuth).
-- Tokens live in app_secrets; only secret key names are stored here.
-- Inbound sync uses Graph deltaLink polling (cron); outbound uses Graph sendMail.

CREATE TABLE public.outlook_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  status public.email_connection_status NOT NULL DEFAULT 'pending',
  outlook_address TEXT,
  access_token_secret_key_name TEXT,
  refresh_token_secret_key_name TEXT,
  token_expires_at TIMESTAMPTZ,
  delta_link TEXT,
  last_synced_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX outlook_connections_business_id_unique_idx
  ON public.outlook_connections (business_id);

ALTER TABLE public.outlook_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own outlook connections"
ON public.outlook_connections
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
