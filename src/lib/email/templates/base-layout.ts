import {
  EMAIL_APP_NAME,
  EMAIL_BRAND,
  EMAIL_TAGLINE,
} from "@/lib/email/constants";
import { escapeHtml } from "@/utils/email";

type BaseEmailLayoutParams = {
  previewText: string;
  title: string;
  bodyHtml: string;
};

export function renderBaseEmailLayout({
  previewText,
  title,
  bodyHtml,
}: BaseEmailLayoutParams): string {
  const safePreview = escapeHtml(previewText);
  const safeTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${EMAIL_BRAND.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${EMAIL_BRAND.foreground};">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${safePreview}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${EMAIL_BRAND.background};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:${EMAIL_BRAND.background};border:1px solid ${EMAIL_BRAND.border};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(180deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0) 100%);">
                <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:${EMAIL_BRAND.primary};">${EMAIL_APP_NAME}</p>
                <p style="margin:0;font-size:14px;line-height:1.5;color:${EMAIL_BRAND.muted};">${EMAIL_TAGLINE}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;border-top:1px solid ${EMAIL_BRAND.border};text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:${EMAIL_BRAND.muted};">
                  &copy; ${new Date().getFullYear()} ${EMAIL_APP_NAME}. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderPrimaryButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 0;">
    <tr>
      <td align="center" style="border-radius:10px;background-color:${EMAIL_BRAND.primary};">
        <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
          ${safeLabel}
        </a>
      </td>
    </tr>
  </table>`;
}
