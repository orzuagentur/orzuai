-- Platform Error Intelligence Center: central event store for all ORZUAI failures/warnings.

create table if not exists public.platform_error_events (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  severity text not null default 'error'
    check (severity in ('critical', 'high', 'warning', 'info')),
  status text not null default 'open'
    check (status in ('open', 'investigating', 'resolved', 'ignored')),
  environment text not null default 'production'
    check (environment in ('production', 'preview', 'development', 'test')),
  module text not null default 'platform',
  category text not null default 'runtime',
  source text not null default 'app',
  title text not null,
  message text not null default '',
  description text not null default '',
  root_cause text,
  suggested_fix text,
  impact text,
  recurrence_risk text,
  business_id uuid references public.businesses (id) on delete set null,
  user_id uuid,
  conversation_id uuid,
  session_id text,
  correlation_id text,
  trace_id text,
  deployment_id text,
  commit_hash text,
  app_version text,
  region text,
  http_status integer,
  method text,
  path text,
  duration_ms integer,
  retry_count integer not null default 0,
  occurrences integer not null default 1,
  assigned_to uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  browser text,
  device text,
  ip inet,
  country text,
  language text,
  request_headers jsonb not null default '{}'::jsonb,
  request_body jsonb,
  response_body jsonb,
  stack_trace text,
  raw_log text,
  terminal jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  ai jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_error_events_last_seen_idx
  on public.platform_error_events (last_seen_at desc);

create index if not exists platform_error_events_status_severity_idx
  on public.platform_error_events (status, severity, last_seen_at desc);

create index if not exists platform_error_events_fingerprint_idx
  on public.platform_error_events (fingerprint);

create index if not exists platform_error_events_business_id_idx
  on public.platform_error_events (business_id, last_seen_at desc);

create index if not exists platform_error_events_module_category_idx
  on public.platform_error_events (module, category);

create index if not exists platform_error_events_source_idx
  on public.platform_error_events (source);

comment on table public.platform_error_events is
  'Central Error Intelligence Center store for platform-wide failures, warnings, and diagnostics.';

alter table public.platform_error_events enable row level security;

drop policy if exists platform_error_events_admin_all on public.platform_error_events;
create policy platform_error_events_admin_all
  on public.platform_error_events
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Service role / ingest uses service key (bypasses RLS). Admins can read via is_platform_admin().

create or replace function public.touch_platform_error_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists platform_error_events_set_updated_at on public.platform_error_events;
create trigger platform_error_events_set_updated_at
  before update on public.platform_error_events
  for each row
  execute function public.touch_platform_error_events_updated_at();
