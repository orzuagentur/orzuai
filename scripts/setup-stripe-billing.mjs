/**
 * One-time Stripe billing bootstrap:
 * - Creates OrzuX plan/add-on products + monthly USD prices in Stripe
 * - Updates platform_subscription_plans / platform_subscription_addons in Supabase
 *
 * Usage (production keys):
 *   vercel env pull .env.stripe-setup --environment=production --yes
 *   node --env-file=.env.stripe-setup scripts/setup-stripe-billing.mjs
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath) {
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
}

loadEnvFile(".env.stripe-setup");

const PLANS = [
  {
    id: "starter",
    name: "OrzuX Starter",
    description: "For growing local businesses",
    unitAmount: 4900,
  },
  {
    id: "pro",
    name: "OrzuX Pro",
    description: "Voice AI + full automation stack",
    unitAmount: 12900,
  },
  {
    id: "agency",
    name: "OrzuX Agency",
    description: "High-volume teams & partners",
    unitAmount: 34900,
  },
];

const ADDONS = [
  {
    id: "ai_reply_pack",
    name: "OrzuX AI Reply Pack",
    description: "+1,000 customer-facing AI replies per month",
    unitAmount: 2900,
  },
  {
    id: "voice_minutes_pack",
    name: "OrzuX Voice Minutes Pack",
    description: "+500 AI voice minutes per month",
    unitAmount: 4900,
  },
  {
    id: "team_seat",
    name: "OrzuX Extra Team Seat",
    description: "+1 workspace member with inbox access",
    unitAmount: 1200,
  },
];

const WEBHOOK_URL = "https://orzux.com/api/webhooks/stripe";
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

async function ensureMonthlyProduct(stripe, input) {
  const existing = await stripe.products.search({
    query: `active:'true' AND metadata['orzux_plan_id']:'${input.id}'`,
    limit: 1,
  });

  let product = existing.data[0];

  if (!product) {
    product = await stripe.products.create({
      name: input.name,
      description: input.description,
      metadata: {
        orzux_plan_id: input.id,
        platform: "orzux",
      },
    });
    console.log(`Created product ${input.id}: ${product.id}`);
  } else {
    await stripe.products.update(product.id, {
      name: input.name,
      description: input.description,
    });
    console.log(`Reusing product ${input.id}: ${product.id}`);
  }

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 20,
  });

  const matched = prices.data.find(
    (price) =>
      price.currency === "usd" &&
      price.unit_amount === input.unitAmount &&
      price.recurring?.interval === "month",
  );

  if (matched) {
    console.log(`Reusing price ${input.id}: ${matched.id}`);
    return { productId: product.id, priceId: matched.id };
  }

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: input.unitAmount,
    recurring: { interval: "month" },
    metadata: {
      orzux_plan_id: input.id,
      platform: "orzux",
    },
  });

  console.log(`Created price ${input.id}: ${price.id}`);
  return { productId: product.id, priceId: price.id };
}

async function ensureMonthlyAddon(stripe, input) {
  const existing = await stripe.products.search({
    query: `active:'true' AND metadata['orzux_addon_id']:'${input.id}'`,
    limit: 1,
  });

  let product = existing.data[0];

  if (!product) {
    product = await stripe.products.create({
      name: input.name,
      description: input.description,
      metadata: {
        orzux_addon_id: input.id,
        platform: "orzux",
      },
    });
    console.log(`Created addon product ${input.id}: ${product.id}`);
  } else {
    await stripe.products.update(product.id, {
      name: input.name,
      description: input.description,
    });
    console.log(`Reusing addon product ${input.id}: ${product.id}`);
  }

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 20,
  });

  const matched = prices.data.find(
    (price) =>
      price.currency === "usd" &&
      price.unit_amount === input.unitAmount &&
      price.recurring?.interval === "month",
  );

  if (matched) {
    console.log(`Reusing addon price ${input.id}: ${matched.id}`);
    return { productId: product.id, priceId: matched.id };
  }

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: input.unitAmount,
    recurring: { interval: "month" },
    metadata: {
      orzux_addon_id: input.id,
      platform: "orzux",
    },
  });

  console.log(`Created addon price ${input.id}: ${price.id}`);
  return { productId: product.id, priceId: price.id };
}

async function ensureWebhook(stripe) {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = endpoints.data.find((endpoint) => endpoint.url === WEBHOOK_URL);

  if (existing) {
    const updated = await stripe.webhookEndpoints.update(existing.id, {
      enabled_events: WEBHOOK_EVENTS,
      disabled: false,
    });
    console.log(`Updated webhook endpoint: ${updated.id}`);
    return updated.secret ?? null;
  }

  const created = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: WEBHOOK_EVENTS,
    description: "OrzuX production billing",
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

  console.log("Syncing OrzuX plans to Stripe...");
  for (const plan of PLANS) {
    const { productId, priceId } = await ensureMonthlyProduct(stripe, plan);
    const { error } = await supabase
      .from("platform_subscription_plans")
      .update({
        stripe_product_id: productId,
        stripe_price_id: priceId,
      })
      .eq("id", plan.id);

    if (error) {
      throw new Error(`Failed to update plan ${plan.id}: ${error.message}`);
    }
  }

  console.log("Syncing OrzuX add-ons to Stripe...");
  for (const addon of ADDONS) {
    const { productId, priceId } = await ensureMonthlyAddon(stripe, addon);
    const { error } = await supabase
      .from("platform_subscription_addons")
      .update({
        stripe_product_id: productId,
        stripe_price_id: priceId,
      })
      .eq("id", addon.id);

    if (error) {
      throw new Error(`Failed to update addon ${addon.id}: ${error.message}`);
    }
  }

  const webhookSecret = await ensureWebhook(stripe);

  const { data: plans } = await supabase
    .from("platform_subscription_plans")
    .select("id, stripe_price_id")
    .order("sort_order");

  const { data: addons } = await supabase
    .from("platform_subscription_addons")
    .select("id, stripe_price_id")
    .order("sort_order");

  console.log("\nDone. Stripe price IDs in Supabase:");
  console.log(JSON.stringify({ plans, addons, webhookSecretSet: Boolean(webhookSecret) }, null, 2));

  if (webhookSecret) {
    console.log("\nRun in Vercel for orzuaibot + orzuai-admin if secret changed:");
    console.log(`echo ${webhookSecret} | vercel env add STRIPE_WEBHOOK_SECRET production preview`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
