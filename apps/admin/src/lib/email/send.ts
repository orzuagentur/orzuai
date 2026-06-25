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
};

export async function sendAdminEmail(
  input: SendEmailInput,
): Promise<{ success: boolean; message?: string }> {
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
    return {
      success: false,
      message: body || `Resend HTTP ${response.status}`,
    };
  }

  return { success: true };
}
