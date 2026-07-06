"use server";

import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

export type EmailTemplateRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  subjectTemplate: string;
  bodyHtmlTemplate: string | null;
  isActive: boolean;
  isSystem: boolean;
  sendCount: number;
  deliveredCount: number;
  failedCount: number;
  updatedAt: string;
};

export type EmailSendLogRow = {
  id: string;
  templateId: string | null;
  templateName: string | null;
  resendId: string | null;
  toEmail: string;
  subject: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  deliveredAt: string | null;
};

export type EmailCenterStats = {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
};

export async function fetchEmailCenterDataAction(): Promise<
  | {
      success: true;
      templates: EmailTemplateRow[];
      recentLog: EmailSendLogRow[];
      stats: EmailCenterStats;
    }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { data: templates, error: templatesError } = await service
      .from("email_templates")
      .select(
        "id, name, category, description, subject_template, body_html_template, is_active, is_system, updated_at",
      )
      .order("category")
      .order("name");

    if (templatesError) {
      return { success: false, message: templatesError.message };
    }

    const { data: logRows, error: logError } = await service
      .from("email_send_log")
      .select(
        "id, template_id, resend_id, to_email, subject, status, error_message, created_at, delivered_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (logError) {
      return { success: false, message: logError.message };
    }

    const { data: statusCounts, error: statsError } = await service
      .from("email_send_log")
      .select("template_id, status");

    if (statsError) {
      return { success: false, message: statsError.message };
    }

    const countsByTemplate = new Map<
      string,
      { sent: number; delivered: number; failed: number }
    >();

    for (const row of statusCounts ?? []) {
      const templateId = (row.template_id as string | null) ?? "_unknown";
      const bucket = countsByTemplate.get(templateId) ?? {
        sent: 0,
        delivered: 0,
        failed: 0,
      };

      const status = row.status as string;
      if (status === "delivered") {
        bucket.delivered += 1;
        bucket.sent += 1;
      } else if (status === "sent") {
        bucket.sent += 1;
      } else if (status === "failed" || status === "bounced") {
        bucket.failed += 1;
      }

      countsByTemplate.set(templateId, bucket);
    }

    let totalSent = 0;
    let totalDelivered = 0;
    let totalFailed = 0;

    for (const row of statusCounts ?? []) {
      const status = row.status as string;
      if (status === "delivered") {
        totalDelivered += 1;
        totalSent += 1;
      } else if (status === "sent") {
        totalSent += 1;
      } else if (status === "failed" || status === "bounced") {
        totalFailed += 1;
      }
    }

    const templateNameById = new Map(
      (templates ?? []).map((row) => [row.id as string, row.name as string]),
    );

    const mappedTemplates: EmailTemplateRow[] = (templates ?? []).map((row) => {
      const counts = countsByTemplate.get(row.id as string) ?? {
        sent: 0,
        delivered: 0,
        failed: 0,
      };

      return {
        id: row.id as string,
        name: row.name as string,
        category: row.category as string,
        description: (row.description as string) ?? "",
        subjectTemplate: row.subject_template as string,
        bodyHtmlTemplate: (row.body_html_template as string | null) ?? null,
        isActive: row.is_active as boolean,
        isSystem: row.is_system as boolean,
        sendCount: counts.sent + counts.failed,
        deliveredCount: counts.delivered,
        failedCount: counts.failed,
        updatedAt: row.updated_at as string,
      };
    });

    const recentLog: EmailSendLogRow[] = (logRows ?? []).map((row) => ({
      id: row.id as string,
      templateId: (row.template_id as string | null) ?? null,
      templateName: row.template_id
        ? (templateNameById.get(row.template_id as string) ?? row.template_id)
        : null,
      resendId: (row.resend_id as string | null) ?? null,
      toEmail: row.to_email as string,
      subject: row.subject as string,
      status: row.status as string,
      errorMessage: (row.error_message as string | null) ?? null,
      createdAt: row.created_at as string,
      deliveredAt: (row.delivered_at as string | null) ?? null,
    }));

    const deliveryRate =
      totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

    return {
      success: true,
      templates: mappedTemplates,
      recentLog,
      stats: {
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load email center",
    };
  }
}

export async function saveEmailTemplateAction(input: {
  id: string;
  name: string;
  category: string;
  description: string;
  subjectTemplate: string;
  bodyHtmlTemplate?: string | null;
  isActive: boolean;
}): Promise<{ success: true } | { success: false; message: string }> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { error } = await service
      .from("email_templates")
      .update({
        name: input.name.trim(),
        category: input.category.trim(),
        description: input.description.trim(),
        subject_template: input.subjectTemplate.trim(),
        body_html_template: input.bodyHtmlTemplate?.trim() || null,
        is_active: input.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save template",
    };
  }
}

export async function createEmailTemplateAction(input: {
  id: string;
  name: string;
  category: string;
  description: string;
  subjectTemplate: string;
  bodyHtmlTemplate?: string | null;
}): Promise<{ success: true } | { success: false; message: string }> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { error } = await service.from("email_templates").insert({
      id: input.id.trim(),
      name: input.name.trim(),
      category: input.category.trim(),
      description: input.description.trim(),
      subject_template: input.subjectTemplate.trim(),
      body_html_template: input.bodyHtmlTemplate?.trim() || null,
      is_active: true,
      is_system: false,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create template",
    };
  }
}

export async function sendPlatformBroadcastAction(input: {
  subject: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
}): Promise<
  | { success: true; sent: number; failed: number }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();
    const { sendAdminEmail } = await import("@/lib/email/send");
    const { renderPlatformBroadcastEmail } = await import(
      "@/lib/email/broadcast-template"
    );

    const { data: users, error: usersError } = await service
      .from("users")
      .select("id, email")
      .not("email", "is", null);

    if (usersError) {
      return { success: false, message: usersError.message };
    }

    const recipients = (users ?? []).filter(
      (row): row is { id: string; email: string } =>
        typeof row.email === "string" && row.email.trim().length > 0,
    );

    if (recipients.length === 0) {
      return { success: false, message: "No users with email found." };
    }

    const { html } = renderPlatformBroadcastEmail({
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
    });

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await sendAdminEmail({
        to: recipient.email,
        subject: input.subject.trim(),
        html,
        templateId: "platform_broadcast",
        userId: recipient.id,
        metadata: { broadcast: true },
      });

      if (result.success) {
        sent += 1;
      } else {
        failed += 1;
      }
    }

    return { success: true, sent, failed };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Broadcast failed",
    };
  }
}
