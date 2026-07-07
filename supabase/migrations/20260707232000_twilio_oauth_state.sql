-- One-time Twilio Connect OAuth state nonces.

CREATE TABLE IF NOT EXISTS public.twilio_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS twilio_oauth_states_business_idx
  ON public.twilio_oauth_states (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS twilio_oauth_states_pending_idx
  ON public.twilio_oauth_states (expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE public.twilio_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages twilio oauth states"
ON public.twilio_oauth_states;

CREATE POLICY "Service role manages twilio oauth states"
ON public.twilio_oauth_states
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
