-- Editable public site content (landing sections, FAQ, documentation).
-- Platform admins edit via admin Content Studio; public site reads with code fallbacks.

create table if not exists public.platform_site_documents (
  id uuid primary key default gen_random_uuid(),
  collection text not null check (collection in ('landing', 'docs', 'faq')),
  doc_key text not null,
  locale text not null default 'en' check (locale in ('en', 'ru', 'uz')),
  title text not null,
  summary text not null default '',
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection, doc_key, locale)
);

create index if not exists platform_site_documents_collection_idx
  on public.platform_site_documents (collection, locale, sort_order);

create index if not exists platform_site_documents_published_idx
  on public.platform_site_documents (published)
  where published = true;

alter table public.platform_site_documents enable row level security;

-- Public read of published docs only (anon/authenticated). Writes via service role.
create policy "platform_site_documents_public_read"
  on public.platform_site_documents
  for select
  to anon, authenticated
  using (published = true);

comment on table public.platform_site_documents is
  'CMS documents for landing, FAQ, and product docs. Edited in OrzuX Admin Content Studio.';
