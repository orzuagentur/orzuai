ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS conversations_business_last_read_idx
ON public.conversations (business_id, last_read_at);
