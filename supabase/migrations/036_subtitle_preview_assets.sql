-- Cached subtitle style preview thumbnails (R2 + public URL lookup)

create table if not exists public.subtitle_preview_assets (
  style_id text primary key,
  storage_path text not null,
  public_url text not null,
  source_url text,
  updated_at timestamptz not null default now()
);

alter table public.subtitle_preview_assets enable row level security;

-- Read/write via service role (web API) only
