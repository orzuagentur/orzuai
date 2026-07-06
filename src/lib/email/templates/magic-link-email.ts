import { EMAIL_SUBJECTS } from "@/lib/email/constants";
import {
  renderEmailHeading,
  renderEmailParagraph,
  renderFallbackLink,
  renderInfoBox,
  renderOtpCode,
  renderPrimaryButton,
} from "@/lib/email/components";
import { renderBaseEmailLayout } from "@/lib/email/templates/base-layout";

type MagicLinkEmailTemplateParams = {
  signInUrl: string;
  signInCode?: string | null;
};

export function renderMagicLinkEmail({
  signInUrl,
  signInCode,
}: MagicLinkEmailTemplateParams): {
  subject: string;
  html: string;
} {
  const codeBlock =
    signInCode && signInCode.trim().length > 0
      ? `
        ${renderEmailParagraph("Or use this one-time sign-in code:", { muted: true })}
        ${renderOtpCode(signInCode)}
      `
      : "";

  const bodyHtml = `
    ${renderEmailHeading("Sign in to OrzuX")}
    ${renderEmailParagraph("Click the button below to sign in to your OrzuX account. This link works once and expires shortly.")}
    ${renderPrimaryButton(signInUrl, "Sign in to OrzuX")}
    ${codeBlock}
    ${renderFallbackLink(signInUrl)}
    ${renderInfoBox("If you did not request this sign-in link, you can safely ignore this email.")}
  `;

  return {
    subject: EMAIL_SUBJECTS.magicLink,
    html: renderBaseEmailLayout({
      previewText: "Your secure sign-in link for OrzuX.",
      title: EMAIL_SUBJECTS.magicLink,
      bodyHtml,
    }),
  };
}
