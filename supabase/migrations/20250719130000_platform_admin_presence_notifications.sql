ALTER TABLE public.platform_admins
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_present BOOLEAN NOT NULL DEFAULT false;

UPDATE public.platform_admins
SET
  invited_at = COALESCE(invited_at, created_at),
  accepted_at = COALESCE(accepted_at, created_at)
WHERE invited_at IS NULL OR accepted_at IS NULL;

CREATE TABLE public.platform_admin_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  email TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'online', 'offline')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX platform_admin_activity_created_at_idx
ON public.platform_admin_activity (created_at DESC);

CREATE TABLE public.platform_admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN ('invite_accepted', 'admin_online', 'admin_offline')
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  actor_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX platform_admin_notifications_recipient_idx
ON public.platform_admin_notifications (recipient_user_id, created_at DESC);

ALTER TABLE public.platform_admin_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read activity feed"
ON public.platform_admin_activity
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins read own notifications"
ON public.platform_admin_notifications
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin()
  AND recipient_user_id = auth.uid()
);

CREATE POLICY "Platform admins mark own notifications read"
ON public.platform_admin_notifications
FOR UPDATE
TO authenticated
USING (
  public.is_platform_admin()
  AND recipient_user_id = auth.uid()
)
WITH CHECK (
  public.is_platform_admin()
  AND recipient_user_id = auth.uid()
);
