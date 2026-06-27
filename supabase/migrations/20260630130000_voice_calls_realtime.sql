CREATE POLICY "Users can view own voice call sessions"
ON public.voice_call_sessions
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'voice_call_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_call_logs;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'voice_call_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_call_sessions;
  END IF;
END $$;
