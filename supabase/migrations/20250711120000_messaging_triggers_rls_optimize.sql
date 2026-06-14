-- P2-11: fewer trigger round-trips, simpler RLS (no conversation join on messages)

-- ---------------------------------------------------------------------------
-- Merge dual unread triggers into one function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_client_message_unread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type <> 'client'
     OR NEW.hidden_for_business
     OR NEW.deleted_for_all_at IS NOT NULL
     OR NEW.business_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.conversations
  SET unread_count = unread_count + 1
  WHERE id = NEW.conversation_id;

  INSERT INTO public.conversation_reads (
    business_id,
    conversation_id,
    user_id,
    unread_count
  )
  SELECT
    NEW.business_id,
    NEW.conversation_id,
    recipients.user_id,
    1
  FROM (
    SELECT b.user_id
    FROM public.businesses AS b
    WHERE b.id = NEW.business_id
    UNION
    SELECT m.user_id
    FROM public.business_members AS m
    WHERE m.business_id = NEW.business_id
      AND m.status = 'active'
      AND m.user_id IS NOT NULL
  ) AS recipients
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET
    unread_count = public.conversation_reads.unread_count + 1,
    updated_at = timezone('utc', now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_increment_unread_trigger ON public.messages;
DROP TRIGGER IF EXISTS messages_increment_conversation_reads_trigger ON public.messages;

CREATE TRIGGER messages_client_unread_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_client_message_unread();

-- ---------------------------------------------------------------------------
-- messages RLS: use denormalized business_id (no join to conversations)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS messages_team_access ON public.messages;

CREATE POLICY messages_team_access
ON public.messages
FOR ALL
TO authenticated
USING (
  business_id IS NOT NULL
  AND public.user_can_access_business(business_id)
)
WITH CHECK (
  business_id IS NOT NULL
  AND public.user_can_access_business(business_id)
);

-- ---------------------------------------------------------------------------
-- conversation_reads RLS: own rows only (no business membership re-check)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS conversation_reads_self_access ON public.conversation_reads;

CREATE POLICY conversation_reads_self_access
ON public.conversation_reads
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
