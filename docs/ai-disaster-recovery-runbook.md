# OrzuX AI — disaster recovery runbook

Targets: **RTO 30 min** (customer replies flowing again), **RPO 0** for queued jobs (Postgres is source of truth).

## 1. Gemini / LLM provider outage

**Symptoms:** Spike in `ai_usage_logs` failures, auto-replies fall back to template text, orchestrator jobs retry.

**Actions:**

1. Check `/api/cron/ai-health` (authorized cron) — `health.llmFailureRate`, queue lag.
2. Confirm env keys: `GEMINI_API_KEY`, optional BYOK keys in `business_ai_provider_keys`.
3. If platform-wide outage: enable maintenance message via `ai_assistant_profile.fallback_reply_message` for affected businesses (support script) or wait for provider recovery.
4. After recovery: cron drains `ai_reply_jobs` and `ai_orchestration_jobs` automatically; no manual replay unless jobs are `failed`.

**Do not:** Delete pending queue rows unless duplicate customer messages are confirmed.

## 2. Supabase / Postgres unavailable

**Symptoms:** All webhooks 5xx, workers cannot claim jobs.

**Actions:**

1. Check [Supabase status](https://status.supabase.com) and project dashboard.
2. Pause inbound marketing traffic if needed; channels may buffer webhooks externally (Meta/Twilio) — watch webhook retry windows.
3. When DB returns: run `GET /api/cron/ai-health` once to drain queues and recover stale `processing` jobs (>2 min).

## 3. Queue backlog (reply lag > 60s)

**Symptoms:** `ai-health` shows high `replyQueue.lagSeconds`, customers wait for answers.

**Actions:**

1. Scale Vercel/server concurrency: set `WORKER_CONCURRENCY` (default 5, max 25).
2. Tune batch drain: `AI_QUEUE_BATCH_SIZE`, `AI_QUEUE_MAX_DRAIN_BATCHES`.
3. Verify QStash worker routes (`qstash-ai-reply-worker`) are receiving dispatches.
4. Check for stuck `processing` — stale recovery runs on each drain.
5. Load test baseline: `npm run load-test:ai-replies` on staging only.

## 4. Orchestration silent failures

**Symptoms:** Customer got reply but CRM empty; `agent_runs.success = false` or `ai_orchestration_jobs.status = failed`.

**Actions:**

1. AI Ops dashboard — failed runs, booking failures.
2. Query recent `agent_tool_audit_events` for tool errors.
3. Re-enqueue: fix root cause, then manually insert `ai_orchestration_jobs` only if idempotency key is new (prefer letting customer send another message).

## 5. Redis (Upstash) cache miss

**Symptoms:** Higher DB load; no user-facing break — KB/profile cache degrades gracefully.

**Actions:**

1. Confirm `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
2. Restart app; startup probe logs `[redis-cache] startup probe: ok`.

## 6. Escalation

| Severity | Who | When |
|----------|-----|------|
| P1 | On-call engineer | No auto-replies > 15 min in production |
| P2 | On-call engineer | CRM orchestration failure rate > 5% / 1 h |
| P3 | Product | Light vs full AI intensity misconfiguration |

Keep this runbook next to `TasksAI.md` and `.cursor/plans/ai-customer-actions-master-plan.md`.
