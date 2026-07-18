-- Stream Error Intelligence events to subscribed admin clients (idempotent).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'platform_error_events'
  ) then
    alter publication supabase_realtime add table public.platform_error_events;
  end if;
end $$;
