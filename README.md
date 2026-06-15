# OrzuAI

Multi-channel inbox and CRM for WhatsApp, Telegram, Instagram, and website forms. Built with Next.js 15, Supabase, and optional Upstash (Redis + QStash).

## Quick start

```bash
cp .env.example .env.local
npm install
npm run validate:env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` → `.env.local`. Run `npm run validate:env` before deploy.

| Area | Required vars | Notes |
|------|---------------|-------|
| App | `NEXT_PUBLIC_APP_URL` | HTTPS in production (webhooks, auth redirects) |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Enable **Realtime** for `messages`, `conversations`, `message_deliveries` in Dashboard → Database → Replication |
| Cron | `CRON_SECRET` | Bearer token for `/api/cron/*` routes |
| AI | `GEMINI_API_KEY` | Primary LLM |
| Channels | WhatsApp / Instagram / Telegram vars | See `.env.example` per channel |

### Messaging scale (recommended production)

| Service | Env vars | Role |
|---------|----------|------|
| **Upstash Redis** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Hot cache for signed media URLs; probed on boot via `src/instrumentation.ts` |
| **QStash** | `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | Durable workers: webhooks, delivery, inbound media hydration, thumbnails |
| **Worker tuning** | `WORKER_CONCURRENCY` (default 5, max 25) | Parallel jobs per worker invocation |
| **Media CDN** | `MEDIA_CDN_URL` (optional) | CDN origin for signed chat media URLs |

### Cron schedule (Vercel Cron or external)

All cron routes: `GET` with header `Authorization: Bearer {CRON_SECRET}`.

| Route | Suggested interval | Purpose |
|-------|-------------------|---------|
| `/api/cron/messaging-health` | Every 2 min | Drain deliveries + media hydration; JSON health + queue lag alerts |
| `/api/cron/webhook-queue` | Every 1–2 min | Fallback webhook drain if QStash delayed |
| `/api/cron/message-deliveries` | Every 1–2 min | Fallback outbound delivery drain |

QStash worker URLs (configure in Upstash console):

- `/api/workers/webhook-queue`
- `/api/workers/inbound-media-hydration`
- `/api/workers/outbound-thumbnail`
- `/api/workers/message-deliveries`

### Supabase Realtime

Client subscriptions (authenticated user, RLS-scoped):

- **Inbox list** — `messages` INSERT, `conversations` INSERT/UPDATE (`use-inbox-list-realtime.ts`)
- **Open chat** — `messages` INSERT/UPDATE, `message_deliveries` INSERT/UPDATE (`use-conversation-realtime.ts`)
- **Broadcast** — typing + attachment metadata only (not delivery status)

Channel inbox uses `channel=eq.{channel}` server filter; monitor uses `business_id=eq.{id}`.

Apply pending migrations in `supabase/migrations/` before production deploy.

## Operations runbook

### Delivery backlog (`pendingDeliveries` high)

1. Check `/api/cron/messaging-health` JSON → `health.pendingDeliveries`, `queueLagAlerts`
2. Confirm QStash workers reachable (200 from worker URLs with valid signature)
3. Verify channel credentials (WhatsApp / Telegram / Instagram connected)
4. Cron fallback: hit `/api/cron/message-deliveries` manually
5. Inspect `message_deliveries` for `last_error`, `attempt_count`, `status=failed`

Recovery target: drain rate 200+/min with QStash + `WORKER_CONCURRENCY` tuned.

### Inbound media hydration stuck

1. Health snapshot: `pendingHydration`, `hydrationLagSeconds`, `staleProcessingHydration`
2. QStash worker: `/api/workers/inbound-media-hydration`
3. Cron drain included in `/api/cron/messaging-health`
4. Check `inbound_media_hydration_queue` for `status=processing` older than 5 min (auto-recovered on drain)

### Webhook queue lag

1. Health: `pendingWebhooks`, `webhookQueueLagSeconds`
2. Worker: `/api/workers/webhook-queue`
3. Fallback: `/api/cron/webhook-queue`
4. Load test: `npm run load-test:webhooks` (staging only)

### Redis unavailable

App falls back to Postgres `media_signed_url_cache`. Boot log: `[redis-cache] startup probe`. No hard failure.

## Load tests (staging)

```bash
npm run load-test:webhooks   # enqueue synthetic webhooks
npm run load-test:inbox      # concurrent list_inbox_conversations RPC
```

See `.env.example` → Load tests section for credentials.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run validate:env` | Validate `.env.local` |
| `npm run load-test:webhooks` | Webhook throughput harness |
| `npm run load-test:inbox` | Inbox concurrency harness |

## Architecture notes

- **Inbox data**: SSR hydrate → client session cache → server actions (no client bootstrap)
- **Media URLs**: client session cache → server Redis → Postgres → generate
- **Delivery status**: postgres realtime on `message_deliveries` only (no broadcast duplicate)
- **Unread writes**: max 2 per inbound message (`20250713120000_unread_trigger_batch.sql`)

Product roadmap: `TASKS.md` · Performance/reliability: `TasksCat.md`
