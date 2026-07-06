import "server-only";

import {
  getResendApiKey,
  getResendFromEmail,
  hasResendEnv,
} from "@/lib/env";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  templateId?: string | null;
  userId?: string | null;
  businessId?: string | null;
  metadata?: Record<string, unknown>;
};

async function logEmailSend(input: {
  templateId?: string | null;
  to: string;
  subject: string;
  status: "sent" | "failed" | "delivered" | "bounced";
  resendId?: string | null;
  errorMessage?: string | null;
  userId?: string | null;
  businessId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const service = createServiceRoleClient();

  await service.from("email_send_log").insert({
    template_id: input.templateId ?? null,
    to_email: input.to.trim().toLowerCase(),
    subject: input.subject,
    status: input.status,
    resend_id: input.resendId ?? null,
    error_message: input.errorMessage ?? null,
    user_id: input.userId ?? null,
    business_id: input.businessId ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function sendAdminEmail(
  input: SendEmailInput,
): Promise<{ success: boolean; message?: string; id?: string }> {
  if (!hasResendEnv()) {
    return {
      success: false,
      message: "Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getResendApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getResendFromEmail(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    await logEmailSend({
      templateId: input.templateId,
      to: input.to,
      subject: input.subject,
      status: "failed",
      errorMessage: body || `Resend HTTP ${response.status}`,
      userId: input.userId,
      businessId: input.businessId,
      metadata: input.metadata,
    });
    return {
      success: false,
      message: body || `Resend HTTP ${response.status}`,
    };
  }

  const payload = (await response.json()) as { id?: string };

  await logEmailSend({
    templateId: input.templateId,
    to: input.to,
    subject: input.subject,
    status: "sent",
    resendId: payload.id ?? null,
    userId: input.userId,
    businessId: input.businessId,
    metadata: input.metadata,
  });

  return { success: true, id: payload.id };
}
