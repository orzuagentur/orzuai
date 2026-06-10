ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS prefer_customer_ai_keys BOOLEAN NOT NULL DEFAULT false;
