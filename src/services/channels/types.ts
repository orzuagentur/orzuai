import type { MessagingChannel } from "@/types/database.types";

export type ChannelTextDeliveryResult =
  | { success: true; providerMessageId?: string }
  | { success: false; error: string; providerMessageId?: string };

export type ChannelRecipient = {
  channel: MessagingChannel;
  recipientId: string;
};

export type ChannelAdapter = {
  channel: MessagingChannel;
  deliverText: (input: {
    businessId: string;
    recipientId: string;
    content: string;
  }) => Promise<ChannelTextDeliveryResult>;
};
