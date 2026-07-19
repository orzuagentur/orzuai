-- Configurable order create-form fields per business (manual UI + AI).
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS order_form_fields JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.businesses.order_form_fields IS
  'JSON array of order form field configs: id, key, label, type, required, enabled, builtIn, options.';
