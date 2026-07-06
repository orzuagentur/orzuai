import {
  renderBusinessSignature,
  renderDetailsTable,
  renderEmailHeading,
  renderEmailParagraph,
  renderInfoBox,
} from "@/lib/email/components";
import { renderBaseEmailLayout } from "@/lib/email/templates/base-layout";
import { escapeHtml } from "@/utils/email";

type BookingActionEmailParams = {
  businessName: string;
  action: "updated" | "cancelled" | "confirmed";
  customerName: string;
  slotLabel: string;
  resourceName?: string;
  pageTitle?: string;
  note?: string;
};

export function renderBookingActionEmail({
  businessName,
  action,
  customerName,
  slotLabel,
  resourceName,
  pageTitle,
  note,
}: BookingActionEmailParams): { subject: string; text: string; html: string } {
  const actionLabel =
    action === "cancelled"
      ? "cancelled"
      : action === "updated"
        ? "updated"
        : "confirmed";

  const subject =
    action === "cancelled"
      ? `Booking cancelled — ${pageTitle ?? businessName}`
      : action === "updated"
        ? `Booking updated — ${pageTitle ?? businessName}`
        : `Booking confirmed — ${pageTitle ?? businessName}`;

  const lines = [
    `Hi ${customerName},`,
    "",
    `Your booking with ${businessName} has been ${actionLabel}.`,
    "",
    pageTitle ? `Service: ${pageTitle}` : null,
    resourceName ? `Resource: ${resourceName}` : null,
    `When: ${slotLabel}`,
    note ? `Note: ${note}` : null,
    "",
    "If you have questions, reply to this email.",
    "",
    `— ${businessName}`,
  ].filter(Boolean);

  const text = lines.join("\n");

  const details = [
    ...(pageTitle ? [{ label: "Service", value: pageTitle }] : []),
    ...(resourceName ? [{ label: "Resource", value: resourceName }] : []),
    { label: "When", value: slotLabel },
    ...(note ? [{ label: "Note", value: note }] : []),
  ];

  const bodyHtml = `
    ${renderEmailHeading(`Booking ${actionLabel}`)}
    ${renderEmailParagraph(`Hi ${escapeHtml(customerName)}, your booking with <strong>${escapeHtml(businessName)}</strong> has been ${actionLabel}.`)}
    ${renderDetailsTable(details)}
    ${renderInfoBox("If you have questions, reply to this email.")}
    ${renderBusinessSignature(businessName)}
  `;

  const html = renderBaseEmailLayout({
    previewText: `Your booking with ${businessName} was ${actionLabel}.`,
    title: subject,
    bodyHtml,
    footerNote: `Sent on behalf of ${businessName} via OrzuX.`,
  });

  return { subject, text, html };
}
