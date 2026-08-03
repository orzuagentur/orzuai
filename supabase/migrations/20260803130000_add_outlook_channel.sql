-- Dedicated messaging channel for Microsoft Outlook / Microsoft 365.
-- Kept separate from Gmail (`email`) so marketplace, inbox, AI settings,
-- and analytics can treat the two mailboxes independently.
ALTER TYPE public.messaging_channel ADD VALUE IF NOT EXISTS 'outlook';
