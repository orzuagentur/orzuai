-- Telegram Bot API integration (v2 prepare)

CREATE TYPE public.telegram_status AS ENUM (
  'connected',
  'disconnected',
  'pending'
);

CREATE TABLE public.telegram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  bot_username TEXT NOT NULL DEFAULT '',
  telegram_status public.telegram_status NOT NULL DEFAULT 'pending',
  telegram_bot_id TEXT,
  bot_token TEXT,
  webhook_secret TEXT,
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX telegram_connections_business_id_unique_idx
  ON public.telegram_connections (business_id);

CREATE INDEX telegram_connections_telegram_bot_id_idx
  ON public.telegram_connections (telegram_bot_id);

ALTER TABLE public.telegram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own telegram connections"
ON public.telegram_connections
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
