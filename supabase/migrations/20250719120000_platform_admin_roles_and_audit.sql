ALTER TABLE public.platform_admins
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin'
  CONSTRAINT platform_admins_role_check
  CHECK (role IN ('owner', 'admin', 'support'));

-- Promote the earliest platform admin to owner (bootstrap).
UPDATE public.platform_admins
SET role = 'owner'
WHERE user_id = (
  SELECT user_id
  FROM public.platform_admins
  ORDER BY created_at ASC
  LIMIT 1
);

CREATE TABLE public.platform_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  target_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL CHECK (action IN ('added', 'removed', 'role_updated')),
  actor_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX platform_admin_audit_log_created_at_idx
ON public.platform_admin_audit_log (created_at DESC);

ALTER TABLE public.platform_admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read team audit log"
ON public.platform_admin_audit_log
FOR SELECT
TO authenticated
USING (public.is_platform_admin());
