CREATE TABLE public.ai_human_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts (id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT 'Customer',
  reason TEXT NOT NULL,
  message_preview TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX ai_human_requests_business_conversation_uidx
ON public.ai_human_requests (business_id, conversation_id);

CREATE INDEX ai_human_requests_business_created_idx
ON public.ai_human_requests (business_id, created_at DESC);

ALTER TABLE public.ai_human_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai human requests"
ON public.ai_human_requests
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));

CREATE POLICY "Users can delete own ai human requests"
ON public.ai_human_requests
FOR DELETE
TO authenticated
USING (public.user_owns_business(business_id));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ai_human_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_human_requests;
  END IF;
END $$;
