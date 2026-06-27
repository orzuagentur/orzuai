-- Calendar 2.0: structured booking hours + AI availability engine
ALTER TABLE public.business_booking_setup
  ADD COLUMN IF NOT EXISTS booking_timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS slot_buffer_minutes INTEGER NOT NULL DEFAULT 15
    CHECK (slot_buffer_minutes BETWEEN 0 AND 120),
  ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER NOT NULL DEFAULT 14
    CHECK (advance_booking_days BETWEEN 1 AND 90),
  ADD COLUMN IF NOT EXISTS business_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_hours_start TEXT NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS business_hours_end TEXT NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS business_days INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5];
