import { APP_ORIGIN } from "../../constants/app-origin";
import { EMAIL_APP_NAME, EMAIL_BRAND } from "./constants";
import { escapeHtml } from "../../utils/email";

export function renderEmailHeading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:22px;line-height:1.35;font-weight:700;color:${EMAIL_BRAND.foreground};">${escapeHtml(text)}</h1>`;
}

export function renderEmailParagraph(
  text: string,
  options?: { muted?: boolean; marginBottom?: number },
): string {
  const color = options?.muted ? EMAIL_BRAND.muted : EMAIL_BRAND.foreground;
  const marginBottom = options?.marginBottom ?? 16;

  return `<p style="margin:0 0 ${marginBottom}px;font-size:15px;line-height:1.65;color:${color};">${text}</p>`;
}

export function renderEmailMuted(text: string): string {
  return renderEmailParagraph(escapeHtml(text), { muted: true, marginBottom: 0 });
}

export function renderEmailLink(href: string, label?: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label ?? href);

  return `<a href="${safeHref}" style="color:${EMAIL_BRAND.primary};text-decoration:underline;word-break:break-all;">${safeLabel}</a>`;
}

export function renderFallbackLink(href: string): string {
  return `
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${EMAIL_BRAND.muted};">
      If the button does not work, copy and paste this link into your browser:
    </p>
    <p style="margin:8px 0 0;font-size:13px;line-height:1.6;word-break:break-all;">
      ${renderEmailLink(href)}
    </p>
  `;
}

export function renderPrimaryButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto 0;">
    <tr>
      <td align="center" style="border-radius:12px;background:linear-gradient(135deg, ${EMAIL_BRAND.primary} 0%, ${EMAIL_BRAND.primaryDark} 100%);box-shadow:0 4px 14px rgba(124,58,237,0.35);">
        <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">
          ${safeLabel}
        </a>
      </td>
    </tr>
  </table>`;
}

export function renderSecondaryButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:16px auto 0;">
    <tr>
      <td align="center" style="border-radius:12px;border:1px solid ${EMAIL_BRAND.border};">
        <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:${EMAIL_BRAND.primary};text-decoration:none;border-radius:12px;">
          ${safeLabel}
        </a>
      </td>
    </tr>
  </table>`;
}

export function renderOtpCode(code: string): string {
  const digits = escapeHtml(code.trim());

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto;">
      <tr>
        <td align="center" style="padding:20px 28px;border-radius:14px;background:${EMAIL_BRAND.surface};border:1px dashed ${EMAIL_BRAND.primary};">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_BRAND.muted};">Verification code</p>
          <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.35em;color:${EMAIL_BRAND.foreground};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${digits}</p>
        </td>
      </tr>
    </table>
  `;
}

export function renderFeatureList(items: string[]): string {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;vertical-align:top;width:28px;">
            <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:999px;background:${EMAIL_BRAND.primarySoft};color:${EMAIL_BRAND.primary};font-size:13px;font-weight:700;">✓</span>
          </td>
          <td style="padding:10px 0 10px 8px;font-size:14px;line-height:1.55;color:${EMAIL_BRAND.foreground};">${escapeHtml(item)}</td>
        </tr>
      `,
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 8px;">${rows}</table>`;
}

export function renderInfoBox(content: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
      <tr>
        <td style="padding:16px 18px;border-radius:12px;background:${EMAIL_BRAND.surface};border:1px solid ${EMAIL_BRAND.border};">
          <p style="margin:0;font-size:14px;line-height:1.6;color:${EMAIL_BRAND.foreground};">${content}</p>
        </td>
      </tr>
    </table>
  `;
}

export function renderDivider(): string {
  return `<hr style="margin:28px 0;border:none;border-top:1px solid ${EMAIL_BRAND.border};" />`;
}

export function renderBusinessSignature(businessName: string): string {
  return `<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:${EMAIL_BRAND.muted};">— ${escapeHtml(businessName)}</p>`;
}

export function renderEmailLogo(): string {
  const logoUrl = `${APP_ORIGIN}/platform-icon.png`;

  return `
    <img
      src="${escapeHtml(logoUrl)}"
      width="48"
      height="48"
      alt="${escapeHtml(EMAIL_APP_NAME)}"
      style="display:block;margin:0 auto 12px;border-radius:12px;"
    />
  `;
}

export function renderDetailsTable(
  rows: Array<{ label: string; value: string }>,
): string {
  const body = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:10px 0;color:${EMAIL_BRAND.muted};font-size:14px;width:110px;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:${EMAIL_BRAND.foreground};">${escapeHtml(row.value)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border-collapse:collapse;">
      ${body}
    </table>
  `;
}
