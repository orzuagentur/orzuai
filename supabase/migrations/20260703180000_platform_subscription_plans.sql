-- Platform-managed subscription plans (prices, entitlements, Stripe IDs)

CREATE TABLE public.platform_subscription_plans (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  price_monthly_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_monthly_cents >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  highlighted BOOLEAN NOT NULL DEFAULT false,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  entitlements JSONB NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX platform_subscription_plans_active_sort_idx
  ON public.platform_subscription_plans (is_active, sort_order ASC);

CREATE TRIGGER set_platform_subscription_plans_updated_at
BEFORE UPDATE ON public.platform_subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_subscription_plan_check;

ALTER TABLE public.platform_subscription_plans ENABLE ROW LEVEL SECURITY;

INSERT INTO public.platform_subscription_plans (
  id,
  label,
  tagline,
  price_monthly_cents,
  sort_order,
  is_active,
  is_public,
  highlighted,
  entitlements
) VALUES
  (
    'free',
    'Free',
    'Launch your first AI inbox',
    0,
    0,
    true,
    true,
    false,
    '{"maxMessagingChannels":1,"maxTeamSeats":1,"monthlyAiReplies":150,"monthlyVoiceMinutes":0,"maxAutomationRules":0,"voiceAi":false,"automations":false,"followUpAgent":false,"analyticsAiAsk":false,"gmailIntegration":false,"websiteKnowledgeSync":false,"extendedAiContext":false,"calendarBookingPages":true,"prioritySupport":false}'::jsonb
  ),
  (
    'starter',
    'Starter',
    'For growing local businesses',
    4900,
    1,
    true,
    true,
    false,
    '{"maxMessagingChannels":3,"maxTeamSeats":3,"monthlyAiReplies":1500,"monthlyVoiceMinutes":0,"maxAutomationRules":5,"voiceAi":false,"automations":true,"followUpAgent":false,"analyticsAiAsk":false,"gmailIntegration":false,"websiteKnowledgeSync":true,"extendedAiContext":false,"calendarBookingPages":true,"prioritySupport":false}'::jsonb
  ),
  (
    'pro',
    'Pro',
    'Voice AI + full automation stack',
    12900,
    2,
    true,
    true,
    true,
    '{"maxMessagingChannels":6,"maxTeamSeats":10,"monthlyAiReplies":6000,"monthlyVoiceMinutes":300,"maxAutomationRules":-1,"voiceAi":true,"automations":true,"followUpAgent":true,"analyticsAiAsk":true,"gmailIntegration":true,"websiteKnowledgeSync":true,"extendedAiContext":true,"calendarBookingPages":true,"prioritySupport":false}'::jsonb
  ),
  (
    'agency',
    'Agency',
    'High-volume teams & partners',
    34900,
    3,
    true,
    true,
    false,
    '{"maxMessagingChannels":-1,"maxTeamSeats":25,"monthlyAiReplies":20000,"monthlyVoiceMinutes":800,"maxAutomationRules":-1,"voiceAi":true,"automations":true,"followUpAgent":true,"analyticsAiAsk":true,"gmailIntegration":true,"websiteKnowledgeSync":true,"extendedAiContext":true,"calendarBookingPages":true,"prioritySupport":true}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.platform_subscription_addons (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_monthly_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_monthly_cents >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER set_platform_subscription_addons_updated_at
BEFORE UPDATE ON public.platform_subscription_addons
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.platform_subscription_addons ENABLE ROW LEVEL SECURITY;

INSERT INTO public.platform_subscription_addons (
  id,
  label,
  description,
  price_monthly_cents,
  sort_order,
  is_active
) VALUES
  (
    'ai_reply_pack',
    'AI Reply Pack',
    '+1,000 customer-facing AI replies per month',
    2900,
    0,
    true
  ),
  (
    'voice_minutes_pack',
    'Voice Minutes Pack',
    '+500 AI voice minutes per month',
    4900,
    1,
    true
  ),
  (
    'team_seat',
    'Extra Team Seat',
    '+1 workspace member with inbox access',
    1200,
    2,
    true
  )
ON CONFLICT (id) DO NOTHING;
