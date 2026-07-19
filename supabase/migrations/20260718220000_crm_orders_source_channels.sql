-- Expand crm_orders.source to real acquisition channels (WhatsApp, Telegram, etc.).
-- Keep legacy 'ai' for existing rows; new AI-created orders use the conversation channel.

ALTER TABLE public.crm_orders
  DROP CONSTRAINT IF EXISTS crm_orders_source_check;

ALTER TABLE public.crm_orders
  ADD CONSTRAINT crm_orders_source_check
  CHECK (
    source = ANY (
      ARRAY[
        'whatsapp'::text,
        'telegram'::text,
        'instagram'::text,
        'website_forms'::text,
        'website_chat'::text,
        'email'::text,
        'voice'::text,
        'sms'::text,
        'facebook_messenger'::text,
        'manual'::text,
        'ai'::text
      ]
    )
  );
