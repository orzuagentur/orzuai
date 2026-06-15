-- Outbound read receipts (WhatsApp status webhooks)

ALTER TYPE public.message_delivery_status ADD VALUE IF NOT EXISTS 'read';
