CREATE TABLE public.email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('auth', 'onboarding', 'transactional', 'booking', 'team', 'system', 'admin')
  ),
  description TEXT NOT NULL DEFAULT '',
  subject_template TEXT NOT NULL,
  body_html_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT REFERENCES public.email_templates(id) ON DELETE SET NULL,
  resend_id TEXT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'delivered', 'bounced')),
  error_message TEXT,
  user_id UUID,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX email_send_log_created_at_idx ON public.email_send_log (created_at DESC);
CREATE INDEX email_send_log_template_idx ON public.email_send_log (template_id);
CREATE INDEX email_send_log_to_email_idx ON public.email_send_log (to_email);
CREATE INDEX email_send_log_status_idx ON public.email_send_log (status);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

INSERT INTO public.email_templates (id, name, category, description, subject_template, is_system) VALUES
  ('verification', 'Email verification', 'auth', 'Sent when a user registers with email.', 'Confirm your OrzuX email', true),
  ('magic_link', 'Magic link sign-in', 'auth', 'Passwordless sign-in link.', 'Sign in to OrzuX', true),
  ('password_reset', 'Password reset', 'auth', 'Password recovery link.', 'Reset your OrzuX password', true),
  ('google_welcome', 'Google welcome', 'onboarding', 'Welcome email after Google sign-up.', 'Welcome to OrzuX — glad you''re here', true),
  ('onboarding_drip', 'Onboarding drip', 'onboarding', 'Automated setup tips (days 0–7).', 'OrzuX setup guide', true),
  ('team_invite', 'Team invitation', 'team', 'Invite a teammate to a business workspace.', 'You''ve been invited to join a team on OrzuX', true),
  ('booking_confirmation', 'Booking confirmation', 'booking', 'Customer booking confirmed.', 'Booking confirmed', true),
  ('booking_action', 'Booking update', 'booking', 'Booking updated or cancelled.', 'Booking update', true),
  ('lead_follow_up', 'Lead follow-up', 'transactional', 'Auto-reply after website form submission.', 'Thank you for contacting us', true),
  ('system_notification', 'System notification', 'system', 'Platform system messages.', 'Notification from OrzuX', true),
  ('admin_invite', 'Admin invite', 'admin', 'Platform admin panel invitation.', 'OrzuX Admin access', true),
  ('platform_broadcast', 'Platform broadcast', 'system', 'Global email to all platform users.', 'Message from OrzuX', true)
ON CONFLICT (id) DO NOTHING;
