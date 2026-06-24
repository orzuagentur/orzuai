ALTER TABLE public.ai_assistant_profile
ADD COLUMN reply_wait_ms INTEGER NOT NULL DEFAULT 1500
  CHECK (reply_wait_ms >= 1500 AND reply_wait_ms <= 8000 AND mod(reply_wait_ms, 500) = 0);

ALTER TABLE public.ai_assistant_profile
ADD COLUMN schedule_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.ai_assistant_profile
ADD COLUMN schedule_timezone TEXT NOT NULL DEFAULT 'UTC';

ALTER TABLE public.ai_assistant_profile
ADD COLUMN schedule_slots JSONB NOT NULL DEFAULT '[]'::jsonb;
