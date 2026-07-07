import {
  EMAIL_SUBJECTS,
  PLATFORM_FEATURE_HIGHLIGHTS,
} from "../constants";
import {
  renderEmailHeading,
  renderEmailParagraph,
  renderFeatureList,
  renderPrimaryButton,
} from "../components";
import { renderBaseEmailLayout } from "./base-layout";
import { escapeHtml } from "../../../utils/email";

type GoogleWelcomeEmailParams = {
  dashboardUrl: string;
  firstName?: string | null;
};

export function renderGoogleWelcomeEmail({
  dashboardUrl,
  firstName,
}: GoogleWelcomeEmailParams): {
  subject: string;
  html: string;
} {
  const greeting = firstName?.trim()
    ? `Hi ${escapeHtml(firstName.trim())},`
    : "Hi there,";

  const bodyHtml = `
    ${renderEmailHeading("Welcome to OrzuX")}
    ${renderEmailParagraph(`${greeting} thank you for signing up with Google. Your account is ready.`)}
    ${renderEmailParagraph("OrzuX helps your team manage customer conversations, automate replies with AI, and grow revenue from one workspace.", { muted: true })}
    ${renderFeatureList([...PLATFORM_FEATURE_HIGHLIGHTS])}
    ${renderPrimaryButton(dashboardUrl, "Open dashboard")}
    ${renderEmailParagraph("We will send a few short setup tips over the next week. You can opt out anytime by completing your setup in the dashboard.", { muted: true, marginBottom: 0 })}
  `;

  return {
    subject: EMAIL_SUBJECTS.googleWelcome,
    html: renderBaseEmailLayout({
      previewText: "Thanks for joining OrzuX — here is what you can do next.",
      title: EMAIL_SUBJECTS.googleWelcome,
      bodyHtml,
    }),
  };
}
