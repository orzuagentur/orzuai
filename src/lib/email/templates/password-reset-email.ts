import { EMAIL_SUBJECTS } from "@/lib/email/constants";
import {
  renderBaseEmailLayout,
  renderPrimaryButton,
} from "@/lib/email/templates/base-layout";
import { escapeHtml } from "@/utils/email";

type PasswordResetEmailTemplateParams = {
  resetUrl: string;
};

export function renderPasswordResetEmail({
  resetUrl,
}: PasswordResetEmailTemplateParams): {
  subject: string;
  html: string;
} {
  const safeUrl = escapeHtml(resetUrl);

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:${"#18181b"};">
      Reset your password
    </h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${"#71717a"};">
      We received a request to reset your OrzuX password. Click the button below to choose a new password.
    </p>
    ${renderPrimaryButton(resetUrl, "Reset Password")}
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${"#71717a"};">
      If the button does not work, copy and paste this link into your browser:
    </p>
    <p style="margin:8px 0 0;font-size:13px;line-height:1.6;word-break:break-all;">
      <a href="${safeUrl}" style="color:#7c3aed;text-decoration:underline;">${safeUrl}</a>
    </p>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${"#71717a"};">
      This link will expire soon. If you did not request a password reset, you can safely ignore this email.
    </p>
  `;

  return {
    subject: EMAIL_SUBJECTS.passwordReset,
    html: renderBaseEmailLayout({
      previewText: "Reset your OrzuX password.",
      title: EMAIL_SUBJECTS.passwordReset,
      bodyHtml,
    }),
  };
}
