-- Flexible knowledge categories per business + structured row metadata.

create table if not exists public.knowledge_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  layout_kind text not null default 'generic'
    check (layout_kind in (
      'services', 'pricing', 'faq', 'hours', 'contact', 'address', 'policies', 'generic'
    )),
  is_system boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug)
);

create index if not exists knowledge_categories_business_id_idx
  on public.knowledge_categories (business_id, sort_order, name);

alter table public.knowledge_base
  alter column category type text using category::text;

alter table public.knowledge_base
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.knowledge_base.metadata is
  'Structured fields for spreadsheet rows, e.g. {"price":"€50","unit":"session"}.';

comment on table public.knowledge_categories is
  'Per-business knowledge category cards. System rows seed defaults; custom rows allowed.';

alter table public.knowledge_categories enable row level security;

drop policy if exists knowledge_categories_select_own on public.knowledge_categories;
create policy knowledge_categories_select_own
  on public.knowledge_categories for select
  using (public.user_can_access_business(business_id));

drop policy if exists knowledge_categories_insert_own on public.knowledge_categories;
create policy knowledge_categories_insert_own
  on public.knowledge_categories for insert
  with check (public.user_can_access_business(business_id));

drop policy if exists knowledge_categories_update_own on public.knowledge_categories;
create policy knowledge_categories_update_own
  on public.knowledge_categories for update
  using (public.user_can_access_business(business_id))
  with check (public.user_can_access_business(business_id));

drop policy if exists knowledge_categories_delete_own on public.knowledge_categories;
create policy knowledge_categories_delete_own
  on public.knowledge_categories for delete
  using (public.user_can_access_business(business_id));
