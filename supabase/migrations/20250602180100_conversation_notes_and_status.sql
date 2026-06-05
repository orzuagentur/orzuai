ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS internal_note TEXT;

UPDATE public.conversations
SET status = 'open'::public.conversation_status
WHERE status = 'active'::public.conversation_status;

UPDATE public.conversations
SET status = 'resolved'::public.conversation_status
WHERE status = 'closed'::public.conversation_status;

UPDATE public.conversations
SET status = 'snoozed'::public.conversation_status
WHERE status = 'archived'::public.conversation_status;

ALTER TABLE public.conversations
ALTER COLUMN status SET DEFAULT 'open';
