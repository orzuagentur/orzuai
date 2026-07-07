-- Server-only Twilio BYOT: Account SID + Auth Token (no Browser Phone / API Key)

ALTER TYPE public.twilio_auth_mode ADD VALUE IF NOT EXISTS 'auth_token';

COMMENT ON COLUMN public.twilio_connections.auth_mode IS
  'connect = Twilio Connect OAuth; api_key = full BYOT with Browser Phone; auth_token = server-only BYOT (SMS + AI calls)';
