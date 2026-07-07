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

type VerificationEmailTemplateParams = {
  verificationUrl: string;
  verificationCode?: string | null;
};

export function renderVerificationEmail({
  verificationUrl,
  verificationCode,
}: VerificationEmailTemplateParams): {
  subject: string;
  html: string;
} {
  const codeBlock =
    verificationCode && verificationCode.trim().length > 0
      ? `
        ${renderEmailParagraph("Or enter this one-time verification code:", { muted: true })}
        ${renderOtpCode(verificationCode)}
      `
      : "";

  const bodyHtml = `
    ${renderEmailHeading("Confirm your email address")}
    ${renderEmailParagraph("Thanks for signing up for OrzuX. Confirm your email to activate your account and open your dashboard.")}
    ${renderPrimaryButton(verificationUrl, "Confirm email")}
    ${codeBlock}
    ${renderFallbackLink(verificationUrl)}
    ${renderInfoBox("If you did not create an OrzuX account, you can safely ignore this email.")}
  `;

  const subject =
    verificationCode && verificationCode.trim().length > 0
      ? EMAIL_SUBJECTS.verificationCode
      : EMAIL_SUBJECTS.verification;

  return {
    subject,
    html: renderBaseEmailLayout({
      previewText: "Confirm your OrzuX email to get started.",
      title: subject,
      bodyHtml,
    }),
  };
}
