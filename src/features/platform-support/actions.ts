"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";

export type TenantSupportMessage = {
  id: string;
  senderType: "platform" | "business";
  content: string;
  createdAt: string;
};

async function requireOwnedBusiness() {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    throw new Error("Business not found.");
  }

  return { user, business };
}

async function ensureSupportThread(businessId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("platform_support_threads")
    .select("id")
    .eq("business_id", businessId)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const { data, error } = await admin
    .from("platform_support_threads")
    .insert({ business_id: businessId })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create support thread.");
  }

  return data.id as string;
}

export async function fetchTenantSupportThreadAction(): Promise<
  | {
      success: true;
      threadId: string;
      unreadCount: number;
      messages: TenantSupportMessage[];
    }
  | { success: false; message: string }
> {
  try {
    const { business } = await requireOwnedBusiness();
    const supabase = await createClient();
    const threadId = await ensureSupportThread(business.id);

    const [{ data: thread }, { data: messages, error }] = await Promise.all([
      supabase
        .from("platform_support_threads")
        .select("unread_by_business")
        .eq("id", threadId)
        .maybeSingle(),
      supabase
        .from("platform_support_messages")
        .select("id, sender_type, content, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);

    if (error) {
      return { success: false, message: error.message };
    }

    const now = new Date().toISOString();
    await supabase
      .from("platform_support_messages")
      .update({ read_by_business_at: now })
      .eq("thread_id", threadId)
      .is("read_by_business_at", null);

    await supabase
      .from("platform_support_threads")
      .update({ unread_by_business: 0 })
      .eq("id", threadId);

    return {
      success: true,
      threadId,
      unreadCount: Number(thread?.unread_by_business ?? 0),
      messages: (messages ?? []).map((row) => ({
        id: row.id as string,
        senderType: row.sender_type as "platform" | "business",
        content: row.content as string,
        createdAt: row.created_at as string,
      })),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load support.",
    };
  }
}

const sendSchema = z.object({
  content: z.string().trim().min(1).max(8000),
});

export async function sendTenantSupportMessageAction(
  input: z.infer<typeof sendSchema>,
) {
  const parsed = sendSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false as const, message: "Invalid message." };
  }

  try {
    const { user, business } = await requireOwnedBusiness();
    const admin = createAdminClient();
    const threadId = await ensureSupportThread(business.id);
    const now = new Date().toISOString();

    const { data: message, error } = await admin
      .from("platform_support_messages")
      .insert({
        thread_id: threadId,
        sender_type: "business",
        sender_business_user_id: user.id,
        content: parsed.data.content,
        read_by_business_at: now,
      })
      .select("id")
      .single();

    if (error || !message) {
      return { success: false as const, message: error?.message ?? "Send failed." };
    }

    const { data: thread } = await admin
      .from("platform_support_threads")
      .select("unread_by_platform")
      .eq("id", threadId)
      .maybeSingle();

    await admin
      .from("platform_support_threads")
      .update({
        last_message_at: now,
        unread_by_platform: Number(thread?.unread_by_platform ?? 0) + 1,
      })
      .eq("id", threadId);

    revalidatePath("/dashboard");

    return { success: true as const, messageId: message.id as string };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Send failed.",
    };
  }
}

export async function fetchTenantSupportUnreadAction(): Promise<
  | { success: true; unreadCount: number }
  | { success: false; message: string }
> {
  try {
    const { business } = await requireOwnedBusiness();
    const supabase = await createClient();

    const { data } = await supabase
      .from("platform_support_threads")
      .select("unread_by_business")
      .eq("business_id", business.id)
      .maybeSingle();

    return {
      success: true,
      unreadCount: Number(data?.unread_by_business ?? 0),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load unread count.",
    };
  }
}

const dismissSchema = z.object({
  announcementId: z.string().uuid(),
});

export async function dismissPlatformAnnouncementAction(
  input: z.infer<typeof dismissSchema>,
) {
  const parsed = dismissSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false as const, message: "Invalid announcement." };
  }

  try {
    const user = await requireUser();
    const supabase = await createClient();

    const { error } = await supabase.from("platform_announcement_dismissals").insert({
      announcement_id: parsed.data.announcementId,
      user_id: user.id,
    });

    if (error && error.code !== "23505") {
      return { success: false as const, message: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Dismiss failed.",
    };
  }
}
