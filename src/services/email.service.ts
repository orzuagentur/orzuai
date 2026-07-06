import "server-only";

import { renderLeadFollowUpEmail } from "@/lib/email/templates/lead-follow-up-email";
import { renderMagicLinkEmail } from "@/lib/email/templates/magic-link-email";
import { renderPasswordResetEmail } from "@/lib/email/templates/password-reset-email";
import { renderSystemNotificationEmail } from "@/lib/email/templates/system-notification-email";
import { renderTeamInviteEmail } from "@/lib/email/templates/team-invite-email";
import { renderVerificationEmail } from "@/lib/email/templates/verification-email";
import { getResendFromEmail, hasResendEnv } from "@/lib/env";
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
    from: getResendFromEmail(),
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
