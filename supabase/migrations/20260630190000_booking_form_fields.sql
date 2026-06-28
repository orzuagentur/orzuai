ALTER TABLE public.booking_pages
  ADD COLUMN IF NOT EXISTS form_fields JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.booking_pages
SET form_fields = '[
  {"id":"first_name","key":"firstName","label":"First name","type":"first_name","required":true,"system":true},
  {"id":"last_name","key":"lastName","label":"Last name","type":"last_name","required":true,"system":true},
  {"id":"email","key":"email","label":"Email","type":"email","required":true,"system":true}
]'::jsonb
WHERE form_fields = '[]'::jsonb OR form_fields IS NULL;
