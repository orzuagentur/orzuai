import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { ENV_KEYS } from "@/constants/env-keys";
import { getStripeClient, hasStripeEnv } from "@/lib/stripe/client";
import { schedulePlatformErrorReport } from "@/services/error-intelligence.service";
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

  try {
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    await handleStripeWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.error("[stripe-webhook]", error);
    schedulePlatformErrorReport({
      severity: "critical",
      module: "billing",
      category: "webhook",
      source: "stripe-webhook",
      title: "Stripe webhook handler failed",
      message: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack ?? null : null,
      path: "/api/webhooks/stripe",
      method: "POST",
      httpStatus: 500,
      rootCause: "Stripe webhook event processing threw after signature verification.",
      suggestedFix: "Check Stripe event type handling and billing service logs.",
    });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
