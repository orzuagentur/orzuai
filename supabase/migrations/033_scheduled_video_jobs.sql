-- Distinguish a YouTube private scheduled upload from an already-public video.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'job_status'
      and e.enumlabel = 'scheduled'
  ) then
    alter type public.job_status add value 'scheduled' after 'ready';
  end if;
end $$;
