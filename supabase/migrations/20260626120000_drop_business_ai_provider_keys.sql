-- Remove customer-owned AI API keys — platform keys only.

DROP TRIGGER IF EXISTS set_business_ai_provider_keys_updated_at
  ON public.business_ai_provider_keys;

DROP TABLE IF EXISTS public.business_ai_provider_keys;

ALTER TABLE public.businesses
  DROP COLUMN IF EXISTS prefer_customer_ai_keys;
