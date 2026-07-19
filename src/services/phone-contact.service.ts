import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getVoiceRepository } from "@/repositories/voice.repository";
import { resolveInboundMessageContext } from "@/services/inbound-ingest.service";

export const VOICE_PHONEBOOK_FLAG = "voicePhonebook";

export type PhoneContactListScope = "phonebook" | "all";

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
  revalidatePath(DASHBOARD_ROUTES.voice);
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
  scope: PhoneContactListScope = "all",
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

  return data
    .map((row) => {
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
        isPhonebook: customFields[VOICE_PHONEBOOK_FLAG] === true
          || customFields[VOICE_PHONEBOOK_FLAG] === "true",
      };
    })
    .filter((contact) => scope !== "phonebook" || contact.isPhonebook)
    .map(({ isPhonebook: _isPhonebook, ...contact }) => contact);
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

  const { data: existingContact, error: existingError } = await admin
    .from("contacts")
    .select("custom_fields")
    .eq("id", context.contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (existingError) {
    return { success: false, message: "Unable to save contact details." };
  }

  const existingCustomFields =
    existingContact?.custom_fields && typeof existingContact.custom_fields === "object"
      ? (existingContact.custom_fields as Record<string, unknown>)
      : {};

  const { error: updateError } = await admin
    .from("contacts")
    .update({
      name,
      email: email || null,
      custom_fields: {
        ...existingCustomFields,
        [VOICE_PHONEBOOK_FLAG]: "true",
        ...(company ? { company } : {}),
        ...(notes ? { notes } : {}),
      },
    })
    .eq("id", context.contactId)
    .eq("business_id", businessId);

  if (updateError) {
    return { success: false, message: "Unable to save contact details." };
  }

  revalidateContactPaths();

  return {
    success: true,
    contactId: context.contactId,
    conversationId: context.conversationId,
  };
}

function isVoicePhonebookContact(customFields: Record<string, unknown>): boolean {
  return (
    customFields[VOICE_PHONEBOOK_FLAG] === true
    || customFields[VOICE_PHONEBOOK_FLAG] === "true"
  );
}

async function getOwnedPhonebookContact(
  contactId: string,
  businessId: string,
): Promise<
  | {
      customFields: Record<string, unknown>;
      phoneNumber: string;
    }
  | null
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("custom_fields, phone_number")
    .eq("id", contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const customFields =
    data.custom_fields && typeof data.custom_fields === "object"
      ? (data.custom_fields as Record<string, unknown>)
      : {};

  if (!isVoicePhonebookContact(customFields)) {
    return null;
  }

  return {
    customFields,
    phoneNumber: data.phone_number?.trim() ?? "",
  };
}

export async function updatePhoneContact(input: {
  contactId: string;
  phoneNumber: string;
  name: string;
  email?: string;
  company?: string;
  notes?: string;
}): Promise<{ success: true } | { success: false; message: string }> {
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

  const existing = await getOwnedPhonebookContact(input.contactId, businessId);

  if (!existing) {
    return { success: false, message: "Contact not found." };
  }

  const email = input.email?.trim() ?? "";
  const company = input.company?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({
      name,
      phone_number: phone,
      email: email || null,
      custom_fields: {
        ...existing.customFields,
        [VOICE_PHONEBOOK_FLAG]: "true",
        ...(company ? { company } : {}),
        ...(notes ? { notes } : {}),
      },
    })
    .eq("id", input.contactId)
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: "Unable to update contact." };
  }

  revalidateContactPaths();
  return { success: true };
}

export async function deletePhoneContact(
  contactId: string,
): Promise<{ success: true } | { success: false; message: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: "Business not found." };
  }

  const existing = await getOwnedPhonebookContact(contactId, businessId);

  if (!existing) {
    return { success: false, message: "Contact not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: "Unable to delete contact." };
  }

  if (existing.phoneNumber) {
    try {
      await getVoiceRepository().deleteCallLogsByPhoneNumber(
        businessId,
        existing.phoneNumber,
      );
    } catch {
      return { success: false, message: "Unable to remove call history." };
    }
  }

  revalidateContactPaths();
  return { success: true };
}
