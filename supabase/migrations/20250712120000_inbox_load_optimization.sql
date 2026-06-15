-- Sprint E: inbox load — denormalized message count + faster list_inbox_conversations

-- ---------------------------------------------------------------------------
-- CAT-P2-10: total_message_count on conversations
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS total_message_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_conversation_total_message_count(
  p_conversation_id UUID
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.conversations AS c
  SET total_message_count = (
    SELECT COUNT(*)::INTEGER
    FROM public.messages AS m
    WHERE m.conversation_id = p_conversation_id
      AND m.hidden_for_business = false
      AND m.deleted_for_all_at IS NULL
  )
  WHERE c.id = p_conversation_id;
$$;

CREATE OR REPLACE FUNCTION public.handle_message_total_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
  v_old_visible BOOLEAN;
  v_new_visible BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_conversation_id := OLD.conversation_id;
    v_old_visible :=
      NOT OLD.hidden_for_business
      AND OLD.deleted_for_all_at IS NULL;
    v_new_visible := false;
  ELSIF TG_OP = 'INSERT' THEN
    v_conversation_id := NEW.conversation_id;
    v_old_visible := false;
    v_new_visible :=
      NOT NEW.hidden_for_business
      AND NEW.deleted_for_all_at IS NULL;
  ELSE
    v_conversation_id := NEW.conversation_id;
    v_old_visible :=
      NOT OLD.hidden_for_business
      AND OLD.deleted_for_all_at IS NULL;
    v_new_visible :=
      NOT NEW.hidden_for_business
      AND NEW.deleted_for_all_at IS NULL;
  END IF;

  IF v_old_visible = v_new_visible THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_new_visible THEN
    UPDATE public.conversations
    SET total_message_count = total_message_count + 1
    WHERE id = v_conversation_id;
  ELSE
    UPDATE public.conversations
    SET total_message_count = GREATEST(total_message_count - 1, 0)
    WHERE id = v_conversation_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS messages_total_message_count_trigger ON public.messages;

CREATE TRIGGER messages_total_message_count_trigger
AFTER INSERT OR UPDATE OF hidden_for_business, deleted_for_all_at OR DELETE
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_message_total_count();

UPDATE public.conversations AS c
SET total_message_count = counts.message_count
FROM (
  SELECT
    m.conversation_id,
    COUNT(*)::INTEGER AS message_count
  FROM public.messages AS m
  WHERE m.hidden_for_business = false
    AND m.deleted_for_all_at IS NULL
  GROUP BY m.conversation_id
) AS counts
WHERE c.id = counts.conversation_id;

-- ---------------------------------------------------------------------------
-- CAT-P0-07: partial index for high_intent view
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS contacts_business_high_lead_score_idx
  ON public.contacts (business_id, lead_score DESC)
  WHERE lead_score >= 70;

CREATE INDEX IF NOT EXISTS conversations_business_activity_idx
  ON public.conversations (business_id, last_message_at DESC NULLS LAST, id DESC);

-- ---------------------------------------------------------------------------
-- CAT-P0-07: rewrite list_inbox_conversations
-- - phone dedupe inside RPC
-- - direct ORDER BY LIMIT/OFFSET (no ROW_NUMBER over full set)
-- - total_count via separate scalar subquery (not COUNT(*) OVER)
-- - FTS on conversation + contact only (preview is denormalized)
-- ---------------------------------------------------------------------------
-- New param p_include_total_count => must drop the previous 9-arg overload first.
DROP FUNCTION IF EXISTS public.list_inbox_conversations(
  UUID,
  UUID,
  public.messaging_channel,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  INTEGER
);

CREATE OR REPLACE FUNCTION public.list_inbox_conversations(
  p_business_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_channel public.messaging_channel DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_view TEXT DEFAULT 'all',
  p_filter TEXT DEFAULT 'all',
  p_sort TEXT DEFAULT 'latest',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_include_total_count BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  channel public.messaging_channel,
  status public.conversation_status,
  updated_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender_type public.message_sender_type,
  last_message_ai_generated BOOLEAN,
  last_client_message_at TIMESTAMPTZ,
  contact_id UUID,
  contact_name TEXT,
  contact_phone TEXT,
  contact_lead_score INTEGER,
  contact_is_favorite BOOLEAN,
  contact_avatar_url TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tsquery tsquery;
  v_limit INTEGER := GREATEST(COALESCE(p_limit, 50), 0);
  v_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
  v_total_count BIGINT := NULL;
BEGIN
  IF NOT public.user_can_access_business(p_business_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  v_tsquery := public.inbox_search_tsquery(p_search);

  RETURN QUERY
  WITH filtered AS (
    SELECT
      c.id,
      c.channel,
      c.status,
      c.updated_at,
      c.last_read_at,
      COALESCE(cr.unread_count, c.unread_count, 0) AS resolved_unread_count,
      c.last_message_preview,
      c.last_message_at,
      c.last_message_sender_type,
      c.last_message_ai_generated,
      c.last_client_message_at,
      ct.id AS contact_id,
      ct.name AS contact_name,
      ct.phone_number AS contact_phone,
      ct.lead_score::INTEGER AS contact_lead_score,
      COALESCE(ct.is_favorite, false) AS contact_is_favorite,
      ct.avatar_url AS contact_avatar_url,
      COALESCE(c.last_message_at, c.updated_at) AS activity_at,
      regexp_replace(COALESCE(ct.phone_number, ''), '[^0-9]', '', 'g') AS phone_digits
    FROM public.conversations AS c
    INNER JOIN public.contacts AS ct
      ON ct.id = c.contact_id
    LEFT JOIN public.conversation_reads AS cr
      ON cr.conversation_id = c.id
      AND cr.user_id = p_user_id
    WHERE c.business_id = p_business_id
      AND (p_channel IS NULL OR c.channel = p_channel)
      AND (
        v_tsquery IS NULL
        OR c.search_vector @@ v_tsquery
        OR ct.search_vector @@ v_tsquery
      )
      AND (
        p_view IS DISTINCT FROM 'needs_reply'
        OR (
          COALESCE(cr.unread_count, c.unread_count, 0) > 0
          AND c.status IN (
            'open'::public.conversation_status,
            'active'::public.conversation_status,
            'pending'::public.conversation_status
          )
        )
      )
      AND (
        p_view IS DISTINCT FROM 'high_intent'
        OR COALESCE(ct.lead_score, 0) >= 70
      )
      AND (
        p_view IS DISTINCT FROM 'favorites'
        OR COALESCE(ct.is_favorite, false) = true
      )
      AND (
        p_filter IS DISTINCT FROM 'ai_handled'
        OR c.last_message_sender_type = 'ai'::public.message_sender_type
      )
      AND (
        p_filter IS DISTINCT FROM 'needs_human'
        OR c.last_message_sender_type = 'client'::public.message_sender_type
      )
      AND (
        p_filter IS DISTINCT FROM 'active'
        OR c.status IN (
          'active'::public.conversation_status,
          'open'::public.conversation_status
        )
      )
  ),
  deduped AS (
    SELECT DISTINCT ON (f.channel, f.phone_digits)
      f.*
    FROM filtered AS f
    ORDER BY
      f.channel,
      f.phone_digits,
      f.activity_at DESC NULLS LAST,
      f.id DESC
  ),
  sorted AS (
    SELECT
      d.*,
      CASE
        WHEN p_sort = 'needs_reply_first'
          AND d.resolved_unread_count > 0
          AND d.status IN (
            'open'::public.conversation_status,
            'active'::public.conversation_status,
            'pending'::public.conversation_status
          )
        THEN 1
        ELSE 0
      END AS needs_reply_rank
    FROM deduped AS d
  )
  SELECT
    s.id,
    s.channel,
    s.status,
    s.updated_at,
    s.last_read_at,
    s.resolved_unread_count,
    s.last_message_preview,
    s.last_message_at,
    s.last_message_sender_type,
    s.last_message_ai_generated,
    s.last_client_message_at,
    s.contact_id,
    s.contact_name,
    s.contact_phone,
    s.contact_lead_score,
    s.contact_is_favorite,
    s.contact_avatar_url,
    CASE
      WHEN p_include_total_count THEN (
        SELECT COUNT(*)::BIGINT FROM deduped
      )
      ELSE NULL::BIGINT
    END AS total_count
  FROM sorted AS s
  ORDER BY
    s.needs_reply_rank DESC,
    CASE WHEN p_sort = 'channel' THEN s.channel END ASC NULLS LAST,
    s.activity_at DESC NULLS LAST,
    s.id DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_inbox_conversations(
  UUID,
  UUID,
  public.messaging_channel,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  INTEGER,
  BOOLEAN
) TO authenticated;
