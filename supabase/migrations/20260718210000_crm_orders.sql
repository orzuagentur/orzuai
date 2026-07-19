-- Orders / requests queue (website forms + AI), distinct from calendar bookings and CRM deals.

CREATE TABLE public.crm_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts (id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations (id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Order',
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('website_forms', 'ai', 'manual')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'done', 'cancelled')),
  amount NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_orders_business_created_idx
  ON public.crm_orders (business_id, created_at DESC);

CREATE INDEX crm_orders_business_status_idx
  ON public.crm_orders (business_id, status);

CREATE INDEX crm_orders_contact_id_idx
  ON public.crm_orders (contact_id);

CREATE TRIGGER set_crm_orders_updated_at
BEFORE UPDATE ON public.crm_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.crm_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own CRM orders"
ON public.crm_orders
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
