-- User presentation library metadata (JSON docs live in Cloudflare R2)

create table if not exists public.presentation_library (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Presentation',
  format text not null default 'pdf' check (format in ('pdf', 'word')),
  source text not null default 'classic' check (source in ('ai', 'classic')),
  storage_path text not null,
  storage_bucket text not null default 'orzu-media',
  slide_count integer not null default 0,
  info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists presentation_library_user_idx
  on public.presentation_library (user_id, updated_at desc);

alter table public.presentation_library enable row level security;

drop policy if exists presentation_library_select_own on public.presentation_library;
create policy presentation_library_select_own
  on public.presentation_library for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists presentation_library_insert_own on public.presentation_library;
create policy presentation_library_insert_own
  on public.presentation_library for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists presentation_library_update_own on public.presentation_library;
create policy presentation_library_update_own
  on public.presentation_library for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists presentation_library_delete_own on public.presentation_library;
create policy presentation_library_delete_own
  on public.presentation_library for delete
  to authenticated
  using (auth.uid() = user_id);
