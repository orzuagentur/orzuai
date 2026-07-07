/**
 * OrzuX Stripe billing bootstrap (production-safe, idempotent).
 *
 * - Fixes product tax codes (Eligible for Stripe Tax / Managed Payments)
 * - Keeps owner $5 test pack (plan_id: test)
 * - Archives legacy/duplicate prices
 * - Webhook -> https://www.orzux.com/api/webhooks/stripe (no 308 redirect)
 * - Syncs Supabase platform_subscription_plans / addons
 *
 * Usage:
 *   vercel env pull .env.stripe-setup --environment=production --yes
 *   node --env-file=.env.stripe-setup scripts/setup-stripe-billing.mjs
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(resolve(filePath), "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) {
        continue;
      }

      const index = line.indexOf("=");

      if (index === -1) {
        continue;
      }

      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional env file
  }
}

loadEnvFile(".env.stripe-setup");
loadEnvFile(".env.local");

/** SaaS — business use (Eligible in Stripe Tax catalog). */
const TAX_CODE_SAAS_BUSINESS = "txcd_10103001";

const WEBHOOK_URL = "https://www.orzux.com/api/webhooks/stripe";

const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.created",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.source.expiring",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.upcoming",
];

const PLANS = [
  {
    id: "starter",
    name: "OrzuX Starter",
    description:
      "OrzuX Starter — unified AI inbox, CRM, and automations for growing local businesses. Billed monthly in USD.",
    statementDescriptor: "ORZUX STARTER",
    unitAmount: 4900,
  },
  {
    id: "pro",
    name: "OrzuX Pro",
    description:
      "OrzuX Pro — Voice AI, full automation stack, Gmail integration, and advanced analytics. Billed monthly in USD.",
    statementDescriptor: "ORZUX PRO",
    unitAmount: 12900,
  },
  {
    id: "agency",
    name: "OrzuX Agency",
    description:
      "OrzuX Agency — high-volume AI communication platform for agencies and partner teams. Billed monthly in USD.",
    statementDescriptor: "ORZUX AGENCY",
    unitAmount: 34900,
  },
];

const TEST_PACK = {
  id: "test",
  name: "OrzuX Test Pack",
  description:
    "Internal OrzuX test subscription ($5/mo). For owner QA only — not a public customer plan.",
  statementDescriptor: "ORZUX TEST",
  unitAmount: 500,
  keepPriceId: "price_1TpxVvFr2dKz1Bb0kDSKlzJm",
};

const ADDONS = [
  {
    id: "ai_reply_pack",
    name: "OrzuX AI Reply Pack",
    description:
      "Add-on: +1,000 customer-facing AI replies per month on your OrzuX workspace.",
    statementDescriptor: "ORZUX AI PACK",
    unitAmount: 2900,
  },
  {
    id: "voice_minutes_pack",
    name: "OrzuX Voice Minutes Pack",
    description:
      "Add-on: +500 AI voice minutes per month for OrzuX Voice AI.",
    statementDescriptor: "ORZUX VOICE",
    unitAmount: 4900,
  },
  {
    id: "team_seat",
    name: "OrzuX Extra Team Seat",
    description:
      "Add-on: +1 workspace member with inbox and team access.",
    statementDescriptor: "ORZUX SEAT",
    unitAmount: 1200,
  },
];

const TWILIO_NUMBER = {
  name: "OrzuX Twilio Phone Number",
  description:
    "Monthly fee for a dedicated Twilio phone number connected to OrzuX Voice AI.",
  statementDescriptor: "ORZUX NUMBER",
};

/** Legacy catalog entries to deactivate (not the $5 test price). */
const LEGACY_PRODUCT_IDS = ["prod_UedC5tqjVmH7Hb"];

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function productPayload(input) {
  return {
    name: input.name,
    description: input.description,
    tax_code: input.taxCode ?? TAX_CODE_SAAS_BUSINESS,
    statement_descriptor: input.statementDescriptor,
    shippable: false,
    metadata: {
      platform: "orzux",
      ...(input.planId ? { plan_id: input.planId } : {}),
      ...(input.addonId ? { addon_id: input.addonId } : {}),
      ...(input.type ? { type: input.type } : {}),
    },
  };
}

async function findProductByMetadata(stripe, key, value) {
  const result = await stripe.products.search({
    query: `active:'true' AND metadata['${key}']:'${value}'`,
    limit: 1,
  });

  return result.data[0] ?? null;
}

async function ensureProduct(stripe, input) {
  let product =
    (input.planId
      ? await findProductByMetadata(stripe, "plan_id", input.planId)
      : null) ??
    (input.addonId
      ? await findProductByMetadata(stripe, "addon_id", input.addonId)
      : null);

  const payload = productPayload(input);

  if (!product) {
    product = await stripe.products.create(payload);
    console.log(`Created product ${input.name}: ${product.id}`);
  } else {
    product = await stripe.products.update(product.id, payload);
    console.log(`Updated product ${input.name}: ${product.id}`);
  }

  return product;
}

async function ensureMonthlyPrice(stripe, input) {
  const prices = await stripe.prices.list({
    product: input.productId,
    active: true,
    limit: 100,
  });

  const matched = prices.data.find((price) => {
    if (
      price.currency !== "usd" ||
      price.unit_amount !== input.unitAmount ||
      price.recurring?.interval !== "month"
    ) {
      return false;
    }

    if (input.planId) {
      return price.metadata?.plan_id === input.planId;
    }

    if (input.addonId) {
      return price.metadata?.addon_id === input.addonId;
    }

    return false;
  });

  if (matched) {
    await stripe.prices.update(matched.id, {
      nickname: input.nickname,
      tax_behavior: "exclusive",
      metadata: {
        platform: "orzux",
        plan_id: input.planId,
        ...(input.addonId ? { addon_id: input.addonId } : {}),
      },
    });
    console.log(`Reusing price ${input.planId ?? input.addonId}: ${matched.id}`);
    return matched.id;
  }

  const price = await stripe.prices.create({
    product: input.productId,
    currency: "usd",
    unit_amount: input.unitAmount,
    recurring: { interval: "month" },
    tax_behavior: "exclusive",
    nickname: input.nickname,
    metadata: {
      platform: "orzux",
      plan_id: input.planId ?? undefined,
      addon_id: input.addonId ?? undefined,
    },
  });

  console.log(`Created price ${input.planId ?? input.addonId}: ${price.id}`);
  return price.id;
}

async function archiveDuplicatePrices(stripe, productId, keepPriceIds) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  for (const price of prices.data) {
    if (keepPriceIds.has(price.id)) {
      continue;
    }

    await stripe.prices.update(price.id, { active: false });
    console.log(`Archived duplicate price ${price.id}`);
  }
}

async function ensureTestPack(stripe) {
  const product = await ensureProduct(stripe, {
    planId: TEST_PACK.id,
    name: TEST_PACK.name,
    description: TEST_PACK.description,
    statementDescriptor: TEST_PACK.statementDescriptor,
  });

  let testPriceId = TEST_PACK.keepPriceId;

  try {
    const existing = await stripe.prices.retrieve(TEST_PACK.keepPriceId);

    if (existing.product !== product.id) {
      console.log(
        `Test price ${TEST_PACK.keepPriceId} is on product ${existing.product}; keeping as owner test pack.`,
      );
    }

    await stripe.prices.update(TEST_PACK.keepPriceId, {
      active: true,
      nickname: "Owner test pack ($5)",
      tax_behavior: "exclusive",
      metadata: {
        platform: "orzux",
        plan_id: "test",
        owner_test: "true",
      },
    });
  } catch {
    testPriceId = await ensureMonthlyPrice(stripe, {
      productId: product.id,
      planId: TEST_PACK.id,
      unitAmount: TEST_PACK.unitAmount,
      nickname: "Owner test pack ($5)",
    });
  }

  await stripe.products.update(product.id, {
    default_price: testPriceId,
  });

  return { productId: product.id, priceId: testPriceId };
}

async function ensureTwilioProduct(stripe) {
  const existing = await stripe.products.search({
    query: "active:'true' AND metadata['type']:'twilio_phone_number'",
    limit: 1,
  });

  let product = existing.data[0];

  const payload = {
    name: TWILIO_NUMBER.name,
    description: TWILIO_NUMBER.description,
    tax_code: TAX_CODE_SAAS_BUSINESS,
    statement_descriptor: TWILIO_NUMBER.statementDescriptor,
    shippable: false,
    metadata: {
      platform: "orzux",
      type: "twilio_phone_number",
    },
  };

  if (!product) {
    const byName = await stripe.products.search({
      query: "active:'true' AND name:'Twilio Phone Number'",
      limit: 1,
    });
    product = byName.data[0];
  }

  if (!product) {
    product = await stripe.products.create(payload);
    console.log(`Created Twilio product: ${product.id}`);
  } else {
    product = await stripe.products.update(product.id, payload);
    console.log(`Updated Twilio product: ${product.id}`);
  }

  return product.id;
}

async function deactivateLegacyProducts(stripe) {
  for (const productId of LEGACY_PRODUCT_IDS) {
    try {
      await stripe.products.update(productId, { active: false });
      console.log(`Deactivated legacy product ${productId}`);
    } catch (error) {
      console.warn(`Could not deactivate ${productId}:`, error.message);
    }
  }
}

async function ensureWebhook(stripe) {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });

  const wrongUrlEndpoints = endpoints.data.filter(
    (endpoint) =>
      endpoint.url.includes("orzux.com/api/webhooks/stripe") &&
      endpoint.url !== WEBHOOK_URL,
  );

  for (const endpoint of wrongUrlEndpoints) {
    await stripe.webhookEndpoints.del(endpoint.id);
    console.log(`Deleted redirecting webhook ${endpoint.id} (${endpoint.url})`);
  }

  let existing = endpoints.data.find((endpoint) => endpoint.url === WEBHOOK_URL);

  if (existing) {
    existing = await stripe.webhookEndpoints.update(existing.id, {
      enabled_events: WEBHOOK_EVENTS,
      disabled: false,
      description: "OrzuX production billing (www — no redirect)",
    });
    console.log(`Updated webhook endpoint: ${existing.id}`);
    return existing.secret ?? null;
  }

  const created = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: WEBHOOK_EVENTS,
    description: "OrzuX production billing (www — no redirect)",
  });

  console.log(`Created webhook endpoint: ${created.id}`);
  console.log("IMPORTANT: copy webhook signing secret to STRIPE_WEBHOOK_SECRET in Vercel");
  return created.secret ?? null;
}

async function main() {
  const stripeSecret = requireEnv("STRIPE_SECRET_KEY");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const stripe = new Stripe(stripeSecret);
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Deactivating legacy Stripe products...");
  await deactivateLegacyProducts(stripe);

  console.log("Ensuring owner $5 test pack...");
  await ensureTestPack(stripe);

  console.log("Syncing OrzuX plans...");
  const keepPriceIds = new Set([TEST_PACK.keepPriceId]);

  for (const plan of PLANS) {
    const product = await ensureProduct(stripe, {
      planId: plan.id,
      name: plan.name,
      description: plan.description,
      statementDescriptor: plan.statementDescriptor,
    });

    const priceId = await ensureMonthlyPrice(stripe, {
      productId: product.id,
      planId: plan.id,
      unitAmount: plan.unitAmount,
      nickname: `${plan.name} — monthly`,
    });

    keepPriceIds.add(priceId);

    await stripe.products.update(product.id, {
      default_price: priceId,
    });

    await archiveDuplicatePrices(stripe, product.id, keepPriceIds);

    const { error } = await supabase
      .from("platform_subscription_plans")
      .update({
        stripe_product_id: product.id,
        stripe_price_id: priceId,
      })
      .eq("id", plan.id);

    if (error) {
      throw new Error(`Failed to update plan ${plan.id}: ${error.message}`);
    }
  }

  console.log("Syncing add-ons...");
  for (const addon of ADDONS) {
    const product = await ensureProduct(stripe, {
      addonId: addon.id,
      name: addon.name,
      description: addon.description,
      statementDescriptor: addon.statementDescriptor,
    });

    const priceId = await ensureMonthlyPrice(stripe, {
      productId: product.id,
      addonId: addon.id,
      unitAmount: addon.unitAmount,
      nickname: `${addon.name} — monthly`,
    });

    await stripe.products.update(product.id, {
      default_price: priceId,
    });

    await archiveDuplicatePrices(stripe, product.id, new Set([priceId]));

    const { error } = await supabase
      .from("platform_subscription_addons")
      .update({
        stripe_product_id: product.id,
        stripe_price_id: priceId,
      })
      .eq("id", addon.id);

    if (error) {
      throw new Error(`Failed to update addon ${addon.id}: ${error.message}`);
    }
  }

  console.log("Updating Twilio phone number product...");
  await ensureTwilioProduct(stripe);

  const webhookSecret = await ensureWebhook(stripe);

  const { data: plans } = await supabase
    .from("platform_subscription_plans")
    .select("id, stripe_product_id, stripe_price_id")
    .order("sort_order");

  const { data: addons } = await supabase
    .from("platform_subscription_addons")
    .select("id, stripe_product_id, stripe_price_id")
    .order("sort_order");

  console.log("\nDone.");
  console.log(
    JSON.stringify(
      {
        webhookUrl: WEBHOOK_URL,
        webhookSecretSet: Boolean(webhookSecret),
        plans,
        addons,
        testPackPriceId: TEST_PACK.keepPriceId,
      },
      null,
      2,
    ),
  );

  if (webhookSecret) {
    console.log("\nUpdate Vercel STRIPE_WEBHOOK_SECRET if this is a new endpoint.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
