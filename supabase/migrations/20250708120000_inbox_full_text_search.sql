-- Inbox full-text search (GIN) + server-side list/filter/sort RPC

-- ---------------------------------------------------------------------------
-- FTS generated columns + GIN indexes
-- ---------------------------------------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(name, '') || ' ' ||
      coalesce(phone_number, '') || ' ' ||
      coalesce(email, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS contacts_search_vector_gin_idx
  ON public.contacts USING GIN (search_vector);

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(last_message_preview, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS conversations_search_vector_gin_idx
  ON public.conversations USING GIN (search_vector);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(content, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS messages_search_vector_gin_idx
  ON public.messages USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS messages_business_visible_idx
  ON public.messages (business_id, conversation_id)
  WHERE hidden_for_business = false;

-- ---------------------------------------------------------------------------
-- Inbox list RPC (search, filters, sort, pagination in PostgreSQL)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_search_tsquery(p_search TEXT)
RETURNS tsquery
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN NULLIF(btrim(p_search), '') IS NULL THEN NULL::tsquery
    ELSE plainto_tsquery('simple', btrim(p_search))
  END;
$$;

CREATE OR REPLACE FUNCTION public.list_inbox_conversations(
  p_business_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_channel public.messaging_channel DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_view TEXT DEFAULT 'all',
  p_filter TEXT DEFAULT 'all',
  p_sort TEXT DEFAULT 'latest',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
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
      c.unread_count,
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
      COALESCE(c.last_message_at, c.updated_at) AS activity_at
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
        OR EXISTS (
          SELECT 1
          FROM public.messages AS m
          WHERE m.conversation_id = c.id
            AND m.hidden_for_business = false
            AND m.search_vector @@ v_tsquery
        )
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
  ranked AS (
    SELECT
      f.*,
      COUNT(*) OVER () AS total_count,
      ROW_NUMBER() OVER (
        ORDER BY
          CASE
            WHEN p_sort = 'needs_reply_first'
              AND f.resolved_unread_count > 0
              AND f.status IN (
                'open'::public.conversation_status,
                'active'::public.conversation_status,
                'pending'::public.conversation_status
              )
            THEN 1
            ELSE 0
          END DESC,
          CASE WHEN p_sort = 'channel' THEN f.channel END ASC,
          f.activity_at DESC NULLS LAST,
          f.id DESC
      ) AS row_num
    FROM filtered AS f
  )
  SELECT
    r.id,
    r.channel,
    r.status,
    r.updated_at,
    r.last_read_at,
    r.resolved_unread_count,
    r.last_message_preview,
    r.last_message_at,
    r.last_message_sender_type,
    r.last_message_ai_generated,
    r.last_client_message_at,
    r.contact_id,
    r.contact_name,
    r.contact_phone,
    r.contact_lead_score,
    r.contact_is_favorite,
    r.contact_avatar_url,
    r.total_count
  FROM ranked AS r
  WHERE r.row_num > v_offset
    AND r.row_num <= v_offset + v_limit
  ORDER BY r.row_num;
END;
$$;

-- Explicit signature required: a 10-arg overload (with p_include_total_count)
-- also exists at this point on a clean rebuild, so a bare GRANT is ambiguous.
GRANT EXECUTE ON FUNCTION public.list_inbox_conversations(
  UUID,
  UUID,
  public.messaging_channel,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inbox_search_tsquery TO authenticated;
