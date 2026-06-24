import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isMessagingIntegrationChannel } from "@/features/integrations";
import type { IntegrationChannelId } from "@/features/integrations";
import { KNOWLEDGE_CATEGORIES } from "@/types/knowledge.types";
import { generateBusinessCalendarFromKnowledge } from "@/services/business-calendar-setup.service";
import { sendChatMessage } from "@/services/chat.service";
import { updateChannelAiEnabled } from "@/services/channel-workspace.service";
import { deleteContact } from "@/services/contacts.service";
import {
  createKnowledgeEntry,
  deleteKnowledgeEntry,
} from "@/services/knowledge.service";
import { generateTextWithFallback } from "@/services/llm.service";
import {
  formatWebSnippetsForPrompt,
  searchWebSnippets,
} from "@/services/web-search.service";
import {
  FULL_ACCESS_ACTION_TYPES,
  copilotActionSchema,
  type CopilotProposedAction,
  type PlatformCopilotMode,
} from "@/types/platform-copilot.types";
import { isAllowedCopilotPath } from "@/lib/platform-copilot/parse-copilot-response";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";

const executeActionInputSchema = z.object({
  mode: z.enum(["chat", "full_access"]),
  action: z.unknown(),
});

function modeAllowsAction(
  mode: PlatformCopilotMode,
  type: CopilotProposedAction["type"],
): boolean {
  if (type === "navigate") {
    return true;
  }

  if (mode !== "full_access") {
    return false;
  }

  return FULL_ACCESS_ACTION_TYPES.has(type);
}

async function createKnowledgeFromWebResearch(
  businessId: string,
  query: string,
  businessHint?: string,
): Promise<{ created: number; titles: string[] } | { error: string }> {
  const snippets = await searchWebSnippets(query, 6);
  const webContext = formatWebSnippetsForPrompt(snippets);

  const synthesis = await generateTextWithFallback({
    businessId,
    callType: "crm_plan",
    preferredProvider: "gemini",
    systemInstruction:
      "Create knowledge base FAQ entries from web research. Reply with valid JSON only.",
    prompt: [
      "Create 3-5 knowledge base entries for this business.",
      businessHint ? `Business hint: ${businessHint}` : "",
      `Research query: ${query}`,
      "",
      "Web snippets:",
      webContext,
      "",
      'Return JSON: {"entries":[{"title":"...","content":"...","category":"FAQ|Services|Pricing|Business Hours"}]}',
    ].join("\n"),
  });

  if (!synthesis.success) {
    return { error: synthesis.error.message };
  }

  const jsonMatch = synthesis.data.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { error: "Не удалось сформировать записи из интернета." };
  }

  let parsed: {
    entries?: Array<{ title?: string; content?: string; category?: string }>;
  };

  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { error: "Некорректный ответ ИИ при создании базы знаний." };
  }

  const entries = (parsed.entries ?? []).slice(0, 5);
  const titles: string[] = [];
  let created = 0;

  for (const entry of entries) {
    const title = entry.title?.trim();
    const content = entry.content?.trim();
    const category = KNOWLEDGE_CATEGORIES.includes(
      entry.category as (typeof KNOWLEDGE_CATEGORIES)[number],
    )
      ? (entry.category as (typeof KNOWLEDGE_CATEGORIES)[number])
      : "FAQ";

    if (!title || !content || content.length < 10) {
      continue;
    }

    const result = await createKnowledgeEntry({
      title,
      content,
      category,
    });

    if (result.success) {
      created += 1;
      titles.push(title);
    }
  }

  if (created === 0) {
    return { error: "Не удалось сохранить записи в базу знаний." };
  }

  return { created, titles };
}

export async function executePlatformCopilotAction(input: {
  mode: PlatformCopilotMode;
  action: unknown;
}): Promise<
  | {
      success: true;
      message: string;
      navigateTo?: string | null;
      navigateLabel?: string | null;
    }
  | { success: false; message: string }
> {
  const parsedInput = executeActionInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return { success: false, message: "Некорректные параметры действия." };
  }

  const actionParsed = copilotActionSchema.safeParse(parsedInput.data.action);

  if (!actionParsed.success) {
    return { success: false, message: "Действие не прошло проверку безопасности." };
  }

  const action = actionParsed.data;

  if (!modeAllowsAction(parsedInput.data.mode, action.type)) {
    return {
      success: false,
      message:
        "Это действие доступно только в режиме «Полный доступ». Переключите режим и подтвердите последствия.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Бизнес не найден." };
  }

  switch (action.type) {
    case "navigate": {
      const path = action.params.path.trim();
      if (!isAllowedCopilotPath(path)) {
        return { success: false, message: "Недопустимый путь навигации." };
      }

      return {
        success: true,
        message: action.summary,
        navigateTo: path,
        navigateLabel: action.label,
      };
    }

    case "setup_calendar": {
      const result = await generateBusinessCalendarFromKnowledge(business.id);

      if (!result.success) {
        return { success: false, message: result.message };
      }

      revalidatePath(DASHBOARD_ROUTES.calendar);

      return {
        success: true,
        message: `Календарь создан: ${result.replacedCount} ресурсов для «${result.setup.businessTypeLabel}».`,
        navigateTo: DASHBOARD_ROUTES.calendar,
        navigateLabel: "Открыть календарь",
      };
    }

    case "create_knowledge_entry": {
      const result = await createKnowledgeEntry(action.params);

      if (!result.success) {
        return { success: false, message: result.error.message };
      }

      revalidatePath(DASHBOARD_ROUTES.knowledgeBase);

      return {
        success: true,
        message: `Запись «${result.data.title}» добавлена в базу знаний.`,
        navigateTo: DASHBOARD_ROUTES.knowledgeBase,
        navigateLabel: "Открыть базу знаний",
      };
    }

    case "delete_knowledge_entry": {
      const result = await deleteKnowledgeEntry(action.params.entryId);

      if (!result.success) {
        return { success: false, message: result.error.message };
      }

      revalidatePath(DASHBOARD_ROUTES.knowledgeBase);

      return {
        success: true,
        message: `Запись «${action.params.title ?? "без названия"}» удалена.`,
      };
    }

    case "delete_contact": {
      const result = await deleteContact({
        contactId: action.params.contactId,
      });

      if (!result.success) {
        return { success: false, message: result.error.message };
      }

      revalidatePath(DASHBOARD_ROUTES.contacts);
      revalidatePath(DASHBOARD_ROUTES.chats);

      return {
        success: true,
        message: `Контакт «${action.params.name ?? "без имени"}» удалён.`,
      };
    }

    case "send_message": {
      const result = await sendChatMessage({
        conversationId: action.params.conversationId,
        content: action.params.content,
        emailSubject: action.params.emailSubject,
      });

      if (!result.success) {
        return { success: false, message: result.error.message };
      }

      revalidatePath(DASHBOARD_ROUTES.chats);

      return {
        success: true,
        message: `Сообщение отправлено${action.params.contactName ? ` — ${action.params.contactName}` : ""}.`,
        navigateTo: DASHBOARD_ROUTES.chats,
        navigateLabel: "Открыть чаты",
      };
    }

    case "toggle_channel_ai": {
      const channel = action.params.channel as IntegrationChannelId;

      if (!isMessagingIntegrationChannel(channel)) {
        return { success: false, message: "Неизвестный канал." };
      }

      const result = await updateChannelAiEnabled(
        channel,
        action.params.enabled,
      );

      if (!result.success) {
        return { success: false, message: result.message ?? "Ошибка канала." };
      }

      revalidatePath(DASHBOARD_ROUTES.aiAssistant);
      revalidatePath(DASHBOARD_ROUTES.integrations);

      return {
        success: true,
        message: `ИИ на канале ${channel} ${action.params.enabled ? "включён" : "выключен"}.`,
      };
    }

    case "web_research_kb": {
      const result = await createKnowledgeFromWebResearch(
        business.id,
        action.params.query,
        action.params.businessHint,
      );

      if ("error" in result) {
        return { success: false, message: result.error };
      }

      revalidatePath(DASHBOARD_ROUTES.knowledgeBase);

      return {
        success: true,
        message: `Создано ${result.created} записей из интернета: ${result.titles.join(", ")}.`,
        navigateTo: DASHBOARD_ROUTES.knowledgeBase,
        navigateLabel: "Открыть базу знаний",
      };
    }

    default:
      return { success: false, message: "Неизвестное действие." };
  }
}
