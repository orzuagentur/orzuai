-- Platform-billed Twilio phone numbers (monthly via Stripe subscription items)
CREATE TABLE IF NOT EXISTS public.twilio_number_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_sid TEXT NOT NULL,
  country_code TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents > 0),
  stripe_subscription_item_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  canceled_at TIMESTAMPTZ,
  CONSTRAINT twilio_number_subscriptions_business_phone_sid_unique UNIQUE (business_id, phone_sid)
);

CREATE INDEX IF NOT EXISTS twilio_number_subscriptions_business_status_idx
  ON public.twilio_number_subscriptions (business_id, status);

ALTER TABLE public.twilio_number_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY twilio_number_subscriptions_select_own
  ON public.twilio_number_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.user_owns_business(business_id));

CREATE POLICY twilio_number_subscriptions_service_role
  ON public.twilio_number_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
