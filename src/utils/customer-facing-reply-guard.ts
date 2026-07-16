export const DEFAULT_CUSTOMER_REPLY_FALLBACK =
  "I can help with that right here. What exact detail should I handle next?";

const MAX_CUSTOMER_REPLY_LENGTH = 4000;

const INTERNAL_REPLY_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bbusiness instructions?\b/i, reason: "business_instructions" },
  { pattern: /\bsystem (prompt|message|instruction|instructions)\b/i, reason: "system_prompt" },
  { pattern: /\bdeveloper (prompt|message|instruction|instructions)\b/i, reason: "developer_prompt" },
  { pattern: /\bhidden (prompt|message|instruction|instructions)\b/i, reason: "hidden_prompt" },
  { pattern: /\binternal (prompt|message|instructions?|note|notes)\b/i, reason: "internal_content" },
  { pattern: /\bdo not reveal\b/i, reason: "policy_leak" },
  { pattern: /\bignore (all )?(previous|prior|above) instructions?\b/i, reason: "prompt_injection" },
  { pattern: /\bchain[- ]of[- ]thought\b/i, reason: "reasoning_leak" },
  { pattern: /\btool[_ -]?call\b/i, reason: "tool_call" },
  { pattern: /\bfunction[_ -]?call\b/i, reason: "function_call" },
  { pattern: /\brole\s*:\s*(system|developer|assistant|tool)\b/i, reason: "role_marker" },
  { pattern: /"role"\s*:\s*"(system|developer|tool)"/i, reason: "role_json" },
  { pattern: /\bsystemPrompt\b/i, reason: "system_prompt_key" },
  { pattern: /\bconversation_id\b/i, reason: "internal_identifier" },
  { pattern: /\bbusiness_id\b/i, reason: "internal_identifier" },
  { pattern: /\bclientSummary\b/i, reason: "orchestrator_schema" },
  { pattern: /\bactionsApplied\b/i, reason: "orchestrator_schema" },
  { pattern: /\borchestrator\b/i, reason: "orchestrator_leak" },
  { pattern: /\bdebug\b.*\b(json|payload|trace)\b/i, reason: "debug_payload" },
  { pattern: /^```/i, reason: "code_fence" },
  { pattern: /<\/?(system|developer|tool)>/i, reason: "xml_role_marker" },
  { pattern: /\b(will|shall|i['\u2019]ll|we['\u2019]ll)\b.*\b(contact|connect|transfer|escalate|notify|forward|pass|send|share|ask)\b.*\b(you|manager|team|staff|human|owner)\b/i, reason: "delegation_promise" },
  { pattern: /\b(will|shall|i['\u2019]ll|we['\u2019]ll)\b.*\b(check|verify|confirm)\b.*\b(with )?(manager|team|staff|owner|human)\b/i, reason: "manager_callback" },
  { pattern: /\b(team member|manager|human agent|real person|staff|owner)\b.*\b(will|shall)\b/i, reason: "delegation_promise" },
  { pattern: /(передам|передаю|передал|перешлю|сообщу|уведомлю)[\s\S]{0,140}(менеджер|менеджеру|администратор|сотрудник|специалист|команд[аеуы])/i, reason: "delegation_promise" },
  { pattern: /(менеджер|администратор|сотрудник|специалист)[\s\S]{0,140}(проверит|подтвердит|свяжется|ответит|сообщит)/i, reason: "manager_callback" },
  { pattern: /ожидайте[\s\S]{0,120}(ответ|провер|менеджер|администратор|сотрудник|специалист)/i, reason: "manager_callback" },
];

function normalizeCustomerFacingText(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n");
}

function looksLikeInternalStructuredPayload(text: string): boolean {
  const trimmed = text.trim();

  if (!/^[{[]/.test(trimmed)) {
    return false;
  }

  return [
    "systemPrompt",
    "conversation_id",
    "business_id",
    "actionsApplied",
    "clientSummary",
    "toolCall",
    "function_call",
  ].some((key) => trimmed.includes(key));
}

export type CustomerFacingReplyValidation =
  | { safe: true; text: string }
  | { safe: false; reason: string };

export function validateCustomerFacingReply(
  value: string | null | undefined,
): CustomerFacingReplyValidation {
  const text = normalizeCustomerFacingText(value ?? "");

  if (!text) {
    return { safe: false, reason: "empty" };
  }

  if (looksLikeInternalStructuredPayload(text)) {
    return { safe: false, reason: "internal_structured_payload" };
  }

  for (const { pattern, reason } of INTERNAL_REPLY_PATTERNS) {
    if (pattern.test(text)) {
      return { safe: false, reason };
    }
  }

  return {
    safe: true,
    text:
      text.length > MAX_CUSTOMER_REPLY_LENGTH
        ? text.slice(0, MAX_CUSTOMER_REPLY_LENGTH).trim()
        : text,
  };
}

export function sanitizeCustomerFacingReply(
  value: string | null | undefined,
  options?: { fallback?: string | null },
): { text: string | null; blocked: boolean; reason?: string } {
  const validation = validateCustomerFacingReply(value);

  if (validation.safe) {
    return { text: validation.text, blocked: false };
  }

  return {
    text:
      options?.fallback === undefined
        ? DEFAULT_CUSTOMER_REPLY_FALLBACK
        : options.fallback,
    blocked: true,
    reason: validation.reason,
  };
}
