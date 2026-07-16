import { getPlatformPromptContent } from "@/services/platform-prompts.service";
import { parseGuardFallbackPrompt } from "@orzu/platform-ai";

const BOOKING_OR_ORDER_PATTERNS = [
  /\b(book|booking|reserve|reservation|appointment|schedule|order|check[- ]?in|check[- ]?out|room|table|slot)\b/i,
  /\b(брон|заброн|брони|резерв|запис|заказ|номер|комнат|столик|заезд|выезд|свободн)\b/i,
  /\b(bron|band|xona|stol|buyurtma|navbat|uchrashuv)\b/i,
];

function getFallbackByLanguage(): Record<string, string> {
  return parseGuardFallbackPrompt(getPlatformPromptContent("guard_fallback"));
}

export function isLikelyBookingOrOrderMessage(message: string): boolean {
  const trimmed = message.trim();

  if (!trimmed) {
    return false;
  }

  return BOOKING_OR_ORDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function resolveActionFallbackReplyMessage(input: {
  language: string;
  clientMessage?: string | null;
}): string | null {
  if (!isLikelyBookingOrOrderMessage(input.clientMessage ?? "")) {
    return null;
  }

  const language = input.language.trim().toLowerCase();

  if (language.includes("russian") || language === "ru") {
    return "Проверяю доступность и оформляю бронь по вашим данным. Если выбранный вариант недоступен, сразу предложу ближайший свободный.";
  }

  if (language.includes("uzbek") || language === "uz") {
    return "Ma'lumotlaringiz bo'yicha mavjud vaqtni tekshiryapman va bronni rasmiylashtiryapman. Agar tanlangan vaqt band bo'lsa, eng yaqin bo'sh variantni taklif qilaman.";
  }

  return "I am checking availability and creating the booking from your details now. If the selected option is unavailable, I will offer the nearest open slot.";
}

function isGenericWaitingFallback(message: string): boolean {
  return [
    /help you right here in (this )?chat/i,
    /checking this and will help/i,
    /помогу[\s\S]{0,80}(здесь|чате|чат)/i,
    /проверяю[\s\S]{0,80}помогу/i,
    /shu yerda yordam beraman/i,
  ].some((pattern) => pattern.test(message));
}

export function resolveAssistantFallbackReplyMessage(input: {
  language: string;
  clientMessage?: string | null;
  customMessage?: string | null;
}): string {
  const actionFallback = resolveActionFallbackReplyMessage({
    language: input.language,
    clientMessage: input.clientMessage,
  });

  if (actionFallback) {
    return actionFallback;
  }

  const custom = input.customMessage?.trim();

  if (custom && !isGenericWaitingFallback(custom)) {
    return custom;
  }

  const language = input.language.trim();
  const FALLBACK_BY_LANGUAGE = getFallbackByLanguage();

  return (
    FALLBACK_BY_LANGUAGE[language] ??
    FALLBACK_BY_LANGUAGE.English ??
    "I am checking the details now and will respond with the next step."
  );
}
