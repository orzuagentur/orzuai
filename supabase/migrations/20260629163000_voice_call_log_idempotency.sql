create unique index if not exists voice_call_logs_business_external_call_id_unique
  on public.voice_call_logs (business_id, external_call_id)
  where external_call_id is not null;
