export const LANDING_LOCALES = ["en", "ru", "uz"] as const;

export type LandingLocale = (typeof LANDING_LOCALES)[number];

export function isLandingLocale(value: string | null | undefined): value is LandingLocale {
  return value === "en" || value === "ru" || value === "uz";
}

export function resolveLandingLocale(
  value: string | null | undefined,
): LandingLocale {
  return isLandingLocale(value) ? value : "en";
}

type LandingCopy = {
  tagline: string;
  subtitle: string;
  startButton: string;
  heroBadge: string;
  header: {
    login: string;
    startFree: string;
    bookDemo: string;
  };
  product: {
    title: string;
    subtitle: string;
  };
  comparison: {
    title: string;
    subtitle: string;
  };
  faqTitle: string;
};

export const LANDING_I18N: Record<LandingLocale, LandingCopy> = {
  en: {
    tagline: "The AI inbox for WhatsApp, Instagram, Telegram, and your website.",
    subtitle:
      "Unify customer conversations, automate replies with AI trained on your business knowledge, and grow faster — all from one dashboard.",
    startButton: "START",
    heroBadge: "AI inbox for WhatsApp, Instagram & Telegram",
    header: {
      login: "Log in",
      startFree: "Start free",
      bookDemo: "Book a demo",
    },
    product: {
      title: "One dashboard for every conversation",
      subtitle:
        "Inbox, CRM, AI replies, and channel analytics — without switching between apps.",
    },
    comparison: {
      title: "Why teams switch to OrzuAI",
      subtitle:
        "ManyChat and Intercom are great at one channel or one use case. OrzuAI unifies messaging + CRM + AI in one place.",
    },
    faqTitle: "Frequently asked questions",
  },
  ru: {
    tagline: "AI-инбокс для WhatsApp, Instagram, Telegram и вашего сайта.",
    subtitle:
      "Объедините переписки с клиентами, автоматизируйте ответы с AI на базе знаний о бизнесе и растите быстрее — из одной панели.",
    startButton: "НАЧАТЬ",
    heroBadge: "AI-инбокс для WhatsApp, Instagram и Telegram",
    header: {
      login: "Войти",
      startFree: "Начать бесплатно",
      bookDemo: "Записаться на демо",
    },
    product: {
      title: "Одна панель для всех диалогов",
      subtitle:
        "Инбокс, CRM, AI-ответы и аналитика по каналам — без переключения между приложениями.",
    },
    comparison: {
      title: "Почему команды переходят на OrzuAI",
      subtitle:
        "ManyChat и Intercom сильны в одном канале или сценарии. OrzuAI объединяет мессенджеры, CRM и AI в одном месте.",
    },
    faqTitle: "Частые вопросы",
  },
  uz: {
    tagline: "WhatsApp, Instagram, Telegram va saytingiz uchun AI inbox.",
    subtitle:
      "Mijozlar bilan suhbatlarni birlashtiring, biznes bilimingiz asosida AI javoblarni avtomatlashtiring va bitta paneldan tezroq o'sing.",
    startButton: "BOSHLASH",
    heroBadge: "WhatsApp, Instagram va Telegram uchun AI inbox",
    header: {
      login: "Kirish",
      startFree: "Bepul boshlash",
      bookDemo: "Demo bron qilish",
    },
    product: {
      title: "Har bir suhbat uchun bitta panel",
      subtitle:
        "Inbox, CRM, AI javoblar va kanal analitikasi — ilovalar o'rtasida almashmasdan.",
    },
    comparison: {
      title: "Nima uchun jamoalar OrzuAI ga o'tadi",
      subtitle:
        "ManyChat va Intercom bitta kanal yoki vazifada yaxshi. OrzuAI xabarlar, CRM va AI ni bir joyga birlashtiradi.",
    },
    faqTitle: "Ko'p beriladigan savollar",
  },
};

export const LANDING_LOCALE_LABELS: Record<LandingLocale, string> = {
  en: "EN",
  ru: "RU",
  uz: "UZ",
};
