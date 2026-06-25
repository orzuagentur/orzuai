CREATE TABLE public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE user_id = auth.uid()
  );
$$;

CREATE TABLE public.app_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT app_secrets_key_name_format CHECK (key_name ~ '^[A-Z][A-Z0-9_]*$')
);

CREATE UNIQUE INDEX app_secrets_key_name_uidx ON public.app_secrets (key_name);

CREATE INDEX app_secrets_updated_at_idx ON public.app_secrets (updated_at DESC);

CREATE TRIGGER set_app_secrets_updated_at
BEFORE UPDATE ON public.app_secrets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.app_secret_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id UUID REFERENCES public.app_secrets (id) ON DELETE SET NULL,
  key_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'viewed', 'tested')),
  actor_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX app_secret_audit_log_created_at_idx
ON public.app_secret_audit_log (created_at DESC);

CREATE INDEX app_secret_audit_log_key_name_idx
ON public.app_secret_audit_log (key_name);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_secret_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage app secrets"
ON public.app_secrets
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Platform admins read audit log"
ON public.app_secret_audit_log
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins write audit log"
ON public.app_secret_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Platform admins read platform_admins"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_secrets TO authenticated;
GRANT SELECT, INSERT ON public.app_secret_audit_log TO authenticated;
GRANT SELECT ON public.platform_admins TO authenticated;
