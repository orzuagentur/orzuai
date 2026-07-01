export function resolveElevenLabsLanguageCode(
  language: string,
): string | undefined {
  const normalized = language.trim().toLowerCase();

  if (
    normalized.startsWith("uk") ||
    normalized.includes("ukrain") ||
    normalized === "українська"
  ) {
    return "uk";
  }

  if (
    normalized.startsWith("ru") ||
    normalized === "russian" ||
    normalized === "русский"
  ) {
    return "ru";
  }

  if (
    normalized.startsWith("uz") ||
    normalized === "uzbek" ||
    normalized.includes("o'zbek")
  ) {
    return "uz";
  }

  if (normalized.startsWith("de") || normalized.includes("german")) {
    return "de";
  }

  if (normalized.startsWith("es") || normalized.includes("spanish")) {
    return "es";
  }

  if (normalized.startsWith("en") || normalized === "english") {
    return "en";
  }

  return undefined;
}

export type VoicePhonePrompts = {
  repeat: string;
  goodbye: string;
  outboundReprompt: string;
  inboundReprompt: string;
  error: string;
  handoffHold: string;
};

export function getVoicePhonePrompts(language: string): VoicePhonePrompts {
  const code = resolveElevenLabsLanguageCode(language);

  switch (code) {
    case "uk":
      return {
        repeat: "Я вас не почув. Будь ласка, повторіть.",
        goodbye: "Дякуємо за дзвінок. До побачення.",
        outboundReprompt:
          "Скажіть, будь ласка, якщо у вас є запитання щодо вашого замовлення.",
        inboundReprompt: "Чим я можу вам допомогти?",
        error: "Вибачте, сталася помилка. Спробуйте пізніше.",
        handoffHold: "Зачекайте, я з'єдную вас із оператором.",
      };
    case "ru":
      return {
        repeat: "Я вас не расслышал. Пожалуйста, повторите.",
        goodbye: "Спасибо за звонок. До свидания.",
        outboundReprompt:
          "Скажите, пожалуйста, если у вас есть вопросы по вашему заказу.",
        inboundReprompt: "Чем я могу вам помочь?",
        error: "Извините, произошла ошибка. Попробуйте позже.",
        handoffHold: "Подождите, я соединяю вас с оператором.",
      };
    case "de":
      return {
        repeat: "Ich habe Sie nicht verstanden. Bitte wiederholen Sie das.",
        goodbye: "Vielen Dank für Ihren Anruf. Auf Wiederhören.",
        outboundReprompt:
          "Bitte sagen Sie Bescheid, wenn Sie Fragen zu Ihrer Bestellung haben.",
        inboundReprompt: "Wie kann ich Ihnen helfen?",
        error: "Entschuldigung, es ist ein Fehler aufgetreten.",
        handoffHold: "Bitte warten Sie, ich verbinde Sie mit einem Mitarbeiter.",
      };
    case "es":
      return {
        repeat: "No le he entendido. Por favor, repita.",
        goodbye: "Gracias por llamar. Hasta luego.",
        outboundReprompt:
          "Dígame si tiene alguna pregunta sobre su pedido.",
        inboundReprompt: "¿En qué puedo ayudarle?",
        error: "Lo sentimos, ha ocurrido un error.",
        handoffHold: "Espere, le conecto con un miembro del equipo.",
      };
    case "uz":
      return {
        repeat: "Sizni eshitmadim. Iltimos, takrorlang.",
        goodbye: "Qo'ng'iroq uchun rahmat. Xayr.",
        outboundReprompt: "Buyurtmangiz bo'yicha savollaringiz bo'lsa, ayting.",
        inboundReprompt: "Sizga qanday yordam bera olaman?",
        error: "Kechirasiz, xatolik yuz berdi.",
        handoffHold: "Kuting, sizni operator bilan bog'layman.",
      };
    default:
      return {
        repeat: "I did not hear you. Could you please repeat that?",
        goodbye: "Thank you for calling. Goodbye.",
        outboundReprompt:
          "Please tell me if you have any questions about your request.",
        inboundReprompt: "How can I help you today?",
        error: "Sorry, something went wrong. Please try again later.",
        handoffHold: "Please hold while I connect you with a team member.",
      };
  }
}
