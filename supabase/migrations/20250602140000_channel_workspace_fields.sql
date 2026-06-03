-- Per-channel workspace: contacts, conversations, AI settings, analytics

CREATE TYPE public.messaging_channel AS ENUM (
  'whatsapp',
  'instagram',
  'telegram'
);

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS channel public.messaging_channel NOT NULL DEFAULT 'whatsapp';

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS channel public.messaging_channel NOT NULL DEFAULT 'whatsapp';

ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS channel public.messaging_channel NOT NULL DEFAULT 'whatsapp';

ALTER TABLE public.ai_settings
  DROP CONSTRAINT IF EXISTS ai_settings_business_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS ai_settings_business_id_channel_key
  ON public.ai_settings (business_id, channel);

CREATE TABLE IF NOT EXISTS public.channel_analytics (
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  channel public.messaging_channel NOT NULL,
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_contacts INTEGER NOT NULL DEFAULT 0,
  ai_replies INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (business_id, channel)
);

CREATE INDEX IF NOT EXISTS contacts_business_id_channel_idx
  ON public.contacts (business_id, channel);

CREATE INDEX IF NOT EXISTS conversations_business_id_channel_idx
  ON public.conversations (business_id, channel);

ALTER TABLE public.channel_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own channel analytics"
ON public.channel_analytics
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

INSERT INTO public.channel_analytics (business_id, channel, total_messages, total_contacts, ai_replies, updated_at)
SELECT
  business_id,
  'whatsapp'::public.messaging_channel,
  total_messages,
  total_contacts,
  ai_replies,
  updated_at
FROM public.analytics
ON CONFLICT (business_id, channel) DO UPDATE SET
  total_messages = EXCLUDED.total_messages,
  total_contacts = EXCLUDED.total_contacts,
  ai_replies = EXCLUDED.ai_replies,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.channel_analytics (business_id, channel)
SELECT b.id, c.channel
FROM public.businesses b
CROSS JOIN (
  VALUES
    ('instagram'::public.messaging_channel),
    ('telegram'::public.messaging_channel)
) AS c(channel)
ON CONFLICT (business_id, channel) DO NOTHING;

INSERT INTO public.ai_settings (business_id, model, language, system_prompt, ai_enabled, channel)
SELECT
  s.business_id,
  s.model,
  s.language,
  s.system_prompt,
  false,
  c.channel
FROM public.ai_settings s
CROSS JOIN (
  VALUES
    ('instagram'::public.messaging_channel),
    ('telegram'::public.messaging_channel)
) AS c(channel)
WHERE s.channel = 'whatsapp'::public.messaging_channel
ON CONFLICT DO NOTHING;
