-- Granular team member permissions and optional access window.

ALTER TABLE public.business_members
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS access_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.business_members.permissions IS
  'Optional permission overrides keyed by dashboard area (inbox, crm, calendar, etc.).';

COMMENT ON COLUMN public.business_members.access_starts_at IS
  'Optional start of member access window. NULL means immediate access when active.';

COMMENT ON COLUMN public.business_members.access_ends_at IS
  'Optional end of member access window. NULL means no expiry.';
