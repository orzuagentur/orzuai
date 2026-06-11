import "server-only";

import { z } from "zod";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getContactForInboxSidebar } from "@/services/contacts.service";
import type { ContactProfileData } from "@/types/contact.types";
import type { CrmDealItem } from "@/types/crm-deal.types";
import type { UnifiedContactItem } from "@/types/contact.types";

export const inboxDetailsPanelSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation identifier."),
});

export type InboxDetailsPanelInput = z.infer<typeof inboxDetailsPanelSchema>;

export type InboxDetailsPanelData = {
  contactId: string;
  contact: UnifiedContactItem;
  messageCount: number;
  deals: CrmDealItem[];
  profileForInfoRows: ContactProfileData;
  suggestedAction: string;
};

export type InboxDetailsPanelResult =
  | { success: true; data: InboxDetailsPanelData }
  | { success: false; error: { code: string; message: string } };

const DEFAULT_SUGGESTED_ACTION =
  "Review the latest customer message and reply with next steps.";

export async function getInboxDetailsPanel(
  input: InboxDetailsPanelInput,
): Promise<InboxDetailsPanelResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CHAT_MESSAGES.genericError },
    };
  }

  const parsed = inboxDetailsPanelSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
      },
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return {
      success: false,
      error: { code: "NO_BUSINESS", message: CHAT_MESSAGES.noBusinessDescription },
    };
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, contact:contacts(id)")
    .eq("id", parsed.data.conversationId)
    .eq("business_id", business.id)
    .maybeSingle();

  const contactRef = Array.isArray(conversation?.contact)
    ? conversation.contact[0]
    : conversation?.contact;

  if (!conversation || !contactRef?.id) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: CHAT_MESSAGES.genericError },
    };
  }

  const sidebar = await getContactForInboxSidebar(contactRef.id);

  if (!sidebar) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: CHAT_MESSAGES.genericError },
    };
  }

  const profileForInfoRows: ContactProfileData = {
    contact: sidebar.contact,
    conversationId: conversation.id,
    assignedToEmail: null,
    messageCount: sidebar.messageCount,
    timeline: [],
    tasks: [],
    deals: sidebar.deals,
  };

  return {
    success: true,
    data: {
      contactId: sidebar.contact.id,
      contact: sidebar.contact,
      messageCount: sidebar.messageCount,
      deals: sidebar.deals,
      profileForInfoRows,
      suggestedAction: DEFAULT_SUGGESTED_ACTION,
    },
  };
}
