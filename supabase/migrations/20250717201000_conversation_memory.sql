-- Long-term conversation memory for AI Assistant (Sprint AI-4).

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_summary_message_count INT NOT NULL DEFAULT 0;
