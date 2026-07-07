"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  renderMarketingOutreachEmail,
  renderMarketingSubject,
} from "@orzuai/lib/email/templates/marketing-outreach-email";
import {
  resolveFromEmailDbValue,
} from "@orzuai/lib/email/from-addresses";
import { formatResendFromAddress } from "@orzuai/lib/resend/from-address";

import { sendAdminEmail } from "@/lib/email/send";
import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";
import type {
  MarketingAnalyticsOverview,
  MarketingBusinessRecipient,
  MarketingCampaignDetail,
  MarketingTemplate,
} from "@/features/marketing/types";

const templateSchema = z.object({
  name: z.string().min(1).max(120),
  subjectTemplate: z.string().min(1).max(200),
  headline: z.string().min(1).max(200),
  greeting: z.string().min(1).max(80),
  bodyTemplate: z.string().min(1).max(8000),
  ctaLabel: z.string().min(1).max(80),
  ctaUrl: z.string().url().max(500),
  fromEmail: z.string().min(1).max(120),
  featureHighlights: z.array(z.string().min(1).max(300)).max(8),
});

const sendSchema = z.object({
  campaignName: z.string().max(120).optional(),
  fromEmail: z.string().min(1).max(120),
  template: templateSchema,
  recipients: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().max(120).optional(),
        businessId: z.string().uuid().nullable().optional(),
      }),
    )
    .min(1)
    .max(200),
});

function mapTemplateRow(row: Record<string, unknown>): MarketingTemplate {
  const highlights = row.feature_highlights;

  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    subjectTemplate: String(row.subject_template ?? ""),
    headline: String(row.headline ?? ""),
    greeting: String(row.greeting ?? "Здравствуйте"),
    bodyTemplate: String(row.body_template ?? ""),
    ctaLabel: String(row.cta_label ?? "Посмотреть возможности"),
    ctaUrl: String(row.cta_url ?? "https://www.orzux.com/dashboard"),
    fromEmail: String(row.from_email ?? "hello"),
    featureHighlights: Array.isArray(highlights)
      ? highlights.map((item) => String(item))
      : [],
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

function resolveMarketingFromAddress(fromEmail: string): string {
  return (
    resolveFromEmailDbValue(fromEmail) ??
    formatResendFromAddress(
      fromEmail.includes("@") ? fromEmail : `hello@orzux.com`,
    )
  );
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function fetchMarketingTemplateAction(): Promise<{
  success: boolean;
  message?: string;
  template?: MarketingTemplate;
}> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { data, error } = await service
      .from("marketing_templates")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error || !data) {
      return { success: false, message: "Шаблон маркетинга не найден." };
    }

    return { success: true, template: mapTemplateRow(data) };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Не удалось загрузить шаблон.",
    };
  }
}

export async function saveMarketingTemplateAction(
  input: z.infer<typeof templateSchema>,
): Promise<{ success: boolean; message?: string }> {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = templateSchema.parse(input);
    const service = createServiceRoleClient();

    const { error } = await service
      .from("marketing_templates")
      .update({
        name: parsed.name,
        subject_template: parsed.subjectTemplate,
        headline: parsed.headline,
        greeting: parsed.greeting,
        body_template: parsed.bodyTemplate,
        cta_label: parsed.ctaLabel,
        cta_url: parsed.ctaUrl,
        from_email: parsed.fromEmail,
        feature_highlights: parsed.featureHighlights,
        updated_at: new Date().toISOString(),
        updated_by: admin.user.id,
      })
      .eq("id", "default");

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/marketing");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Не удалось сохранить шаблон.",
    };
  }
}

export async function previewMarketingEmailAction(input: {
  template: z.infer<typeof templateSchema>;
  recipientName?: string;
}): Promise<{
  success: boolean;
  message?: string;
  subject?: string;
  html?: string;
  from?: string;
}> {
  try {
    await requirePlatformAdmin();
    const parsed = templateSchema.parse(input.template);
    const recipientName = input.recipientName?.trim() || "Алексей";

    const rendered = renderMarketingOutreachEmail({
      recipientName,
      subjectTemplate: parsed.subjectTemplate,
      greeting: parsed.greeting,
      headline: parsed.headline,
      bodyText: parsed.bodyTemplate,
      featureHighlights: parsed.featureHighlights,
      ctaLabel: parsed.ctaLabel,
      ctaUrl: parsed.ctaUrl,
    });

    return {
      success: true,
      subject: rendered.subject,
      html: rendered.html,
      from: resolveMarketingFromAddress(parsed.fromEmail),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Не удалось сформировать превью.",
    };
  }
}

export async function fetchMarketingBusinessesAction(): Promise<{
  success: boolean;
  message?: string;
  businesses?: MarketingBusinessRecipient[];
}> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { data, error } = await service
      .from("businesses")
      .select("id, business_name, email, subscription_plan, user_id")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      return { success: false, message: error.message };
    }

    const businesses: MarketingBusinessRecipient[] = [];

    for (const row of data ?? []) {
      let ownerEmail: string | null = null;

      if (row.user_id) {
        const { data: userData } = await service.auth.admin.getUserById(
          row.user_id,
        );
        ownerEmail = userData.user?.email?.trim().toLowerCase() ?? null;
      }

      const businessEmail = row.email?.trim().toLowerCase() ?? null;
      const email = businessEmail || ownerEmail;

      if (!email) {
        continue;
      }

      businesses.push({
        id: row.id,
        businessName: row.business_name ?? "Без названия",
        email,
        ownerEmail,
        subscriptionPlan: row.subscription_plan ?? "free",
      });
    }

    return { success: true, businesses };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Не удалось загрузить бизнесы.",
    };
  }
}

export async function sendMarketingCampaignAction(
  input: z.infer<typeof sendSchema>,
): Promise<{
  success: boolean;
  message?: string;
  campaignId?: string;
  sent?: number;
  failed?: number;
}> {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = sendSchema.parse(input);
    const service = createServiceRoleClient();
    const fromAddress = resolveMarketingFromAddress(parsed.fromEmail);

    const campaignName =
      parsed.campaignName?.trim() ||
      `Рассылка ${new Date().toLocaleDateString("ru-RU")}`;

    const { data: campaign, error: campaignError } = await service
      .from("marketing_campaigns")
      .insert({
        name: campaignName,
        subject: renderMarketingSubject(
          parsed.template.subjectTemplate,
          parsed.recipients[0]?.name?.trim() || "коллега",
        ),
        template_snapshot: parsed.template,
        from_email: parsed.fromEmail,
        created_by: admin.user.id,
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      return { success: false, message: campaignError?.message ?? "Campaign error" };
    }

    let sent = 0;
    let failed = 0;

    for (const recipient of parsed.recipients) {
      const trackingToken = randomUUID();
      const recipientName = recipient.name?.trim() || "коллега";
      const email = recipient.email.trim().toLowerCase();

      const { data: recipientRow, error: recipientError } = await service
        .from("marketing_campaign_recipients")
        .insert({
          campaign_id: campaign.id,
          business_id: recipient.businessId ?? null,
          recipient_email: email,
          recipient_name: recipientName,
          tracking_token: trackingToken,
          status: "pending",
        })
        .select("id")
        .single();

      if (recipientError || !recipientRow) {
        failed += 1;
        continue;
      }

      const subject = renderMarketingSubject(
        parsed.template.subjectTemplate,
        recipientName,
      );

      const rendered = renderMarketingOutreachEmail({
        recipientName,
        subjectTemplate: parsed.template.subjectTemplate,
        greeting: parsed.template.greeting,
        headline: parsed.template.headline,
        bodyText: parsed.template.bodyTemplate,
        featureHighlights: parsed.template.featureHighlights,
        ctaLabel: parsed.template.ctaLabel,
        ctaUrl: parsed.template.ctaUrl,
        trackingToken,
      });

      const result = await sendAdminEmail({
        to: email,
        subject,
        html: rendered.html,
        templateId: "marketing_outreach",
        from: fromAddress,
        businessId: recipient.businessId ?? null,
        metadata: {
          campaignId: campaign.id,
          recipientId: recipientRow.id,
          trackingToken,
        },
      });

      if (result.success) {
        sent += 1;
        await service
          .from("marketing_campaign_recipients")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            resend_id: result.id ?? null,
          })
          .eq("id", recipientRow.id);
      } else {
        failed += 1;
        await service
          .from("marketing_campaign_recipients")
          .update({
            status: "failed",
            error_message: result.message ?? "Send failed",
          })
          .eq("id", recipientRow.id);
      }
    }

    await service
      .from("marketing_campaigns")
      .update({
        sent_count: sent,
        failed_count: failed,
      })
      .eq("id", campaign.id);

    revalidatePath("/marketing");

    return {
      success: sent > 0,
      campaignId: campaign.id,
      sent,
      failed,
      message:
        failed > 0
          ? `Отправлено: ${sent}, ошибок: ${failed}`
          : `Успешно отправлено: ${sent}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Не удалось отправить рассылку.",
    };
  }
}

export async function fetchMarketingAnalyticsAction(): Promise<{
  success: boolean;
  message?: string;
  analytics?: MarketingAnalyticsOverview;
}> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { data: campaigns, error } = await service
      .from("marketing_campaigns")
      .select("id, name, subject, from_email, sent_count, failed_count, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return { success: false, message: error.message };
    }

    const summaries = [];

    let totalSent = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalFailed = 0;

    for (const campaign of campaigns ?? []) {
      const { data: recipients } = await service
        .from("marketing_campaign_recipients")
        .select("status, open_count, click_count")
        .eq("campaign_id", campaign.id);

      const sent =
        recipients?.filter((row) => row.status !== "pending" && row.status !== "failed")
          .length ?? campaign.sent_count ?? 0;
      const failed =
        recipients?.filter((row) => row.status === "failed").length ??
        campaign.failed_count ??
        0;
      const opened =
        recipients?.filter(
          (row) =>
            row.status === "opened" ||
            row.status === "clicked" ||
            (row.open_count ?? 0) > 0,
        ).length ?? 0;
      const clicked =
        recipients?.filter(
          (row) => row.status === "clicked" || (row.click_count ?? 0) > 0,
        ).length ?? 0;
      const ignored = Math.max(sent - opened, 0);

      totalSent += sent;
      totalOpened += opened;
      totalClicked += clicked;
      totalFailed += failed;

      summaries.push({
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        fromEmail: campaign.from_email,
        sentCount: sent,
        failedCount: failed,
        openedCount: opened,
        clickedCount: clicked,
        ignoredCount: ignored,
        openRate: pct(opened, sent),
        clickRate: pct(clicked, sent),
        createdAt: campaign.created_at,
      });
    }

    return {
      success: true,
      analytics: {
        totalCampaigns: summaries.length,
        totalSent,
        totalOpened,
        totalClicked,
        totalIgnored: Math.max(totalSent - totalOpened, 0),
        totalFailed,
        openRate: pct(totalOpened, totalSent),
        clickRate: pct(totalClicked, totalSent),
        campaigns: summaries,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Не удалось загрузить аналитику.",
    };
  }
}

export async function fetchMarketingCampaignDetailAction(
  campaignId: string,
): Promise<{
  success: boolean;
  message?: string;
  campaign?: MarketingCampaignDetail;
}> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { data: campaign, error } = await service
      .from("marketing_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (error || !campaign) {
      return { success: false, message: "Кампания не найдена." };
    }

    const { data: recipients } = await service
      .from("marketing_campaign_recipients")
      .select(
        "id, recipient_email, recipient_name, business_id, status, sent_at, opened_at, clicked_at, open_count, click_count, error_message",
      )
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    const businessIds = [
      ...new Set(
        (recipients ?? [])
          .map((row) => row.business_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const businessNames = new Map<string, string>();

    if (businessIds.length > 0) {
      const { data: businesses } = await service
        .from("businesses")
        .select("id, business_name")
        .in("id", businessIds);

      for (const business of businesses ?? []) {
        businessNames.set(business.id, business.business_name ?? "");
      }
    }

    const sent = campaign.sent_count ?? 0;
    const opened =
      recipients?.filter(
        (row) =>
          row.status === "opened" ||
          row.status === "clicked" ||
          (row.open_count ?? 0) > 0,
      ).length ?? 0;
    const clicked =
      recipients?.filter(
        (row) => row.status === "clicked" || (row.click_count ?? 0) > 0,
      ).length ?? 0;

    return {
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        fromEmail: campaign.from_email,
        sentCount: sent,
        failedCount: campaign.failed_count ?? 0,
        openedCount: opened,
        clickedCount: clicked,
        ignoredCount: Math.max(sent - opened, 0),
        openRate: pct(opened, sent),
        clickRate: pct(clicked, sent),
        createdAt: campaign.created_at,
        recipients: (recipients ?? []).map((row) => ({
          id: row.id,
          recipientEmail: row.recipient_email,
          recipientName: row.recipient_name,
          businessId: row.business_id,
          businessName: row.business_id
            ? businessNames.get(row.business_id) ?? null
            : null,
          status: row.status,
          sentAt: row.sent_at,
          openedAt: row.opened_at,
          clickedAt: row.clicked_at,
          openCount: row.open_count ?? 0,
          clickCount: row.click_count ?? 0,
          errorMessage: row.error_message,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Не удалось загрузить кампанию.",
    };
  }
}