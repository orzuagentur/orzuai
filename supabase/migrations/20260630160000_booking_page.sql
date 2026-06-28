-- Booking page: title, duration, per-day schedule, publish flag
ALTER TABLE public.business_booking_setup
  ADD COLUMN IF NOT EXISTS booking_page_title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (slot_duration_minutes BETWEEN 5 AND 480),
  ADD COLUMN IF NOT EXISTS booking_page_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_schedule JSONB NOT NULL DEFAULT '{}'::jsonb;
