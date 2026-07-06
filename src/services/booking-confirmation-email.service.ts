import "server-only";

import { renderBookingConfirmationEmail } from "@/lib/email/templates/booking-confirmation-email";
import { renderBookingActionEmail } from "@/lib/email/templates/booking-action-email";
import { sendBusinessOutboundEmail } from "@/services/business-outbound-email.service";

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

  const { subject, text, html } = renderBookingConfirmationEmail({
    businessName: input.businessName,
    pageTitle: input.pageTitle,
    customerName: input.customerName,
    slotLabel: input.slotLabel,
    resourceName: input.resourceName,
    timeZone: input.timeZone,
  });

  return sendBusinessOutboundEmail({
    businessId: input.businessId,
    to: recipient,
    subject,
    text,
    html,
  });
}

export async function sendBookingActionEmail(input: {
  businessId: string;
  businessName: string;
  customerEmail: string;
  customerName: string;
  action: "updated" | "cancelled" | "confirmed";
  slotLabel: string;
  resourceName?: string;
  pageTitle?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const recipient = input.customerEmail.trim().toLowerCase();

  if (!recipient.includes("@")) {
    return { success: false, error: "Customer email is invalid." };
  }

  const { subject, text, html } = renderBookingActionEmail({
    businessName: input.businessName,
    action: input.action,
    customerName: input.customerName,
    slotLabel: input.slotLabel,
    resourceName: input.resourceName,
    pageTitle: input.pageTitle,
    note: input.note,
  });

  return sendBusinessOutboundEmail({
    businessId: input.businessId,
    to: recipient,
    subject,
    text,
    html,
  });
}
