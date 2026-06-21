-- AI usage call types + assistant fallback reply message

ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS call_type TEXT NOT NULL DEFAULT 'auto_reply';

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_call_type_check;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_call_type_check
  CHECK (
    call_type IN (
      'auto_reply',
      'orchestrator',
      'sentiment',
      'bant',
      'follow_up',
      'automation',
      'intent',
      'crm_plan',
      'analytics',
      'voice',
      'other'
    )
  );

CREATE INDEX IF NOT EXISTS ai_usage_logs_business_call_type_idx
  ON public.ai_usage_logs (business_id, call_type, created_at DESC);

ALTER TABLE public.ai_assistant_profile
  ADD COLUMN IF NOT EXISTS fallback_reply_message TEXT;
