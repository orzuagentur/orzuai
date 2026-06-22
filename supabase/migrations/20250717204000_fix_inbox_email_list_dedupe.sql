-- Email contacts store addresses in phone_number/email, not digits.
-- The inbox list deduped by phone digits only, collapsing most email threads.

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
      CASE
        WHEN c.channel = 'email'::public.messaging_channel THEN
          lower(
            trim(
              COALESCE(
                NULLIF(trim(ct.email), ''),
                NULLIF(trim(ct.phone_number), ''),
                ct.id::text
              )
            )
          )
        ELSE
          regexp_replace(COALESCE(ct.phone_number, ''), '[^0-9]', '', 'g')
      END AS dedupe_key
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
    SELECT DISTINCT ON (f.channel, f.dedupe_key)
      f.*
    FROM filtered AS f
    ORDER BY
      f.channel,
      f.dedupe_key,
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
