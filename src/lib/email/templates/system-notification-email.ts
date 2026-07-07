import { EMAIL_SUBJECTS } from "../constants";
import {
  renderEmailHeading,
  renderEmailParagraph,
  renderInfoBox,
  renderPrimaryButton,
} from "../components";
import { renderBaseEmailLayout } from "./base-layout";
import { escapeHtml } from "../../../utils/email";

type SystemNotificationEmailParams = {
  title: string;
  body: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
  previewText?: string | null;
};

export function renderSystemNotificationEmail({
  title,
  body,
  actionUrl,
  actionLabel,
  previewText,
}: SystemNotificationEmailParams): {
  subject: string;
  html: string;
} {
  const actionBlock =
    actionUrl && actionLabel
      ? renderPrimaryButton(actionUrl, actionLabel)
      : "";

  const bodyHtml = `
    ${renderEmailHeading(title)}
    ${renderEmailParagraph(escapeHtml(body))}
    ${actionBlock}
    ${renderInfoBox("This is an automated message from OrzuX.")}
  `;

  return {
    subject: `${EMAIL_SUBJECTS.systemNotification}: ${title}`,
    html: renderBaseEmailLayout({
      previewText: previewText ?? body.slice(0, 120),
      title,
      bodyHtml,
    }),
  };
}
