import {
  renderBusinessSignature,
  renderDetailsTable,
  renderEmailHeading,
  renderEmailParagraph,
  renderInfoBox,
} from "../components";
import { renderBaseEmailLayout } from "./base-layout";
import { escapeHtml } from "../../../utils/email";

type BookingConfirmationEmailParams = {
  businessName: string;
  pageTitle: string;
  customerName: string;
  slotLabel: string;
  resourceName?: string;
  timeZone: string;
};

export function renderBookingConfirmationEmail({
  businessName,
  pageTitle,
  customerName,
  slotLabel,
  resourceName,
}: BookingConfirmationEmailParams): { subject: string; text: string; html: string } {
  const subject = `Booking confirmed — ${pageTitle}`;

  const lines = [
    `Hi ${customerName},`,
    "",
    `Your appointment with ${businessName} is confirmed.`,
    "",
    `Service: ${pageTitle}`,
    `When: ${slotLabel}`,
    resourceName ? `With: ${resourceName}` : null,
    "",
    "If you need to reschedule, please contact us directly.",
    "",
    `— ${businessName}`,
  ].filter(Boolean);

  const text = lines.join("\n");

  const details = [
    { label: "Service", value: pageTitle },
    { label: "When", value: slotLabel },
  ];

  if (resourceName) {
    details.push({ label: "With", value: resourceName });
  }

  const bodyHtml = `
    ${renderEmailHeading("Booking confirmed")}
    ${renderEmailParagraph(`Hi ${escapeHtml(customerName)}, your appointment with <strong>${escapeHtml(businessName)}</strong> is confirmed.`)}
    ${renderDetailsTable(details)}
    ${renderInfoBox("If you need to reschedule, please contact the business directly.")}
    ${renderBusinessSignature(businessName)}
  `;

  const html = renderBaseEmailLayout({
    previewText: `Your booking with ${businessName} is confirmed.`,
    title: subject,
    bodyHtml,
    footerNote: `Sent on behalf of ${businessName} via OrzuX.`,
  });

  return { subject, text, html };
}
