import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { resolveInboundMessageContext } from "@/services/inbound-ingest.service";
import { updateContact } from "@/services/contacts.service";

export type PhoneContactListItem = {
  id: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  company: string | null;
  channel: string;
  createdAt: string | null;
};

function revalidateContactPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.chats);
  revalidatePath(DASHBOARD_ROUTES.chatsVoice);
  revalidatePath(DASHBOARD_ROUTES.chatsSms);
  revalidatePath(DASHBOARD_ROUTES.contacts);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export async function listPhoneContacts(
  businessId: string,
): Promise<PhoneContactListItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, phone_number, email, custom_fields, channel, created_at")
    .eq("business_id", businessId)
    .not("phone_number", "is", null)
    .neq("phone_number", "")
    .order("name", { ascending: true })
    .limit(500);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const customFields =
      row.custom_fields && typeof row.custom_fields === "object"
        ? (row.custom_fields as Record<string, unknown>)
        : {};

    return {
      id: row.id,
      name: row.name,
      phoneNumber: row.phone_number,
      email: row.email ?? null,
      company:
        typeof customFields.company === "string" ? customFields.company : null,
      channel: row.channel,
      createdAt: row.created_at ?? null,
    };
  });
}

export async function createPhoneContact(input: {
  phoneNumber: string;
  name: string;
  email?: string;
  company?: string;
  notes?: string;
}): Promise<
  | {
      success: true;
      contactId: string;
      conversationId: string;
    }
  | { success: false; message: string }
> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: "Business not found." };
  }

  const phone = input.phoneNumber.trim();
  const name = input.name.trim() || phone;

  if (!phone || phone.length < 8) {
    return { success: false, message: "Enter a valid phone number." };
  }

  const admin = createAdminClient();
  const context = await resolveInboundMessageContext(admin, {
    businessId,
    channel: "voice",
    contactName: name,
    contactPhone: phone,
    identifier: phone,
    displayLabel: name,
  });

  if (!context) {
    return { success: false, message: "Unable to create contact." };
  }

  const email = input.email?.trim() ?? "";
  const company = input.company?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";

  if (email || company || notes) {
    const updateResult = await updateContact({
      contactId: context.contactId,
      name,
      email: email || undefined,
      customFields: {
        company: company || undefined,
        notes: notes || undefined,
      },
    });

    if (!updateResult.success) {
      return {
        success: false,
        message: updateResult.error?.message ?? "Unable to save contact details.",
      };
    }
  }

  revalidateContactPaths();

  return {
    success: true,
    contactId: context.contactId,
    conversationId: context.conversationId,
  };
}
