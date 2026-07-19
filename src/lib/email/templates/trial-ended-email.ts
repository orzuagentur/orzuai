import {
  renderEmailHeading,
  renderEmailParagraph,
  renderInfoBox,
  renderPrimaryButton,
} from "../components";
import { APP_ORIGIN } from "../../../constants/app-origin";
import { renderBaseEmailLayout } from "./base-layout";

export function renderTrialEndedEmail(): { subject: string; html: string } {
  const subject = "Your OrzuX 3-day trial has ended";

  const bodyHtml = `
    ${renderEmailHeading("Trial ended")}
    ${renderEmailParagraph(
      "Your 3-day OrzuX trial is over. To keep AI replies, channel connections, and voice calls, choose a paid subscription.",
    )}
    ${renderInfoBox(`
      <p style="margin:0 0 8px;"><strong>Trial included:</strong> up to 3 channels, 100 AI replies, 20 voice minutes.</p>
      <p style="margin:0;">Subscribe now to restore full access for your workspace.</p>
    `)}
    ${renderPrimaryButton(`${APP_ORIGIN}/dashboard/subscription`, "Choose a plan")}
  `;

  return {
    subject,
    html: renderBaseEmailLayout({
      previewText: "Subscribe to keep OrzuX running after your trial.",
      title: subject,
      bodyHtml,
    }),
  };
}
