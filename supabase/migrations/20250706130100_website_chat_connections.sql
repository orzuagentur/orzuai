CREATE TABLE IF NOT EXISTS public.website_chat_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  widget_token TEXT NOT NULL,
  connection_status public.website_form_status NOT NULL DEFAULT 'pending',
  site_name TEXT,
  site_url TEXT,
  welcome_message TEXT NOT NULL DEFAULT 'Hi! How can we help you today?',
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS website_chat_connections_business_id_unique_idx
  ON public.website_chat_connections (business_id);

CREATE UNIQUE INDEX IF NOT EXISTS website_chat_connections_widget_token_unique_idx
  ON public.website_chat_connections (widget_token);

CREATE TRIGGER set_website_chat_connections_updated_at
BEFORE UPDATE ON public.website_chat_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.website_chat_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY website_chat_connections_business_access
ON public.website_chat_connections
FOR ALL
USING (public.user_can_access_business(business_id))
WITH CHECK (public.user_can_access_business(business_id));

INSERT INTO public.channel_analytics (business_id, channel, total_messages, total_contacts, ai_replies, updated_at)
SELECT b.id, 'website_chat'::public.messaging_channel, 0, 0, 0, timezone('utc', now())
FROM public.businesses AS b
ON CONFLICT DO NOTHING;
