CREATE TABLE public.platform_legal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  footer_label TEXT NOT NULL DEFAULT '',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  show_in_footer BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT platform_legal_pages_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT platform_legal_pages_sections_array CHECK (jsonb_typeof(sections) = 'array')
);

CREATE UNIQUE INDEX platform_legal_pages_slug_uidx ON public.platform_legal_pages (slug);
CREATE INDEX platform_legal_pages_sort_order_idx ON public.platform_legal_pages (sort_order ASC, title ASC);

CREATE TRIGGER set_platform_legal_pages_updated_at
BEFORE UPDATE ON public.platform_legal_pages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.platform_legal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published legal pages"
ON public.platform_legal_pages
FOR SELECT
TO anon, authenticated
USING (published = true);

CREATE POLICY "Platform admins manage legal pages"
ON public.platform_legal_pages
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());
