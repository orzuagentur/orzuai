import {
  DRIP_CONTENT,
  type OnboardingDripDay,
} from "../drip-schedule";
import {
  renderEmailHeading,
  renderEmailParagraph,
  renderFallbackLink,
  renderPrimaryButton,
} from "../components";
import { renderBaseEmailLayout } from "./base-layout";
import { escapeHtml } from "../../../utils/email";

export type { OnboardingDripDay } from "../drip-schedule";

type OnboardingDripEmailParams = {
  dripDay: OnboardingDripDay;
  dashboardUrl: string;
  businessName?: string | null;
};

export function renderOnboardingDripEmail({
  dripDay,
  dashboardUrl,
  businessName,
}: OnboardingDripEmailParams): {
  subject: string;
  html: string;
} {
  const content = DRIP_CONTENT[dripDay];
  const greeting = businessName?.trim()
    ? `Hi ${escapeHtml(businessName.trim())},`
    : "Hi there,";

  const bodyHtml = `
    ${renderEmailHeading(content.title)}
    ${renderEmailParagraph(greeting, { muted: true })}
    ${renderEmailParagraph(escapeHtml(content.body))}
    ${renderPrimaryButton(dashboardUrl, content.cta)}
    ${renderFallbackLink(dashboardUrl)}
    ${renderEmailParagraph("You will stop receiving setup tips once your workspace is fully configured.", { muted: true, marginBottom: 0 })}
  `;

  return {
    subject: content.subject,
    html: renderBaseEmailLayout({
      previewText: content.preview,
      title: content.title,
      bodyHtml,
    }),
  };
}
