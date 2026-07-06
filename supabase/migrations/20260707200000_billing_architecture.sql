-- Billing architecture: invoice cache, Twilio top-ups, addon visibility

CREATE TABLE public.billing_invoices (
  id TEXT PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  number TEXT,
  status TEXT NOT NULL,
  amount_due_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  hosted_invoice_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX billing_invoices_business_created_idx
  ON public.billing_invoices (business_id, created_at DESC);

CREATE TABLE public.twilio_balance_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX twilio_balance_topups_business_idx
  ON public.twilio_balance_topups (business_id, created_at DESC);

ALTER TABLE public.platform_subscription_addons
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_balance_topups ENABLE ROW LEVEL SECURITY;
