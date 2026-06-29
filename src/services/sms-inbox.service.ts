import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import type { InboxBusinessContext } from "@/services/chat.service";
import {
  getChatsChannelPageData,
  getConversationDetail,
  resolveInboxBusinessContext,
} from "@/services/chat.service";
import { isVoiceInboxVisible, isSmsInboxVisible } from "@/services/voice-inbox.service";
import type { ConversationDetail, ConversationListItem } from "@/types/chat.types";

export type SmsInboxPageData = {
  hasBusiness: boolean;
  businessId: string | null;
  smsInboxEnabled: boolean;
  voiceInboxEnabled: boolean;
  visibleChannelIds: import("@/types/database.types").MessagingChannel[];
  conversations: ConversationListItem[];
  activeConversation: ConversationDetail | null;
};

export async function getSmsInboxPageData(
  inboxContext?: InboxBusinessContext | null,
  activeConversationId?: string | null,
  phoneDraft?: string | null,
): Promise<SmsInboxPageData> {
  const empty: SmsInboxPageData = {
    hasBusiness: false,
    businessId: null,
    smsInboxEnabled: false,
    voiceInboxEnabled: false,
    visibleChannelIds: [],
    conversations: [],
    activeConversation: null,
  };

  if (!hasSupabaseEnv()) {
    return empty;
  }

  const ctx = inboxContext ?? (await resolveInboxBusinessContext());

  if (!ctx) {
    return empty;
  }

  const [smsInboxEnabled, voiceInboxEnabled, channelPage] = await Promise.all([
    isSmsInboxVisible(ctx.businessId),
    isVoiceInboxVisible(ctx.businessId),
    getChatsChannelPageData("voice", ctx),
  ]);

  let activeConversation: ConversationDetail | null = null;

  if (activeConversationId) {
    activeConversation = await getConversationDetail(
      activeConversationId,
      ctx.businessId,
    );
  }

  return {
    hasBusiness: true,
    businessId: ctx.businessId,
    smsInboxEnabled,
    voiceInboxEnabled,
    visibleChannelIds: channelPage.visibleChannelIds,
    conversations: channelPage.conversations,
    activeConversation,
  };
}
