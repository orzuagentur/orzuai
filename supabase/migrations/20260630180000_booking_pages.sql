CREATE TABLE public.booking_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'generic',
  business_type_label TEXT NOT NULL DEFAULT 'Business',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (slot_duration_minutes BETWEEN 5 AND 480),
  slot_buffer_minutes INTEGER NOT NULL DEFAULT 15
    CHECK (slot_buffer_minutes BETWEEN 0 AND 120),
  advance_booking_days INTEGER NOT NULL DEFAULT 14
    CHECK (advance_booking_days BETWEEN 1 AND 90),
  booking_timezone TEXT NOT NULL DEFAULT 'UTC',
  weekly_schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT booking_pages_slug_unique UNIQUE (slug)
);

CREATE INDEX booking_pages_business_sort_idx
ON public.booking_pages (business_id, sort_order, created_at);

CREATE TRIGGER set_booking_pages_updated_at
BEFORE UPDATE ON public.booking_pages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.business_calendar_resources
  ADD COLUMN IF NOT EXISTS booking_page_id UUID
  REFERENCES public.booking_pages (id) ON DELETE CASCADE;

CREATE INDEX business_calendar_resources_page_idx
ON public.business_calendar_resources (booking_page_id, active, sort_order);

ALTER TABLE public.booking_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage booking pages"
ON public.booking_pages
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

CREATE POLICY "Public can read published booking pages"
ON public.booking_pages
FOR SELECT
TO anon, authenticated
USING (published = true);

CREATE POLICY "Public can read resources for published booking pages"
ON public.business_calendar_resources
FOR SELECT
TO anon, authenticated
USING (
  active = true
  AND booking_page_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.booking_pages AS page
    WHERE page.id = business_calendar_resources.booking_page_id
      AND page.published = true
  )
);

INSERT INTO public.booking_pages (
  business_id,
  slug,
  title,
  business_type,
  business_type_label,
  slot_duration_minutes,
  slot_buffer_minutes,
  advance_booking_days,
  booking_timezone,
  weekly_schedule,
  published,
  sort_order
)
SELECT
  setup.business_id,
  trim(
    both '-'
    FROM lower(
      regexp_replace(
        coalesce(
          nullif(trim(setup.booking_page_title), ''),
          'booking-' || left(replace(setup.business_id::text, '-', ''), 8)
        ),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      )
    )
  ) || '-' || left(replace(setup.business_id::text, '-', ''), 6),
  coalesce(nullif(trim(setup.booking_page_title), ''), 'Booking page'),
  setup.business_type,
  setup.business_type_label,
  setup.slot_duration_minutes,
  setup.slot_buffer_minutes,
  setup.advance_booking_days,
  setup.booking_timezone,
  setup.weekly_schedule,
  setup.booking_page_published,
  0
FROM public.business_booking_setup AS setup
WHERE coalesce(nullif(trim(setup.booking_page_title), ''), '') <> ''
   OR setup.booking_page_published = true
ON CONFLICT (slug) DO NOTHING;

UPDATE public.business_calendar_resources AS resource
SET booking_page_id = page.id
FROM public.booking_pages AS page
WHERE resource.business_id = page.business_id
  AND resource.booking_page_id IS NULL
  AND page.sort_order = 0;
