import "server-only";

import { z } from "zod";

import { buildPlanFeaturesFromEntitlements } from "@/features/subscription/plan-features";
import {
  getPlanEntitlements as getStaticPlanEntitlements,
  isUnlimitedQuota,
  type PlanEntitlements,
} from "@/features/subscription/entitlements";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BusinessSubscriptionAddon,
  PlatformAddonEntitlementBoost,
  PlatformAddonRecord,
  PlatformPlanRecord,
  PlatformSubscriptionAddonRow,
  PlatformSubscriptionPlanRow,
  UpsertPlatformPlanInput,
} from "@/types/platform-plans.types";

const planEntitlementsSchema = z.object({
  maxMessagingChannels: z.number().int(),
  maxTeamSeats: z.number().int().min(1),
  monthlyAiReplies: z.number().int().min(-1),
  monthlyVoiceMinutes: z.number().int().min(0),
  maxAutomationRules: z.number().int().min(-1),
  voiceAi: z.boolean(),
  automations: z.boolean(),
  followUpAgent: z.boolean(),
  analyticsAiAsk: z.boolean(),
  gmailIntegration: z.boolean(),
  websiteKnowledgeSync: z.boolean(),
  extendedAiContext: z.boolean(),
  calendarBookingPages: z.boolean(),
  prioritySupport: z.boolean(),
});

const DEFAULT_PLAN_IDS = ["free", "starter", "pro", "agency"] as const;

let cachedPlans: PlatformPlanRecord[] | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000;

function mapPlanRow(row: PlatformSubscriptionPlanRow): PlatformPlanRecord {
  const entitlements = planEntitlementsSchema.parse(row.entitlements);
  const features =
    row.features.length > 0
      ? row.features
      : buildPlanFeaturesFromEntitlements(entitlements);

  return {
    id: row.id,
    label: row.label,
    tagline: row.tagline,
    priceMonthly: row.price_monthly_cents / 100,
    priceMonthlyCents: row.price_monthly_cents,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    isPublic: row.is_public,
    highlighted: row.highlighted,
    stripeProductId: row.stripe_product_id,
    stripePriceId: row.stripe_price_id,
    entitlements,
    features,
    monthlyAiReplies: entitlements.monthlyAiReplies,
  };
}

function buildFallbackPlans(): PlatformPlanRecord[] {
  return DEFAULT_PLAN_IDS.map((id, index) => {
    const entitlements = getStaticPlanEntitlements(id);
    const staticPlan = {
      free: { label: "Free", tagline: "Launch your first AI inbox", price: 0, highlighted: false },
      starter: { label: "Starter", tagline: "For growing local businesses", price: 49, highlighted: false },
      pro: { label: "Pro", tagline: "Calls AI + full inbox and CRM stack", price: 129, highlighted: true },
      agency: { label: "Agency", tagline: "High-volume teams & partners", price: 349, highlighted: false },
    }[id];

    return {
      id,
      label: staticPlan.label,
      tagline: staticPlan.tagline,
      priceMonthly: staticPlan.price,
      priceMonthlyCents: staticPlan.price * 100,
      sortOrder: index,
      isActive: true,
      isPublic: true,
      highlighted: staticPlan.highlighted,
      stripeProductId: null,
      stripePriceId: null,
      entitlements,
      features: buildPlanFeaturesFromEntitlements(entitlements),
      monthlyAiReplies: entitlements.monthlyAiReplies,
    };
  });
}

let cachedAddons: PlatformAddonRecord[] | null = null;
let addonCacheLoadedAt = 0;

const addonMetadataSchema = z.object({
  monthlyAiReplies: z.number().int().optional(),
  monthlyVoiceMinutes: z.number().int().optional(),
  maxTeamSeats: z.number().int().optional(),
});

function mapAddonRow(row: PlatformSubscriptionAddonRow): PlatformAddonRecord {
  const metadata = addonMetadataSchema.parse(row.metadata ?? {});

  return {
    id: row.id,
    label: row.label,
    description: row.description,
    priceMonthly: row.price_monthly_cents / 100,
    priceMonthlyCents: row.price_monthly_cents,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    stripeProductId: row.stripe_product_id,
    stripePriceId: row.stripe_price_id,
    entitlementBoost: metadata,
  };
}

function buildFallbackAddons(): PlatformAddonRecord[] {
  return [
    {
      id: "ai_reply_pack",
      label: "AI Reply Pack",
      description: "+1,000 customer-facing AI replies per month",
      priceMonthly: 29,
      priceMonthlyCents: 2900,
      sortOrder: 0,
      isActive: true,
      stripeProductId: null,
      stripePriceId: null,
      entitlementBoost: { monthlyAiReplies: 1000 },
    },
    {
      id: "voice_minutes_pack",
      label: "Voice Minutes Pack",
      description: "+500 AI voice minutes per month",
      priceMonthly: 49,
      priceMonthlyCents: 4900,
      sortOrder: 1,
      isActive: true,
      stripeProductId: null,
      stripePriceId: null,
      entitlementBoost: { monthlyVoiceMinutes: 500 },
    },
    {
      id: "team_seat",
      label: "Extra Team Seat",
      description: "+1 workspace member with inbox access",
      priceMonthly: 12,
      priceMonthlyCents: 1200,
      sortOrder: 2,
      isActive: true,
      stripeProductId: null,
      stripePriceId: null,
      entitlementBoost: { maxTeamSeats: 1 },
    },
  ];
}

export function invalidatePlatformAddonsCache(): void {
  cachedAddons = null;
  addonCacheLoadedAt = 0;
}

export async function listPlatformAddons(options?: {
  activeOnly?: boolean;
  force?: boolean;
}): Promise<PlatformAddonRecord[]> {
  const now = Date.now();

  if (
    !options?.force &&
    cachedAddons &&
    now - addonCacheLoadedAt < CACHE_TTL_MS
  ) {
    return filterAddons(cachedAddons, options);
  }

  if (!hasSupabaseEnv()) {
    cachedAddons = buildFallbackAddons();
    addonCacheLoadedAt = now;
    return filterAddons(cachedAddons, options);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_subscription_addons")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    cachedAddons = buildFallbackAddons();
  } else {
    cachedAddons = data.map((row) =>
      mapAddonRow(row as unknown as PlatformSubscriptionAddonRow),
    );
  }

  addonCacheLoadedAt = now;
  return filterAddons(cachedAddons, options);
}

function filterAddons(
  addons: PlatformAddonRecord[],
  options?: { activeOnly?: boolean },
): PlatformAddonRecord[] {
  return addons.filter((addon) => {
    if (options?.activeOnly && !addon.isActive) {
      return false;
    }

    return true;
  });
}

export async function getPlatformAddon(
  addonId: string,
): Promise<PlatformAddonRecord | null> {
  const addons = await listPlatformAddons();
  return addons.find((addon) => addon.id === addonId) ?? null;
}

export async function getStripePriceIdForAddonAsync(
  addonId: string,
): Promise<string | null> {
  const addon = await getPlatformAddon(addonId);
  return addon?.stripePriceId ?? null;
}

export async function resolveAddonItemsFromStripePrices(
  priceIds: string[],
): Promise<BusinessSubscriptionAddon[]> {
  const addons = await listPlatformAddons({ force: true });
  const activeAddons: BusinessSubscriptionAddon[] = [];

  for (const priceId of priceIds) {
    const addon = addons.find((entry) => entry.stripePriceId === priceId);

    if (!addon) {
      continue;
    }

    const existing = activeAddons.find((entry) => entry.id === addon.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      activeAddons.push({ id: addon.id, quantity: 1 });
    }
  }

  return activeAddons;
}

export function applyAddonEntitlementBoosts(
  base: PlanEntitlements,
  activeAddons: BusinessSubscriptionAddon[],
  catalog: PlatformAddonRecord[],
): PlanEntitlements {
  const boosts: PlatformAddonEntitlementBoost = {};

  for (const active of activeAddons) {
    const addon = catalog.find((entry) => entry.id === active.id);

    if (!addon) {
      continue;
    }

    const quantity = active.quantity;

    if (addon.entitlementBoost.monthlyAiReplies) {
      boosts.monthlyAiReplies =
        (boosts.monthlyAiReplies ?? 0) +
        addon.entitlementBoost.monthlyAiReplies * quantity;
    }

    if (addon.entitlementBoost.monthlyVoiceMinutes) {
      boosts.monthlyVoiceMinutes =
        (boosts.monthlyVoiceMinutes ?? 0) +
        addon.entitlementBoost.monthlyVoiceMinutes * quantity;
    }

    if (addon.entitlementBoost.maxTeamSeats) {
      boosts.maxTeamSeats =
        (boosts.maxTeamSeats ?? 0) +
        addon.entitlementBoost.maxTeamSeats * quantity;
    }
  }

  return {
    ...base,
    monthlyAiReplies:
      base.monthlyAiReplies >= 0 && boosts.monthlyAiReplies
        ? base.monthlyAiReplies + boosts.monthlyAiReplies
        : base.monthlyAiReplies,
    monthlyVoiceMinutes: base.monthlyVoiceMinutes + (boosts.monthlyVoiceMinutes ?? 0),
    maxTeamSeats: base.maxTeamSeats + (boosts.maxTeamSeats ?? 0),
  };
}

export function parseBusinessSubscriptionAddons(
  value: unknown,
): BusinessSubscriptionAddon[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed: BusinessSubscriptionAddon[] = [];

  for (const entry of value) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      "id" in entry &&
      typeof entry.id === "string"
    ) {
      const quantity =
        "quantity" in entry && typeof entry.quantity === "number"
          ? Math.max(1, entry.quantity)
          : 1;
      parsed.push({ id: entry.id, quantity });
    }
  }

  return parsed;
}

export function invalidatePlatformPlansCache(): void {
  cachedPlans = null;
  cacheLoadedAt = 0;
  invalidatePlatformAddonsCache();
}

export async function listPlatformPlans(options?: {
  activeOnly?: boolean;
  publicOnly?: boolean;
  force?: boolean;
}): Promise<PlatformPlanRecord[]> {
  const now = Date.now();

  if (
    !options?.force &&
    cachedPlans &&
    now - cacheLoadedAt < CACHE_TTL_MS
  ) {
    return filterPlans(cachedPlans, options);
  }

  if (!hasSupabaseEnv()) {
    cachedPlans = buildFallbackPlans();
    cacheLoadedAt = now;
    return filterPlans(cachedPlans, options);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_subscription_plans")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    cachedPlans = buildFallbackPlans();
  } else {
    cachedPlans = data.map((row) =>
      mapPlanRow(row as unknown as PlatformSubscriptionPlanRow),
    );
  }

  cacheLoadedAt = now;
  return filterPlans(cachedPlans, options);
}

function filterPlans(
  plans: PlatformPlanRecord[],
  options?: { activeOnly?: boolean; publicOnly?: boolean },
): PlatformPlanRecord[] {
  return plans.filter((plan) => {
    if (options?.activeOnly && !plan.isActive) {
      return false;
    }

    if (options?.publicOnly && !plan.isPublic) {
      return false;
    }

    return true;
  });
}

export async function getPlatformPlan(
  planId: string,
): Promise<PlatformPlanRecord | null> {
  const plans = await listPlatformPlans();
  return plans.find((plan) => plan.id === planId) ?? null;
}

export async function getPlanEntitlementsForBusiness(
  planId: string,
): Promise<PlanEntitlements> {
  const plan = await getPlatformPlan(planId);

  if (plan) {
    return plan.entitlements;
  }

  if ((DEFAULT_PLAN_IDS as readonly string[]).includes(planId)) {
    return getStaticPlanEntitlements(planId as (typeof DEFAULT_PLAN_IDS)[number]);
  }

  return getStaticPlanEntitlements("free");
}

export async function resolveSubscriptionPlanAsync(
  plan: string | null | undefined,
): Promise<string> {
  const normalized = plan?.trim().toLowerCase();

  if (!normalized) {
    return "free";
  }

  const plans = await listPlatformPlans({ activeOnly: true });
  const match = plans.find((entry) => entry.id === normalized);

  if (match) {
    return match.id;
  }

  if ((DEFAULT_PLAN_IDS as readonly string[]).includes(normalized)) {
    return normalized;
  }

  return "free";
}

export function resolveSubscriptionPlan(
  plan: string | null | undefined,
): string {
  const normalized = plan?.trim().toLowerCase();

  if (!normalized) {
    return "free";
  }

  if (cachedPlans?.some((entry) => entry.id === normalized)) {
    return normalized;
  }

  if ((DEFAULT_PLAN_IDS as readonly string[]).includes(normalized)) {
    return normalized;
  }

  return "free";
}

export async function getStripePriceIdForPlanAsync(
  planId: string,
): Promise<string | null> {
  if (planId === "free") {
    return null;
  }

  const plan = await getPlatformPlan(planId);

  if (plan?.stripePriceId) {
    return plan.stripePriceId;
  }

  return null;
}

export async function resolvePlanIdFromStripePrice(
  priceId: string | undefined,
): Promise<string> {
  if (!priceId?.trim()) {
    return "free";
  }

  const plans = await listPlatformPlans({ force: true });

  for (const plan of plans) {
    if (plan.stripePriceId === priceId) {
      return plan.id;
    }
  }

  return "free";
}

export async function upsertPlatformPlan(
  input: UpsertPlatformPlanInput,
): Promise<{ success: true; plan: PlatformPlanRecord } | { success: false; message: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  const parsedEntitlements = planEntitlementsSchema.safeParse(input.entitlements);

  if (!parsedEntitlements.success) {
    return {
      success: false,
      message: parsedEntitlements.error.issues[0]?.message ?? "Invalid entitlements.",
    };
  }

  const features =
    input.features && input.features.length > 0
      ? input.features
      : buildPlanFeaturesFromEntitlements(parsedEntitlements.data);

  const admin = createAdminClient();
  const payload = {
    id: input.id.trim().toLowerCase(),
    label: input.label.trim(),
    tagline: input.tagline?.trim() ?? "",
    price_monthly_cents: input.priceMonthlyCents,
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
    is_public: input.isPublic ?? true,
    highlighted: input.highlighted ?? false,
    entitlements: parsedEntitlements.data,
    features,
  };

  const { data, error } = await admin
    .from("platform_subscription_plans")
    .upsert(payload)
    .select("*")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: error?.message ?? "Unable to save plan.",
    };
  }

  invalidatePlatformPlansCache();

  return {
    success: true,
    plan: mapPlanRow(data as unknown as PlatformSubscriptionPlanRow),
  };
}

export async function updatePlatformPlanStripeIds(input: {
  planId: string;
  stripeProductId: string;
  stripePriceId: string;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const admin = createAdminClient();
  await admin
    .from("platform_subscription_plans")
    .update({
      stripe_product_id: input.stripeProductId,
      stripe_price_id: input.stripePriceId,
    })
    .eq("id", input.planId);

  invalidatePlatformPlansCache();
}

export function isUnlimitedAiReplies(monthlyLimit: number): boolean {
  return isUnlimitedQuota(monthlyLimit);
}
