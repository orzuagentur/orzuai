ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_sender_type message_sender_type,
  ADD COLUMN IF NOT EXISTS last_message_ai_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_client_message_at TIMESTAMPTZ;

WITH latest AS (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    LEFT(TRIM(content), 80) AS preview,
    created_at,
    sender_type,
    ai_generated
  FROM messages
  WHERE hidden_for_business = false
    AND deleted_for_all_at IS NULL
  ORDER BY conversation_id, created_at DESC
),
latest_client AS (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    created_at AS last_client_at
  FROM messages
  WHERE sender_type = 'client'
    AND hidden_for_business = false
    AND deleted_for_all_at IS NULL
  ORDER BY conversation_id, created_at DESC
)
UPDATE conversations c
SET
  last_message_preview = l.preview,
  last_message_at = l.created_at,
  last_message_sender_type = l.sender_type,
  last_message_ai_generated = COALESCE(l.ai_generated, false),
  last_client_message_at = lc.last_client_at
FROM latest l
LEFT JOIN latest_client lc ON lc.conversation_id = l.conversation_id
WHERE c.id = l.conversation_id;

CREATE INDEX IF NOT EXISTS conversations_business_last_message_at_idx
  ON conversations (business_id, last_message_at DESC NULLS LAST);
