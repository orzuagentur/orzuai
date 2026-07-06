import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import type { Json } from "@/types/database.types";

export type EmailSendLogStatus = "sent" | "failed" | "delivered" | "bounced";

export async function logEmailSend(input: {
  templateId?: string | null;
  to: string;
  subject: string;
  status: EmailSendLogStatus;
  resendId?: string | null;
  errorMessage?: string | null;
  userId?: string | null;
  businessId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const admin = createAdminClient();

  await admin.from("email_send_log").insert({
    template_id: input.templateId ?? null,
    to_email: input.to.trim().toLowerCase(),
    subject: input.subject,
    status: input.status,
    resend_id: input.resendId ?? null,
    error_message: input.errorMessage ?? null,
    user_id: input.userId ?? null,
    business_id: input.businessId ?? null,
    metadata: (input.metadata ?? {}) as Json,
  });
}
