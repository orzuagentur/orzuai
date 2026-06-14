-- Realtime delivery status: conversation-scoped message_deliveries updates

ALTER TABLE public.message_deliveries
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations (id) ON DELETE CASCADE;

UPDATE public.message_deliveries AS d
SET conversation_id = m.conversation_id
FROM public.messages AS m
WHERE m.id = d.message_id
  AND d.conversation_id IS NULL;

CREATE INDEX IF NOT EXISTS message_deliveries_conversation_id_idx
  ON public.message_deliveries (conversation_id);

ALTER TABLE public.message_deliveries REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'message_deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_deliveries;
  END IF;
END
$$;
