-- Allow historical handoff rows; only one pending request per conversation.

DROP INDEX IF EXISTS public.ai_human_requests_business_conversation_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS ai_human_requests_pending_conversation_uidx
  ON public.ai_human_requests (business_id, conversation_id)
  WHERE status = 'pending';
