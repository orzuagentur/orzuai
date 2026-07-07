import {
  renderEmailHeading,
  renderEmailParagraph,
  renderInfoBox,
} from "../components";
import { renderBaseEmailLayout } from "./base-layout";

type NewDeviceLoginEmailParams = {
  deviceLabel: string;
  signedInAtLabel: string;
  ipAddress?: string | null;
};

export function renderNewDeviceLoginEmail({
  deviceLabel,
  signedInAtLabel,
  ipAddress,
}: NewDeviceLoginEmailParams): {
  subject: string;
  html: string;
} {
  const subject = "New sign-in to your OrzuX account";

  const ipLine = ipAddress?.trim()
    ? `<p style="margin:0 0 8px;"><strong>IP address:</strong> ${ipAddress.trim()}</p>`
    : "";

  const bodyHtml = `
    ${renderEmailHeading("New device sign-in")}
    ${renderEmailParagraph("We detected a sign-in to your OrzuX account from a device we have not seen before.")}
    ${renderInfoBox(`
      <p style="margin:0 0 8px;"><strong>Device:</strong> ${deviceLabel}</p>
      <p style="margin:0 0 8px;"><strong>Time:</strong> ${signedInAtLabel}</p>
      ${ipLine}
    `)}
    ${renderEmailParagraph("If this was you, no action is needed. If you do not recognize this activity, change your password immediately.")}
  `;

  return {
    subject,
    html: renderBaseEmailLayout({
      previewText: `New sign-in from ${deviceLabel}.`,
      title: subject,
      bodyHtml,
    }),
  };
}
