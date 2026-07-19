import "server-only";

import { renderLeadFollowUpEmail } from "@/lib/email/templates/lead-follow-up-email";
import { renderMagicLinkEmail } from "@/lib/email/templates/magic-link-email";
import { renderNewDeviceLoginEmail } from "@/lib/email/templates/new-device-login-email";
import { renderPasswordChangedEmail } from "@/lib/email/templates/password-changed-email";
import { renderPasswordResetEmail } from "@/lib/email/templates/password-reset-email";
import {
  renderSubscriptionPlanChangedEmail,
  renderSubscriptionPurchasedEmail,
  renderSubscriptionRenewedEmail,
} from "@/lib/email/templates/subscription-billing-email";
import { renderTrialEndedEmail } from "@/lib/email/templates/trial-ended-email";
import {
  renderCardExpiringEmail,
  renderPaymentBankFailedEmail,
  renderPaymentCardFailedEmail,
} from "@/lib/email/templates/payment-billing-email";
import { renderSystemNotificationEmail } from "@/lib/email/templates/system-notification-email";
import { renderTeamInviteEmail } from "@/lib/email/templates/team-invite-email";
import { renderVerificationEmail } from "@/lib/email/templates/verification-email";
import { getEmailFromAddressForTemplate } from "@/services/email-template-config.service";
import { hasResendEnv } from "@/lib/env";
import { getResendClient } from "@/lib/resend/client";
import type {
  EmailServiceResult,
  SendLeadFollowUpEmailInput,
  SendMagicLinkEmailInput,
  SendOnboardingDripEmailInput,
  SendPasswordResetEmailInput,
  SendSystemNotificationEmailInput,
  SendTeamInviteEmailInput,
  SendVerificationEmailInput,
} from "@/types/email.types";
import {
  sendLeadFollowUpEmailSchema,
  sendMagicLinkEmailSchema,
  sendOnboardingDripEmailSchema,
  sendPasswordResetEmailSchema,
  sendSystemNotificationEmailSchema,
  sendTeamInviteEmailSchema,
  sendVerificationEmailSchema,
} from "@/types/email.types";

import { logEmailSend } from "@/services/email-log.service";

type SendTransactionalEmailParams = {
  to: string;
  subject: string;
  html: string;
  templateId?: string;
  userId?: string | null;
  businessId?: string | null;
  metadata?: Record<string, unknown>;
};

function validationError(message: string): EmailServiceResult {
  return {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  };
}

function sendFailedError(message: string): EmailServiceResult {
  return {
    success: false,
    error: {
      code: "SEND_FAILED",
      message,
    },
  };
}

function missingConfigError(): EmailServiceResult {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: "Resend is not configured. Missing required environment variables.",
    },
  };
}

async function sendTransactionalEmail({
  to,
  subject,
  html,
  templateId,
  userId,
  businessId,
  metadata,
}: SendTransactionalEmailParams): Promise<EmailServiceResult> {
  if (!hasResendEnv()) {
    return missingConfigError();
  }

  const response = await getResendClient().emails.send({
    from: await getEmailFromAddressForTemplate(templateId),
    to: [to],
    subject,
    html,
  });

  if (response.error) {
    await logEmailSend({
      templateId,
      to,
      subject,
      status: "failed",
      errorMessage: response.error.message,
      userId,
      businessId,
      metadata,
    });
    return sendFailedError(response.error.message);
  }

  if (!response.data?.id) {
    await logEmailSend({
      templateId,
      to,
      subject,
      status: "failed",
      errorMessage: "Email was accepted but no message ID was returned.",
      userId,
      businessId,
      metadata,
    });
    return sendFailedError("Email was accepted but no message ID was returned.");
  }

  await logEmailSend({
    templateId,
    to,
    subject,
    status: "sent",
    resendId: response.data.id,
    userId,
    businessId,
    metadata,
  });

  return {
    success: true,
    data: {
      id: response.data.id,
    },
  };
}

export async function sendVerificationEmail(
  input: SendVerificationEmailInput,
): Promise<EmailServiceResult> {
  const parsed = sendVerificationEmailSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { subject, html } = renderVerificationEmail({
    verificationUrl: parsed.data.verificationUrl,
    verificationCode: parsed.data.verificationCode,
  });

  return sendTransactionalEmail({
    to: parsed.data.to,
    subject,
    html,
    templateId: "verification",
  });
}

export async function sendLeadFollowUpEmail(
  input: SendLeadFollowUpEmailInput,
): Promise<EmailServiceResult> {
  const parsed = sendLeadFollowUpEmailSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { subject, html } = renderLeadFollowUpEmail({
    businessName: parsed.data.businessName,
    recipientName: parsed.data.recipientName,
    message: parsed.data.message,
  });

  return sendTransactionalEmail({
    to: parsed.data.to,
    subject,
    html,
    templateId: "lead_follow_up",
  });
}

export async function sendOnboardingDripEmail(
  input: SendOnboardingDripEmailInput,
): Promise<EmailServiceResult> {
  const parsed = sendOnboardingDripEmailSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  return sendTransactionalEmail({
    to: parsed.data.to,
    subject: parsed.data.subject,
    html: parsed.data.html,
    templateId: parsed.data.templateId ?? "onboarding_drip",
  });
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<EmailServiceResult> {
  const parsed = sendPasswordResetEmailSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { subject, html } = renderPasswordResetEmail({
    resetUrl: parsed.data.resetUrl,
    resetCode: parsed.data.resetCode,
  });

  return sendTransactionalEmail({
    to: parsed.data.to,
    subject,
    html,
    templateId: "password_reset",
  });
}

export async function sendMagicLinkEmail(
  input: SendMagicLinkEmailInput,
): Promise<EmailServiceResult> {
  const parsed = sendMagicLinkEmailSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { subject, html } = renderMagicLinkEmail({
    signInUrl: parsed.data.signInUrl,
    signInCode: parsed.data.signInCode,
  });

  return sendTransactionalEmail({
    to: parsed.data.to,
    subject,
    html,
    templateId: "magic_link",
  });
}

export async function sendTeamInviteEmail(
  input: SendTeamInviteEmailInput,
): Promise<EmailServiceResult> {
  const parsed = sendTeamInviteEmailSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { subject, html } = renderTeamInviteEmail({
    businessName: parsed.data.businessName,
    inviterName: parsed.data.inviterName,
    roleLabel: parsed.data.roleLabel,
    roleDescription: parsed.data.roleDescription,
    permissionLabels: parsed.data.permissionLabels,
    acceptUrl: parsed.data.acceptUrl,
    authLink: parsed.data.authLink,
    expiresAt: parsed.data.expiresAt,
    expiryDays: parsed.data.expiryDays,
  });

  return sendTransactionalEmail({
    to: parsed.data.to,
    subject,
    html,
    templateId: "team_invite",
    metadata: { role: parsed.data.roleLabel },
  });
}

export async function sendSystemNotificationEmail(
  input: SendSystemNotificationEmailInput,
): Promise<EmailServiceResult> {
  const parsed = sendSystemNotificationEmailSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { subject, html } = renderSystemNotificationEmail({
    title: parsed.data.title,
    body: parsed.data.body,
    actionUrl: parsed.data.actionUrl,
    actionLabel: parsed.data.actionLabel,
    previewText: parsed.data.previewText,
  });

  return sendTransactionalEmail({
    to: parsed.data.to,
    subject,
    html,
    templateId: "system_notification",
  });
}

export async function sendPasswordChangedEmail(input: {
  to: string;
  userId: string;
  changedAtLabel: string;
}): Promise<EmailServiceResult> {
  const { subject, html } = renderPasswordChangedEmail({
    changedAtLabel: input.changedAtLabel,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    html,
    templateId: "password_changed",
    userId: input.userId,
  });
}

export async function sendNewDeviceLoginEmail(input: {
  to: string;
  userId: string;
  deviceLabel: string;
  signedInAtLabel: string;
  ipAddress?: string | null;
}): Promise<EmailServiceResult> {
  const { subject, html } = renderNewDeviceLoginEmail({
    deviceLabel: input.deviceLabel,
    signedInAtLabel: input.signedInAtLabel,
    ipAddress: input.ipAddress,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    html,
    templateId: "new_device_login",
    userId: input.userId,
    metadata: { deviceLabel: input.deviceLabel },
  });
}

export async function sendSubscriptionPurchasedEmail(input: {
  to: string;
  userId: string;
  businessId: string;
  planLabel: string;
  amountLabel?: string | null;
}): Promise<EmailServiceResult> {
  const { subject, html } = renderSubscriptionPurchasedEmail({
    planLabel: input.planLabel,
    amountLabel: input.amountLabel,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    html,
    templateId: "subscription_purchased",
    userId: input.userId,
    businessId: input.businessId,
    metadata: { planLabel: input.planLabel },
  });
}

export async function sendSubscriptionRenewedEmail(input: {
  to: string;
  userId: string;
  businessId: string;
  planLabel: string;
  amountLabel?: string | null;
  billingPeriodLabel?: string | null;
}): Promise<EmailServiceResult> {
  const { subject, html } = renderSubscriptionRenewedEmail({
    planLabel: input.planLabel,
    amountLabel: input.amountLabel,
    billingPeriodLabel: input.billingPeriodLabel,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    html,
    templateId: "subscription_renewed",
    userId: input.userId,
    businessId: input.businessId,
    metadata: { planLabel: input.planLabel },
  });
}

export async function sendSubscriptionPlanChangedEmail(input: {
  to: string;
  userId: string;
  businessId: string;
  planLabel: string;
  previousPlanLabel?: string | null;
}): Promise<EmailServiceResult> {
  const { subject, html } = renderSubscriptionPlanChangedEmail({
    planLabel: input.planLabel,
    previousPlanLabel: input.previousPlanLabel,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    html,
    templateId: "subscription_plan_changed",
    userId: input.userId,
    businessId: input.businessId,
    metadata: {
      planLabel: input.planLabel,
      previousPlanLabel: input.previousPlanLabel,
    },
  });
}

export async function sendTrialEndedEmail(input: {
  to: string;
  userId: string;
  businessId: string;
}): Promise<EmailServiceResult> {
  const { subject, html } = renderTrialEndedEmail();

  return sendTransactionalEmail({
    to: input.to,
    subject,
    html,
    templateId: "trial_ended",
    userId: input.userId,
    businessId: input.businessId,
  });
}

export async function sendPaymentCardFailedEmail(input: {
  to: string;
  userId: string;
  businessId: string;
  planLabel: string;
  amountLabel?: string | null;
  failureMessage?: string | null;
  paymentMethodLabel: string;
  dedupeKey: string;
  stripeEventId: string;
}): Promise<EmailServiceResult> {
  const { subject, html } = renderPaymentCardFailedEmail({
    planLabel: input.planLabel,
    amountLabel: input.amountLabel,
    failureMessage: input.failureMessage,
    paymentMethodLabel: input.paymentMethodLabel,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    html,
    templateId: "payment_card_failed",
    userId: input.userId,
    businessId: input.businessId,
    metadata: {
      dedupeKey: input.dedupeKey,
      stripeEventId: input.stripeEventId,
    },
  });
}

export async function sendPaymentBankFailedEmail(input: {
  to: string;
  userId: string;
  businessId: string;
  planLabel: string;
  amountLabel?: string | null;
  failureMessage?: string | null;
  paymentMethodLabel: string;
  dedupeKey: string;
  stripeEventId: string;
}): Promise<EmailServiceResult> {
  const { subject, html } = renderPaymentBankFailedEmail({
    planLabel: input.planLabel,
    amountLabel: input.amountLabel,
    failureMessage: input.failureMessage,
    paymentMethodLabel: input.paymentMethodLabel,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    html,
    templateId: "payment_bank_failed",
    userId: input.userId,
    businessId: input.businessId,
    metadata: {
      dedupeKey: input.dedupeKey,
      stripeEventId: input.stripeEventId,
    },
  });
}

export async function sendCardExpiringEmail(input: {
  to: string;
  userId: string;
  businessId: string;
  cardLabel: string;
  expiryLabel: string;
  planLabel?: string | null;
  dedupeKey: string;
  stripeEventId: string;
}): Promise<EmailServiceResult> {
  const { subject, html } = renderCardExpiringEmail({
    cardLabel: input.cardLabel,
    expiryLabel: input.expiryLabel,
    planLabel: input.planLabel,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    html,
    templateId: "card_expiring",
    userId: input.userId,
    businessId: input.businessId,
    metadata: {
      dedupeKey: input.dedupeKey,
      stripeEventId: input.stripeEventId,
    },
  });
}
