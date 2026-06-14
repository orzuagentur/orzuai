-- Enum values must be committed in their own migration before use elsewhere (PG 55P04).

ALTER TYPE public.message_delivery_status ADD VALUE IF NOT EXISTS 'processing';

ALTER TYPE public.message_attachment_status ADD VALUE IF NOT EXISTS 'processing';
