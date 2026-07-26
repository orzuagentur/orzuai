# Stripe Billing (OrzuAi)

## What was built

- Plans in Supabase (`billing_plans`) — **admin is source of truth**
- Saving a plan in Admin → **Plans** creates/updates Stripe Product + Price automatically (no manual price ID copy)
- User **Billing** page: `/[locale]/dashboard/billing` (Account menu → Billing)
- Checkout (subscribe / switch) + Customer Portal (manage card / cancel)
- Webhook syncs subscription status into `billing_subscriptions`

Default seed plans: **Free** (€0), **Creator** (€29/mo), **Studio** (€79/mo).

## 1) Run database migration

In Supabase SQL Editor, run:

`supabase/migrations/035_billing.sql`

(or paste from that file). Confirms tables `billing_plans` + `billing_subscriptions` and seeds three plans.

## 2) Stripe API keys

Dashboard → [API keys](https://dashboard.stripe.com/acct_1Txagi2E9af2wZog/apikeys)

| Variable | Where | Value |
|---|---|---|
| `STRIPE_SECRET_KEY` | Vercel **web** + **admin**, and both `.env.local` | `sk_test_…` (dev) or `sk_live_…` (prod) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel **web** (+ `.env.local`) | `pk_test_…` / `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | Vercel **web** only | `whsec_…` (see below) |

Keep test and live keys separate. Use test until go-live.

## 3) Webhook endpoint

1. Stripe Dashboard → Developers → Webhooks → Add endpoint  
2. URL: `https://www.orzuai.com/api/stripe/webhook`  
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

Local:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Paste the CLI `whsec_…` into `web/.env.local`.

## 4) Customer Portal

Stripe Dashboard → Settings → Billing → Customer portal:

- Allow customers to update payment method
- Allow cancel subscription
- (optional) allow plan switching — in-app also uses Checkout for upgrades

## 5) Sync seed plans to Stripe

1. Set `STRIPE_SECRET_KEY` on **admin**
2. Open Admin → **Plans**
3. For Creator / Studio click **Sync Stripe** (or Edit → Save)

Free stays without Stripe Price.

## 6) Admin workflows

- **Plans**: create / edit price / entitlements → auto Stripe sync  
- **Users**: Assign plan (comped or Free), Cancel at period end, Keep (undo cancel)

## 7) User workflows

Account → **Billing** → Subscribe / Switch → Stripe Checkout → return  
**Manage billing** → Stripe Customer Portal
