"use server";

import type { PlanEntitlements } from "@orzuai/features/subscription/entitlements";
import type {
  PlatformPlanRecord,
  PlatformSubscriptionAddonRow,
  UpsertPlatformAddonInput,
  UpsertPlatformPlanInput,
} from "@orzuai/types/platform-plans.types";

import {
  listAdminPlatformAddons,
  listAdminPlatformPlans,
  syncAdminPlatformAddonToStripe,
  syncAdminPlatformPlanToStripe,
  syncAllAdminAddonsToStripe,
  syncAllAdminPaidPlansToStripe,
  upsertAdminPlatformAddon,
  upsertAdminPlatformPlan,
} from "@/features/billing/plans-service";
import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

async function writePlanAuditLog(input: {
  actorUserId: string;
  actorEmail: string;
  action: string;
  metadata: Record<string, unknown>;
}) {
  const service = createServiceRoleClient();
  await service.from("platform_business_admin_audit_log").insert({
    action: input.action,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    metadata: input.metadata,
  });
}

export async function fetchPlatformPlansAction(): Promise<
  | { success: true; plans: PlatformPlanRecord[]; addons: PlatformSubscriptionAddonRow[] }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const [plans, addons] = await Promise.all([
      listAdminPlatformPlans(),
      listAdminPlatformAddons(),
    ]);

    return { success: true, plans, addons };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load plans.",
    };
  }
}

export async function savePlatformPlanAction(input: UpsertPlatformPlanInput): Promise<
  | { success: true; plan: PlatformPlanRecord }
  | { success: false; message: string }
> {
  try {
    const { user } = await requirePlatformAdmin();
    const plan = await upsertAdminPlatformPlan(input);

    await writePlanAuditLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "",
      action: "subscription_plan_upsert",
      metadata: {
        planId: plan.id,
        label: plan.label,
        priceMonthlyCents: plan.priceMonthlyCents,
      },
    });

    return { success: true, plan };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to save plan.",
    };
  }
}

export async function syncPlatformPlanStripeAction(planId: string): Promise<
  | { success: true; stripeProductId: string; stripePriceId: string }
  | { success: false; message: string }
> {
  try {
    const { user } = await requirePlatformAdmin();
    const result = await syncAdminPlatformPlanToStripe(planId);

    await writePlanAuditLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "",
      action: "subscription_plan_stripe_sync",
      metadata: { planId, stripePriceId: result.stripePriceId },
    });

    return { success: true, ...result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Stripe sync failed.",
    };
  }
}

export async function syncAllPlatformPlansStripeAction(): Promise<
  | {
      success: true;
      synced: Array<{ planId: string; stripePriceId: string }>;
      skipped: string[];
      errors: Array<{ planId: string; message: string }>;
    }
  | { success: false; message: string }
> {
  try {
    const { user } = await requirePlatformAdmin();
    const result = await syncAllAdminPaidPlansToStripe();

    await writePlanAuditLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "",
      action: "subscription_plans_stripe_sync_all",
      metadata: result,
    });

    return { success: true, ...result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Stripe sync failed.",
    };
  }
}

export async function savePlatformAddonAction(
  input: UpsertPlatformAddonInput,
): Promise<{ success: true; id: string } | { success: false; message: string }> {
  try {
    const { user } = await requirePlatformAdmin();
    const id = await upsertAdminPlatformAddon(input);

    await writePlanAuditLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "",
      action: "subscription_addon_upsert",
      metadata: { addonId: id },
    });

    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to save add-on.",
    };
  }
}

export async function syncPlatformAddonStripeAction(addonId: string): Promise<
  | { success: true; stripeProductId: string; stripePriceId: string }
  | { success: false; message: string }
> {
  try {
    const { user } = await requirePlatformAdmin();
    const result = await syncAdminPlatformAddonToStripe(addonId);

    await writePlanAuditLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "",
      action: "subscription_addon_stripe_sync",
      metadata: { addonId, stripePriceId: result.stripePriceId },
    });

    return { success: true, ...result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Stripe sync failed.",
    };
  }
}

export async function syncAllPlatformAddonsStripeAction(): Promise<
  | {
      success: true;
      synced: Array<{ addonId: string; stripePriceId: string }>;
      errors: Array<{ addonId: string; message: string }>;
    }
  | { success: false; message: string }
> {
  try {
    const { user } = await requirePlatformAdmin();
    const result = await syncAllAdminAddonsToStripe();

    await writePlanAuditLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "",
      action: "subscription_addons_stripe_sync_all",
      metadata: result,
    });

    return { success: true, ...result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Stripe sync failed.",
    };
  }
}

export type { PlanEntitlements };
