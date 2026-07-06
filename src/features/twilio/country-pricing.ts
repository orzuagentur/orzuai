export type TwilioCountryPricing = {
  code: string;
  label: string;
  /** Platform monthly price in USD cents (billed via Stripe). */
  monthlyPriceCents: number;
};

export const TWILIO_COUNTRY_PRICING: TwilioCountryPricing[] = [
  { code: "US", label: "United States", monthlyPriceCents: 150 },
  { code: "DE", label: "Germany", monthlyPriceCents: 250 },
  { code: "GB", label: "United Kingdom", monthlyPriceCents: 200 },
  { code: "CA", label: "Canada", monthlyPriceCents: 150 },
  { code: "AU", label: "Australia", monthlyPriceCents: 200 },
  { code: "FR", label: "France", monthlyPriceCents: 250 },
  { code: "NL", label: "Netherlands", monthlyPriceCents: 220 },
  { code: "ES", label: "Spain", monthlyPriceCents: 220 },
  { code: "IT", label: "Italy", monthlyPriceCents: 220 },
  { code: "PL", label: "Poland", monthlyPriceCents: 180 },
];

export function getTwilioCountryPricing(
  countryCode: string,
): TwilioCountryPricing | null {
  const normalized = countryCode.trim().toUpperCase();
  return TWILIO_COUNTRY_PRICING.find((entry) => entry.code === normalized) ?? null;
}

export function formatMonthlyPrice(monthlyPriceCents: number): string {
  const dollars = monthlyPriceCents / 100;
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
}

export function inferCountryCodeFromPhoneNumber(phoneNumber: string): string {
  const normalized = phoneNumber.trim();

  if (normalized.startsWith("+49")) return "DE";
  if (normalized.startsWith("+44")) return "GB";
  if (normalized.startsWith("+1")) return "US";
  if (normalized.startsWith("+61")) return "AU";
  if (normalized.startsWith("+33")) return "FR";
  if (normalized.startsWith("+31")) return "NL";
  if (normalized.startsWith("+34")) return "ES";
  if (normalized.startsWith("+39")) return "IT";
  if (normalized.startsWith("+48")) return "PL";

  return "US";
}
