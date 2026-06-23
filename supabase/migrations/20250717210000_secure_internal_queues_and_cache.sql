-- Lock down internal queue/cache tables that are only meant for service-role workers.

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'inbound_webhook_queue',
    'media_signed_url_cache',
    'ai_reply_jobs',
    'ai_orchestration_jobs'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    END IF;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS service_role_inbound_webhook_queue ON public.inbound_webhook_queue;
CREATE POLICY service_role_inbound_webhook_queue
  ON public.inbound_webhook_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_media_signed_url_cache ON public.media_signed_url_cache;
CREATE POLICY service_role_media_signed_url_cache
  ON public.media_signed_url_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_ai_reply_jobs ON public.ai_reply_jobs;
CREATE POLICY service_role_ai_reply_jobs
  ON public.ai_reply_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_ai_orchestration_jobs ON public.ai_orchestration_jobs;
CREATE POLICY service_role_ai_orchestration_jobs
  ON public.ai_orchestration_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON FUNCTION public.upsert_ai_reply_job(
  UUID,
  UUID,
  public.messaging_channel,
  TEXT
) FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.claim_ai_reply_jobs(INTEGER)
  FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.claim_ai_orchestration_jobs(INTEGER)
  FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.claim_inbound_webhook_jobs(INTEGER)
  FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.upsert_ai_reply_job(
  UUID,
  UUID,
  public.messaging_channel,
  TEXT
) TO service_role;

GRANT EXECUTE ON FUNCTION public.claim_ai_reply_jobs(INTEGER)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.claim_ai_orchestration_jobs(INTEGER)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.claim_inbound_webhook_jobs(INTEGER)
  TO service_role;
