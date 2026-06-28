import "server-only";

import { sendGmailMessage } from "@/lib/gmail/client";
import { getResendClient } from "@/lib/resend/client";
import { getResendFromEmail, hasResendEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGmailAccessTokenForBusiness } from "@/services/gmail-integration.service";

export type BusinessOutboundEmailInput = {
  businessId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type BusinessSenderProfile = {
  businessName: string;
  replyToEmail: string | null;
  ownerEmail: string | null;
};

export async function resolveBusinessSenderProfile(
  businessId: string,
): Promise<BusinessSenderProfile> {
  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("business_name, email, user_id")
    .eq("id", businessId)
    .maybeSingle();

  let ownerEmail: string | null = business?.email?.trim() || null;

  if (!ownerEmail?.includes("@") && business?.user_id) {
    const { data: ownerUser } = await admin.auth.admin.getUserById(business.user_id);
    ownerEmail = ownerUser.user?.email?.trim() || null;
  }

  return {
    businessName: business?.business_name ?? "Business",
    replyToEmail: ownerEmail,
    ownerEmail,
  };
}

/**
 * Sends email as the business owner when possible.
 * 1. Connected Gmail — from owner's Gmail address.
 * 2. Resend fallback — platform from with reply-to set to business or owner email.
 */
export async function sendBusinessOutboundEmail(
  input: BusinessOutboundEmailInput,
): Promise<{ success: boolean; error?: string }> {
  const recipient = input.to.trim().toLowerCase();

  if (!recipient.includes("@")) {
    return { success: false, error: "Recipient email is invalid." };
  }

  const gmail = await getGmailAccessTokenForBusiness(input.businessId);

  if (gmail) {
    const result = await sendGmailMessage({
      accessToken: gmail.accessToken,
      fromEmail: gmail.fromEmail,
      toEmail: recipient,
      subject: input.subject,
      body: input.text,
    });

    if (result.success) {
      return { success: true };
    }

    return { success: false, error: result.error ?? "Gmail send failed." };
  }

  if (!hasResendEnv()) {
    return {
      success: false,
      error: "Email is not configured. Connect Gmail or configure Resend.",
    };
  }

  const sender = await resolveBusinessSenderProfile(input.businessId);
  const replyTo = sender.replyToEmail;

  if (!replyTo?.includes("@")) {
    return {
      success: false,
      error: "Add a business email or use the account owner email to send notifications.",
    };
  }

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: getResendFromEmail(),
      replyTo: [replyTo],
      to: recipient,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email send failed.",
    };
  }
}
