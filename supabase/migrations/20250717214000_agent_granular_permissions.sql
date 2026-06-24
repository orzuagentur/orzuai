-- Granular AI Agent permissions for CRM actions, manager notes, and owner alerts.

ALTER TABLE public.ai_assistant_profile
  ADD COLUMN IF NOT EXISTS can_add_note BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_add_internal_note BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_notify_on_actions BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_summarize_actions_in_chat BOOLEAN NOT NULL DEFAULT TRUE;
