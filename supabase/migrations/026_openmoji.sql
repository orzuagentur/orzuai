-- OpenMoji platform emoji catalog (SVG files in Storage bucket "openmoji")
create table if not exists public.openmoji (
  hex text primary key,
  filename text not null,
  storage_path text not null,
  public_url text not null,
  byte_size int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists openmoji_filename_idx on public.openmoji (filename);

alter table public.openmoji enable row level security;

drop policy if exists "Anyone can read openmoji" on public.openmoji;
create policy "Anyone can read openmoji"
  on public.openmoji for select
  using (true);

comment on table public.openmoji is
  'OpenMoji color SVG catalog. Files live in Storage bucket openmoji / {hex}.svg';
