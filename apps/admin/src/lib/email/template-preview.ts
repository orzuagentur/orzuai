import { APP_ORIGIN } from "@orzuai/constants/app-origin";
import { getAdminTemplateFromLabel } from "@/lib/email/resolve-template-from";
import { renderOnboardingDripEmail } from "@orzuai/lib/email/templates/onboarding-drip-email";
import { renderBookingActionEmail } from "@orzuai/lib/email/templates/booking-action-email";
import { renderBookingConfirmationEmail } from "@orzuai/lib/email/templates/booking-confirmation-email";
import { renderGoogleWelcomeEmail } from "@orzuai/lib/email/templates/google-welcome-email";
import { renderLeadFollowUpEmail } from "@orzuai/lib/email/templates/lead-follow-up-email";
import { renderMagicLinkEmail } from "@orzuai/lib/email/templates/magic-link-email";
import { renderNewDeviceLoginEmail } from "@orzuai/lib/email/templates/new-device-login-email";
import { renderPasswordChangedEmail } from "@orzuai/lib/email/templates/password-changed-email";
import { renderPasswordResetEmail } from "@orzuai/lib/email/templates/password-reset-email";
import {
  renderSubscriptionPlanChangedEmail,
  renderSubscriptionPurchasedEmail,
  renderSubscriptionRenewedEmail,
} from "@orzuai/lib/email/templates/subscription-billing-email";
import {
  renderCardExpiringEmail,
  renderPaymentBankFailedEmail,
  renderPaymentCardFailedEmail,
} from "@orzuai/lib/email/templates/payment-billing-email";
import { renderSystemNotificationEmail } from "@orzuai/lib/email/templates/system-notification-email";
import { renderTeamInviteEmail } from "@orzuai/lib/email/templates/team-invite-email";
import { renderVerificationEmail } from "@orzuai/lib/email/templates/verification-email";

import { renderPlatformBroadcastEmail } from "@/lib/email/broadcast-template";
import { renderAdminInviteEmail } from "@/lib/email/team-templates";
import { getAdminAppUrl } from "@/lib/env";

export type RenderedEmailPreview = {
  subject: string;
  html: string;
  fromLabel: string;
};

const SAMPLE = {
  dashboardUrl: `${APP_ORIGIN}/dashboard`,
  verifyUrl: `${APP_ORIGIN}/auth/verify?token=sample`,
  resetUrl: `${APP_ORIGIN}/auth/reset?token=sample`,
  signInUrl: `${APP_ORIGIN}/auth/login?token=sample`,
  acceptUrl: `${APP_ORIGIN}/team/accept?token=sample`,
  businessName: "Sample Business",
  customerName: "Alex Customer",
  inviterName: "Jordan Owner",
};

function renderCodeTemplatePreview(
  templateId: string,
  fromLabel: string,
): RenderedEmailPreview | null {
  switch (templateId) {
    case "verification": {
      const rendered = renderVerificationEmail({
        verificationUrl: SAMPLE.verifyUrl,
        verificationCode: "482910",
      });
      return { ...rendered, fromLabel };
    }
    case "magic_link": {
      const rendered = renderMagicLinkEmail({
        signInUrl: SAMPLE.signInUrl,
        signInCode: "739204",
      });
      return { ...rendered, fromLabel };
    }
    case "password_reset": {
      const rendered = renderPasswordResetEmail({
        resetUrl: SAMPLE.resetUrl,
      });
      return { ...rendered, fromLabel };
    }
    case "password_changed": {
      const rendered = renderPasswordChangedEmail({
        changedAtLabel: "Jul 7, 2026, 1:42 AM UTC",
      });
      return { ...rendered, fromLabel };
    }
    case "new_device_login": {
      const rendered = renderNewDeviceLoginEmail({
        deviceLabel: "Desktop · Chrome on Windows",
        signedInAtLabel: "Jul 7, 2026, 1:42 AM UTC",
        ipAddress: "203.0.113.10",
      });
      return { ...rendered, fromLabel };
    }
    case "google_welcome": {
      const rendered = renderGoogleWelcomeEmail({
        dashboardUrl: SAMPLE.dashboardUrl,
        firstName: "Alex",
      });
      return { ...rendered, fromLabel };
    }
    case "onboarding_drip": {
      const rendered = renderOnboardingDripEmail({
        dripDay: 0,
        dashboardUrl: SAMPLE.dashboardUrl,
        businessName: SAMPLE.businessName,
      });
      return { ...rendered, fromLabel };
    }
    case "team_invite": {
      const rendered = renderTeamInviteEmail({
        businessName: SAMPLE.businessName,
        inviterName: SAMPLE.inviterName,
        roleLabel: "Manager",
        roleDescription: "Manage inbox, contacts, and team settings.",
        permissionLabels: ["Inbox", "Contacts", "Settings"],
        acceptUrl: SAMPLE.acceptUrl,
        authLink: SAMPLE.signInUrl,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        expiryDays: 7,
      });
      return { ...rendered, fromLabel };
    }
    case "booking_confirmation": {
      const rendered = renderBookingConfirmationEmail({
        businessName: SAMPLE.businessName,
        pageTitle: "Consultation",
        customerName: SAMPLE.customerName,
        slotLabel: "Mon, Jul 7 · 2:00 PM (Europe/Berlin)",
        resourceName: "Main calendar",
        timeZone: "Europe/Berlin",
      });
      return { subject: rendered.subject, html: rendered.html, fromLabel };
    }
    case "booking_action": {
      const rendered = renderBookingActionEmail({
        businessName: SAMPLE.businessName,
        action: "updated",
        customerName: SAMPLE.customerName,
        slotLabel: "Mon, Jul 7 · 3:30 PM (Europe/Berlin)",
        resourceName: "Main calendar",
        pageTitle: "Consultation",
        note: "We moved your appointment by one hour.",
      });
      return { subject: rendered.subject, html: rendered.html, fromLabel };
    }
    case "lead_follow_up": {
      const rendered = renderLeadFollowUpEmail({
        businessName: SAMPLE.businessName,
        recipientName: SAMPLE.customerName,
        message: "Thanks for reaching out! We received your request and will reply shortly.",
      });
      return { ...rendered, fromLabel };
    }
    case "system_notification": {
      const rendered = renderSystemNotificationEmail({
        title: "Sample system notification",
        body: "This is how platform system messages appear to your users.",
        actionUrl: SAMPLE.dashboardUrl,
        actionLabel: "Open dashboard",
        previewText: "Sample system notification",
      });
      return { ...rendered, fromLabel };
    }
    case "subscription_purchased": {
      const rendered = renderSubscriptionPurchasedEmail({
        planLabel: "Pro",
        amountLabel: "$129.00",
      });
      return { ...rendered, fromLabel };
    }
    case "subscription_renewed": {
      const rendered = renderSubscriptionRenewedEmail({
        planLabel: "Pro",
        amountLabel: "$129.00",
        billingPeriodLabel: "Jul 1, 2026 – Aug 1, 2026",
      });
      return { ...rendered, fromLabel };
    }
    case "subscription_plan_changed": {
      const rendered = renderSubscriptionPlanChangedEmail({
        planLabel: "Pro",
        previousPlanLabel: "Starter",
      });
      return { ...rendered, fromLabel };
    }
    case "payment_card_failed": {
      const rendered = renderPaymentCardFailedEmail({
        planLabel: "Pro",
        amountLabel: "$129.00",
        paymentMethodLabel: "Visa •••• 4242",
        failureMessage: "Your card was declined.",
      });
      return { ...rendered, fromLabel };
    }
    case "payment_bank_failed": {
      const rendered = renderPaymentBankFailedEmail({
        planLabel: "Pro",
        amountLabel: "$129.00",
        paymentMethodLabel: "SEPA Direct Debit",
        failureMessage: "The bank account could not be debited.",
      });
      return { ...rendered, fromLabel };
    }
    case "card_expiring": {
      const rendered = renderCardExpiringEmail({
        planLabel: "Pro",
        cardLabel: "Visa •••• 4242",
        expiryLabel: "07/2026",
      });
      return { ...rendered, fromLabel };
    }
    default:
      return null;
  }
}

export async function renderAdminEmailTemplatePreview(input: {
  templateId: string;
  subjectOverride?: string;
  bodyHtmlOverride?: string | null;
}): Promise<RenderedEmailPreview | { error: string }> {
  const templateId = input.templateId.trim();
  const fromLabel = await getAdminTemplateFromLabel(templateId);

  if (input.bodyHtmlOverride?.trim()) {
    return {
      subject: input.subjectOverride?.trim() || "Preview",
      html: input.bodyHtmlOverride.trim(),
      fromLabel,
    };
  }

  if (templateId === "admin_invite") {
    const rendered = renderAdminInviteEmail({
      inviteeEmail: "preview@example.com",
      role: "admin",
      inviterEmail: "admin@orzux.com",
      loginUrl: `${getAdminAppUrl()}/login`,
    });

    return {
      subject: input.subjectOverride?.trim() || rendered.subject,
      html: rendered.html,
      fromLabel: await getAdminTemplateFromLabel("admin_invite"),
    };
  }

  if (templateId === "platform_broadcast") {
    const rendered = renderPlatformBroadcastEmail({
      title: "Sample broadcast title",
      body: "This is how a platform-wide announcement appears to users.",
      actionUrl: "https://orzux.com/dashboard",
      actionLabel: "Open OrzuX",
    });

    return {
      subject: input.subjectOverride?.trim() || "Message from OrzuX",
      html: rendered.html,
      fromLabel: await getAdminTemplateFromLabel("platform_broadcast"),
    };
  }

  const rendered = renderCodeTemplatePreview(templateId, fromLabel);

  if (!rendered) {
    return {
      error: "No code preview is available for this template. Add HTML override to preview.",
    };
  }

  return {
    ...rendered,
    subject: input.subjectOverride?.trim() || rendered.subject,
  };
}
