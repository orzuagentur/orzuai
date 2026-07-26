import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/middleware";
import {
  getUserEntitlements,
  listActivePlans,
} from "@/lib/billing/entitlements";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServiceClient();
  try {
    const [plans, current] = await Promise.all([
      listActivePlans(sb),
      getUserEntitlements(sb, user.id),
    ]);
    return NextResponse.json({
      plans,
      currentPlan: current.plan,
      status: current.status,
      entitlements: current.entitlements,
      cancelAtPeriodEnd: current.cancelAtPeriodEnd,
      currentPeriodEnd: current.currentPeriodEnd,
      publishableKey: (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "").trim() || null,
      stripeConfigured: Boolean((process.env.STRIPE_SECRET_KEY || "").trim()),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load billing";
    const missing = /schema cache|does not exist|Could not find the table/i.test(
      msg,
    );
    if (missing) {
      return NextResponse.json(
        {
          error: "Billing tables missing. Run migration 035_billing.sql.",
          pendingMigration: "035_billing",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
