alter table public.voice_call_queue
  drop constraint if exists voice_call_queue_status_check;

alter table public.voice_call_queue
  add constraint voice_call_queue_status_check
  check (status in ('pending', 'processing', 'completed', 'failed'));

alter table public.voice_call_queue
  add column if not exists processing_started_at timestamptz,
  add column if not exists attempts integer not null default 0,
  add column if not exists last_error text;

create index if not exists voice_call_queue_processing_started_at_idx
  on public.voice_call_queue (processing_started_at)
  where status = 'processing';
