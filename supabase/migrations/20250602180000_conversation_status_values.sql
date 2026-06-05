ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'open';
ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'resolved';
ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'snoozed';
