alter table public.voice_call_logs
  add column if not exists custom_prompt text;

comment on column public.voice_call_logs.custom_prompt is
  'Optional per-call AI objective supplied by the operator before an outbound AI call.';
