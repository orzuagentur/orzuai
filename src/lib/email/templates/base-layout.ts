import {
  EMAIL_APP_NAME,
  EMAIL_BRAND,
  EMAIL_FOOTER_SUPPORT,
  EMAIL_TAGLINE,
} from "@/lib/email/constants";
import { renderEmailLogo } from "@/lib/email/components";
import { escapeHtml } from "@/utils/email";

type BaseEmailLayoutParams = {
  previewText: string;
  title: string;
  bodyHtml: string;
  footerNote?: string;
};

export function renderBaseEmailLayout({
  previewText,
  title,
  bodyHtml,
  footerNote,
}: BaseEmailLayoutParams): string {
  const safePreview = escapeHtml(previewText);
  const safeTitle = escapeHtml(title);
  const year = new Date().getFullYear();
  const footer = footerNote ?? EMAIL_FOOTER_SUPPORT;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${safeTitle}</title>
    <style>
      @media only screen and (max-width: 600px) {
        .email-shell { padding: 16px 8px !important; }
        .email-card { border-radius: 14px !important; }
        .email-body { padding: 0 20px 24px !important; }
        .email-header { padding: 28px 20px 20px !important; }
        .email-footer { padding: 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:${EMAIL_BRAND.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_BRAND.foreground};-webkit-font-smoothing:antialiased;">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${safePreview}</span>
    <table role="presentation" class="email-shell" width="100%" cellspacing="0" cellpadding="0" style="background-color:${EMAIL_BRAND.background};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:${EMAIL_BRAND.card};border:1px solid ${EMAIL_BRAND.border};border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(24,24,27,0.08);">
            <tr>
              <td class="email-header" style="padding:36px 36px 24px;text-align:center;background:linear-gradient(180deg, ${EMAIL_BRAND.primarySoft} 0%, rgba(255,255,255,0) 100%);">
                ${renderEmailLogo()}
                <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:${EMAIL_BRAND.primary};letter-spacing:-0.02em;">${EMAIL_APP_NAME}</p>
                <p style="margin:0;font-size:14px;line-height:1.5;color:${EMAIL_BRAND.muted};">${EMAIL_TAGLINE}</p>
              </td>
            </tr>
            <tr>
              <td class="email-body" style="padding:0 36px 32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td class="email-footer" style="padding:24px 36px;border-top:1px solid ${EMAIL_BRAND.border};background:${EMAIL_BRAND.surface};text-align:center;">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${EMAIL_BRAND.muted};">${escapeHtml(footer)}</p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:${EMAIL_BRAND.muted};">&copy; ${year} ${EMAIL_APP_NAME}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** @deprecated Import from @/lib/email/components instead */
export { renderPrimaryButton } from "@/lib/email/components";
