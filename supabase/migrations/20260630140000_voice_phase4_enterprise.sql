-- Phase 4: recording, handoff, SMS, business hours, conversation link
ALTER TABLE public.voice_call_logs
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS recording_sid TEXT,
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS human_handled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS voice_call_logs_conversation_id_idx
  ON public.voice_call_logs (conversation_id)
  WHERE conversation_id IS NOT NULL;

ALTER TABLE public.voice_agent_config
  ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS business_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_hours_start TEXT NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS business_hours_end TEXT NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS business_timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS business_days INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5],
  ADD COLUMN IF NOT EXISTS after_hours_message TEXT NOT NULL DEFAULT 'Thank you for calling. We are currently closed. Please call back during business hours.';
