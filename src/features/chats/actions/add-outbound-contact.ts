"use server";

import {
  listConnectedAddContactChannels,
  startOutboundConversation,
  verifyOutboundContact,
} from "@/services/outbound-contact.service";
import type { OutboundAddContactChannel } from "@/features/chats/outbound-contact";

export async function listConnectedAddContactChannelsAction() {
  const channels = await listConnectedAddContactChannels();
  return { success: true as const, channels };
}

export async function verifyOutboundContactAction(input: {
  channel: OutboundAddContactChannel;
  identifier: string;
  contactName?: string;
}) {
  return verifyOutboundContact(input);
}

export async function startOutboundConversationAction(input: {
  verifiedToken: string;
}) {
  return startOutboundConversation(input);
}
