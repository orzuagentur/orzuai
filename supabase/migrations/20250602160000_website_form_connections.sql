-- Website Forms integration: inbound leads via webhook + API key

CREATE TYPE public.website_form_status AS ENUM (
  'connected',
  'disconnected',
  'pending'
);

CREATE TYPE public.website_form_follow_up AS ENUM (
  'whatsapp',
  'telegram',
  'email',
  'none'
);

ALTER TYPE public.messaging_channel ADD VALUE IF NOT EXISTS 'website_forms';

CREATE TABLE public.website_form_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  webhook_token TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL DEFAULT '',
  site_name TEXT,
  site_url TEXT,
  connection_status public.website_form_status NOT NULL DEFAULT 'pending',
  auto_follow_up_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  follow_up_channel public.website_form_follow_up NOT NULL DEFAULT 'whatsapp',
  connected_at TIMESTAMPTZ,
  last_submission_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX website_form_connections_business_id_unique_idx
  ON public.website_form_connections (business_id);

CREATE UNIQUE INDEX website_form_connections_webhook_token_unique_idx
  ON public.website_form_connections (webhook_token);

CREATE TRIGGER set_website_form_connections_updated_at
BEFORE UPDATE ON public.website_form_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.website_form_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own website form connections"
ON public.website_form_connections
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

INSERT INTO public.channel_analytics (business_id, channel, total_messages, total_contacts, ai_replies, updated_at)
SELECT b.id, 'website_forms'::public.messaging_channel, 0, 0, 0, timezone('utc', now())
FROM public.businesses b
ON CONFLICT (business_id, channel) DO NOTHING;

INSERT INTO public.ai_settings (business_id, model, language, system_prompt, ai_enabled, channel)
SELECT
  s.business_id,
  s.model,
  s.language,
  s.system_prompt,
  false,
  'website_forms'::public.messaging_channel
FROM public.ai_settings s
WHERE s.channel = 'whatsapp'::public.messaging_channel
ON CONFLICT DO NOTHING;
