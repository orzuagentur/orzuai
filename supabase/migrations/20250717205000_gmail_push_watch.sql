-- Gmail Pub/Sub push: store watch expiration for renewal cron

ALTER TABLE public.email_connections
  ADD COLUMN IF NOT EXISTS watch_expiration TIMESTAMPTZ;
