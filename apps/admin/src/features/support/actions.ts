"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

export type SupportThreadListItem = {
  threadId: string;
  businessId: string;
  businessName: string;
  ownerEmail: string | null;
  subject: string;
  lastMessageAt: string | null;
  unreadByPlatform: number;
  preview: string | null;
};

export type SupportMessageItem = {
  id: string;
  senderType: "platform" | "business";
  content: string;
  createdAt: string;
  senderAdminUserId: string | null;
};

export async function fetchSupportThreadsAction(): Promise<
  | { success: true; threads: SupportThreadListItem[] }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { data, error } = await service
      .from("platform_support_threads")
      .select(
        "id, business_id, subject, last_message_at, unread_by_platform, businesses(business_name, user_id)",
      )
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) {
      return { success: false, message: error.message };
    }

    const threads: SupportThreadListItem[] = [];

    for (const row of data ?? []) {
      const business = row.businesses as {
        business_name?: string;
        user_id?: string;
      } | null;

      let ownerEmail: string | null = null;
      if (business?.user_id) {
        const { data: userData } = await service.auth.admin.getUserById(
          business.user_id,
        );
        ownerEmail = userData.user?.email ?? null;
      }

      const { data: lastMessage } = await service
        .from("platform_support_messages")
        .select("content")
        .eq("thread_id", row.id as string)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      threads.push({
        threadId: row.id as string,
        businessId: row.business_id as string,
        businessName: business?.business_name ?? "Business",
        ownerEmail,
        subject: row.subject as string,
        lastMessageAt: (row.last_message_at as string | null) ?? null,
        unreadByPlatform: Number(row.unread_by_platform ?? 0),
        preview: (lastMessage?.content as string | null) ?? null,
      });
    }

    return { success: true, threads };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load support threads.",
    };
  }
}

export async function fetchSupportMessagesAction(
  threadId: string,
): Promise<
  | { success: true; messages: SupportMessageItem[] }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { data, error } = await service
      .from("platform_support_messages")
      .select("id, sender_type, content, created_at, sender_admin_user_id")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      return { success: false, message: error.message };
    }

    await service
      .from("platform_support_messages")
      .update({ read_by_platform_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .is("read_by_platform_at", null);

    await service
      .from("platform_support_threads")
      .update({ unread_by_platform: 0 })
      .eq("id", threadId);

    return {
      success: true,
      messages: (data ?? []).map((row) => ({
        id: row.id as string,
        senderType: row.sender_type as "platform" | "business",
        content: row.content as string,
        createdAt: row.created_at as string,
        senderAdminUserId: (row.sender_admin_user_id as string | null) ?? null,
      })),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load messages.",
    };
  }
}

const sendSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().trim().min(1).max(8000),
});

export async function sendSupportMessageAction(input: z.infer<typeof sendSchema>) {
  const parsed = sendSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false as const, message: "Invalid message." };
  }

  const { user } = await requirePlatformAdmin();
  const service = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: message, error } = await service
    .from("platform_support_messages")
    .insert({
      thread_id: parsed.data.threadId,
      sender_type: "platform",
      sender_admin_user_id: user.id,
      content: parsed.data.content,
      read_by_platform_at: now,
    })
    .select("id")
    .single();

  if (error || !message) {
    return { success: false as const, message: error?.message ?? "Send failed." };
  }

  const { data: thread } = await service
    .from("platform_support_threads")
    .select("business_id, unread_by_business")
    .eq("id", parsed.data.threadId)
    .maybeSingle();

  await service
    .from("platform_support_threads")
    .update({
      last_message_at: now,
      unread_by_business: Number(thread?.unread_by_business ?? 0) + 1,
    })
    .eq("id", parsed.data.threadId);

  if (thread?.business_id) {
    await service.from("platform_business_admin_audit_log").insert({
      business_id: thread.business_id,
      action: "support.message_sent",
      actor_user_id: user.id,
      actor_email: user.email ?? "",
      metadata: { threadId: parsed.data.threadId, preview: parsed.data.content.slice(0, 120) },
    });
  }

  revalidatePath("/support");
  revalidatePath(`/businesses/${thread?.business_id ?? ""}`);

  return { success: true as const, messageId: message.id as string };
}

export async function startSupportThreadForBusinessAction(businessId: string) {
  const { ensureSupportThreadAction } = await import("@/features/businesses/actions");
  return ensureSupportThreadAction(businessId);
}

const draftSchema = z.object({
  threadId: z.string().uuid(),
});

export async function draftSupportReplyAction(input: z.infer<typeof draftSchema>) {
  const parsed = draftSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false as const, message: "Invalid thread." };
  }

  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();
    const messagesResult = await fetchSupportMessagesAction(parsed.data.threadId);

    if (!messagesResult.success) {
      return { success: false as const, message: messagesResult.message };
    }

    const transcript = messagesResult.messages
      .slice(-12)
      .map((message) => `${message.senderType}: ${message.content}`)
      .join("\n");

    const { getSecret } = await import("@orzu/secrets/server");
    const apiKey = await getSecret(service, "OPENAI_API_KEY");

    if (!apiKey?.trim()) {
      return {
        success: false as const,
        message: "OPENAI_API_KEY не настроен для admin.",
      };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Ты оператор поддержки OrzuX. Пиши по-русски, кратко и профессионально. Верни только текст ответа клиенту без markdown.",
          },
          {
            role: "user",
            content: `Сгенерируй черновик ответа клиенту на основе переписки:\n\n${transcript}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false as const,
        message: errorText.slice(0, 200) || "AI draft failed.",
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const draft = payload.choices?.[0]?.message?.content?.trim();

    if (!draft) {
      return { success: false as const, message: "AI вернул пустой ответ." };
    }

    return { success: true as const, draft };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "AI draft failed.",
    };
  }
}
