import { EMAIL_SUBJECTS } from "@/lib/email/constants";
import {
  renderDivider,
  renderEmailHeading,
  renderEmailParagraph,
  renderFallbackLink,
  renderFeatureList,
  renderInfoBox,
  renderPrimaryButton,
} from "@/lib/email/components";
import { renderBaseEmailLayout } from "@/lib/email/templates/base-layout";
import { escapeHtml } from "@/utils/email";

type TeamInviteEmailParams = {
  businessName: string;
  inviterName?: string | null;
  roleLabel: string;
  roleDescription: string;
  permissionLabels: string[];
  acceptUrl: string;
  authLink: string;
  expiresAt: string;
  expiryDays: number;
};

function formatExpiryDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export function renderTeamInviteEmail({
  businessName,
  inviterName,
  roleLabel,
  roleDescription,
  permissionLabels,
  acceptUrl,
  authLink,
  expiresAt,
  expiryDays,
}: TeamInviteEmailParams): {
  subject: string;
  html: string;
} {
  const inviterLine = inviterName?.trim()
    ? `<strong>${escapeHtml(inviterName.trim())}</strong> invited you to join`
    : "You have been invited to join";

  const permissionsBlock =
    permissionLabels.length > 0
      ? `
        ${renderDivider()}
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#18181b;">Your access</p>
        ${renderFeatureList(permissionLabels)}
      `
      : "";

  const bodyHtml = `
    ${renderEmailHeading("You're invited to the team")}
    ${renderEmailParagraph(`${inviterLine} <strong>${escapeHtml(businessName)}</strong> on OrzuX.`)}
    ${renderInfoBox(`<strong>Role:</strong> ${escapeHtml(roleLabel)}<br /><span style="color:#71717a;">${escapeHtml(roleDescription)}</span>`)}
    ${permissionsBlock}
    ${renderPrimaryButton(authLink, "Accept invitation & sign in")}
    ${renderFallbackLink(acceptUrl)}
    ${renderEmailParagraph(`This invitation link expires in <strong>${expiryDays} day${expiryDays === 1 ? "" : "s"}</strong> (${escapeHtml(formatExpiryDate(expiresAt))}).`, { muted: true, marginBottom: 0 })}
  `;

  return {
    subject: `${EMAIL_SUBJECTS.teamInvite} — ${businessName}`,
    html: renderBaseEmailLayout({
      previewText: `Join ${businessName} on OrzuX as ${roleLabel}.`,
      title: EMAIL_SUBJECTS.teamInvite,
      bodyHtml,
    }),
  };
}
