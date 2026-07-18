-- Fix invalid default severity on platform_error_events.

alter table public.platform_error_events
  alter column severity set default 'high';
