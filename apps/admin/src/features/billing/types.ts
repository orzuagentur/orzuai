import { PLATFORM_PLANS, resolvePlanId } from "@/features/dashboard/plan-catalog";

export type BillingOverviewStats = {
  estimatedMrrUsd: number;
  activeSubscriptions: number;
  withStripe: number;
  totalAccounts: number;
};

export type BillingAccountRow = {
  businessId: string;
  businessName: string;
  ownerEmail: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  estimatedMrrUsd: number;
  createdAt: string;
};

export function subscriptionStatusLabel(status: string): string {
  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case "active":
      return "Активна";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Просрочена";
    case "canceled":
    case "cancelled":
      return "Отменена";
    case "incomplete":
      return "Неполная";
    case "free":
      return "Free";
    default:
      return status || "—";
  }
}

export function subscriptionStatusTone(
  status: string,
): "success" | "warning" | "danger" | "default" {
  const normalized = status.trim().toLowerCase();

  if (normalized === "active" || normalized === "trialing") {
    return "success";
  }

  if (normalized === "past_due" || normalized === "incomplete") {
    return "warning";
  }

  if (normalized === "canceled" || normalized === "cancelled") {
    return "danger";
  }

  return "default";
}

export function estimateBusinessMrr(
  plan: string,
  status: string,
  planPrices?: Record<string, { priceMonthly: number }>,
): number {
  const normalizedStatus = status.trim().toLowerCase();

  if (normalizedStatus !== "active" && normalizedStatus !== "trialing") {
    return 0;
  }

  const planId = plan.trim().toLowerCase() || "free";
  const fromDb = planPrices?.[planId]?.priceMonthly;
  if (typeof fromDb === "number") {
    return fromDb;
  }

  const fallbackId = resolvePlanId(plan);
  return PLATFORM_PLANS[fallbackId]?.priceMonthly ?? 0;
}
