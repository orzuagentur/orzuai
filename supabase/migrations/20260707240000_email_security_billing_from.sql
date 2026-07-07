-- Configurable sender per template + security/billing automation templates

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS from_email TEXT;

ALTER TABLE public.email_templates
  DROP CONSTRAINT IF EXISTS email_templates_category_check;

ALTER TABLE public.email_templates
  ADD CONSTRAINT email_templates_category_check CHECK (
    category IN (
      'auth',
      'onboarding',
      'transactional',
      'booking',
      'team',
      'system',
      'admin',
      'billing'
    )
  );

CREATE TABLE IF NOT EXISTS public.user_auth_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_label TEXT NOT NULL,
  user_agent TEXT,
  last_ip TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS user_auth_devices_user_id_idx
  ON public.user_auth_devices (user_id);

ALTER TABLE public.user_auth_devices ENABLE ROW LEVEL SECURITY;

INSERT INTO public.email_templates (
  id,
  name,
  category,
  description,
  subject_template,
  from_email,
  is_system
) VALUES
  (
    'password_changed',
    'Password changed',
    'auth',
    'Sent when a user updates their account password.',
    'Your OrzuX password was changed',
    'security',
    true
  ),
  (
    'new_device_login',
    'New device sign-in',
    'auth',
    'Sent when a user signs in from a new browser or device.',
    'New sign-in to your OrzuX account',
    'security',
    true
  ),
  (
    'subscription_purchased',
    'Subscription purchased',
    'billing',
    'Sent when a business subscribes to a paid plan for the first time.',
    'Your OrzuX subscription is active',
    'billing',
    true
  ),
  (
    'subscription_renewed',
    'Subscription renewed',
    'billing',
    'Sent when a monthly subscription payment is successfully charged.',
    'Your OrzuX subscription was renewed',
    'billing',
    true
  ),
  (
    'subscription_plan_changed',
    'Subscription plan changed',
    'billing',
    'Sent when a business upgrades or downgrades its subscription plan.',
    'Your OrzuX plan was updated',
    'billing',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  subject_template = EXCLUDED.subject_template,
  from_email = COALESCE(public.email_templates.from_email, EXCLUDED.from_email);

UPDATE public.email_templates
SET from_email = 'security'
WHERE id IN ('verification', 'magic_link', 'password_reset', 'admin_invite')
  AND from_email IS NULL;

UPDATE public.email_templates
SET from_email = 'hello'
WHERE id IN ('google_welcome', 'team_invite', 'platform_broadcast')
  AND from_email IS NULL;

UPDATE public.email_templates
SET from_email = 'noreply'
WHERE id IN (
  'onboarding_drip',
  'lead_follow_up',
  'booking_confirmation',
  'booking_action',
  'system_notification'
)
  AND from_email IS NULL;
