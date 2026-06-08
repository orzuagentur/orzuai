import { EMAIL_SUBJECTS } from "@/lib/email/constants";
import {
  renderBaseEmailLayout,
  renderPrimaryButton,
} from "@/lib/email/templates/base-layout";
import { escapeHtml } from "@/utils/email";

export type OnboardingDripDay = 0 | 1 | 3;

type OnboardingDripEmailParams = {
  dripDay: OnboardingDripDay;
  dashboardUrl: string;
  businessName?: string | null;
};

const DRIP_CONTENT: Record<
  OnboardingDripDay,
  { subject: string; preview: string; title: string; body: string; cta: string }
> = {
  0: {
    subject: EMAIL_SUBJECTS.onboardingDay0,
    preview: "Welcome to OrzuX — here is how to get your first channel live.",
    title: "Welcome to OrzuX",
    body: "Your account is ready. Complete the 5-step setup wizard to connect a channel, add business knowledge, and test your first AI reply.",
    cta: "Start setup",
  },
  1: {
    subject: EMAIL_SUBJECTS.onboardingDay1,
    preview: "Day 1 tip: connect WhatsApp or Instagram to start receiving messages.",
    title: "Connect your first channel",
    body: "Most teams start with WhatsApp or Instagram. Open Integrations, connect a channel, and your inbox will populate automatically.",
    cta: "Open Integrations",
  },
  3: {
    subject: EMAIL_SUBJECTS.onboardingDay3,
    preview: "Day 3 tip: add knowledge entries so AI replies sound like your brand.",
    title: "Train your AI assistant",
    body: "Add FAQs, pricing, and policies to Knowledge. OrzuX uses this context for every auto-reply across WhatsApp, Instagram, and Telegram.",
    cta: "Add knowledge",
  },
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
  const safeUrl = escapeHtml(dashboardUrl);

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:#18181b;">
      ${escapeHtml(content.title)}
    </h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#71717a;">
      ${greeting}
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#71717a;">
      ${escapeHtml(content.body)}
    </p>
    ${renderPrimaryButton(dashboardUrl, content.cta)}
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">
      Or copy this link: <a href="${safeUrl}" style="color:#7c3aed;text-decoration:underline;">${safeUrl}</a>
    </p>
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
