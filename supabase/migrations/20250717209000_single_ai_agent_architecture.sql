-- Single AI Agent architecture.
-- The app now uses ai_assistant_profile as the canonical agent and no longer
-- routes customer messages through ai_agents.

ALTER TABLE public.ai_assistant_profile
  ADD COLUMN IF NOT EXISTS can_reply BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_create_task BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_create_deal BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_update_contact BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_create_calendar_event BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_request_human BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_notify_owner BOOLEAN NOT NULL DEFAULT TRUE;

-- Preserve history as plain text/JSON before removing multi-agent foreign keys.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS ai_agent_snapshot JSONB;

DO $$
BEGIN
  IF to_regclass('public.ai_agents') IS NOT NULL THEN
    UPDATE public.messages AS m
    SET ai_agent_snapshot = jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'removedByMigration', '20250717209000_single_ai_agent_architecture'
    )
    FROM public.ai_agents AS a
    WHERE m.ai_agent_id = a.id
      AND m.ai_agent_snapshot IS NULL;
  END IF;
END;
$$;

ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS ai_agent_snapshot JSONB;

DO $$
BEGIN
  IF to_regclass('public.ai_agents') IS NOT NULL THEN
    UPDATE public.agent_runs AS r
    SET ai_agent_snapshot = jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'goal', a.goal,
      'removedByMigration', '20250717209000_single_ai_agent_architecture'
    )
    FROM public.ai_agents AS a
    WHERE r.agent_id = a.id
      AND r.ai_agent_snapshot IS NULL;
  END IF;
END;
$$;

ALTER TABLE public.business_ai_config
  DROP CONSTRAINT IF EXISTS business_ai_config_follow_up_agent_id_fkey;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_ai_agent_id_fkey;

ALTER TABLE public.agent_runs
  DROP CONSTRAINT IF EXISTS agent_runs_agent_id_fkey;

ALTER TABLE public.business_ai_config
  DROP COLUMN IF EXISTS follow_up_agent_id;

ALTER TABLE public.messages
  DROP COLUMN IF EXISTS ai_agent_id;

ALTER TABLE public.agent_runs
  DROP COLUMN IF EXISTS agent_id;

DROP TABLE IF EXISTS public.ai_agents;
