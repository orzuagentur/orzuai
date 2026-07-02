-- Platform announcements broadcast to tenant dashboards

CREATE TABLE public.platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) > 0),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) > 0),
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  target_audience TEXT NOT NULL DEFAULT 'all'
    CHECK (
      target_audience IN (
        'all',
        'free',
        'starter',
        'pro',
        'agency',
        'business_ids'
      )
    ),
  target_business_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX platform_announcements_active_idx
  ON public.platform_announcements (is_active, starts_at, ends_at);

CREATE TRIGGER set_platform_announcements_updated_at
BEFORE UPDATE ON public.platform_announcements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.platform_announcement_dismissals (
  announcement_id UUID NOT NULL
    REFERENCES public.platform_announcements (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX platform_announcement_dismissals_user_idx
  ON public.platform_announcement_dismissals (user_id);

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_announcement_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage announcements"
ON public.platform_announcements
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Tenants read matching active announcements"
ON public.platform_announcements
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (starts_at IS NULL OR starts_at <= timezone('utc', now()))
  AND (ends_at IS NULL OR ends_at >= timezone('utc', now()))
  AND (
    target_audience = 'all'
    OR (
      target_audience IN ('free', 'starter', 'pro', 'agency')
      AND EXISTS (
        SELECT 1
        FROM public.businesses AS b
        WHERE b.user_id = auth.uid()
          AND b.subscription_plan = target_audience
      )
    )
    OR (
      target_audience = 'business_ids'
      AND EXISTS (
        SELECT 1
        FROM public.businesses AS b
        WHERE b.user_id = auth.uid()
          AND b.id = ANY (target_business_ids)
      )
    )
  )
);

CREATE POLICY "Platform admins manage announcement dismissals"
ON public.platform_announcement_dismissals
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Users dismiss announcements for themselves"
ON public.platform_announcement_dismissals
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own announcement dismissals"
ON public.platform_announcement_dismissals
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_announcement_dismissals TO authenticated;

-- Allow business owners to mark support messages as read
CREATE POLICY "Business owners update own support thread"
ON public.platform_support_threads
FOR UPDATE
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
