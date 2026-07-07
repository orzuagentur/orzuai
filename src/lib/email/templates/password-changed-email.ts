import {
  renderEmailHeading,
  renderEmailParagraph,
  renderInfoBox,
} from "../components";
import { renderBaseEmailLayout } from "./base-layout";

type PasswordChangedEmailParams = {
  changedAtLabel: string;
};

export function renderPasswordChangedEmail({
  changedAtLabel,
}: PasswordChangedEmailParams): {
  subject: string;
  html: string;
} {
  const subject = "Your OrzuX password was changed";

  const bodyHtml = `
    ${renderEmailHeading("Password updated")}
    ${renderEmailParagraph("Your OrzuX account password was changed successfully.")}
    ${renderInfoBox(`Changed on ${changedAtLabel}`)}
    ${renderEmailParagraph("If you did not make this change, reset your password immediately and contact support.")}
  `;

  return {
    subject,
    html: renderBaseEmailLayout({
      previewText: "Your OrzuX password was changed.",
      title: subject,
      bodyHtml,
    }),
  };
}
