import {
  copilotAgentResponseSchema,
  copilotActionSchema,
  type CopilotAgentResponse,
  type CopilotProposedAction,
} from "@/types/platform-copilot.types";
import { isAllowedCopilotPath } from "@/lib/platform-copilot/parse-copilot-response";

function parseJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      return null;
    }

    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
}

function normalizeAction(action: CopilotProposedAction, index: number): CopilotProposedAction | null {
  const withId = {
    ...action,
    id: action.id?.trim() || `action-${index + 1}`,
  };

  if (withId.type === "navigate") {
    const path = withId.params.path.trim();
    if (!isAllowedCopilotPath(path)) {
      return null;
    }
  }

  const parsed = copilotActionSchema.safeParse(withId);
  return parsed.success ? parsed.data : null;
}

export function parseCopilotAgentResponse(raw: string): CopilotAgentResponse {
  const parsed = parseJsonObject(raw);

  if (!parsed) {
    return {
      reply: raw.trim() || "Не удалось разобрать ответ.",
      quickReplies: [],
      actions: [],
    };
  }

  const validated = copilotAgentResponseSchema.safeParse(parsed);

  if (!validated.success) {
    const reply =
      typeof (parsed as { reply?: unknown }).reply === "string"
        ? (parsed as { reply: string }).reply
        : raw.trim();

    return {
      reply,
      quickReplies: [],
      actions: [],
    };
  }

  const actions = (validated.data.actions ?? [])
    .map((action, index) => normalizeAction(action, index))
    .filter((action): action is CopilotProposedAction => action !== null);

  return {
    reply: validated.data.reply,
    quickReplies: validated.data.quickReplies ?? [],
    actions,
  };
}
