"use server";

import { z } from "zod";

import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { placeOutboundVoiceCall } from "@/services/voice-agent.service";

const schema = z.object({
  phoneNumber: z.string().trim().min(8).max(32),
  contactId: z.string().uuid().optional(),
});

export async function triggerContactVoiceCallAction(
  input: z.infer<typeof schema>,
): Promise<{ success: boolean; message?: string }> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid phone number.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return placeOutboundVoiceCall({
    businessId: business.id,
    contactId: parsed.data.contactId ?? null,
    phoneNumber: parsed.data.phoneNumber,
    triggerReason: "contact_call",
    requireAiAssistant: true,
  });
}
