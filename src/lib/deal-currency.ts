export const DEAL_CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "UZS", label: "UZS — Uzbek Som" },
  { code: "RUB", label: "RUB — Russian Ruble" },
  { code: "KZT", label: "KZT — Kazakh Tenge" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "TRY", label: "TRY — Turkish Lira" },
] as const;

export type DealCurrencyCode = (typeof DEAL_CURRENCIES)[number]["code"];

const DEAL_CURRENCY_CODES = new Set<string>(
  DEAL_CURRENCIES.map((entry) => entry.code),
);

export function normalizeDealCurrency(
  value: string | null | undefined,
): DealCurrencyCode {
  const normalized = value?.trim().toUpperCase();

  if (normalized && DEAL_CURRENCY_CODES.has(normalized)) {
    return normalized as DealCurrencyCode;
  }

  return "USD";
}

export function formatDealMoney(
  value: number | null,
  currency: string = "USD",
): string {
  if (value === null) {
    return "—";
  }

  const code = normalizeDealCurrency(currency);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: code === "UZS" || code === "KZT" ? 0 : 2,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString()}`;
  }
}
