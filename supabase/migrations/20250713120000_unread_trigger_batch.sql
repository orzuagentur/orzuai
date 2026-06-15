-- Sprint F: unread trigger — O(1) writes per inbound message (not O(team size))

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

  -- Write 1: business-level unread counter (fallback for users without conversation_reads row)
  UPDATE public.conversations
  SET unread_count = unread_count + 1
  WHERE id = NEW.conversation_id;

  -- Write 2: bump only existing per-user rows that have not read since this message
  UPDATE public.conversation_reads
  SET
    unread_count = unread_count + 1,
    updated_at = timezone('utc', now())
  WHERE conversation_id = NEW.conversation_id
    AND (last_read_at IS NULL OR last_read_at < NEW.created_at);

  RETURN NEW;
END;
$$;
