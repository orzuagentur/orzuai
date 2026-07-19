export const COOKIE_CONSENT_STORAGE_KEY = "orzux-cookie-consent-v2";

export type CookieCategoryId = "necessary" | "analytics" | "preferences";

export type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  preferences: boolean;
};

export type StoredCookieConsent = {
  version: 2;
  at: string;
  preferences: CookiePreferences;
};

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  preferences: false,
};

export const COOKIE_CATEGORY_COPY: Record<
  CookieCategoryId,
  { title: string; description: string; locked?: boolean }
> = {
  necessary: {
    title: "Necessary",
    description:
      "Required for sign-in, security, and basic site function. Always on.",
    locked: true,
  },
  analytics: {
    title: "Analytics",
    description:
      "Helps us understand product usage (Google Analytics). Only if you allow it.",
  },
  preferences: {
    title: "Preferences",
    description:
      "Remembers UI choices such as locale and layout on this device.",
  },
};

export function readCookieConsent(): StoredCookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCookieConsent;
    if (parsed?.version !== 2 || !parsed.preferences) return null;
    return {
      version: 2,
      at: parsed.at,
      preferences: {
        necessary: true,
        analytics: Boolean(parsed.preferences.analytics),
        preferences: Boolean(parsed.preferences.preferences),
      },
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(
  preferences: CookiePreferences,
): StoredCookieConsent {
  const payload: StoredCookieConsent = {
    version: 2,
    at: new Date().toISOString(),
    preferences: {
      necessary: true,
      analytics: Boolean(preferences.analytics),
      preferences: Boolean(preferences.preferences),
    },
  };
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(
    new CustomEvent("orzux-cookie-consent", { detail: payload }),
  );
  return payload;
}

export function hasAnalyticsConsent(
  consent: StoredCookieConsent | null = readCookieConsent(),
): boolean {
  return Boolean(consent?.preferences.analytics);
}

export function applyAnalyticsConsent(enabled: boolean) {
  if (typeof window === "undefined") return;

  const w = window as Window & {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  };

  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== "function") {
    w.gtag = function gtag(...args: unknown[]) {
      w.dataLayer?.push(args);
    };
  }

  // Google Consent Mode v2 — deny by default unless the user opted in.
  w.gtag("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: enabled ? "granted" : "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  });

  if (enabled) {
    w.gtag("event", "consent_analytics_granted");
  }
}
