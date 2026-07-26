-- YouTube publish SLA + per-channel learning hardening.

alter table public.video_jobs
  add column if not exists planned_publish_at timestamptz,
  add column if not exists youtube_publish_at timestamptz,
  add column if not exists actual_publish_at timestamptz,
  add column if not exists publish_drift_seconds int,
  add column if not exists publish_strategy text,
  add column if not exists quality_checked_at timestamptz,
  add column if not exists quality_check jsonb not null default '{}'::jsonb;

create index if not exists video_jobs_planned_publish_idx
  on public.video_jobs (user_id, coalesce(youtube_channel_id, ''), planned_publish_at desc)
  where planned_publish_at is not null;

alter table public.published_videos
  add column if not exists planned_publish_at timestamptz,
  add column if not exists youtube_publish_at timestamptz,
  add column if not exists actual_publish_at timestamptz,
  add column if not exists publish_drift_seconds int;

alter table public.ai_learning_memory
  add column if not exists youtube_channel_id text;

create index if not exists ai_learning_user_channel_idx
  on public.ai_learning_memory (user_id, coalesce(youtube_channel_id, ''), created_at desc);

alter table public.comment_replies
  add column if not exists youtube_channel_id text;

create index if not exists comment_replies_user_channel_idx
  on public.comment_replies (user_id, coalesce(youtube_channel_id, ''), created_at desc);

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.youtube_channels
  where is_active = true
)
update public.youtube_channels yc
set is_active = false
from ranked r
where yc.id = r.id
  and r.rn > 1;

create unique index if not exists youtube_channels_one_active_uidx
  on public.youtube_channels (user_id)
  where is_active = true;

update public.publish_schedules
set
  videos_per_day = least(4, greatest(1, videos_per_day)),
  times = case
    when array_length(times, 1) > 4 then times[1:4]
    else times
  end;

alter table public.publish_schedules
  drop constraint if exists publish_schedules_videos_per_day_check;

alter table public.publish_schedules
  add constraint publish_schedules_videos_per_day_check
  check (videos_per_day between 1 and 4);

update public.profiles
set videos_per_day = least(4, greatest(1, videos_per_day));

alter table public.profiles
  drop constraint if exists profiles_videos_per_day_check;

alter table public.profiles
  add constraint profiles_videos_per_day_check
  check (videos_per_day between 1 and 4);

comment on column public.video_jobs.planned_publish_at is
  'User-facing target publish time from schedule/manual request.';
comment on column public.video_jobs.youtube_publish_at is
  'publishAt value accepted by YouTube for private scheduled uploads, or upload time for immediate public uploads.';
comment on column public.video_jobs.actual_publish_at is
  'Confirmed public publish time from YouTube sync, or upload completion time for immediate public uploads. Null while private scheduled.';
comment on column public.video_jobs.publish_drift_seconds is
  'actual_publish_at - planned_publish_at; should stay within SLA for immediate late uploads.';
