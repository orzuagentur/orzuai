-- Personal Telegram account integration via MTProto (GramJS).
-- Separate from telegram_connections (Bot API). The encrypted StringSession is
-- stored in the platform secret vault; only the secret key name is referenced here.

CREATE TYPE public.telegram_user_status AS ENUM (
  'disconnected',
  'pending_code',
  'pending_password',
  'connected'
);

CREATE TABLE public.telegram_user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  status public.telegram_user_status NOT NULL DEFAULT 'disconnected',
  phone_number TEXT,
  phone_code_hash TEXT,
  telegram_user_id TEXT,
  username TEXT,
  first_name TEXT,
  -- Reference to the AES-256-GCM encrypted StringSession in the secret vault.
  session_secret_key_name TEXT,
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX telegram_user_connections_business_id_unique_idx
  ON public.telegram_user_connections (business_id);

CREATE INDEX telegram_user_connections_telegram_user_id_idx
  ON public.telegram_user_connections (telegram_user_id);

ALTER TABLE public.telegram_user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own telegram user connections"
ON public.telegram_user_connections
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
