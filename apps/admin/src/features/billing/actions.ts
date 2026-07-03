"use server";

import { loadPlatformPlansForAdmin } from "@/features/dashboard/plans";
import type {
  BillingAccountRow,
  BillingOverviewStats,
} from "@/features/billing/types";
import { estimateBusinessMrr } from "@/features/billing/types";
import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

async function resolveOwnerEmails(userIds: string[]) {
  const service = createServiceRoleClient();
  const map = new Map<string, string>();

  for (const userId of userIds) {
    const { data } = await service.auth.admin.getUserById(userId);
    if (data.user?.email) {
      map.set(userId, data.user.email);
    }
  }

  return map;
}

function buildOverviewStats(rows: BillingAccountRow[]): BillingOverviewStats {
  return {
    estimatedMrrUsd: rows.reduce((sum, row) => sum + row.estimatedMrrUsd, 0),
    activeSubscriptions: rows.filter((row) => {
      const status = row.subscriptionStatus.toLowerCase();
      return status === "active" || status === "trialing";
    }).length,
    withStripe: rows.filter((row) => Boolean(row.stripeCustomerId)).length,
    totalAccounts: rows.length,
  };
}

export async function fetchBillingOverviewAction(input?: {
  query?: string;
  plan?: string;
  stripeOnly?: boolean;
}): Promise<
  | {
      success: true;
      stats: BillingOverviewStats;
      accounts: BillingAccountRow[];
      byPlan: Array<{ plan: string; label: string; count: number; revenueUsd: number }>;
    }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();
    const planPrices = await loadPlatformPlansForAdmin();

    let query = service
      .from("businesses")
      .select(
        "id, business_name, subscription_plan, subscription_status, stripe_customer_id, stripe_subscription_id, created_at, user_id",
      )
      .order("created_at", { ascending: false })
      .limit(300);

    const search = input?.query?.trim();
    if (search) {
      query = query.or(`business_name.ilike.%${search}%`);
    }

    if (input?.plan?.trim()) {
      query = query.eq("subscription_plan", input.plan.trim());
    }

    if (input?.stripeOnly) {
      query = query.not("stripe_customer_id", "is", null);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, message: error.message };
    }

    const rows = data ?? [];
    const ownerEmails = await resolveOwnerEmails([
      ...new Set(rows.map((row) => row.user_id as string)),
    ]);

    const accounts: BillingAccountRow[] = rows.map((row) => {
      const plan = row.subscription_plan as string;
      const status = row.subscription_status as string;

      return {
        businessId: row.id as string,
        businessName: row.business_name as string,
        ownerEmail: ownerEmails.get(row.user_id as string) ?? null,
        subscriptionPlan: plan,
        subscriptionStatus: status,
        stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
        stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
        estimatedMrrUsd: estimateBusinessMrr(plan, status, planPrices),
        createdAt: row.created_at as string,
      };
    });

    const planCounts = new Map<string, number>();
    for (const account of accounts) {
      const planId = account.subscriptionPlan.trim().toLowerCase() || "free";
      planCounts.set(planId, (planCounts.get(planId) ?? 0) + 1);
    }

    const byPlan = Object.entries(planPrices).map(([plan, config]) => {
      const count = planCounts.get(plan) ?? 0;
      return {
        plan,
        label: config.label,
        count,
        revenueUsd: count * config.priceMonthly,
      };
    });

    for (const [plan, count] of planCounts.entries()) {
      if (plan in planPrices) continue;
      byPlan.push({
        plan,
        label: plan,
        count,
        revenueUsd: 0,
      });
    }

    return {
      success: true,
      stats: buildOverviewStats(accounts),
      accounts,
      byPlan,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load billing.",
    };
  }
}
