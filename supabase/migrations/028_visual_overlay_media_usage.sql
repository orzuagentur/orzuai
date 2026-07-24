-- Allow worker to record emoji/icon overlays used in AI Video generations.
alter table public.media_usage drop constraint if exists media_usage_provider_check;
alter table public.media_usage
  add constraint media_usage_provider_check
  check (
    provider in (
      'pexels',
      'jamendo',
      'heygen',
      'topic',
      'library',
      'openmoji',
      'iconify'
    )
  );
