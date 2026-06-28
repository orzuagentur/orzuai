ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.business_calendar_resources (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_page_id UUID REFERENCES public.booking_pages (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_booking BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS calendar_events_resource_start_idx
  ON public.calendar_events (business_id, resource_id, start_at);
