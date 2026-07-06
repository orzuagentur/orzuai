-- Team invite tokens, acceptance tracking, and member onboarding state.

ALTER TABLE public.business_members
  ADD COLUMN IF NOT EXISTS invite_token TEXT,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS team_onboarding_completed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS business_members_invite_token_unique_idx
  ON public.business_members (invite_token)
  WHERE invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS business_members_invite_expires_idx
  ON public.business_members (invite_expires_at)
  WHERE status = 'invited';

COMMENT ON COLUMN public.business_members.invite_token IS
  'Opaque token embedded in invite email links.';

COMMENT ON COLUMN public.business_members.invite_expires_at IS
  'Invite link expiry chosen by owner (1-7 days).';

COMMENT ON COLUMN public.business_members.team_onboarding_completed_at IS
  'When the invited member finished role-based team onboarding.';
