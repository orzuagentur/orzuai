ALTER TABLE public.voice_agent_config
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS voice_language TEXT NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS voice_system_prompt TEXT;

CREATE TABLE public.voice_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  call_sid TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  turns JSONB NOT NULL DEFAULT '[]'::jsonb,
  turn_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX voice_call_sessions_call_sid_idx
  ON public.voice_call_sessions (call_sid);

CREATE TRIGGER set_voice_call_sessions_updated_at
BEFORE UPDATE ON public.voice_call_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.voice_call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages voice call sessions"
ON public.voice_call_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
