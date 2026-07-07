import { EMAIL_SUBJECTS } from "../constants";
import {
  renderEmailHeading,
  renderEmailParagraph,
  renderFallbackLink,
  renderInfoBox,
  renderPrimaryButton,
} from "../components";
import { renderBaseEmailLayout } from "./base-layout";

type PasswordResetEmailTemplateParams = {
  resetUrl: string;
};

export function renderPasswordResetEmail({
  resetUrl,
}: PasswordResetEmailTemplateParams): {
  subject: string;
  html: string;
} {
  const bodyHtml = `
    ${renderEmailHeading("Reset your password")}
    ${renderEmailParagraph("We received a request to reset your OrzuX password. Click the button below to choose a new password.")}
    ${renderPrimaryButton(resetUrl, "Reset password")}
    ${renderFallbackLink(resetUrl)}
    ${renderInfoBox("This link expires soon. If you did not request a password reset, you can safely ignore this email.")}
  `;

  return {
    subject: EMAIL_SUBJECTS.passwordReset,
    html: renderBaseEmailLayout({
      previewText: "Reset your OrzuX password securely.",
      title: EMAIL_SUBJECTS.passwordReset,
      bodyHtml,
    }),
  };
}
