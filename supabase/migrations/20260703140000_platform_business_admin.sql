-- Platform admin: per-tenant controls, support channel, audit log

CREATE TABLE public.platform_business_controls (
  business_id UUID PRIMARY KEY REFERENCES public.businesses (id) ON DELETE CASCADE,
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'readonly')),
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  voice_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  automations_enabled BOOLEAN NOT NULL DEFAULT true,
  outbound_ai_enabled BOOLEAN NOT NULL DEFAULT true,
  admin_notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX platform_business_controls_status_idx
  ON public.platform_business_controls (account_status);

CREATE TRIGGER set_platform_business_controls_updated_at
BEFORE UPDATE ON public.platform_business_controls
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.platform_support_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses (id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT 'Поддержка OrzuX',
  last_message_at TIMESTAMPTZ,
  unread_by_platform INTEGER NOT NULL DEFAULT 0,
  unread_by_business INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX platform_support_threads_last_message_idx
  ON public.platform_support_threads (last_message_at DESC NULLS LAST);

CREATE TRIGGER set_platform_support_threads_updated_at
BEFORE UPDATE ON public.platform_support_threads
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.platform_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.platform_support_threads (id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('platform', 'business')),
  sender_admin_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  sender_business_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(btrim(content)) > 0),
  read_by_platform_at TIMESTAMPTZ,
  read_by_business_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX platform_support_messages_thread_created_idx
  ON public.platform_support_messages (thread_id, created_at ASC);

CREATE TABLE public.platform_business_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX platform_business_admin_audit_business_idx
  ON public.platform_business_admin_audit_log (business_id, created_at DESC);

CREATE INDEX platform_business_admin_audit_created_idx
  ON public.platform_business_admin_audit_log (created_at DESC);

ALTER TABLE public.platform_business_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_business_admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage business controls"
ON public.platform_business_controls
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Business owners read own controls"
ON public.platform_business_controls
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));

CREATE POLICY "Platform admins manage support threads"
ON public.platform_support_threads
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Business owners read own support thread"
ON public.platform_support_threads
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));

CREATE POLICY "Platform admins manage support messages"
ON public.platform_support_messages
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Business owners read own support messages"
ON public.platform_support_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.platform_support_threads AS t
    WHERE t.id = thread_id
      AND public.user_owns_business(t.business_id)
  )
);

CREATE POLICY "Business owners send support messages"
ON public.platform_support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_type = 'business'
  AND EXISTS (
    SELECT 1
    FROM public.platform_support_threads AS t
    WHERE t.id = thread_id
      AND public.user_owns_business(t.business_id)
  )
);

CREATE POLICY "Platform admins read business audit log"
ON public.platform_business_admin_audit_log
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins write business audit log"
ON public.platform_business_admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_business_controls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_support_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_support_messages TO authenticated;
GRANT SELECT, INSERT ON public.platform_business_admin_audit_log TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'platform_support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_support_messages;
  END IF;
END $$;
