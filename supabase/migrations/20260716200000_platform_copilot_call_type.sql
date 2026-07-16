-- Allow platform_copilot usage logging (operator helper, not customer-facing)

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
      'conversation_summary',
      'voice',
      'voice_stt',
      'voice_tts',
      'platform_copilot',
      'other'
    )
  );
