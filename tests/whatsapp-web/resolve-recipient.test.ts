import { describe, expect, it, vi } from "vitest";

import { resolveChannelRecipient } from "@/services/channels/resolve-recipient";

function adminWithConversation(conversation: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: conversation })),
  };

  return {
    from: vi.fn(() => query),
  } as never;
}

describe("resolveChannelRecipient for WhatsApp Web", () => {
  it("prefers the contact phone over a stored WhatsApp chat JID when available", async () => {
    const admin = adminWithConversation({
      contact_id: "contact-1",
      contact: {
        phone_number: "+992000000907",
        email: null,
        custom_fields: {
          whatsappChatJid: "249000000697@lid",
        },
      },
    });

    await expect(
      resolveChannelRecipient(admin, {
        businessId: "business-1",
        conversationId: "conversation-1",
        channel: "whatsapp_web",
      }),
    ).resolves.toBe("+992000000907");
  });

  it("falls back to the stored WhatsApp chat JID when no phone is available", async () => {
    const admin = adminWithConversation({
      contact_id: "contact-1",
      contact: {
        phone_number: null,
        email: null,
        custom_fields: {
          whatsappChatJid: "249000000697@lid",
        },
      },
    });

    await expect(
      resolveChannelRecipient(admin, {
        businessId: "business-1",
        conversationId: "conversation-1",
        channel: "whatsapp_web",
      }),
    ).resolves.toBe("249000000697@lid");
  });
});
