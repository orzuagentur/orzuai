-- Website Knowledge Sync: crawl site → knowledge_base for AI replies

CREATE TYPE public.website_knowledge_sync_status AS ENUM (
  'idle',
  'syncing',
  'ready',
  'error'
);

CREATE TABLE public.website_knowledge_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  sync_status public.website_knowledge_sync_status NOT NULL DEFAULT 'idle',
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sync_interval_hours INTEGER NOT NULL DEFAULT 168,
  last_synced_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  pages_indexed INTEGER NOT NULL DEFAULT 0,
  entries_synced INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX website_knowledge_syncs_business_id_unique_idx
  ON public.website_knowledge_syncs (business_id);

CREATE INDEX website_knowledge_syncs_next_sync_at_idx
  ON public.website_knowledge_syncs (next_sync_at)
  WHERE auto_sync_enabled = TRUE AND sync_status <> 'syncing';

CREATE TRIGGER set_website_knowledge_syncs_updated_at
BEFORE UPDATE ON public.website_knowledge_syncs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.website_knowledge_syncs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own website knowledge syncs"
ON public.website_knowledge_syncs
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS source_url TEXT;

ALTER TABLE public.knowledge_base
  DROP CONSTRAINT IF EXISTS knowledge_base_source_check;

ALTER TABLE public.knowledge_base
  ADD CONSTRAINT knowledge_base_source_check
  CHECK (source IN ('manual', 'website_sync'));

CREATE INDEX IF NOT EXISTS knowledge_base_business_id_source_idx
  ON public.knowledge_base (business_id, source);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_base_business_source_url_unique_idx
  ON public.knowledge_base (business_id, source_url)
  WHERE source_url IS NOT NULL;
