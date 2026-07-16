import type {
  ChannelAiBehaviorPermissions,
  ChannelAiBehaviorSettings,
} from "@/types/channel-workspace.types";

const DEFAULT_REPLY_WAIT_MS = 1_500;

export const DEFAULT_CHANNEL_AI_PERMISSIONS: ChannelAiBehaviorPermissions = {
  canCreateTask: true,
  canCreateDeal: true,
  canUpdateContact: true,
  canAddNote: true,
  canAddInternalNote: true,
  canCreateCalendarEvent: true,
  canRequestHuman: true,
  canNotifyOwner: true,
  canNotifyOnActions: true,
  canSummarizeActionsInChat: true,
  canSendProactiveMessage: true,
};

export function buildDefaultChannelAiBehavior(
  replyWaitMs: number = DEFAULT_REPLY_WAIT_MS,
): ChannelAiBehaviorSettings {
  return {
    ...DEFAULT_CHANNEL_AI_PERMISSIONS,
    replyWaitMs,
    overridesEnabled: false,
  };
}

export type ChannelAiOverrideRow = {
  channel_overrides_enabled?: boolean | null;
  reply_wait_ms?: number | null;
  can_create_task?: boolean | null;
  can_create_deal?: boolean | null;
  can_update_contact?: boolean | null;
  can_add_note?: boolean | null;
  can_add_internal_note?: boolean | null;
  can_create_calendar_event?: boolean | null;
  can_request_human?: boolean | null;
  can_notify_owner?: boolean | null;
  can_notify_on_actions?: boolean | null;
  can_summarize_actions_in_chat?: boolean | null;
  can_send_proactive_message?: boolean | null;
};

export function mapChannelAiBehaviorRow(
  row: ChannelAiOverrideRow | null | undefined,
  fallback: ChannelAiBehaviorSettings,
): ChannelAiBehaviorSettings {
  if (!row?.channel_overrides_enabled) {
    return {
      ...fallback,
      overridesEnabled: false,
    };
  }

  return {
    overridesEnabled: true,
    replyWaitMs: row.reply_wait_ms ?? fallback.replyWaitMs,
    canCreateTask: row.can_create_task ?? fallback.canCreateTask,
    canCreateDeal: row.can_create_deal ?? fallback.canCreateDeal,
    canUpdateContact: row.can_update_contact ?? fallback.canUpdateContact,
    canAddNote: row.can_add_note ?? fallback.canAddNote,
    canAddInternalNote: row.can_add_internal_note ?? fallback.canAddInternalNote,
    canCreateCalendarEvent:
      row.can_create_calendar_event ?? fallback.canCreateCalendarEvent,
    canRequestHuman: row.can_request_human ?? fallback.canRequestHuman,
    canNotifyOwner: row.can_notify_owner ?? fallback.canNotifyOwner,
    canNotifyOnActions: row.can_notify_on_actions ?? fallback.canNotifyOnActions,
    canSummarizeActionsInChat:
      row.can_summarize_actions_in_chat ?? fallback.canSummarizeActionsInChat,
    canSendProactiveMessage:
      row.can_send_proactive_message ?? fallback.canSendProactiveMessage,
  };
}

export function applyChannelBehaviorToProfilePermissions<
  T extends ChannelAiBehaviorPermissions,
>(profile: T, behavior: ChannelAiBehaviorSettings | null | undefined): T {
  if (!behavior?.overridesEnabled) {
    return profile;
  }

  return {
    ...profile,
    canCreateTask: behavior.canCreateTask,
    canCreateDeal: behavior.canCreateDeal,
    canUpdateContact: behavior.canUpdateContact,
    canAddNote: behavior.canAddNote,
    canAddInternalNote: behavior.canAddInternalNote,
    canCreateCalendarEvent: behavior.canCreateCalendarEvent,
    canRequestHuman: behavior.canRequestHuman,
    canNotifyOwner: behavior.canNotifyOwner,
    canNotifyOnActions: behavior.canNotifyOnActions,
    canSummarizeActionsInChat: behavior.canSummarizeActionsInChat,
    canSendProactiveMessage: behavior.canSendProactiveMessage,
  };
}
