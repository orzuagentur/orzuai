CREATE TABLE public.onboarding_drip_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  drip_day SMALLINT NOT NULL CHECK (drip_day IN (0, 1, 3)),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX onboarding_drip_emails_user_day_unique_idx
  ON public.onboarding_drip_emails (user_id, drip_day);

CREATE INDEX onboarding_drip_emails_sent_at_idx
  ON public.onboarding_drip_emails (sent_at);

ALTER TABLE public.onboarding_drip_emails ENABLE ROW LEVEL SECURITY;
