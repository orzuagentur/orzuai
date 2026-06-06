import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { ENV_KEYS } from "@/constants/env-keys";
import { getStripeClient, hasStripeEnv } from "@/lib/stripe/client";
import { handleStripeWebhookEvent } from "@/services/stripe.service";

export async function POST(request: NextRequest) {
  if (!hasStripeEnv()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const webhookSecret = process.env[ENV_KEYS.STRIPE_WEBHOOK_SECRET]?.trim();

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  await handleStripeWebhookEvent(event);

  return NextResponse.json({ received: true });
}
