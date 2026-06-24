ALTER TABLE public.ai_assistant_profile
  ADD COLUMN IF NOT EXISTS voice_reply_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS elevenlabs_voice_id text,
  ADD COLUMN IF NOT EXISTS elevenlabs_voice_name text,
  ADD COLUMN IF NOT EXISTS voice_reply_mode text NOT NULL DEFAULT 'mirror'
    CHECK (voice_reply_mode IN ('mirror', 'always'));
