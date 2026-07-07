import { NextResponse, type NextRequest } from "next/server";

import { ENV_KEYS } from "@/constants/env-keys";
import { getStripeClient, hasStripeEnv } from "@/lib/stripe/client";
import { ensureStripeBillingWebhook, STRIPE_BILLING_WEBHOOK_EVENTS } from "@/lib/stripe/webhook-endpoints";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env[ENV_KEYS.CRON_SECRET]?.trim();
  const authHeader = request.headers.get("authorization");
  const provided =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  return Boolean(cronSecret && provided === cronSecret);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasStripeEnv()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    const stripe = getStripeClient();
    const result = await ensureStripeBillingWebhook(stripe);

    return NextResponse.json({
      success: true,
      webhookId: result.webhookId,
      webhookUrl: result.webhookUrl,
      created: result.created,
      deletedEndpointIds: result.deletedEndpointIds,
      events: STRIPE_BILLING_WEBHOOK_EVENTS.length,
      webhookSecret: result.webhookSecret,
      vercelEnvAction:
        result.webhookSecret ?
          "Update STRIPE_WEBHOOK_SECRET in Vercel (orzuaibot production) with webhookSecret from this response."
        : "Existing endpoint — signing secret unchanged.",
    });
  } catch (error) {
    console.error("[stripe-webhook-setup]", error);
    return NextResponse.json({ error: "Stripe webhook setup failed" }, { status: 500 });
  }
}
