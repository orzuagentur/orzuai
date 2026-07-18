import { DASHBOARD_ROUTES } from "@/constants/routes";

export const TWILIO_INTEGRATION_HREF = `${DASHBOARD_ROUTES.integrations}/voice`;
export const SMS_INTEGRATION_HREF = `${DASHBOARD_ROUTES.integrations}/sms`;

export const TWILIO_MESSAGES = {
  channelLabel: "Twilio",
  callsLabel: "Calls",
  smsLabel: "SMS",
  connectTitle: "Connect Twilio for Calls",
  connectDescription:
    "Выберите способ: OrzuX одной кнопкой, или свой Twilio-аккаунт с ключами.",
  connectButton: "Подключить через OrzuX",
  connectTabOrzuLabel: "OrzuX",
  connectTabOwnLabel: "Свой аккаунт",
  connectOrzuTitle: "Подключение через OrzuX",
  connectOrzuDescription:
    "Одна кнопка. OrzuX сам настроит webhooks и хранит служебные ключи платформы. После авторизации списание идёт на ваш Twilio.",
  connectOrzuNote:
    "Рекомендуется для большинства бизнесов. Номера остаются в вашем Twilio; OrzuX управляет маршрутизацией звонков и SMS.",
  connectOrzuUnavailableTitle: "OrzuX Connect пока не готов на платформе",
  connectOrzuUnavailableDescription:
    "Нужны TWILIO_CONNECT_APP_SID, TWILIO_ACCOUNT_SID и TWILIO_AUTH_TOKEN платформы. Пока можно подключить свой аккаунт на вкладке «Свой аккаунт».",
  connectOwnTitle: "Подключить свой Twilio",
  connectOwnDescription:
    "Вставьте Account SID, API Key и Auth Token. Секреты шифруются и хранятся только на сервере OrzuX.",
  connectNote:
    "One-click Twilio Connect. Usage is charged to your Twilio account and card. Numbers are managed in your Connect workspace inside Twilio.",
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
  buyNumberTitle: "Купить номер через OrzuX",
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
    "Платформенные ключи Twilio не настроены. Обратитесь в поддержку OrzuX.",
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
  manualConnectTitle: "Полное подключение (API Key)",
  manualConnectDescription:
    "Account SID, API Key и Auth Token — SMS, AI-звонки и Browser Phone из панели OrzuX.",
  manualServerConnectTitle: "Только сервер (Auth Token)",
  manualServerConnectDescription:
    "Account SID + Auth Token — SMS и AI-звонки без Browser Phone.",
  manualConnectAccountSidLabel: "Account SID",
  manualConnectApiKeySidLabel: "API Key SID",
  manualConnectApiKeySecretLabel: "API Key Secret",
  manualConnectButton: "Подключить свой Twilio",
  manualServerConnectButton: "Подключить без Browser Phone",
  manualConnectConnecting: "Проверка…",
  manualConnectSuccess: "Twilio подключён по API Key. Выберите номер.",
  manualServerConnectSuccess: "Twilio подключён (серверный режим). Выберите номер.",
  manualConnectSecurityNote:
    "Секреты шифруются и хранятся только на сервере OrzuX. Auth Token обязателен для проверки webhook-подписей Twilio. Используйте Standard API Key (не Restricted).",
  manualServerConnectSecurityNote:
    "Auth Token шифруется и хранится только на сервере OrzuX. Для звонков из панели используйте полное подключение с API Key.",
  manualConnectHelpLink: "Как создать API Key в Twilio",
  invalidApiKeySid: "Некорректный API Key SID (должен начинаться с SK).",
  invalidApiKeySecret: "API Key Secret слишком короткий.",
  apiKeyConnectFailed: "Не удалось подключить Twilio по API Key. Проверьте данные и права ключа.",
  authTokenConnectFailed:
    "Не удалось подключить Twilio. Проверьте Account SID и Auth Token.",
  apiKeyAccountMismatch: "API Key не принадлежит указанному Account SID.",
  apiKeySecretStoreFailed: "Не удалось сохранить API Key Secret.",
  manualConnectAuthTokenLabel: "Auth Token",
  invalidAuthToken: "Twilio Auth Token is invalid or too short.",
  authTokenAccountMismatch: "Twilio Auth Token does not belong to the selected Account SID.",
  authTokenStoreFailed: "Unable to store Twilio Auth Token securely.",
  browserPhoneProvisionFailed:
    "Browser Phone не настроен (для OrzuX Connect нужны платформенные TWILIO_API_KEY_*). AI-звонки и номер всё равно работают.",
  authModeConnectLabel: "OrzuX Connect",
  authModeApiKeyLabel: "Свой аккаунт (API Key)",
  authModeAuthTokenLabel: "Свой аккаунт (Auth Token)",
} as const;
