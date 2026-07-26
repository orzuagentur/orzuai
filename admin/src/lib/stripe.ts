import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean((process.env.STRIPE_SECRET_KEY || "").trim());
}

export function getStripe(): Stripe {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!_stripe) {
    _stripe = new Stripe(key, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}
