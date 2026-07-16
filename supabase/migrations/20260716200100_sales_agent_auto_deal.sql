-- AI-P1-A03: Sales agent auto-deal settings on business_ai_config
ALTER TABLE public.business_ai_config
  ADD COLUMN IF NOT EXISTS auto_deal_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_deal_threshold INTEGER NOT NULL DEFAULT 70;

ALTER TABLE public.business_ai_config
  DROP CONSTRAINT IF EXISTS business_ai_config_auto_deal_threshold_check;

ALTER TABLE public.business_ai_config
  ADD CONSTRAINT business_ai_config_auto_deal_threshold_check
  CHECK (auto_deal_threshold >= 0 AND auto_deal_threshold <= 100);

COMMENT ON COLUMN public.business_ai_config.auto_deal_enabled IS
  'When true, create a CRM deal if BANT average score >= auto_deal_threshold.';
COMMENT ON COLUMN public.business_ai_config.auto_deal_threshold IS
  'Minimum BANT average score (0-100) required to auto-create a CRM deal.';
