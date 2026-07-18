import { DASHBOARD_ROUTES } from "@/constants/routes";

export const TWILIO_INTEGRATION_HREF = `${DASHBOARD_ROUTES.integrations}/voice`;
export const SMS_INTEGRATION_HREF = `${DASHBOARD_ROUTES.integrations}/sms`;

export const TWILIO_MESSAGES = {
  channelLabel: "Voice",
  callsLabel: "Calls",
  smsLabel: "SMS",
  buyNumberTitle: "Купить номер OrzuX",
  buyNumberDescription:
    "Номер покупается на телефонии OrzuX и сразу подключается к ИИ. Оплата — через вашу подписку Stripe.",
  buyNumberSuccess: "Номер OrzuX куплен и подключён.",
  purchaseNumberFailed:
    "Не удалось купить номер. Проверьте Geo Permissions и баланс platform Twilio OrzuX.",
  searchNumbersFailed: "Не удалось найти доступные номера.",
  listNumbersFailed: "Не удалось получить список номеров из Twilio.",
  platformKeysMissing:
    "Платформенные ключи Twilio не настроены (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN). Обратитесь в поддержку OrzuX.",
  refreshSuccess: "Список номеров обновлён.",
  refreshFailed: "Не удалось обновить список номеров.",
  disconnectButton: "Отключить номер OrzuX",
  disconnected: "Номер OrzuX отключён.",
  resyncSuccess: "Настройки номера обновлены.",
  resyncFailed: "Не удалось синхронизировать номер.",
  saveFailed: "Не удалось сохранить настройки.",
  notAuthorized: "Сначала получите номер OrzuX.",
  notConnected: "Номер OrzuX ещё не подключён.",
  phoneNotFound: "Выбранный номер больше недоступен.",
  webhookSetupFailed:
    "Не удалось настроить webhooks на номере. Проверьте права platform Twilio.",
  oldWebhookCleanupFailed:
    "Новый номер настроен, но не удалось снять webhooks со старого номера.",
  noBusiness: "Сначала создайте бизнес в настройках.",
} as const;
