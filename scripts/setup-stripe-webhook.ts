#!/usr/bin/env tsx
/**
 * Stripe webhook bootstrap only (fixes 308 redirect).
 *
 * Usage (recommended — injects real secrets, no empty pull placeholders):
 *   vercel env run -e production -- npx tsx scripts/setup-stripe-webhook.ts
 *
 * Fallback:
 *   npx tsx scripts/setup-stripe-webhook.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { getSecret } from "@orzu/secrets/server";

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
] as const;

function loadEnvFile(filePath: string): void {
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

      if (!value) {
        continue;
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional env file
  }
}

function isValidStripeSecretKey(value: string | undefined): value is string {
  return Boolean(value && /^sk_(live|test)_[A-Za-z0-9]+$/.test(value) && value.length > 20);
}

async function resolveStripeSecretKey(): Promise<string> {
  const fromEnv = process.env.STRIPE_SECRET_KEY?.trim();

  if (isValidStripeSecretKey(fromEnv)) {
    return fromEnv;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (supabaseUrl && serviceRoleKey) {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const fromSecrets = (await getSecret(admin, "STRIPE_SECRET_KEY"))?.trim();

    if (isValidStripeSecretKey(fromSecrets)) {
      return fromSecrets;
    }
  }

  throw new Error(
    "STRIPE_SECRET_KEY unavailable. Run: vercel env run -e production -- npx tsx scripts/setup-stripe-webhook.ts",
  );
}

async function ensureWebhook(stripe: Stripe) {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });

  const wrongUrlEndpoints = endpoints.data.filter(
    (endpoint) =>
      endpoint.url.includes("orzux.com/api/webhooks/stripe") &&
      endpoint.url !== WEBHOOK_URL,
  );

  for (const endpoint of wrongUrlEndpoints) {
    await stripe.webhookEndpoints.del(endpoint.id);
    console.log(`DELETED_BAD_WEBHOOK:${endpoint.id}`);
  }

  let existing = endpoints.data.find((endpoint) => endpoint.url === WEBHOOK_URL);

  if (existing) {
    existing = await stripe.webhookEndpoints.update(existing.id, {
      enabled_events: [...WEBHOOK_EVENTS],
      disabled: false,
      description: "OrzuX production billing (www — no redirect)",
    });
    console.log(`UPDATED_WEBHOOK:${existing.id}`);
    return { id: existing.id, secret: existing.secret ?? null, created: false };
  }

  const created = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: [...WEBHOOK_EVENTS],
    description: "OrzuX production billing (www — no redirect)",
  });

  console.log(`CREATED_WEBHOOK:${created.id}`);
  return { id: created.id, secret: created.secret ?? null, created: true };
}

function updateVercelWebhookSecret(secret: string): void {
  execSync(`vercel env update STRIPE_WEBHOOK_SECRET production --yes`, {
    input: secret,
    stdio: ["pipe", "inherit", "inherit"],
  });
  console.log("UPDATED_VERCEL_ENV:STRIPE_WEBHOOK_SECRET:production");
}

async function main(): Promise<void> {
  loadEnvFile(".env.stripe-setup");
  loadEnvFile(".env.local");

  const stripe = new Stripe(await resolveStripeSecretKey());
  const result = await ensureWebhook(stripe);

  console.log(
    JSON.stringify({
      webhookId: result.id,
      webhookUrl: WEBHOOK_URL,
      events: WEBHOOK_EVENTS.length,
      created: result.created,
    }),
  );

  if (result.secret) {
    writeFileSync(resolve(".stripe-webhook-secret.local"), result.secret, "utf8");
    console.log("WROTE_LOCAL_SECRET:.stripe-webhook-secret.local");

    try {
      updateVercelWebhookSecret(result.secret);
    } catch (error) {
      console.error(
        "VERCEL_ENV_UPDATE_FAILED:",
        error instanceof Error ? error.message : error,
      );
      console.log("Set STRIPE_WEBHOOK_SECRET manually in Vercel from .stripe-webhook-secret.local");
    }
  } else {
    console.log("WEBHOOK_SECRET_UNCHANGED:existing_endpoint");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
