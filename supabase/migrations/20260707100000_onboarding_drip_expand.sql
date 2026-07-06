-- Expand onboarding drip days and allow skipping completed users.

ALTER TABLE public.onboarding_drip_emails
  DROP CONSTRAINT IF EXISTS onboarding_drip_emails_drip_day_check;

ALTER TABLE public.onboarding_drip_emails
  ADD CONSTRAINT onboarding_drip_emails_drip_day_check
  CHECK (drip_day IN (0, 1, 2, 3, 5, 7));

ALTER TABLE public.onboarding_drip_emails
  ADD COLUMN IF NOT EXISTS drip_paused_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS onboarding_drip_emails_paused_idx
  ON public.onboarding_drip_emails (drip_paused_at)
  WHERE drip_paused_at IS NOT NULL;
