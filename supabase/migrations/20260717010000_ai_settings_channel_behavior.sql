-- Per-channel AI behavior overrides (permissions + reply wait).
-- When channel_overrides_enabled is false, the agent inherits ai_assistant_profile.
-- When true (after saving channel AI edit), these columns drive that channel.

alter table public.ai_settings
  add column if not exists channel_overrides_enabled boolean not null default false,
  add column if not exists reply_wait_ms integer,
  add column if not exists can_create_task boolean,
  add column if not exists can_create_deal boolean,
  add column if not exists can_update_contact boolean,
  add column if not exists can_add_note boolean,
  add column if not exists can_add_internal_note boolean,
  add column if not exists can_create_calendar_event boolean,
  add column if not exists can_request_human boolean,
  add column if not exists can_notify_owner boolean,
  add column if not exists can_notify_on_actions boolean,
  add column if not exists can_summarize_actions_in_chat boolean,
  add column if not exists can_send_proactive_message boolean;

comment on column public.ai_settings.channel_overrides_enabled is
  'When true, reply_wait_ms and permission columns override ai_assistant_profile for this channel.';
