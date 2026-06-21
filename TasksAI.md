# TasksAI.md — AI Platform Production Roadmap

> Задачи из полного CTO-аудита AI-архитектуры (июнь 2026).  
> **Цель:** превратить OrzuAI из «AI-powered CRM inbox» в **реальную production AI-платформу**, готовую к 100 000 пользователей 24/7 без участия человека.  
> **North Star:** TTFAR < 10s · auto-reply success rate > 99.5% · zero lost replies on deploy · LLM cost predictable · product honest about what AI does.  
> **Приоритеты:** P0 = блокер production / потеря данных / trust · P1 = масштаб и надёжность · P2 = enterprise features · P3 = polish / future  
> **Правило:** работать строго по этому файлу; одна задача = один focused PR где возможно.  
> **Связь:** `TASKS.md` = продукт · `TasksCat.md` = Inbox/Messaging perf · **TasksAI.md** = AI Core only.

---

## Целевая архитектура (как должно быть)

```
Клиент → Webhook Queue (Postgres + QStash) → Message DB
                    ↓
         [Durable Job Queue — Redis/Postgres]
         debounce 1.5s per conversation (multi-instance safe)
                    ↓
    ┌───────────────────────────────────────────────┐
    │ PHASE 1 — Customer-facing (latency budget 8s) │
    │ AI Assistant (single voice, ai_assistant_profile)│
    │ + Vector RAG (top-k) + rolling summary memory  │
    │ 1× LLM (primary) → fallback chain if fail      │
    │ → send reply → log usage + agent_run           │
    └───────────────────────────────────────────────┘
                    ↓
    ┌───────────────────────────────────────────────┐
    │ PHASE 2 — Background (durable worker, not after())│
    │ Orchestrator → CRM Executor (typed tools)       │
    │ Human handoff · Follow-up schedule · Analytics  │
    │ All LLM calls metered · idempotent · retried    │
    └───────────────────────────────────────────────┘
```

### Принципы продукта (не нарушать)

| Принцип | Пояснение |
|---------|-----------|
| **Один голос для клиента** | AI Assistant — единственный, кто пишет клиенту. Агенты — CRM-исполнители, не чат-боты. |
| **Reply first, CRM after** | Клиент не ждёт orchestrator. Фон — durable queue, не `after()`. |
| **Честный UI** | Если агент не меняет текст — UI не обещает «5 разных AI». |
| **Meter everything** | Каждый LLM call в `ai_usage_logs` + plan limits. |
| **Fail open for customer** | LLM down → fallback provider или шаблон «мы скоро ответим». |
| **Fail closed for CRM** | CRM write без валидации — never. Retry + dead letter. |

---

## Статус фаз (обновлять при закрытии задач)

| Фаза | Название | Прогресс |
|------|----------|----------|
| A | Foundation — orchestrator rebuild | 12/14 |
| B | P0 — Reliability & trust blockers | 7/10 |
| C | P1 — Memory, RAG, LLM infra | 0/12 |
| D | P1 — Agents honesty & CRM tools | 0/8 |
| E | P2 — Observability & cost control | 0/9 |
| F | P2 — Scale (10k–100k users) | 0/10 |
| G | P3 — Enterprise & autonomous AI | 0/8 |

**Легенда:** `[x]` done · `[~]` partial · `[ ]` todo

---

## Уже сделано (baseline — не ломать)

* [x] AI Assistant profile (`ai_assistant_profile`) — единый голос бизнеса
* [x] Two-phase pipeline: fast reply → background orchestration (`auto-reply-pipeline.service.ts`)
* [x] `runAutoReplyOrchestrator` — intent + CRM plan в одном JSON (`ai-orchestrator.service.ts`)
* [x] CRM executor через `applyPreparedExecutorPlan` (`agent-task-executor.service.ts`)
* [x] Intent routing по goal агента, не keywords (`intent-router.service.ts`)
* [x] Human handoff: `ai_human_requests` + push + global overlay
* [x] Debounce 1.5s — durable Postgres queue (`ai_reply_jobs`) + QStash worker
* [x] Background orchestration — durable queue (`ai_orchestration_jobs`), not `after()`
* [x] Keyword knowledge retrieval (top 25 из 200 entries)
* [x] Follow-up agent cron 24h/48h (`follow-up-agent.service.ts`)
* [x] BANT scoring + sentiment + automations (parallel side effects)
* [x] Analytics Assistant для owner Q&A (`analytics-assistant.service.ts`)
* [x] AI nav: expandable sidebar AI Assistant / AI Agents
* [x] Webhook queue durable (Postgres + QStash) — см. `TasksCat.md`
* [~] Agent runs logging — partial (`agent_runs`, но `ai_agent_id` null на auto-replies)
* [~] AI usage limits — только fast path; background `skipUsageLimit: true`

---

# Фаза A — Orchestrator Rebuild (завершение)

> Большая часть сделана. Закрыть хвосты и dead code.

### AI-A-01 — Применить миграции в production Supabase

* [ ] **P0**

**Файлы:**
- `supabase/migrations/20250717120000_ai_assistant_profile.sql`
- `supabase/migrations/20250717130000_ai_agents_goal.sql`
- `supabase/migrations/20250717140000_agent_runs.sql`
- `supabase/migrations/20250717150000_ai_human_requests.sql`
- `supabase/migrations/20250717160000_ai_reply_orchestration_queues.sql`
- `supabase/migrations/20250717170000_ai_usage_call_type_and_fallback.sql`
- `supabase/migrations/20250717180000_agent_crm_idempotency.sql`
- `supabase/migrations/20250717200000_knowledge_embeddings.sql`
- `supabase/migrations/20250717201000_conversation_memory.sql`

**Acceptance:**
- Все 5 миграций applied без ошибок
- `ai_assistant_profile`, `ai_human_requests`, `agent_runs`, `ai_reply_jobs`, `ai_orchestration_jobs` существуют в prod

---

### AI-A-02 — Удалить dead code paths

* [ ] **P1**

**Файлы:**
- `src/utils/ai-agent-routing.ts` — `resolveAgentSystemPrompt` (не вызывается)
- `src/services/agent-task-executor.service.ts` — `executeAgentCrmActions`, `buildCrmActionsReplyContext`
- `src/docs/ai-architecture-refactor-plan.md` — обновить статус этапов

**Сделать:**
- Удалить или пометить `@deprecated` с комментарием «CRM-only agents»
- Убедиться grep = 0 callers перед удалением

**Acceptance:**
- `tsc --noEmit` pass
- Нет exported dead functions в hot path

---

### AI-A-03 — Документировать реальную архитектуру

* [ ] **P1**

**Файлы:**
- `docs/ai-assistant-orchestrator-plan.md` — актуализировать (reply-first уже done)
- `README.md` — секция «How AI works» (1 Assistant + background CRM)

**Acceptance:**
- Новый разработчик понимает систему за 10 минут без oral tradition

---

### AI-A-04 — Wire `ai_agent_id` в agent_runs для auto-reply

* [ ] **P2**

**Файлы:**
- `src/services/auto-reply-pipeline.service.ts`
- `src/services/agent-task-executor.service.ts`

**Сделать:**
- Log matched agent id из orchestrator routing в `agent_runs`
- Analytics Agents tab показывает реальную нагрузку

**Acceptance:**
- Agent analytics rollup ≠ 0 для businesses с активными агентами

---

# P0 — Critical Path (блокеры production и trust)

### AI-P0-01 — Durable auto-reply queue (убрать in-memory Map)

* [x] **P0**

**Проблема:** `pendingByConversation` в `auto-reply-queue.service.ts` — теряется при restart, race при multi-instance → duplicate/missed replies.

**Файлы:**
- `src/services/auto-reply-queue.service.ts`
- `src/services/auto-reply-pipeline.service.ts`
- Новый: `supabase/migrations/*_ai_reply_jobs.sql` или Redis sorted set

**Сделать:**
- Вариант A (рекомендуется): Postgres table `ai_reply_jobs` с `conversation_id`, `scheduled_at`, `status`, `SKIP LOCKED` worker
- Debounce: upsert job, push `scheduled_at` +1.5s на каждое новое сообщение
- Worker: cron + QStash dispatch (pattern как webhook queue)
- Убрать in-memory `Map` полностью

**Acceptance:**
- Deploy/restart mid-debounce → reply всё равно отправляется ровно 1 раз
- 2 Vercel instances на 1 conversation → 1 reply, не 2
- Load test: 100 concurrent conversations, 0 duplicate replies

---

### AI-P0-02 — Durable background orchestration (не `after()`)

* [x] **P0**

**Проблема:** `after()` может оборваться на serverless timeout → CRM не обновится, human request не создастся.

**Файлы:**
- `src/services/auto-reply-pipeline.service.ts` — `runAutoReplyBackgroundOrchestration`
- `src/services/messaging.service.ts`
- Новый: `ai_orchestration_jobs` table или reuse `ai_reply_jobs` phase 2

**Сделать:**
- После fast reply enqueue background job с payload `{ conversationId, messageId, businessId }`
- Worker route `/api/workers/ai-orchestration` + QStash
- Retry 3× с exponential backoff; dead letter + alert

**Acceptance:**
- Orchestrator выполняется даже если HTTP response уже закрыт
- Failed job visible в admin health endpoint
- CRM deal создаётся при valid orchestrator output после transient Gemini fail + retry

---

### AI-P0-03 — LLM provider fallback chain

* [x] **P0**

**Проблема:** Inbound hardcoded Gemini — SPOF. Gemini down = zero auto-replies.

**Файлы:**
- `src/services/llm.service.ts`
- `src/services/auto-reply-pipeline.service.ts`
- `src/lib/gemini/constants.ts`

**Сделать:**
- `generateWithFallback({ primary: 'gemini', fallbacks: ['openai', 'claude'] })`
- Config per business: platform keys vs BYOK (`prefer_customer_ai_keys` — реально wire)
- Log which provider used in `ai_usage_logs`
- Fast reply: try primary → fallback → template message «Мы получили ваше сообщение…»

**Acceptance:**
- Gemini 503 → OpenAI отвечает клиенту < 15s
- All providers down → graceful template, не silent fail
- Usage logged for each attempt

---

### AI-P0-04 — Meter ALL LLM calls (убрать skipUsageLimit)

* [x] **P0**

**Проблема:** Background orchestrator, sentiment, BANT — `skipUsageLimit: true` → cost explosion, plan limits обходятся.

**Файлы:**
- `src/services/auto-reply-pipeline.service.ts`
- `src/services/ai-orchestrator.service.ts`
- `src/services/sales-agent.service.ts`
- `src/services/ai-usage.service.ts`

**Сделать:**
- Каждый LLM call → `ai_usage_logs` с `call_type`: `auto_reply` | `orchestrator` | `sentiment` | `bant` | `follow_up`
- Plan limits: fast reply = hard block; background = soft cap + alert owner
- Dashboard: breakdown by call_type

**Acceptance:**
- 1 inbound message = 2–6 rows в usage log
- Agency plan 50k limit enforced across all call types
- Owner видит «Background AI: 12,400 calls this month»

---

### AI-P0-05 — UI honesty: Agents ≠ separate chat AI

* [ ] **P0** (product trust)

**Проблема:** UI обещает Sales/Support/Booking agents; клиент всегда слышит AI Assistant.

**Файлы:**
- `src/features/ai-assistant/agent-wizard-catalog.ts`
- `src/components/ai-assistant/*`
- `src/features/ai-assistant/constants.ts`

**Сделать:**
- Переименовать copy: «CRM Agents» / «Background executors»
- Wizard step: «This agent handles CRM tasks. All customer replies come from AI Assistant.»
- Убрать misleading icons «AI Sales Agent replies to customers»
- Channel AI settings: убрать или скрыть provider/model selector если не wired

**Acceptance:**
- Новый user не думает, что создаёт 5 chatbots
- Support ticket «agent doesn't reply differently» = 0

---

### AI-P0-06 — Orchestrator failure visibility

* [x] **P0**

**Проблема:** Invalid JSON / Gemini fail → silent skip CRM. Owner не знает.

**Файлы:**
- `src/services/ai-orchestrator.service.ts`
- `src/services/agent-task-executor.service.ts`
- `agent_runs` table

**Сделать:**
- Log `status: failed`, `error_code`, `raw_response` (truncated) в `agent_runs`
- Inbox badge или Settings alert: «AI CRM action failed — review»
- Retry orchestrator 1× on JSON parse fail

**Acceptance:**
- Owner видит failed orchestrator runs в Analytics → AI Ops
- No silent CRM skip without trace

---

### AI-P0-07 — Idempotent CRM executor

* [ ] **P0**

**Проблема:** Retry orchestrator job → duplicate deals/tasks.

**Файлы:**
- `src/services/agent-task-executor.service.ts`

**Сделать:**
- Idempotency key: `{conversationId}:{messageId}:{actionType}`
- Check existing before insert (partial exists for deals 24h — extend to all actions)
- Transaction wrapper для multi-action plans

**Acceptance:**
- Same job processed 2× → 1 deal, 1 task
- Partial failure → rollback or compensating log

---

### AI-P0-08 — Auto-reply error → customer-visible fallback

* [x] **P0**

**Проблема:** LLM fail → nothing sent; customer waits forever.

**Файлы:**
- `src/services/auto-reply-pipeline.service.ts`
- `src/services/messaging.service.ts`

**Сделать:**
- On total failure: send configurable fallback template from `ai_assistant_profile`
- Mark conversation `ai_status: error` for owner
- Push notification to owner

**Acceptance:**
- Gemini + OpenAI + Claude all fail → customer gets fallback within 20s
- Owner notified

---

### AI-P0-09 — Remove/wire dead channel AI settings

* [ ] **P0**

**Проблема:** `ai_settings.provider/model` per channel не влияет на inbound — misleading config.

**Файлы:**
- `src/services/channel-ai.service.ts` (или аналог)
- `src/components/ai-assistant/ChannelAiPanel.tsx`

**Сделать:**
- Либо wire settings в fast path
- Либо remove UI fields; document «Assistant uses platform Gemini»

**Acceptance:**
- Every visible setting changes behavior OR is removed

---

### AI-P0-10 — Health endpoint: AI subsystem

* [x] **P0**

**Файлы:**
- Новый: `src/services/ai-health.service.ts`
- `src/app/api/cron/ai-health/route.ts`

**Сделать:**
- Metrics: pending reply jobs, pending orchestration jobs, failed last 24h, avg latency p95
- Gemini/OpenAI reachability probe (cached 60s)
- Expose в cron JSON + optional dashboard widget

**Acceptance:**
- `/api/cron/ai-health` returns actionable snapshot
- Alert threshold: >50 pending jobs or >5% fail rate

---

# P1 — Memory, RAG, LLM Infrastructure

### AI-P1-01 — Vector embeddings для Knowledge Base

* [ ] **P1**

**Проблема:** Keyword ranking degrades with KB > 200 entries; no semantic search.

**Файлы:**
- `src/services/knowledge-retrieval.service.ts`
- `supabase/migrations/*_knowledge_embeddings.sql` — pgvector

**Сделать:**
- Embed on create/update knowledge entry (Gemini embedding API or OpenAI ada)
- Store `embedding vector(768)` on `knowledge_base`
- Retrieval: hybrid keyword + cosine top-k
- Reindex cron for `website_sync` entries

**Acceptance:**
- Query «сколько стоит доставка» finds «pricing shipping» entry
- Retrieval p95 < 100ms for 10k entries
- Fallback to keyword if embedding fail

---

### AI-P1-02 — Conversation rolling summary (long-term memory)

* [ ] **P1**

**Проблема:** LLM sees only last 20 messages; 100+ message dialogs = amnesia.

**Файлы:**
- `supabase/migrations/*_conversation_summaries.sql`
- `src/services/conversation-memory.service.ts` (new)

**Сделать:**
- Every 10 messages: background job summarizes → `conversations.ai_summary`
- Inject summary + last 20 messages in prompt
- Update `contacts.ai_summary` on significant events

**Acceptance:**
- Message 100: model knows intent from message 5
- Summary < 500 tokens
- No blocking fast reply path

---

### AI-P1-03 — CRM context in replies (wire dead code or replace)

* [ ] **P1**

**Проблема:** `buildCrmActionsReplyContext` never called — AI doesn't know deal stage when replying.

**Файлы:**
- `src/services/auto-reply-pipeline.service.ts`
- `src/services/agent-task-executor.service.ts`

**Сделать:**
- Load lightweight CRM snapshot (deal stage, open tasks, lead score) before fast reply
- Cap at 800 chars in system prompt
- OR delete dead code and document «CRM affects background only»

**Acceptance:**
- Customer asks «какой статус моего заказа» → AI uses CRM if data exists

---

### AI-P1-04 — Native tool calling для CRM executor

* [ ] **P1**

**Проблема:** JSON-in-prompt fragile; schema drift breaks silently.

**Файлы:**
- `src/services/ai-orchestrator.service.ts`
- `src/services/agent-task-executor.service.ts`

**Сделать:**
- Gemini function declarations: `create_deal`, `create_task`, `update_contact`, `request_human`
- Zod validate tool args server-side
- Keep JSON fallback for 1 release

**Acceptance:**
- Invalid tool args → structured error + retry
- Schema changes caught by TypeScript + Zod

---

### AI-P1-05 — Context window strategy

* [ ] **P1**

**Файлы:**
- `src/lib/gemini/constants.ts` — `GEMINI_MAX_HISTORY_MESSAGES = 20`
- `src/services/auto-reply-pipeline.service.ts`

**Сделать:**
- Tiered context: summary + 20 recent + knowledge top-k
- Configurable per plan (Pro: 40 messages)
- Token budget calculator before LLM call

**Acceptance:**
- No prompt overflow errors at max history
- Documented limits in Settings UI

---

### AI-P1-06 — Follow-up cron: indexed job queue

* [ ] **P1**

**Проблема:** O(n) scan all conversations every cron tick — breaks at 10k+.

**Файлы:**
- `src/services/follow-up-agent.service.ts`
- `supabase/migrations/*_follow_up_queue.sql`

**Сделать:**
- Schedule follow-up at reply time → `follow_up_jobs(scheduled_at, conversation_id)`
- Cron processes due jobs only (index on `scheduled_at`)
- Dedup via existing `conversation_follow_ups`

**Acceptance:**
- 50k conversations: cron completes < 30s
- No full table scan

---

### AI-P1-07 — Instagram channel parity

* [ ] **P1**

**Проблема:** Follow-up/automation skip Instagram; `isChannelConnected` returns false.

**Файлы:**
- `src/services/follow-up-agent.service.ts`
- `src/services/automations.service.ts`

**Сделать:**
- Wire Instagram send path or explicit UI «Instagram: auto-reply only, no follow-up»

**Acceptance:**
- No silent skip; behavior documented per channel

---

### AI-P1-08 — Suggest reply uses same pipeline as auto-reply

* [ ] **P1**

**Файлы:**
- `src/services/messaging.service.ts` — `suggestConversationReply`
- `src/services/auto-reply-pipeline.service.ts`

**Сделать:**
- Shared `buildAssistantPromptContext()`
- Same knowledge + memory + profile

**Acceptance:**
- Suggest reply quality = auto-reply quality

---

### AI-P1-09 — Website form follow-up unified pipeline

* [ ] **P1**

**Файлы:**
- `src/services/website-forms.service.ts`

**Сделать:**
- Use `generateFastAssistantReply` + background orchestration
- Remove duplicate LLM paths

**Acceptance:**
- 1 code path for all channels

---

### AI-P1-10 — Knowledge fetch optimization

* [ ] **P1**

**Проблема:** 200 rows fetched per message.

**Файлы:**
- `src/services/knowledge-retrieval.service.ts`

**Сделать:**
- After vector RAG: fetch only top-k ids
- Cache per business 5 min (Redis)

**Acceptance:**
- Knowledge step < 50ms p95

---

### AI-P1-11 — Voice agent memory alignment

* [ ] **P2**

**Файлы:**
- Voice session services

**Сделать:**
- Share conversation summary with voice sessions
- 8-turn limit documented; optional CRM context injection

**Acceptance:**
- Voice + chat consistent on same contact

---

### AI-P1-12 — Platform copilot isolation audit

* [ ] **P2**

**Файлы:**
- `src/services/platform-copilot.service.ts`

**Сделать:**
- Confirm no customer data leak into platform copilot
- Separate usage logging

**Acceptance:**
- Security review pass

---

# P1 — Agents Honesty & CRM Tools

### AI-P1-A01 — Booking/Scheduler: real calendar integration

* [ ] **P1**

**Проблема:** «Booking agent» creates CRM task only — no calendar.

**Сделать:**
- Google Calendar OAuth + `create_event` tool
- OR Calendly link injection in Assistant prompt
- UI: «Connect calendar» in agent wizard

**Acceptance:**
- Customer «запишите на завтра 15:00» → calendar event OR Calendly link sent

---

### AI-P1-A02 — Qualification agent = BANT (rename + docs)

* [ ] **P1**

**Сделать:**
- UI label: «Lead Qualification (BANT scoring)»
- Explain: updates lead_score, doesn't change chat voice

**Acceptance:**
- No separate «Qualification Agent» chat promise

---

### AI-P1-A03 — Sales agent routing rules UI

* [ ] **P2**

**Файлы:**
- Automations / agent settings

**Сделать:**
- Visual rule: if lead_score > 70 → create deal + notify owner
- Test button with sample message

**Acceptance:**
- Owner configures without editing JSON

---

### AI-P1-A04 — End-of-conversation CRM batch (optional mode)

* [ ] **P2**

**Проблема:** CRM runs every message — noisy for long chats.

**Сделать:**
- Setting: «CRM update: every message | on idle 5min | on resolve»
- Idle detector job

**Acceptance:**
- Long chat → 1 consolidated CRM update on resolve

---

### AI-P1-A05 — Human handoff SLA + escalation

* [ ] **P1**

**Файлы:**
- `src/services/ai-human-request.service.ts`

**Сделать:**
- If no accept in 5 min → notify next team member
- If declined → AI sends polite message (exists) + log
- Metrics: avg time to accept

**Acceptance:**
- Handoff SLA visible in Analytics

---

### AI-P1-A06 — Agent templates match reality

* [ ] **P1**

**Файлы:**
- `src/features/ai-assistant/agent-wizard-catalog.ts`

**Сделать:**
- Each template lists: CRM actions enabled, NOT customer voice
- Preview: «Sample CRM actions for this goal»

**Acceptance:**
- Template «Booking» requires calendar connect or shows warning

---

### AI-P1-A07 — CRM executor action audit log

* [ ] **P2**

**Сделать:**
- `crm_action_log`: who (ai_agent_id), what, when, message_id
- Visible in contact activity timeline

**Acceptance:**
- Owner sees «AI created deal $500» with trace

---

### AI-P1-A08 — Wire `prefer_customer_ai_keys`

* [ ] **P2**

**Файлы:**
- `src/services/llm.service.ts`
- Business settings

**Сделать:**
- BYOK Gemini/OpenAI keys per business
- Fallback to platform keys if BYOK fail

**Acceptance:**
- Agency client uses own API key; usage still logged

---

# P2 — Observability & Cost Control

### AI-P2-01 — OpenTelemetry / LLM tracing

* [ ] **P2**

**Сделать:**
- Span per LLM call: model, tokens, latency, conversation_id
- Export to console → Sentry/Datadog ready

**Acceptance:**
- Debug slow reply: see which step took 8s

---

### AI-P2-02 — AI ops dashboard

* [ ] **P2**

**Файлы:**
- Analytics → AI Ops tab (extend)

**Сделать:**
- Reply latency p50/p95, success rate, fallback rate
- Cost per business per day
- Top failure reasons

**Acceptance:**
- Owner answers «why AI slow yesterday» from UI

---

### AI-P2-03 — Rate limiting Gemini calls per business

* [ ] **P2**

**Сделать:**
- Token bucket: max N concurrent LLM calls per business
- Queue excess; prevent one tenant starving others

**Acceptance:**
- 1 business spam → others unaffected

---

### AI-P2-04 — Prompt injection guardrails

* [ ] **P2**

**Сделать:**
- System prompt hardening
- Detect «ignore previous instructions» patterns
- Log suspicious messages

**Acceptance:**
- Basic jailbreak tests documented

---

### AI-P2-05 — PII handling in logs

* [ ] **P2**

**Сделать:**
- Redact phone/email in `agent_runs.raw_response`
- Retention policy: 90 days

**Acceptance:**
- GDPR-friendly logging

---

### AI-P2-06 — Alerting rules

* [ ] **P2**

**Сделать:**
- Email owner when: fail rate > 10%, queue lag > 5 min, usage > 90% plan

**Acceptance:**
- Alerts fire in staging test

---

### AI-P2-07 — Load test: AI auto-reply path

* [ ] **P2**

**Сделать:**
- `npm run load-test:ai-replies` — 100 msg/min × 10 min
- Measure duplicate rate, p95 latency

**Acceptance:**
- Document baseline in README

---

### AI-P2-08 — Cost caps per plan (hard stop)

* [ ] **P2**

**Сделать:**
- Agency: $X/month AI cost cap → disable background LLM, keep fast reply

**Acceptance:**
- No surprise $10k Gemini bill

---

### AI-P2-09 — Structured eval suite

* [ ] **P3**

**Сделать:**
- 50 golden Q&A pairs per vertical
- CI regression: reply quality score ≥ threshold

**Acceptance:**
- Prompt change triggers eval in CI

---

# P2 — Scale (10k → 100k users)

### AI-P2-S01 — Multi-region LLM routing

* [ ] **P2**

**Сделать:**
- Route EU businesses → EU Gemini endpoint if available
- Latency-based provider selection

**Acceptance:**
- Document data residency

---

### AI-P2-S02 — Background worker dedicated service

* [ ] **P2**

**Сделать:**
- Extract AI workers from Vercel serverless → Railway/Fly long-running
- Or: QStash-only with generous timeout

**Acceptance:**
- Background job success rate > 99.9%

---

### AI-P2-S03 — Batch knowledge embedding pipeline

* [ ] **P2**

**Сделать:**
- Async embed on bulk website sync
- Progress UI in Knowledge settings

**Acceptance:**
- 1000-page site sync doesn't block API

---

### AI-P2-S04 — Conversation memory partition strategy

* [ ] **P2**

**Сделать:**
- Archive messages > 90 days to cold storage
- Summary always hot

**Acceptance:**
- Query performance stable at 10M messages

---

### AI-P2-S05 — Gemini quota management

* [ ] **P2**

**Сделать:**
- Platform-level quota pool + per-tenant allocation
- Queue when quota exceeded; priority: fast reply > background

**Acceptance:**
- 100k users model documented with quota math

---

### AI-P2-S06 — Horizontal auto-reply workers

* [ ] **P2**

**Сделать:**
- N workers claim from `ai_reply_jobs` with concurrency limit
- Metrics: worker utilization

**Acceptance:**
- Scale workers without code change

---

### AI-P2-S07 — Cache assistant profile + knowledge index

* [ ] **P2**

**Сделать:**
- Redis cache: profile, embedding index metadata
- Invalidate on settings save

**Acceptance:**
- DB reads per reply reduced 50%

---

### AI-P2-S08 — Reduce LLM fan-out per message

* [ ] **P2**

**Проблема:** Up to 6 Gemini calls per inbound message.

**Сделать:**
- Merge sentiment + BANT into orchestrator (1 call) OR run on idle
- Config: «Light mode» = fast reply only

**Acceptance:**
- Default path ≤ 2 LLM calls per message
- «Full AI» mode opt-in

---

### AI-P2-S09 — Database indexes for AI tables

* [ ] **P2**

**Сделать:**
- Index `agent_runs(business_id, created_at)`
- Index `ai_usage_logs(business_id, created_at)`
- Index `ai_human_requests(status, business_id)`

**Acceptance:**
- Analytics queries < 200ms at 1M rows

---

### AI-P2-S10 — Disaster recovery runbook

* [ ] **P2**

**Сделать:**
- README: Gemini outage, Supabase outage, queue backlog
- RTO/RPO targets

**Acceptance:**
- On-call can execute without founder

---

# P3 — Enterprise & Autonomous AI

### AI-P3-01 — Public REST API for AI actions

* [ ] **P3**

**Сделать:**
- API keys, scopes: read conversations, trigger reply, CRM write

---

### AI-P3-02 — Agentic loop (ReAct) — spike only

* [ ] **P3**

**Сделать:**
- Spike: multi-step tool use for complex booking flow
- Not for v1 production

---

### AI-P3-03 — Multi-language auto-detect + reply

* [ ] **P3**

**Сделать:**
- Detect RU/UZ/EN; reply in same language

---

### AI-P3-04 — AI Agent Store (marketplace)

* [ ] **P3**

**Сделать:**
- Pre-built CRM agent templates with calendar integrations

---

### AI-P3-05 — Autonomous follow-up planning

* [ ] **P3**

**Сделать:**
- LLM plans follow-up timing/content vs fixed 24h/48h

---

### AI-P3-06 — Cross-conversation memory (contact-level)

* [ ] **P3**

**Сделать:**
- Remember preferences across WhatsApp + Telegram same contact

---

### AI-P3-07 — SSO + audit log for AI settings changes

* [ ] **P3**

---

### AI-P3-08 — SOC2-ready AI data handling doc

* [ ] **P3**

---

# Рекомендуемый порядок спринтов

### Sprint AI-1 (5–7 дней) — «Never lose a reply» ✅ DONE

1. [x] AI-P0-01 Durable auto-reply queue
2. [x] AI-P0-02 Durable background orchestration
3. [x] AI-P0-10 AI health endpoint
4. [~] AI-A-01 Apply migrations (SQL ready; apply in Supabase dashboard)

**Exit:** restart/multi-instance safe; CRM jobs durable; health visible

---

### Sprint AI-2 (5–7 дней) — «LLM never silent» ✅ DONE

1. [x] AI-P0-03 Provider fallback chain
2. [x] AI-P0-08 Customer fallback message
3. [x] AI-P0-04 Meter all LLM calls
4. [x] AI-P0-06 Orchestrator failure visibility

**Exit:** Gemini down → customer still gets reply; all calls logged

---

### Sprint AI-3 (5–7 дней) — «Product trust»

1. [x] AI-P0-05 UI honesty (CRM Agents)
2. [x] AI-P0-09 Wire or remove channel AI settings
3. [x] AI-P0-07 Idempotent CRM executor
4. [x] AI-A-02 Remove dead code

**Exit:** UI matches reality; no misleading settings

---

### Sprint AI-4 (7–10 дней) — «Memory & RAG»

1. [x] AI-P1-01 Vector embeddings
2. [x] AI-P1-02 Conversation summaries
3. [x] AI-P1-03 CRM context in replies
4. [x] AI-P1-05 Context window strategy

**Exit:** long conversations work; semantic knowledge search

---

### Sprint AI-5 (7–10 дней) — «Tools & scale prep»

1. [ ] AI-P1-04 Native tool calling
2. [ ] AI-P1-06 Follow-up indexed queue
3. [ ] AI-P2-S08 Reduce LLM fan-out
4. [ ] AI-P2-07 Load test AI path

**Exit:** ≤2 LLM calls/msg default; follow-up scales

---

### Sprint AI-6 (7–10 дней) — «Observability & cost»

1. [ ] AI-P2-01 LLM tracing
2. [ ] AI-P2-02 AI ops dashboard
3. [ ] AI-P2-03 Rate limiting
4. [ ] AI-P2-06 Alerting

**Exit:** ops can run platform without guessing

---

### Sprint AI-7+ — «Enterprise» (ongoing)

- Calendar integration (AI-P1-A01)
- Scale workers (AI-P2-S02, S06)
- Enterprise API (AI-P3-01)

---

# Manual QA checklist (после каждого AI спринта)

- [ ] New WhatsApp message → AI reply < 10s (p95)
- [ ] Send 3 messages rapid → exactly 1 reply (debounce)
- [ ] Deploy during debounce → reply still sent once
- [ ] Gemini mock fail → fallback provider or template reply
- [ ] Orchestrator creates deal → visible in CRM within 30s
- [ ] Orchestrator fail → visible in AI Ops / agent_runs
- [ ] Human handoff → overlay → accept → AI stops
- [ ] Human decline → customer gets polite message
- [ ] 100-message thread → AI remembers early context (after P1-02)
- [ ] Knowledge semantic query finds correct entry (after P1-01)
- [ ] Usage dashboard counts background LLM calls
- [ ] Plan limit reached → fast reply blocked with clear message

---

# Метрики успеха (target)

| Metric | Current (est.) | Target (production) |
|--------|----------------|---------------------|
| Auto-reply success rate | ~95% (Gemini SPOF) | **> 99.5%** |
| Auto-reply p95 latency | 5–15s | **< 8s** |
| Lost replies on deploy | Possible | **0** |
| Duplicate replies (scale-out) | Possible | **0** |
| LLM calls per inbound msg | 4–6 (uncapped bg) | **≤ 2 default** |
| CRM actions lost (silent) | Unknown | **0** (all logged) |
| Long conversation memory | 20 msgs | **summary + 20** |
| Knowledge retrieval @ 10k entries | Degraded keyword | **< 100ms vector** |
| Concurrent conversations (comfortable) | ~500 | **10,000+** |
| Production Readiness Score | 4.5/10 | **8/10** |
| Enterprise Readiness (100k) | 2.5/10 | **7/10** |

---

# Production Readiness Scorecard (обновлять после спринтов)

| Область | Сейчас | Target | Задачи |
|---------|--------|--------|--------|
| AI Architecture | 5 | 8 | P0-01..03, P1-04 |
| Agent System | 3 | 7 | P0-05, P1-A* |
| Memory System | 3 | 8 | P1-01, P1-02 |
| Tool System | 4 | 8 | P1-04, P1-A01 |
| Reliability | 4 | 9 | P0-01..03, P0-08 |
| Scalability | 2 | 7 | P2-S*, P1-06 |
| Monitoring | 3 | 8 | P0-10, P2-01..02 |
| Security | 5 | 8 | P2-04, P2-05 |

**Overall Production Readiness:** 4.5 → **8.0** (after Sprint AI-1..6)  
**Enterprise Readiness (100k autonomous):** 2.5 → **7.0** (after Sprint AI-7+)

---

# Топ-20 критических проблем (из аудита → задачи)

| # | Проблема | Severity | Task ID |
|---|----------|----------|---------|
| 1 | In-memory auto-reply debounce | P0 | AI-P0-01 |
| 2 | Gemini SPOF, no fallback | P0 | AI-P0-03 |
| 3 | Fake multi-agent UI | P0 | AI-P0-05 |
| 4 | Uncapped background LLM cost | P0 | AI-P0-04 |
| 5 | No vector RAG | P1 | AI-P1-01 |
| 6 | 20-message amnesia | P1 | AI-P1-02 |
| 7 | Silent orchestrator failure | P0 | AI-P0-06 |
| 8 | Follow-up O(n) scan | P1 | AI-P1-06 |
| 9 | No LLM observability | P2 | AI-P2-01 |
| 10 | `after()` drops background jobs | P0 | AI-P0-02 |
| 11 | JSON-not-tools fragile | P1 | AI-P1-04 |
| 12 | CRM not in reply context | P1 | AI-P1-03 |
| 13 | Agent analytics underreports | P2 | AI-A-04 |
| 14 | No calendar tool | P1 | AI-P1-A01 |
| 15 | Plan quotas bypassed | P0 | AI-P0-04 |
| 16 | No conversation summarization | P1 | AI-P1-02 |
| 17 | Dead code / architecture drift | P1 | AI-A-02 |
| 18 | Side-effect LLM race | P2 | AI-P2-S08 |
| 19 | Knowledge 200-row fetch | P1 | AI-P1-10 |
| 20 | No DR / multi-region | P2 | AI-P2-S10 |

---

# CTO Verdict (baseline)

**Сейчас:** OrzuAI — хороший AI-powered CRM inbox для SMB.  
**Не готов:** к 100k users 24/7 autonomous без Sprint AI-1..6.  
**Первый шаг:** Sprint AI-1 — durable queues (P0-01, P0-02). Без этого любой deploy = roulette.

---

# Связь с другими файлами

| Файл | Scope |
|------|-------|
| `TASKS.md` | Продуктовые фичи, CRM, billing, integrations |
| `TasksCat.md` | Inbox/Messaging performance & webhook queue |
| `TasksAI.md` | **AI Core: LLM, agents, memory, tools, scale** |
| `docs/ai-assistant-orchestrator-plan.md` | Vision doc (Assistant + CRM agents) |

**Не дублировать:** webhook queue, delivery, hydration → см. `TasksCat.md`  
**Дублировать только если AI-specific:** e.g. AI reply job queue ≠ message delivery queue

---

*Последнее обновление: 2026-06-02 · источник: CTO AI Architecture Audit · commit baseline: `1280974`*
