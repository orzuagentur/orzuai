-- Add a dedicated messaging channel for the personal WhatsApp (Web/QR) client.
-- Kept separate from the official `whatsapp` (Cloud API) channel so inbox,
-- routing and analytics can distinguish the two connections.
ALTER TYPE public.messaging_channel ADD VALUE IF NOT EXISTS 'whatsapp_web';
