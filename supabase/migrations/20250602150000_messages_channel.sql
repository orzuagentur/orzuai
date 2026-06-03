-- Denormalize messaging channel on messages for unified inbox queries

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS channel public.messaging_channel;

UPDATE public.messages AS m
SET channel = c.channel
FROM public.conversations AS c
WHERE m.conversation_id = c.id
  AND m.channel IS NULL;

ALTER TABLE public.messages
  ALTER COLUMN channel SET DEFAULT 'whatsapp'::public.messaging_channel;

UPDATE public.messages
SET channel = 'whatsapp'::public.messaging_channel
WHERE channel IS NULL;

ALTER TABLE public.messages
  ALTER COLUMN channel SET NOT NULL;

CREATE INDEX IF NOT EXISTS messages_conversation_id_channel_idx
  ON public.messages (conversation_id, channel);
