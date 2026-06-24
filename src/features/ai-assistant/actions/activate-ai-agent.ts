"use server";

import { getActiveMessagingChannelIds } from "@/features/integrations";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  getChannelConnectionStatuses,
  updateChannelAiEnabled,
} from "@/services/channel-workspace.service";
import { saveAiAssistantProfile } from "@/services/ai-assistant-profile.service";
import { getAiAssistantProfileForBusiness } from "@/services/ai-assistant-profile.service";
import {
  DEFAULT_COMMUNICATION_STYLE,
  isCommunicationStyleId,
} from "@/features/ai-assistant/communication-styles";

export async function activateAiAgentAction(): Promise<{
  success: boolean;
  message?: string;
  enabledChannels: number;
}> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found.", enabledChannels: 0 };
  }

  const profile = await getAiAssistantProfileForBusiness(business.id);
  const saved = await saveAiAssistantProfile({
    name: profile.name || "AI Agent",
    systemPrompt: profile.systemPrompt,
    communicationStyle: isCommunicationStyleId(profile.communicationStyle)
      ? profile.communicationStyle
      : DEFAULT_COMMUNICATION_STYLE,
    language: profile.language,
    canReply: true,
    canCreateTask: profile.canCreateTask,
    canCreateDeal: profile.canCreateDeal,
    canUpdateContact: profile.canUpdateContact,
    canAddNote: profile.canAddNote,
    canAddInternalNote: profile.canAddInternalNote,
    canCreateCalendarEvent: profile.canCreateCalendarEvent,
    canRequestHuman: profile.canRequestHuman,
    canNotifyOwner: profile.canNotifyOwner,
    canNotifyOnActions: profile.canNotifyOnActions,
    canSummarizeActionsInChat: profile.canSummarizeActionsInChat,
  });

  if (!saved.success) {
    return {
      success: false,
      message: saved.message ?? "Unable to activate AI Agent.",
      enabledChannels: 0,
    };
  }

  const statuses = await getChannelConnectionStatuses(business.id);
  const connectedChannels = getActiveMessagingChannelIds(statuses);

  await Promise.all(
    connectedChannels.map((channel) =>
      updateChannelAiEnabled(channel, true),
    ),
  );

  return {
    success: true,
    enabledChannels: connectedChannels.length,
  };
}
