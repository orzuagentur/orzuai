-- Provider send time for correct message ordering after delayed webhook/sync delivery.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

UPDATE public.messages
SET sent_at = created_at
WHERE sent_at IS NULL;

ALTER TABLE public.messages
  ALTER COLUMN sent_at SET NOT NULL,
  ALTER COLUMN sent_at SET DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS messages_conversation_sent_at_idx
  ON public.messages (conversation_id, sent_at ASC, id ASC);

DROP FUNCTION IF EXISTS public.insert_inbound_channel_message(
  UUID,
  public.messaging_channel,
  public.message_sender_type,
  TEXT,
  TEXT,
  TEXT,
  TEXT
);

CREATE OR REPLACE FUNCTION public.insert_inbound_channel_message(
  p_conversation_id UUID,
  p_channel public.messaging_channel,
  p_sender_type public.message_sender_type,
  p_content TEXT,
  p_external_message_id TEXT DEFAULT NULL,
  p_message_preview TEXT DEFAULT NULL,
  p_email_subject TEXT DEFAULT NULL,
  p_sent_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  channel public.messaging_channel,
  sender_type public.message_sender_type,
  content TEXT,
  ai_generated BOOLEAN,
  created_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  external_message_id TEXT,
  is_duplicate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.messages%ROWTYPE;
  v_inserted public.messages%ROWTYPE;
  v_preview TEXT;
  v_prev_client_at TIMESTAMPTZ;
  v_sent_at TIMESTAMPTZ;
BEGIN
  v_sent_at := COALESCE(p_sent_at, timezone('utc', now()));

  IF p_external_message_id IS NOT NULL THEN
    SELECT m.*
    INTO v_existing
    FROM public.messages AS m
    WHERE m.channel = p_channel
      AND m.external_message_id = p_external_message_id
    LIMIT 1;

    IF FOUND THEN
      id := v_existing.id;
      conversation_id := v_existing.conversation_id;
      channel := v_existing.channel;
      sender_type := v_existing.sender_type;
      content := v_existing.content;
      ai_generated := v_existing.ai_generated;
      created_at := v_existing.created_at;
      sent_at := v_existing.sent_at;
      external_message_id := v_existing.external_message_id;
      is_duplicate := TRUE;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.messages (
      conversation_id,
      channel,
      sender_type,
      content,
      ai_generated,
      external_message_id,
      email_subject,
      sent_at
    )
    VALUES (
      p_conversation_id,
      p_channel,
      p_sender_type,
      p_content,
      FALSE,
      p_external_message_id,
      NULLIF(BTRIM(p_email_subject), ''),
      v_sent_at
    )
    RETURNING * INTO v_inserted;
  EXCEPTION
    WHEN unique_violation THEN
      IF p_external_message_id IS NULL THEN
        RAISE;
      END IF;

      SELECT m.*
      INTO v_existing
      FROM public.messages AS m
      WHERE m.channel = p_channel
        AND m.external_message_id = p_external_message_id
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE;
      END IF;

      id := v_existing.id;
      conversation_id := v_existing.conversation_id;
      channel := v_existing.channel;
      sender_type := v_existing.sender_type;
      content := v_existing.content;
      ai_generated := v_existing.ai_generated;
      created_at := v_existing.created_at;
      sent_at := v_existing.sent_at;
      external_message_id := v_existing.external_message_id;
      is_duplicate := TRUE;
      RETURN NEXT;
      RETURN;
  END;

  v_preview := COALESCE(
    NULLIF(BTRIM(p_message_preview), ''),
    NULLIF(BTRIM(p_email_subject), ''),
    LEFT(BTRIM(p_content), 80)
  );

  IF p_sender_type = 'client'::public.message_sender_type THEN
    SELECT c.last_client_message_at
    INTO v_prev_client_at
    FROM public.conversations AS c
    WHERE c.id = p_conversation_id;
  END IF;

  UPDATE public.conversations AS c
  SET
    last_message_preview = v_preview,
    last_message_at = v_inserted.sent_at,
    last_message_sender_type = p_sender_type,
    last_message_ai_generated = FALSE,
    last_client_message_at = CASE
      WHEN p_sender_type = 'client'::public.message_sender_type THEN v_inserted.sent_at
      ELSE c.last_client_message_at
    END,
    updated_at = v_inserted.sent_at
  WHERE c.id = p_conversation_id;

  id := v_inserted.id;
  conversation_id := v_inserted.conversation_id;
  channel := v_inserted.channel;
  sender_type := v_inserted.sender_type;
  content := v_inserted.content;
  ai_generated := v_inserted.ai_generated;
  created_at := v_inserted.created_at;
  sent_at := v_inserted.sent_at;
  external_message_id := v_inserted.external_message_id;
  is_duplicate := FALSE;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_inbound_channel_message(
  UUID,
  public.messaging_channel,
  public.message_sender_type,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ
) TO service_role;
