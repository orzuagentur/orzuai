-- AI-P1-A04: End-of-conversation CRM batch mode
ALTER TABLE public.ai_assistant_profile
  ADD COLUMN IF NOT EXISTS crm_update_mode TEXT NOT NULL DEFAULT 'every_message';

ALTER TABLE public.ai_assistant_profile
  DROP CONSTRAINT IF EXISTS ai_assistant_profile_crm_update_mode_check;

ALTER TABLE public.ai_assistant_profile
  ADD CONSTRAINT ai_assistant_profile_crm_update_mode_check
  CHECK (crm_update_mode IN ('every_message', 'idle_5min', 'on_resolve'));

COMMENT ON COLUMN public.ai_assistant_profile.crm_update_mode IS
  'When to run background CRM orchestration: every_message | idle_5min | on_resolve.';
