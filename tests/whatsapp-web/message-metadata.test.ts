import { describe, expect, it } from "vitest";

import type { ChatMessageData } from "@/types/chat.types";
import { normalizeOutboundDeliveryStatus } from "@/utils/message-metadata";
import { createOptimisticChatMessage } from "@/utils/optimistic-chat-message";

function outboundMessage(
  patch: Partial<ChatMessageData> = {},
): ChatMessageData {
  return {
    id: "message-1",
    conversationId: "conversation-1",
    channel: "whatsapp_web",
    senderType: "user",
    content: "hello",
    aiGenerated: false,
    createdAt: "2026-08-04T00:00:00.000Z",
    sentAt: "2026-08-04T00:00:00.000Z",
    deletedForAllAt: null,
    hiddenForBusiness: false,
    editedAt: null,
    isEdited: false,
    ...patch,
  };
}

describe("WhatsApp Web outbound message metadata", () => {
  it("does not promote a missing delivery status to sent", () => {
    expect(
      normalizeOutboundDeliveryStatus(outboundMessage()).deliveryStatus,
    ).toBe("pending");
  });

  it("keeps pending delivery status pending after server reconciliation", () => {
    expect(
      normalizeOutboundDeliveryStatus(
        outboundMessage({ deliveryStatus: "pending", isPending: true }),
      ),
    ).toMatchObject({ deliveryStatus: "pending", isPending: false });
  });

  it("creates optimistic messages as pending until the worker confirms send", () => {
    expect(
      createOptimisticChatMessage({
        id: "pending-1",
        conversationId: "conversation-1",
        channel: "whatsapp_web",
        content: "hello",
      }).deliveryStatus,
    ).toBe("pending");
  });

  it("normalizes AI outbound messages with missing delivery status as pending", () => {
    expect(
      normalizeOutboundDeliveryStatus(
        outboundMessage({ senderType: "ai" }),
      ).deliveryStatus,
    ).toBe("pending");
  });
});
