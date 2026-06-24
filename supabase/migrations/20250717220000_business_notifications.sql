CREATE TABLE public.business_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('ai_action', 'human_request')),
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts (id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT 'Customer',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '{}',
  source_id UUID,
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX business_notifications_business_created_idx
ON public.business_notifications (business_id, created_at DESC);

CREATE INDEX business_notifications_business_unread_idx
ON public.business_notifications (business_id)
WHERE read_at IS NULL;

CREATE INDEX business_notifications_human_source_idx
ON public.business_notifications (business_id, source_id)
WHERE kind = 'human_request' AND source_id IS NOT NULL;

ALTER TABLE public.business_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business notifications"
ON public.business_notifications
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));

CREATE POLICY "Users can update own business notifications"
ON public.business_notifications
FOR UPDATE
TO authenticated
USING (public.user_owns_business(business_id));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'business_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.business_notifications;
  END IF;
END $$;
