-- Human-readable OpenMoji metadata (from official openmoji.csv)
alter table public.openmoji
  add column if not exists name text,
  add column if not exists tags text,
  add column if not exists group_name text,
  add column if not exists subgroup text;

create index if not exists openmoji_name_idx on public.openmoji (name);
create index if not exists openmoji_group_idx on public.openmoji (group_name);

comment on column public.openmoji.name is 'OpenMoji annotation (English name)';
comment on column public.openmoji.tags is 'Comma-separated search tags from OpenMoji';
