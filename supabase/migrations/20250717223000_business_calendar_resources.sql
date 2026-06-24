CREATE TABLE public.business_booking_setup (
  business_id UUID PRIMARY KEY REFERENCES public.businesses (id) ON DELETE CASCADE,
  business_type TEXT NOT NULL DEFAULT 'generic',
  business_type_label TEXT NOT NULL DEFAULT 'Business',
  operating_hours_note TEXT NOT NULL DEFAULT '',
  generated_from_knowledge_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER set_business_booking_setup_updated_at
BEFORE UPDATE ON public.business_booking_setup
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.business_calendar_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (
    resource_type IN ('room', 'table', 'staff', 'chair', 'service', 'other')
  ),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes >= 5),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'ai_knowledge',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX business_calendar_resources_business_name_uidx
ON public.business_calendar_resources (business_id, lower(name));

CREATE INDEX business_calendar_resources_business_active_idx
ON public.business_calendar_resources (business_id, active, sort_order);

ALTER TABLE public.business_booking_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_calendar_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own business booking setup"
ON public.business_booking_setup
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

CREATE POLICY "Users can manage own calendar resources"
ON public.business_calendar_resources
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));
