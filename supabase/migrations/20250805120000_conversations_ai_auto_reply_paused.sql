ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS ai_auto_reply_paused boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.conversations.ai_auto_reply_paused IS
  'When true, auto-reply worker skips this conversation (e.g. after human handoff).';
