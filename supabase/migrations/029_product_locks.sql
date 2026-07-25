-- Product feature locks (admin can mark tools as "under development")
create table if not exists public.product_locks (
  id int primary key default 1 check (id = 1),
  locks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.product_locks (id, locks)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.product_locks enable row level security;

-- Authenticated users can read locks (to gate UI)
drop policy if exists product_locks_select_authenticated on public.product_locks;
create policy product_locks_select_authenticated
  on public.product_locks
  for select
  to authenticated
  using (true);

-- Writes only via service role (admin API)
