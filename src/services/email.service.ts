import "server-only";

import { renderLeadFollowUpEmail } from "@/lib/email/templates/lead-follow-up-email";
import { renderPasswordResetEmail } from "@/lib/email/templates/password-reset-email";
import { renderVerificationEmail } from "@/lib/email/templates/verification-email";
import { getResendFromEmail, hasResendEnv } from "@/lib/env";
import { getResendClient } from "@/lib/resend/client";
import type {
  EmailServiceResult,
  SendLeadFollowUpEmailInput,
  SendOnboardingDripEmailInput,
  SendPasswordResetEmailInput,
  SendVerificationEmailInput,
} from "@/types/email.types";
import {
  sendLeadFollowUpEmailSchema,
  sendOnboardingDripEmailSchema,
  sendPasswordResetEmailSchema,
  sendVerificationEmailSchema,
} from "@/types/email.types";

type SendTransactionalEmailParams = {
  to: string;
  subject: string;
  html: string;
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
    return sendFailedError(response.error.message);
  }

  if (!response.data?.id) {
    return sendFailedError("Email was accepted but no message ID was returned.");
  }

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
  });

  return sendTransactionalEmail({
    to: parsed.data.to,
    subject,
    html,
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
  });
}
