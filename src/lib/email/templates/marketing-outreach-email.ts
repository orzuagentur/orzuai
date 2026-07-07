import { APP_ORIGIN } from "../../../constants/app-origin";
import { EMAIL_BRAND } from "../constants";
import {
  renderPrimaryButton,
} from "../components";
import { renderBaseEmailLayout } from "./base-layout";
import { escapeHtml } from "../../../utils/email";

export type MarketingOutreachEmailParams = {
  recipientName: string;
  subjectTemplate: string;
  greeting: string;
  headline: string;
  bodyText: string;
  featureHighlights: string[];
  ctaLabel: string;
  ctaUrl: string;
  trackingToken?: string | null;
  previewText?: string;
};

function personalizeToken(
  template: string,
  recipientName: string,
): string {
  const safeName = recipientName.trim() || "коллега";

  return template
    .replaceAll("{{name}}", safeName)
    .replaceAll("{{имя}}", safeName);
}

function buildTrackedCtaUrl(ctaUrl: string, trackingToken?: string | null): string {
  if (!trackingToken?.trim()) {
    return ctaUrl;
  }

  return `${APP_ORIGIN}/api/marketing/click/${encodeURIComponent(trackingToken.trim())}`;
}

function buildOpenPixel(trackingToken?: string | null): string {
  if (!trackingToken?.trim()) {
    return "";
  }

  const src = `${APP_ORIGIN}/api/marketing/open/${encodeURIComponent(trackingToken.trim())}`;

  return `<img src="${escapeHtml(src)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />`;
}

function renderFeatureGrid(features: string[]): string {
  if (features.length === 0) {
    return "";
  }

  const items = features
    .map(
      (feature, index) => `
      <tr>
        <td style="padding:${index === 0 ? "0" : "12px"} 0 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${EMAIL_BRAND.surface};border:1px solid ${EMAIL_BRAND.border};border-radius:14px;">
            <tr>
              <td style="padding:14px 16px;">
                <p style="margin:0;font-size:14px;line-height:1.55;color:${EMAIL_BRAND.foreground};">
                  <span style="display:inline-block;width:22px;font-size:16px;">✦</span>
                  ${escapeHtml(feature)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;">
      <tr>
        <td>
          <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_BRAND.muted};">
            Возможности платформы
          </p>
        </td>
      </tr>
      ${items}
    </table>`;
}

export function renderMarketingOutreachEmail(
  params: MarketingOutreachEmailParams,
): { html: string; subject: string } {
  const recipientName = params.recipientName.trim() || "коллега";
  const greeting = personalizeToken(params.greeting, recipientName);
  const headline = personalizeToken(params.headline, recipientName);
  const bodyText = personalizeToken(params.bodyText, recipientName);
  const ctaUrl = buildTrackedCtaUrl(params.ctaUrl, params.trackingToken);

  const greetingBlock = `<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${EMAIL_BRAND.foreground};"><strong>${escapeHtml(greeting)}, ${escapeHtml(recipientName)}!</strong></p>`;
  const bodyBlock = `<p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:${EMAIL_BRAND.foreground};">${escapeHtml(bodyText).replaceAll("\n", "<br />")}</p>`;

  const bodyHtml = `
    ${greetingBlock}
    <h2 style="margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:700;color:${EMAIL_BRAND.foreground};">${escapeHtml(headline)}</h2>
    ${bodyBlock}
    ${renderFeatureGrid(params.featureHighlights)}
    ${renderPrimaryButton(ctaUrl, params.ctaLabel)}
    <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:${EMAIL_BRAND.muted};text-align:center;">
      OrzuX — AI-платформа для общения с клиентами. Один inbox, один ассистент, полный контроль.
    </p>
    ${buildOpenPixel(params.trackingToken)}
  `;

  const html = renderBaseEmailLayout({
    previewText:
      params.previewText ??
      `${greeting}, ${recipientName}! ${headline}`,
    title: headline,
    bodyHtml,
    footerNote: "Вы получили это письмо, потому что зарегистрированы в OrzuX.",
  });

  return {
    html,
    subject: renderMarketingSubject(params.subjectTemplate, recipientName),
  };
}

export function renderMarketingSubject(
  subjectTemplate: string,
  recipientName: string,
): string {
  return personalizeToken(subjectTemplate, recipientName);
}
