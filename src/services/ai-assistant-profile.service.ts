import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  DEFAULT_AI_LANGUAGE,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "@/features/business/constants";
import { DEFAULT_COMMUNICATION_STYLE } from "@/features/ai-assistant/communication-styles";
import { getDefaultGeminiModel } from "@/lib/env";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  disableAiForAllChannels,
  enableAiForChannels,
  getChannelConnectionStatuses,
} from "@/services/channel-workspace.service";
import { getActiveMessagingChannelIds } from "@/features/integrations";
import {
  isCollectionNiche,
  parseDataCollectionFields,
  type CollectionNiche,
  type DataCollectionField,
} from "@/lib/ai/data-collection";
import type {
  AiAssistantProfileData,
  CrmUpdateMode,
  SaveAiAssistantProfileInput,
} from "@/types/ai-assistant-profile.types";
import {
  isCrmUpdateMode,
  saveAiAssistantProfileSchema,
} from "@/types/ai-assistant-profile.types";
import type { AgentScheduleSlot } from "@/types/ai-assistant-schedule.types";
import { agentScheduleSlotsSchema } from "@/types/ai-assistant-schedule.types";
import { saveVoiceAgentSettingsSchema } from "@/types/elevenlabs.types";
import type { SaveVoiceAgentSettingsInput } from "@/types/elevenlabs.types";

function parseCrmUpdateMode(value: unknown): CrmUpdateMode {
  return isCrmUpdateMode(value) ? value : "every_message";
}

const PROFILE_SELECT =
  "business_id, name, system_prompt, communication_style, language, reply_wait_ms, schedule_enabled, schedule_timezone, schedule_slots, crm_update_mode, can_reply, can_create_task, can_create_deal, can_update_contact, can_add_note, can_add_internal_note, can_create_calendar_event, can_request_human, can_notify_owner, can_notify_on_actions, can_summarize_actions_in_chat, can_send_proactive_message, collection_niche, data_collection_fields, voice_reply_enabled, elevenlabs_voice_id, elevenlabs_voice_name, voice_reply_mode";

function parseCollectionNiche(value: unknown): CollectionNiche {
  return isCollectionNiche(value) ? value : "generic";
}

function parseScheduleSlots(value: unknown): AgentScheduleSlot[] {
  const parsed = agentScheduleSlotsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

function revalidateAssistantProfilePaths(): void {
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.chats);
}

function mapProfileRow(row: {
  business_id: string;
  name: string;
  system_prompt: string;
  communication_style: string;
  language: string;
  reply_wait_ms?: number | null;
  schedule_enabled?: boolean | null;
  schedule_timezone?: string | null;
  schedule_slots?: unknown;
  crm_update_mode?: string | null;
  can_reply?: boolean | null;
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
  collection_niche?: string | null;
  data_collection_fields?: unknown;
  voice_reply_enabled?: boolean | null;
  elevenlabs_voice_id?: string | null;
  elevenlabs_voice_name?: string | null;
  voice_reply_mode?: string | null;
}): AiAssistantProfileData {
  return {
    businessId: row.business_id,
    name: row.name,
    systemPrompt: row.system_prompt,
    communicationStyle: row.communication_style,
    language: row.language,
    replyWaitMs: row.reply_wait_ms ?? 1500,
    scheduleEnabled: row.schedule_enabled ?? false,
    scheduleTimezone: row.schedule_timezone?.trim() || "UTC",
    scheduleSlots: parseScheduleSlots(row.schedule_slots),
    crmUpdateMode: parseCrmUpdateMode(row.crm_update_mode),
    canReply: row.can_reply ?? true,
    canCreateTask: row.can_create_task ?? true,
    canCreateDeal: row.can_create_deal ?? true,
    canUpdateContact: row.can_update_contact ?? true,
    canAddNote: row.can_add_note ?? true,
    canAddInternalNote: row.can_add_internal_note ?? true,
    canCreateCalendarEvent: row.can_create_calendar_event ?? true,
    canRequestHuman: row.can_request_human ?? true,
    canNotifyOwner: row.can_notify_owner ?? true,
    canNotifyOnActions: row.can_notify_on_actions ?? true,
    canSummarizeActionsInChat: row.can_summarize_actions_in_chat ?? true,
    canSendProactiveMessage: row.can_send_proactive_message ?? true,
    collectionNiche: parseCollectionNiche(row.collection_niche),
    dataCollectionFields: parseDataCollectionFields(row.data_collection_fields),
    voiceReplyEnabled: row.voice_reply_enabled ?? false,
    elevenlabsVoiceId: row.elevenlabs_voice_id?.trim() || null,
    elevenlabsVoiceName: row.elevenlabs_voice_name?.trim() || null,
    voiceReplyMode: row.voice_reply_mode === "always" ? "always" : "mirror",
  };
}

export function getDefaultAiAssistantProfile(
  businessId: string,
): AiAssistantProfileData {
  return {
    businessId,
    name: "AI Agent",
    systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
    communicationStyle: DEFAULT_COMMUNICATION_STYLE,
    language: DEFAULT_AI_LANGUAGE,
    replyWaitMs: 1500,
    scheduleEnabled: false,
    scheduleTimezone: "UTC",
    scheduleSlots: [],
    crmUpdateMode: "every_message",
    canReply: true,
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
    collectionNiche: "generic",
    dataCollectionFields: [] as DataCollectionField[],
    voiceReplyEnabled: false,
    elevenlabsVoiceId: null,
    elevenlabsVoiceName: null,
    voiceReplyMode: "mirror",
  };
}

export async function ensureAiAssistantProfile(
  businessId: string,
): Promise<AiAssistantProfileData> {
  if (!hasSupabaseEnv()) {
    return getDefaultAiAssistantProfile(businessId);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_assistant_profile")
    .select(PROFILE_SELECT)
    .eq("business_id", businessId)
    .maybeSingle();

  if (data) {
    return mapProfileRow(data);
  }

  const defaults = getDefaultAiAssistantProfile(businessId);
  const { data: created } = await supabase
    .from("ai_assistant_profile")
    .insert({
      business_id: businessId,
      name: defaults.name,
      system_prompt: defaults.systemPrompt,
      communication_style: defaults.communicationStyle,
      language: defaults.language,
      can_reply: defaults.canReply,
      can_create_task: defaults.canCreateTask,
      can_create_deal: defaults.canCreateDeal,
      can_update_contact: defaults.canUpdateContact,
      can_add_note: defaults.canAddNote,
      can_add_internal_note: defaults.canAddInternalNote,
      can_create_calendar_event: defaults.canCreateCalendarEvent,
      can_request_human: defaults.canRequestHuman,
      can_notify_owner: defaults.canNotifyOwner,
      can_notify_on_actions: defaults.canNotifyOnActions,
      can_summarize_actions_in_chat: defaults.canSummarizeActionsInChat,
    })
    .select(PROFILE_SELECT)
    .single();

  return created ? mapProfileRow(created) : defaults;
}

export async function getAiAssistantProfileForBusiness(
  businessId: string,
): Promise<AiAssistantProfileData> {
  return ensureAiAssistantProfile(businessId);
}

export async function saveAiAssistantProfile(
  input: SaveAiAssistantProfileInput,
): Promise<{ success: boolean; message?: string }> {
  const parsed = saveAiAssistantProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid profile.",
    };
  }

  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ai_assistant_profile").upsert(
    {
      business_id: business.id,
      name: parsed.data.name,
      system_prompt: parsed.data.systemPrompt,
      communication_style: parsed.data.communicationStyle,
      language: parsed.data.language,
      reply_wait_ms: parsed.data.replyWaitMs,
      schedule_enabled: parsed.data.scheduleEnabled,
      schedule_timezone: parsed.data.scheduleTimezone,
      schedule_slots: parsed.data.scheduleSlots,
      crm_update_mode: parsed.data.crmUpdateMode,
      can_reply: parsed.data.canReply,
      can_create_task: parsed.data.canCreateTask,
      can_create_deal: parsed.data.canCreateDeal,
      can_update_contact: parsed.data.canUpdateContact,
      can_add_note: parsed.data.canAddNote,
      can_add_internal_note: parsed.data.canAddInternalNote,
      can_create_calendar_event: parsed.data.canCreateCalendarEvent,
      can_request_human: parsed.data.canRequestHuman,
      can_notify_owner: parsed.data.canNotifyOwner,
      can_notify_on_actions: parsed.data.canNotifyOnActions,
      can_summarize_actions_in_chat: parsed.data.canSummarizeActionsInChat,
      can_send_proactive_message: parsed.data.canSendProactiveMessage,
      collection_niche: parsed.data.collectionNiche,
      data_collection_fields: parsed.data.dataCollectionFields,
    },
    { onConflict: "business_id" },
  );

  if (error) {
    return { success: false, message: "Unable to save assistant profile." };
  }

  const defaultModel = getDefaultGeminiModel();

  await supabase
    .from("ai_settings")
    .update({
      provider: "gemini",
      model: defaultModel,
      language: parsed.data.language,
      system_prompt: parsed.data.systemPrompt,
    })
    .eq("business_id", business.id);

  if (parsed.data.canReply) {
    const channelStatuses = await getChannelConnectionStatuses(business.id);
    const connectedChannels = getActiveMessagingChannelIds(channelStatuses);
    await enableAiForChannels(business.id, connectedChannels);
  } else {
    await disableAiForAllChannels(business.id);
  }

  revalidateAssistantProfilePaths();
  return { success: true };
}

export async function saveVoiceAgentSettings(
  input: SaveVoiceAgentSettingsInput,
): Promise<{ success: boolean; message?: string }> {
  const parsed = saveVoiceAgentSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid voice settings.",
    };
  }

  if (parsed.data.voiceReplyEnabled && !parsed.data.elevenlabsVoiceId) {
    return {
      success: false,
      message: "Select a voice before enabling voice replies.",
    };
  }

  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  await ensureAiAssistantProfile(business.id);

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_assistant_profile")
    .update({
      voice_reply_enabled: parsed.data.voiceReplyEnabled,
      elevenlabs_voice_id: parsed.data.elevenlabsVoiceId,
      elevenlabs_voice_name: parsed.data.elevenlabsVoiceName,
      voice_reply_mode: parsed.data.voiceReplyMode,
    })
    .eq("business_id", business.id);

  if (error) {
    return { success: false, message: "Unable to save voice agent settings." };
  }

  revalidateAssistantProfilePaths();
  return { success: true };
}
