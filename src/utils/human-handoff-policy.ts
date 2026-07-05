import type { OrchestratorResponse } from "@/types/ai-orchestrator.types";

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

const EXPLICIT_HUMAN_REQUEST_PATTERN =
  /\b(connect me to (a )?(manager|human|person)|talk to (a )?(manager|human|person)|speak to (a )?(manager|human|person)|call the manager|get me a manager|позовите менеджера|позвать менеджера|подключите к менеджеру|переключите на менеджера|menejerni chaqiring)\b/i;

const STRONG_HANDOFF_CONFIRMATION_PATTERN =
  /\b(yes|yeah|yep|ok|okay|sure|please|connect me|do it|давай|да|конечно|хорошо|ага|подключ|позов|переключ|menejer|ha|bo'pti)\b/i;

const MANAGER_HANDOFF_MESSAGE_PATTERNS = [
  /\bnotified\b.*\b(team|manager)\b/i,
  /\bmanager\b.*\b(join|connect)\b/i,
  /\bпередал\b.*\bменеджер/i,
  /\bпередал\b.*\bзапрос/i,
  /\bmenejerga yetkazdim\b/i,
  /\bhuman\b.*\b(join|take over)\b/i,
  /\bescalat/i,
  /\bпереключил\b/i,
];

export type ManagerHandoffPlan = {
  notifyManager: boolean;
  tellCustomerConfirmed: boolean;
  reason: string;
};

function normalizeOrchestratorHandoff(
  orchestration: OrchestratorResponse,
): Pick<OrchestratorResponse, "managerAlert" | "handoffConfirmed" | "humanReason"> {
  const managerAlert =
    orchestration.managerAlert ||
    (orchestration.needsHuman === true && orchestration.handoffConfirmed !== true);

  const handoffConfirmed = orchestration.handoffConfirmed === true;

  return {
    managerAlert,
    handoffConfirmed,
    humanReason: orchestration.humanReason,
  };
}

export function customerExplicitlyRequestedHuman(message: string): boolean {
  return EXPLICIT_HUMAN_REQUEST_PATTERN.test(message.trim());
}

export function customerConfirmedHumanHandoff(
  message: string,
  conversationHistory: ConversationTurn[],
): boolean {
  const trimmed = message.trim();

  if (!trimmed) {
    return false;
  }

  if (
    STRONG_HANDOFF_CONFIRMATION_PATTERN.test(trimmed) &&
    conversationHistory.some(
      (turn) =>
        turn.role === "assistant" &&
        /\b(manager|менеджер|team member|menejer|человек|person)\b/i.test(
          turn.content,
        ),
    )
  ) {
    return true;
  }

  if (
    /\b(connect me|подключите|позовите менеджера|call the manager|menejerni chaqiring)\b/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  return false;
}

export function looksLikeManagerHandoffCustomerMessage(text: string): boolean {
  const normalized = text.trim();

  if (!normalized) {
    return false;
  }

  return MANAGER_HANDOFF_MESSAGE_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

export function resolveManagerHandoffPlan(input: {
  orchestration: OrchestratorResponse;
  clientMessage: string;
  conversationHistory: ConversationTurn[];
}): ManagerHandoffPlan {
  const handoff = normalizeOrchestratorHandoff(input.orchestration);
  const reason =
    handoff.humanReason?.trim() || "Customer needs a real person";

  const confirmed =
    handoff.handoffConfirmed ||
    customerConfirmedHumanHandoff(
      input.clientMessage,
      input.conversationHistory,
    );

  const silentAlert =
    handoff.managerAlert && !confirmed;

  if (confirmed) {
    return {
      notifyManager: true,
      tellCustomerConfirmed: true,
      reason,
    };
  }

  if (silentAlert) {
    return {
      notifyManager: true,
      tellCustomerConfirmed: false,
      reason,
    };
  }

  return {
    notifyManager: false,
    tellCustomerConfirmed: false,
    reason,
  };
}
