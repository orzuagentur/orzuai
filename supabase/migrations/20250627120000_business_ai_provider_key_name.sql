ALTER TABLE public.business_ai_provider_keys
  ADD COLUMN IF NOT EXISTS key_name TEXT NOT NULL DEFAULT 'API key';
