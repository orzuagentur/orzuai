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
  noPhoneNumbersTitle: "Номера не найдены в подключённом аккаунте",
  noPhoneNumbersDescription:
    "Twilio Connect создаёт отдельный авторизованный аккаунт. Номера из основной Twilio Console могут здесь не отображаться — купите номер через OrzuAI или нажмите «Обновить список».",
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
