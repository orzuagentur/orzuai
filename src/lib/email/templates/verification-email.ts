import { EMAIL_SUBJECTS } from "@/lib/email/constants";
import {
  renderBaseEmailLayout,
  renderPrimaryButton,
} from "@/lib/email/templates/base-layout";
import { escapeHtml } from "@/utils/email";

type VerificationEmailTemplateParams = {
  verificationUrl: string;
};

export function renderVerificationEmail({
  verificationUrl,
}: VerificationEmailTemplateParams): {
  subject: string;
  html: string;
} {
  const safeUrl = escapeHtml(verificationUrl);

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:${"#18181b"};">
      Verify your email address
    </h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${"#71717a"};">
      Thanks for signing up for OrzuAI. Please confirm your email address to activate your account and access the dashboard.
    </p>
    ${renderPrimaryButton(verificationUrl, "Verify Email")}
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${"#71717a"};">
      If the button does not work, copy and paste this link into your browser:
    </p>
    <p style="margin:8px 0 0;font-size:13px;line-height:1.6;word-break:break-all;">
      <a href="${safeUrl}" style="color:#7c3aed;text-decoration:underline;">${safeUrl}</a>
    </p>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${"#71717a"};">
      If you did not create an OrzuAI account, you can safely ignore this email.
    </p>
  `;

  return {
    subject: EMAIL_SUBJECTS.verification,
    html: renderBaseEmailLayout({
      previewText: "Verify your OrzuAI account to get started.",
      title: EMAIL_SUBJECTS.verification,
      bodyHtml,
    }),
  };
}
