-- Instagram Direct / Meta Messaging integration (v2 prepare)

CREATE TYPE public.instagram_status AS ENUM (
  'connected',
  'disconnected',
  'pending'
);

CREATE TABLE public.instagram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  instagram_username TEXT NOT NULL DEFAULT '',
  instagram_status public.instagram_status NOT NULL DEFAULT 'pending',
  meta_page_id TEXT,
  meta_ig_user_id TEXT,
  meta_access_token TEXT,
  meta_business_account_id TEXT,
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX instagram_connections_business_id_unique_idx
  ON public.instagram_connections (business_id);

CREATE INDEX instagram_connections_meta_ig_user_id_idx
  ON public.instagram_connections (meta_ig_user_id);

ALTER TABLE public.instagram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own instagram connections"
ON public.instagram_connections
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
