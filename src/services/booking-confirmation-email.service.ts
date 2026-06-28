import "server-only";

import { renderBookingConfirmationEmail } from "@/lib/email/templates/booking-confirmation-email";
import { sendGmailMessage } from "@/lib/gmail/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGmailAccessTokenForBusiness } from "@/services/gmail-integration.service";

export async function sendBookingConfirmationEmail(input: {
  businessId: string;
  businessName: string;
  pageTitle: string;
  customerEmail: string;
  customerName: string;
  slotLabel: string;
  resourceName?: string;
  timeZone: string;
}): Promise<{ success: boolean; error?: string }> {
  const recipient = input.customerEmail.trim().toLowerCase();

  if (!recipient.includes("@")) {
    return { success: false, error: "Customer email is invalid." };
  }

  const { subject, text } = renderBookingConfirmationEmail({
    businessName: input.businessName,
    pageTitle: input.pageTitle,
    customerName: input.customerName,
    slotLabel: input.slotLabel,
    resourceName: input.resourceName,
    timeZone: input.timeZone,
  });

  const gmail = await getGmailAccessTokenForBusiness(input.businessId);

  if (gmail) {
    const result = await sendGmailMessage({
      accessToken: gmail.accessToken,
      fromEmail: gmail.fromEmail,
      toEmail: recipient,
      subject,
      body: text,
    });

    if (result.success) {
      return { success: true };
    }

    return { success: false, error: result.error ?? "Gmail send failed." };
  }

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("email, business_name")
    .eq("id", input.businessId)
    .maybeSingle();

  const ownerEmail = business?.email?.trim();

  if (!ownerEmail?.includes("@")) {
    return {
      success: false,
      error:
        "Connect Gmail in Integrations or add a business email to send confirmations from your account.",
    };
  }

  return {
    success: false,
    error:
      "Connect Gmail in Integrations to send booking confirmations from your email address.",
  };
}
