CREATE TABLE public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  channel public.messaging_channel,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX canned_responses_business_id_idx
  ON public.canned_responses (business_id);

CREATE TRIGGER set_canned_responses_updated_at
BEFORE UPDATE ON public.canned_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own canned responses"
ON public.canned_responses
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS lead_score SMALLINT CHECK (lead_score >= 0 AND lead_score <= 100),
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;
