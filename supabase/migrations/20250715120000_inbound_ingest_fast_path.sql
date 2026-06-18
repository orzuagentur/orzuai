-- Inbound ingest: fewer round-trips before message INSERT

CREATE OR REPLACE FUNCTION public.resolve_inbound_message_context(
  p_business_id UUID,
  p_channel public.messaging_channel,
  p_contact_name TEXT,
  p_contact_phone TEXT,
  p_external_id TEXT,
  p_display_label TEXT DEFAULT NULL
)
RETURNS TABLE (
  contact_id UUID,
  conversation_id UUID,
  created_contact BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id UUID;
  v_conversation_id UUID;
  v_created_contact BOOLEAN := FALSE;
  v_now TIMESTAMPTZ := timezone('utc', now());
  v_label TEXT := NULLIF(BTRIM(COALESCE(p_display_label, p_contact_name)), '');
  v_digits TEXT;
BEGIN
  SELECT cci.contact_id
  INTO v_contact_id
  FROM public.contact_channel_identities AS cci
  WHERE cci.business_id = p_business_id
    AND cci.channel = p_channel
    AND cci.external_id = p_external_id
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    v_digits := regexp_replace(COALESCE(p_contact_phone, ''), '[^0-9]', '', 'g');

    SELECT c.id
    INTO v_contact_id
    FROM public.contacts AS c
    WHERE c.business_id = p_business_id
      AND c.channel = p_channel
      AND (
        c.phone_number = p_contact_phone
        OR (
          p_channel = 'telegram'::public.messaging_channel
          AND c.phone_number IN ('tg:' || p_external_id, p_external_id)
        )
        OR (
          p_channel = 'instagram'::public.messaging_channel
          AND c.phone_number IN ('ig:' || p_external_id, p_external_id)
        )
        OR (
          p_channel = 'whatsapp'::public.messaging_channel
          AND v_digits <> ''
          AND c.phone_number IN (
            p_contact_phone,
            v_digits,
            '+' || v_digits
          )
        )
      )
    LIMIT 1;
  END IF;

  IF v_contact_id IS NULL THEN
    INSERT INTO public.contacts (
      business_id,
      channel,
      name,
      phone_number,
      last_message_at
    )
    VALUES (
      p_business_id,
      p_channel,
      p_contact_name,
      p_contact_phone,
      v_now
    )
    RETURNING id INTO v_contact_id;

    v_created_contact := TRUE;
  ELSE
    UPDATE public.contacts
    SET
      name = p_contact_name,
      last_message_at = v_now,
      phone_number = CASE
        WHEN p_channel = 'whatsapp'::public.messaging_channel THEN p_contact_phone
        ELSE phone_number
      END
    WHERE id = v_contact_id;
  END IF;

  IF v_contact_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.contact_channel_identities (
    business_id,
    contact_id,
    channel,
    external_id,
    display_label
  )
  VALUES (
    p_business_id,
    v_contact_id,
    p_channel,
    p_external_id,
    v_label
  )
  ON CONFLICT (business_id, channel, external_id) DO UPDATE
  SET
    contact_id = EXCLUDED.contact_id,
    display_label = COALESCE(EXCLUDED.display_label, contact_channel_identities.display_label),
    updated_at = v_now;

  SELECT c.id
  INTO v_conversation_id
  FROM public.conversations AS c
  WHERE c.business_id = p_business_id
    AND c.contact_id = v_contact_id
    AND c.channel = p_channel
    AND c.status IN (
      'open'::public.conversation_status,
      'pending'::public.conversation_status,
      'active'::public.conversation_status
    )
  ORDER BY c.updated_at DESC
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    SELECT c.id
    INTO v_conversation_id
    FROM public.conversations AS c
    WHERE c.business_id = p_business_id
      AND c.contact_id = v_contact_id
      AND c.channel = p_channel
    ORDER BY c.updated_at DESC
    LIMIT 1;

    IF v_conversation_id IS NOT NULL THEN
      UPDATE public.conversations
      SET
        status = 'open'::public.conversation_status,
        updated_at = v_now
      WHERE id = v_conversation_id;
    ELSE
      INSERT INTO public.conversations (
        business_id,
        channel,
        contact_id,
        status
      )
      VALUES (
        p_business_id,
        p_channel,
        v_contact_id,
        'open'::public.conversation_status
      )
      RETURNING id INTO v_conversation_id;
    END IF;
  END IF;

  contact_id := v_contact_id;
  conversation_id := v_conversation_id;
  created_contact := v_created_contact;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_inbound_channel_message(
  p_conversation_id UUID,
  p_channel public.messaging_channel,
  p_sender_type public.message_sender_type,
  p_content TEXT,
  p_external_message_id TEXT DEFAULT NULL,
  p_message_preview TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  channel public.messaging_channel,
  sender_type public.message_sender_type,
  content TEXT,
  ai_generated BOOLEAN,
  created_at TIMESTAMPTZ,
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
BEGIN
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
      external_message_id
    )
    VALUES (
      p_conversation_id,
      p_channel,
      p_sender_type,
      p_content,
      FALSE,
      p_external_message_id
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
      external_message_id := v_existing.external_message_id;
      is_duplicate := TRUE;
      RETURN NEXT;
      RETURN;
  END;

  v_preview := COALESCE(
    NULLIF(BTRIM(p_message_preview), ''),
    LEFT(p_content, 80)
  );

  SELECT c.last_client_message_at
  INTO v_prev_client_at
  FROM public.conversations AS c
  WHERE c.id = p_conversation_id;

  UPDATE public.conversations AS c
  SET
    last_message_preview = v_preview,
    last_message_at = v_inserted.created_at,
    last_message_sender_type = p_sender_type,
    last_message_ai_generated = FALSE,
    last_client_message_at = CASE
      WHEN p_sender_type = 'client'::public.message_sender_type THEN v_inserted.created_at
      ELSE v_prev_client_at
    END,
    updated_at = v_inserted.created_at
  WHERE c.id = p_conversation_id;

  id := v_inserted.id;
  conversation_id := v_inserted.conversation_id;
  channel := v_inserted.channel;
  sender_type := v_inserted.sender_type;
  content := v_inserted.content;
  ai_generated := v_inserted.ai_generated;
  created_at := v_inserted.created_at;
  external_message_id := v_inserted.external_message_id;
  is_duplicate := FALSE;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_inbound_message_context(
  UUID,
  public.messaging_channel,
  TEXT,
  TEXT,
  TEXT,
  TEXT
) TO service_role;

GRANT EXECUTE ON FUNCTION public.insert_inbound_channel_message(
  UUID,
  public.messaging_channel,
  public.message_sender_type,
  TEXT,
  TEXT,
  TEXT
) TO service_role;
