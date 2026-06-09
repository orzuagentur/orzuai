CREATE TABLE public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts (id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Deal',
  value NUMERIC(12, 2),
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'qualified', 'proposal', 'won', 'lost')),
  expected_close_date DATE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'won', 'lost')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_deals_business_id_idx ON public.crm_deals (business_id);
CREATE INDEX crm_deals_contact_id_idx ON public.crm_deals (contact_id);
CREATE UNIQUE INDEX crm_deals_primary_per_contact_idx
  ON public.crm_deals (contact_id)
  WHERE is_primary = true;

CREATE TRIGGER set_crm_deals_updated_at
BEFORE UPDATE ON public.crm_deals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own CRM deals"
ON public.crm_deals
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

INSERT INTO public.crm_deals (
  business_id,
  contact_id,
  title,
  value,
  stage,
  expected_close_date,
  status,
  is_primary
)
SELECT
  business_id,
  id,
  name || ' — deal',
  deal_value,
  pipeline_stage,
  expected_close_date,
  CASE pipeline_stage
    WHEN 'won' THEN 'won'
    WHEN 'lost' THEN 'lost'
    ELSE 'open'
  END,
  true
FROM public.contacts
WHERE NOT EXISTS (
  SELECT 1
  FROM public.crm_deals
  WHERE crm_deals.contact_id = contacts.id
    AND crm_deals.is_primary = true
);
