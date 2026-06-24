-- Ensure AI reply queue RPCs run with table-owner privileges (bypass RLS edge cases)
-- and remain executable only by service_role workers.

ALTER FUNCTION public.upsert_ai_reply_job(
  UUID,
  UUID,
  public.messaging_channel,
  TEXT
)
  SECURITY DEFINER
  SET search_path = public;

ALTER FUNCTION public.claim_ai_reply_jobs(INTEGER)
  SECURITY DEFINER
  SET search_path = public;

GRANT EXECUTE ON FUNCTION public.upsert_ai_reply_job(
  UUID,
  UUID,
  public.messaging_channel,
  TEXT
) TO service_role;

GRANT EXECUTE ON FUNCTION public.claim_ai_reply_jobs(INTEGER)
  TO service_role;
