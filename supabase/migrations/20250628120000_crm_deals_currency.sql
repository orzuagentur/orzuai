ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
