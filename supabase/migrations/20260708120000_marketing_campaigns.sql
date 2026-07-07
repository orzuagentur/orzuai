-- Marketing outreach: editable template, campaigns, per-recipient open/click tracking.

CREATE TABLE public.marketing_templates (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'Основной маркетинг',
  subject_template TEXT NOT NULL,
  headline TEXT NOT NULL,
  greeting TEXT NOT NULL DEFAULT 'Здравствуйте',
  body_template TEXT NOT NULL,
  cta_label TEXT NOT NULL DEFAULT 'Посмотреть возможности',
  cta_url TEXT NOT NULL DEFAULT 'https://www.orzux.com/dashboard',
  from_email TEXT NOT NULL DEFAULT 'hello',
  feature_highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  template_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  from_email TEXT NOT NULL DEFAULT 'hello',
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX marketing_campaigns_created_at_idx
  ON public.marketing_campaigns (created_at DESC);

CREATE TABLE public.marketing_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns (id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses (id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL DEFAULT '',
  tracking_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'failed', 'opened', 'clicked')
  ),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  resend_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX marketing_campaign_recipients_campaign_idx
  ON public.marketing_campaign_recipients (campaign_id);

CREATE INDEX marketing_campaign_recipients_token_idx
  ON public.marketing_campaign_recipients (tracking_token);

CREATE INDEX marketing_campaign_recipients_status_idx
  ON public.marketing_campaign_recipients (status);

ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;

INSERT INTO public.marketing_templates (
  id,
  name,
  subject_template,
  headline,
  greeting,
  body_template,
  cta_label,
  cta_url,
  from_email,
  feature_highlights
) VALUES (
  'default',
  'Основной маркетинг',
  '{{name}}, откройте новые возможности OrzuX для вашего бизнеса',
  'Умная коммуникация для растущего бизнеса',
  'Здравствуйте',
  'OrzuX объединяет все каналы общения с клиентами в одном месте: WhatsApp, Instagram, Telegram, email и голосовой AI. Ваш ассистент обучается на знаниях бизнеса, ведёт CRM и автоматизирует рутину — чтобы вы тратили меньше времени на переписку и больше на рост.',
  'Посмотреть возможности',
  'https://www.orzux.com/dashboard',
  'hello',
  '[
    "Единый inbox для WhatsApp, Instagram, Telegram и email",
    "AI-ассистент на базе знаний вашего бизнеса",
    "CRM, сделки и контекст клиента в одном окне",
    "Автоматизации, аналитика и Voice AI"
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.email_templates (
  id,
  name,
  category,
  description,
  subject_template,
  from_email,
  is_system
) VALUES (
  'marketing_outreach',
  'Marketing outreach',
  'admin',
  'Platform marketing emails to businesses (admin Marketing section)',
  '{{subject}}',
  'hello',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  from_email = COALESCE(public.email_templates.from_email, EXCLUDED.from_email);
