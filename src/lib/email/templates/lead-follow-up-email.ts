import {
  renderBusinessSignature,
  renderEmailHeading,
  renderEmailParagraph,
} from "../components";
import { renderBaseEmailLayout } from "./base-layout";
import { escapeHtml } from "../../../utils/email";

type LeadFollowUpEmailParams = {
  businessName: string;
  recipientName: string;
  message: string;
};

export function renderLeadFollowUpEmail({
  businessName,
  recipientName,
  message,
}: LeadFollowUpEmailParams): { subject: string; html: string } {
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

  const bodyHtml = `
    ${renderEmailHeading(`Thank you for contacting ${escapeHtml(businessName)}`)}
    ${renderEmailParagraph(`Hi ${escapeHtml(recipientName)},`)}
    ${renderEmailParagraph(safeMessage)}
    ${renderBusinessSignature(businessName)}
  `;

  return {
    subject: `Thank you for contacting ${businessName}`,
    html: renderBaseEmailLayout({
      previewText: `A message from ${businessName}.`,
      title: `Message from ${businessName}`,
      bodyHtml,
      footerNote: `Sent on behalf of ${businessName} via OrzuX.`,
    }),
  };
}
