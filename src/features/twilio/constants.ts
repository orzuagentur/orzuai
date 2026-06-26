import { DASHBOARD_ROUTES } from "@/constants/routes";

export const TWILIO_INTEGRATION_HREF = `${DASHBOARD_ROUTES.integrations}/voice`;

export const TWILIO_MESSAGES = {
  channelLabel: "Twilio",
  connectTitle: "Подключить Twilio",
  connectDescription:
    "Авторизуйте Twilio через официальный Connect — мы автоматически настроим голос, SMS, webhooks и AI Agent.",
  connectButton: "Подключить Twilio",
  selectPhoneTitle: "Выберите номер",
  selectPhoneDescription:
    "Выберите телефонный номер Twilio для входящих и исходящих AI-звонков.",
  noPhoneNumbersTitle: "Номера не найдены",
  noPhoneNumbersDescription:
    "В авторизованном Twilio-аккаунте пока нет номеров. Добавьте номер в Twilio Console и нажмите «Синхронизировать».",
  connectedTitle: "Twilio подключён",
  connectedStatus: "Подключено",
  phoneLabel: "Подключённый номер",
  accountLabel: "Twilio аккаунт",
  lastSyncLabel: "Последняя синхронизация",
  connectedAtLabel: "Дата подключения",
  disconnectButton: "Отключить Twilio",
  disconnectConfirm:
    "Отключить Twilio? Webhooks будут сняты с номера, AI Voice будет выключен.",
  disconnected: "Twilio отключён.",
  resyncButton: "Синхронизировать",
  resyncSuccess: "Настройки Twilio обновлены.",
  resyncFailed: "Не удалось синхронизировать Twilio.",
  saveFailed: "Не удалось сохранить настройки Twilio.",
  oauthSuccess: "Twilio авторизован. Выберите номер телефона.",
  oauthError: "Не удалось подключить Twilio.",
  oauthDenied: "Вы отменили авторизацию Twilio.",
  notConfiguredTitle: "Twilio Connect не настроен на платформе",
  notConfiguredDescription:
    "Администратору нужно указать TWILIO_CONNECT_APP_SID и платформенные ключи Twilio.",
  authorizeRedirectLabel: "Authorize URL (Twilio Console)",
  deauthorizeRedirectLabel: "Deauthorize URL (Twilio Console)",
  notAuthorized: "Сначала подключите Twilio.",
  notConnected: "Twilio ещё не подключён полностью.",
  phoneNotFound: "Выбранный номер больше недоступен.",
  webhookSetupFailed:
    "Не удалось настроить webhooks на номере. Проверьте права Twilio Connect.",
  accountVerifyFailed:
    "Не удалось проверить Twilio-аккаунт. Попробуйте подключиться снова.",
  invalidAccountSid: "Некорректный Twilio Account SID.",
  noBusiness: "Сначала создайте бизнес в настройках.",
  selectPhoneButton: "Использовать этот номер",
  connectNote:
    "Секретные ключи хранятся только на сервере OrzuAI. Вы проходите официальную авторизацию Twilio Connect.",
} as const;
