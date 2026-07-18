import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { getStripeClient, hasStripeEnv } from "@/lib/stripe/client";
import {
  ensureStripeBillingWebhook,
  STRIPE_BILLING_WEBHOOK_EVENTS,
} from "@/lib/stripe/webhook-endpoints";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "stripe-webhook-setup", path: "/api/cron/stripe-webhook-setup" },
    async () => {
      if (!hasStripeEnv()) {
        return NextResponse.json(
          { error: "Stripe not configured" },
          { status: 503 },
        );
      }

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
        vercelEnvAction: result.webhookSecret
          ? "Update STRIPE_WEBHOOK_SECRET in Vercel (orzuaibot production) with webhookSecret from this response."
          : "Existing endpoint — signing secret unchanged.",
      });
    },
  );
}
