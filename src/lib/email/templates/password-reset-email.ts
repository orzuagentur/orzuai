import { EMAIL_SUBJECTS } from "../constants";
import {
  renderEmailHeading,
  renderEmailParagraph,
  renderFallbackLink,
  renderInfoBox,
  renderOtpCode,
  renderPrimaryButton,
} from "../components";
import { renderBaseEmailLayout } from "./base-layout";

type PasswordResetEmailTemplateParams = {
  resetUrl: string;
  resetCode?: string | null;
};

export function renderPasswordResetEmail({
  resetUrl,
  resetCode,
}: PasswordResetEmailTemplateParams): {
  subject: string;
  html: string;
} {
  const codeBlock =
    resetCode && resetCode.trim().length > 0
      ? `
        ${renderEmailParagraph("Or enter this confirmation code in the app:")}
        ${renderOtpCode(resetCode)}
      `
      : "";

  const bodyHtml = `
    ${renderEmailHeading("Reset your password")}
    ${renderEmailParagraph("We received a request to reset your OrzuX password. Use the code below, or click the button to choose a new password.")}
    ${codeBlock}
    ${renderPrimaryButton(resetUrl, "Reset password")}
    ${renderFallbackLink(resetUrl)}
    ${renderInfoBox("This code expires soon. If you did not request a password reset, you can safely ignore this email.")}
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
