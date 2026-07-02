"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

export type AnnouncementListItem = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  targetAudience: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  targetAudience: z
    .enum(["all", "free", "starter", "pro", "agency", "business_ids"])
    .default("all"),
  targetBusinessIds: z.array(z.string().uuid()).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  sendPush: z.boolean().optional(),
});

export async function fetchAnnouncementsAction(): Promise<
  | { success: true; items: AnnouncementListItem[] }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { data, error } = await service
      .from("platform_announcements")
      .select(
        "id, title, body, severity, target_audience, is_active, starts_at, ends_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      items: (data ?? []).map((row) => ({
        id: row.id as string,
        title: row.title as string,
        body: row.body as string,
        severity: row.severity as AnnouncementListItem["severity"],
        targetAudience: row.target_audience as string,
        isActive: Boolean(row.is_active),
        startsAt: (row.starts_at as string | null) ?? null,
        endsAt: (row.ends_at as string | null) ?? null,
        createdAt: row.created_at as string,
      })),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load announcements.",
    };
  }
}

export async function createAnnouncementAction(input: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false as const, message: "Invalid announcement." };
  }

  try {
    const { user } = await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { data: created, error } = await service
      .from("platform_announcements")
      .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      severity: parsed.data.severity,
      target_audience: parsed.data.targetAudience,
      target_business_ids: parsed.data.targetBusinessIds ?? [],
      starts_at: parsed.data.startsAt ?? null,
      ends_at: parsed.data.endsAt ?? null,
      created_by: user.id,
      is_active: true,
    })
      .select("id")
      .single();

    if (error || !created) {
      return { success: false as const, message: error?.message ?? "Create failed." };
    }

    if (parsed.data.sendPush) {
      const { triggerAnnouncementPushDelivery } = await import(
        "@/features/announcements/push-delivery"
      );
      await triggerAnnouncementPushDelivery(created.id as string);
    }

    revalidatePath("/announcements");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Create failed.",
    };
  }
}

const toggleSchema = z.object({
  announcementId: z.string().uuid(),
  isActive: z.boolean(),
  sendPush: z.boolean().optional(),
});

export async function toggleAnnouncementAction(input: z.infer<typeof toggleSchema>) {
  const parsed = toggleSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false as const, message: "Invalid announcement." };
  }

  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { error } = await service
      .from("platform_announcements")
      .update({ is_active: parsed.data.isActive })
      .eq("id", parsed.data.announcementId);

    if (error) {
      return { success: false as const, message: error.message };
    }

    if (parsed.data.isActive && parsed.data.sendPush) {
      const { triggerAnnouncementPushDelivery } = await import(
        "@/features/announcements/push-delivery"
      );
      await triggerAnnouncementPushDelivery(parsed.data.announcementId);
    }

    revalidatePath("/announcements");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Update failed.",
    };
  }
}

const deleteSchema = z.object({
  announcementId: z.string().uuid(),
});

const pushSchema = z.object({
  announcementId: z.string().uuid(),
});

export async function resendAnnouncementPushAction(
  input: z.infer<typeof pushSchema>,
) {
  const parsed = pushSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false as const, message: "Invalid announcement." };
  }

  try {
    await requirePlatformAdmin();

    const { triggerAnnouncementPushDelivery } = await import(
      "@/features/announcements/push-delivery"
    );
    await triggerAnnouncementPushDelivery(parsed.data.announcementId);

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Push failed.",
    };
  }
}

export async function deleteAnnouncementAction(input: z.infer<typeof deleteSchema>) {
  const parsed = deleteSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false as const, message: "Invalid announcement." };
  }

  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { error } = await service
      .from("platform_announcements")
      .delete()
      .eq("id", parsed.data.announcementId);

    if (error) {
      return { success: false as const, message: error.message };
    }

    revalidatePath("/announcements");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Delete failed.",
    };
  }
}
