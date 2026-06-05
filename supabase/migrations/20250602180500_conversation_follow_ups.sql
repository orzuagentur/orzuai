CREATE TABLE public.conversation_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  follow_up_day SMALLINT NOT NULL CHECK (follow_up_day IN (1, 2)),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (conversation_id, follow_up_day)
);

CREATE INDEX conversation_follow_ups_business_id_idx
  ON public.conversation_follow_ups (business_id);

ALTER TABLE public.conversation_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation follow-ups"
ON public.conversation_follow_ups
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));
