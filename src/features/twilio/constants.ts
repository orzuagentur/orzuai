import { DASHBOARD_ROUTES } from "@/constants/routes";

export const TWILIO_INTEGRATION_HREF = `${DASHBOARD_ROUTES.integrations}/voice`;
export const SMS_INTEGRATION_HREF = `${DASHBOARD_ROUTES.integrations}/sms`;

export const TWILIO_MESSAGES = {
  channelLabel: "Twilio",
  callsLabel: "Calls",
  smsLabel: "SMS",
  connectTitle: "Connect Twilio for Calls",
  connectDescription:
    "Authorize Twilio to enable AI phone line, inbound and outbound calls.",
  connectButton: "Подключить Twilio",
  selectPhoneTitle: "Выберите номер",
  selectPhoneDescription:
    "Choose a Twilio number for voice calls. OrzuX configures webhooks automatically.",
  numberPickerTitle: "Номера в подключённом Twilio аккаунте",
  numberPickerDescription:
    "Выберите номер, который должен принимать входящие звонки и SMS в OrzuX. Покупать новый номер нужно только если в аккаунте нет подходящего номера.",
  changeNumberButton: "Сменить номер",
  hideNumberPickerButton: "Скрыть выбор номера",
  currentNumberLabel: "Текущий номер",
  noPhoneNumbersTitle: "Номера не найдены в подключённом аккаунте",
  noPhoneNumbersDescription:
    "Нажмите «Обновить список», чтобы заново получить номера из Twilio. Если номеров нет, можно купить новый номер через OrzuX.",
  buyNumberTitle: "Купить номер через OrzuAI",
  buyNumberDescription:
    "Номер будет куплен в вашем авторизованном Twilio-аккаунте и сразу подключён к AI Voice.",
  buyNumberCountryLabel: "Страна",
  buyNumberAreaCodeLabel: "Код региона (необязательно)",
  buyNumberSearchButton: "Найти номера",
  buyNumberPurchaseButton: "Купить и подключить",
  buyNumberSearching: "Поиск…",
  buyNumberPurchasing: "Покупка…",
  buyNumberSuccess: "Номер куплен и подключён.",
  purchaseNumberFailed: "Не удалось купить номер. Проверьте баланс Twilio и права Connect.",
  searchNumbersFailed: "Не удалось найти доступные номера.",
  listNumbersFailed: "Не удалось получить список номеров из Twilio.",
  platformKeysMissing:
    "Платформенные ключи Twilio не настроены. Обратитесь в поддержку OrzuAI.",
  refreshButton: "Обновить список",
  refreshSuccess: "Список номеров обновлён.",
  refreshFailed: "Не удалось обновить список номеров.",
  autoConnectedSingleNumber: "Twilio подключён — единственный номер выбран автоматически.",
  connectedTitle: "Twilio подключён",
  connectedStatus: "Подключено",
  phoneLabel: "Подключённый номер",
  accountLabel: "Twilio аккаунт",
  lastSyncLabel: "Последняя синхронизация",
  connectedAtLabel: "Дата подключения",
  numberSettingsTitle: "Настройки номера",
  numberSettingsUnavailable: "Настройки Twilio пока недоступны.",
  numberSettingsOk: "OK",
  numberSettingsWarning: "Проверить",
  numberSettingsError: "Ошибка",
  connectedAccountSidLabel: "Подключённый аккаунт",
  platformAccountSidLabel: "Platform Browser Phone аккаунт",
  selectedPhoneSidLabel: "Phone Number SID",
  browserTwimlAppSidLabel: "Browser Phone TwiML App SID",
  selectedNumberWebhooksTitle: "Webhooks выбранного номера",
  browserAppWebhooksTitle: "Browser Phone TwiML App",
  errorLogTitle: "Лог ошибок Twilio",
  noTwilioErrors: "Связанных ошибок Twilio не найдено.",
  mismatchLabel: "Не совпадает",
  expectedLabel: "Ожидается",
  requestUrlLabel: "Request URL",
  responseBodyLabel: "Response body",
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
  oldWebhookCleanupFailed:
    "Новый номер настроен, но не удалось снять webhooks со старого номера. Нажмите «Синхронизировать» или проверьте права Twilio.",
  accountVerifyFailed:
    "Не удалось проверить Twilio-аккаунт. Попробуйте подключиться снова.",
  invalidAccountSid: "Некорректный Twilio Account SID.",
  noBusiness: "Сначала создайте бизнес в настройках.",
  selectPhoneButton: "Использовать этот номер",
  connectNote:
    "Секретные ключи хранятся только на сервере OrzuAI. Вы проходите официальную авторизацию Twilio Connect.",
} as const;
