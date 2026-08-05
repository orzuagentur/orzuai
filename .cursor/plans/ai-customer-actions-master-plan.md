# OrzuX — Master Plan: AI общение + CRM/календарь + уведомления менеджерам

> **Статус:** `APPROVED` (2026-08-05 — пользователь: «делай»).
>
> **Дата аудита:** 2026-08-05  
> **Источники:** код репозитория, `TasksAI.md`, `docs/ai-assistant-orchestrator-plan.md`, субагенты explore + ai-engineer + architecture-planner.

---

## 1. Цель («100% рабочий AI»)

Автономный AI для клиента, который:

1. **Отвечает** в подключённых каналах (единый голос `ai_assistant_profile`, RAG + память).
2. **Действует** после ответа (или синхронно для брони/заказа): CRM, сделки, задачи менеджерам, поля клиента, заметки.
3. **Бронирует**: события/слоты в календаре, напоминания, reschedule/cancel — безопасно по контакту.
4. **Эскалирует**: human handoff, `managerAlert`, push/in-app уведомления, SLA.
5. **Надёжен**: durable очереди, idempotency, observability, без «тихих» пропусков CRM.

**North Star (из TasksAI):** TTFAR p95 &lt; 8s · success auto-reply &gt; 99.5% · 0 duplicate/lost replies · 0 silent CRM failures.

---

## 2. Целевая архитектура (как должно работать)

```
Клиент (канал) → ingest → ai_reply_jobs (debounce)
                              ↓
              ┌───────────────────────────────────────┐
              │ PHASE 1 — клиент ждёт (≤8s)         │
              │ prepareAutoReplyContext               │
              │   RAG + memory + CRM snapshot + booking│
              │ generateAssistantReplyWithFallback    │
              │ → sendChannelAutoReplyText            │
              └───────────────────────────────────────┘
                              ↓
              ┌───────────────────────────────────────┐
              │ PHASE 2 — фон (durable)               │
              │ ai_orchestration_jobs → worker        │
              │ runAutoReplyOrchestrator (tools/JSON) │
              │ filterExecutorPlanByProfile           │
              │ applyPreparedExecutorPlan (idempotent)  │
              │ handoff + reportAgentActions → notify │
              └───────────────────────────────────────┘
```

**Принципы (не ломать):**

| Принцип | Смысл |
|---------|--------|
| Один голос | Только Assistant пишет клиенту; orchestrator — план, executor — CRM. |
| Reply first | Клиент не ждёт orchestrator (кроме явного sync-path для booking/order). |
| Fail open (клиент) | Fallback LLM / шаблон «скоро ответим». |
| Fail closed (CRM) | Zod + permissions + idempotency; retry + dead letter. |
| Handoff = стоп AI | После принятия handoff — **нет** auto-reply до resolve. |

---

## 3. Аудит: текущее состояние (2026-08-05)

### 3.1 Что уже работает (production-grade)

| Область | Статус | Ключевые файлы |
|---------|--------|----------------|
| Debounce + reply queue | ✅ Postgres `ai_reply_jobs`, QStash, cron health | `ai-reply-queue.service.ts`, `messaging.service.ts` |
| Fast reply | ✅ RAG, memory, CRM snapshot, booking context | `auto-reply-pipeline.service.ts` |
| Orchestration queue | ✅ `ai_orchestration_jobs`, retry, stale recovery | `ai-orchestration-queue.service.ts` |
| Orchestrator | ✅ Gemini tools + JSON fallback + Zod | `ai-orchestrator.service.ts`, `lib/ai/tools/*` |
| CRM executor | ✅ 21+ actions, idempotency | `agent-task-executor.service.ts`, `lib/crm/executor-idempotency.ts` |
| Calendar booking | ✅ `create_calendar_event` → `createAiCalendarBooking` | `ai-calendar-booking.service.ts` |
| Handoff + notify | ✅ `ai_human_requests`, push, action notifications | `ai-human-request.service.ts`, `agent-action-reporting.service.ts` |
| Каналы (ядро) | ✅ WA, TG, email, voice SMS, voice notes | respective `*.service.ts` |

**TasksAI фазы A–D** в коде в основном соответствуют заявленному (очереди, two-phase, tools).

### 3.2 Критические разрывы (блокируют «100%»)

| ID | Проблема | Влияние |
|----|----------|---------|
| **GAP-P0-01** | **Website chat** не вызывает `scheduleDebouncedChannelAutoReply` — только `scheduleInboundMessageEffects` | Канал с AI toggle без ответов |
| **GAP-P0-02** | **Handoff не останавливает** auto-reply (`processChannelAutoReply` не проверяет pending `ai_human_requests`) | AI продолает писать после «перехвата» |
| **GAP-P0-03** | **Website forms** — статический ack, не pipeline LLM/orchestrator (TasksAI P1-09 помечен [x], код — нет) | Ложное ожидание «полного AI» |
| **GAP-P0-04** | **Нет contact** → executor пропускает CRM, если модель не добавила `create_contact` | Потеря сделок/задач в анонимных тредах |
| **GAP-P1-01** | **Voice Phase 2** — `void runVoiceTurnOrchestration`, не `ai_orchestration_jobs` | CRM после звонка может не выполниться |
| **GAP-P1-02** | **Instagram** — outbound disabled, inbound отсутствует | «Мёртвый» канал в UI |
| **GAP-P1-03** | **Двойной handoff** — `request_human` в executor + `createAiHumanRequest` в tail pipeline | Дубли уведомлений |
| **GAP-P1-04** | **Calendar reschedule/cancel by eventId** без привязки к contact | Риск cross-customer |
| **GAP-P1-05** | **Orchestrator без RAG/memory** (только 8 turns + CRM JSON) | Расхождение reply vs CRM plan |
| **GAP-P2-01** | LLM fan-out 3–4+ (reply + orchestrator + BANT + summary) | Стоимость, latency |
| **GAP-P2-02** | Нет integration tests на executor/tools | Регрессии не ловятся |
| **GAP-P2-03** | `logAgentToolAudit` — console only | Слепая поддержка |
| **GAP-P2-04** | Schema drift (order fields, max 5 vs 10 actions) | validation_failed → missed CRM |
| **GAP-P2-05** | Phase E/F TasksAI (observability, load-test AI) — 0% | Нельзя доказать 99.5% / 100k |

### 3.3 Матрица действий AI (executor)

| Действие | Wired | Idempotent | Тесты | Заметка |
|----------|-------|------------|-------|---------|
| create/update contact, lead | ✅ | ✅ | ❌ | |
| create_deal, update_deal, stage | ✅ | ✅ | ❌ | |
| create_task, update_task_status | ✅ | ✅ | ❌ | + зеркало в календарь best-effort |
| create_order | ✅ | ✅ | ❌ | schema drift риск |
| update_collected_fields | ✅ | ✅ | ❌ | gate для deal/order/booking |
| create_calendar_event | ✅ | ✅ | ❌ | sync path для booking phrases |
| list/reschedule/cancel booking | ✅ | partial | ❌ | eventId scope — fix |
| schedule_follow_up, request_human | ✅ | ✅ | ❌ | dedupe handoff |
| send_customer_message | ✅ | ✅ | ❌ | дубль с auto-reply |
| add_note / internal_note | ✅ | ✅ | ❌ | |

---

## 4. План улучшения (порядок выполнения)

> **Правило реализации:** один focused PR на шаг где возможно; после миграций — `apply_migration` через MCP; regression: `tsc`, golden-path script, manual QA row.

### Фаза 0 — Согласование и baseline (0.5 дня)

| Шаг | Задача | Deliverable |
|-----|--------|-------------|
| **0.1** | Пользователь одобряет этот файл | Статус → `APPROVED` |
| **0.2** | Зафиксировать **каналы v1** (WA/TG/email/web chat/forms/voice) и честность UI для Instagram | Decision log в README |
| **0.3** | Прогнать staging smoke: 1 диалог WA → reply + CRM | Чеклист в §7 |

### Фаза 1 — P0 «клиент + доверие» (3–5 дней)

| Шаг | ID | Работа | Файлы (ориентир) |
|-----|-----|--------|------------------|
| **1.1** | GAP-P0-01 | После inbound web chat → `scheduleInboundMessageProcessing` / debounced auto-reply (как WA) | `website-chat.service.ts`, `messaging.service.ts` |
| **1.2** | GAP-P0-02 | Gate auto-reply: pending/open `ai_human_requests` или `conversation.ai_paused` / assigned human | `messaging.service.ts`, `ai-human-request.service.ts`, при необходимости migration |
| **1.3** | GAP-P0-04 | Pre-executor: если нет contact — inject `create_contact` или auto-create minimal contact из conversation | `auto-reply-pipeline.service.ts`, `agent-task-executor.service.ts` |
| **1.4** | GAP-P1-03 | Единый путь handoff: executor **или** tail, shared idempotency key | `human-handoff-policy.ts`, pipeline tail |
| **1.5** | GAP-P1-04 | Contact-scope для calendar mutate by `eventId` | `agent-task-executor.service.ts`, calendar services |
| **1.6** | — | Manual QA matrix §7 — все P0 строки green | `TasksAI.md` update |

### Фаза 2 — P1 «каналы и durability» (3–4 дня)

| Шаг | ID | Работа | Файлы |
|-----|-----|--------|-------|
| **2.1** | GAP-P0-03 | Forms: enqueue full pipeline **или** явно product scope «orders + template» + UI/docs | `website-forms.service.ts` |
| **2.2** | GAP-P1-01 | Voice orchestration → `scheduleCrmOrchestration` / shared worker | `voice-orchestrator.service.ts` |
| **2.3** | GAP-P1-02 | Instagram: скрыть AI в UI **или** restore (отдельное решение 0.2) | integrations UI, `deliver-text.ts` |
| **2.4** | GAP-P1-05 | Trim RAG + memory summary в `buildOrchestratorPrompt` | `ai-orchestrator.service.ts` |
| **2.5** | GAP-P2-04 | Align JSON schema / Gemini tools с Zod (order, collection keys); max actions | `orchestrator-json-schema.ts`, `orchestrator-gemini.ts`, types |
| **2.6** | GAP-P2-03 | Guard `send_customer_message` vs main reply dedupe | executor + pipeline |

### Фаза 3 — P2 «качество и доказуемость» (7–10 дней, TasksAI E + Sprint 0)

| Шаг | TasksAI | Работа |
|-----|---------|--------|
| **3.1** | AI-A-04 | `ai_agent_id` / intent metadata в `agent_runs` |
| **3.2** | — | `scripts/ai-golden-path/` — staging E2E: booking, deal, task, handoff, notify |
| **3.3** | AI-P2-01 | Tracing spans на pipeline steps |
| **3.4** | AI-P2-02 | AI Ops dashboard (latency, success, cost) |
| **3.5** | AI-P2-07 | `npm run load-test:ai-replies` |
| **3.6** | — | Vitest: executor actions + idempotency + permissions (top 10 tools) |
| **3.7** | AI-P2-05/06 | PII redaction + owner alerts |
| **3.8** | — | Persist tool audit to DB (migration) |

### Фаза 4 — P3 «масштаб и enterprise» (по метрикам, TasksAI F/G)

| Шаг | TasksAI | Работа |
|-----|---------|--------|
| **4.1** | AI-P2-S08 | `ai_intensity: light` — ≤2 LLM/inbound (defer BANT/summary) |
| **4.2** | AI-P2-S09 | Indexes AI tables |
| **4.3** | AI-P2-S07 | Redis cache profile/KB metadata |
| **4.4** | AI-P2-S04/10 | DR runbook, worker tuning |

---

## 5. Чеклист приёмки (golden path)

Выполнить на staging для **одного business** с подключённым календарём и KB:

- [ ] Inbound WA/TG → ответ &lt; 10s, grounded по KB
- [ ] «Хочу записаться на …» → booking/event в календаре + подтверждение клиенту
- [ ] «Интересует цена / куплю» → deal или task для менеджера + push/notification
- [ ] Заполнение custom fields → `update_collected_fields` → gate снят → deal/order
- [ ] «Позовите менеджера» + подтверждение → **один** human request, AI **не** отвечает после accept
- [ ] Повтор webhook → **один** deal/task (idempotency)
- [ ] Web chat (после 1.1) — тот же сценарий
- [ ] Voice call → CRM в очереди (после 2.2)
- [ ] Orchestration fail → owner alert, клиент уже получил reply
- [ ] AI Ops: видны latency, failures, cost

---

## 6. Как должно стать после успешного улучшения

### Поведение для клиента

- В **каждом канале**, где в Integrations включён AI, клиент получает **быстрый**, **контекстный** ответ (знания бизнеса + история + CRM snapshot).
- Запросы на **запись, заказ, сделку, вопрос** обрабатываются **согласованно**: текст ответа не обещает то, что executor не сделал (sanitizer + sync booking path).
- При эскалации человек **перехватывает** диалог; AI **не** конкурирует с менеджером.

### Поведение для менеджера

- **Inbox + CRM** обновляются автоматически: контакт, сделка, задача, заметка, событие календаря.
- **Уведомления**: handoff, важные CRM actions, failed orchestration, SLA просрочка.
- **Прозрачность**: agent runs / tool audit / AI Ops — «что AI сделал и почему».

### Техническое состояние

- **100% durable** Phase 2 (chat + voice + forms path по решению 0.2).
- **0** silent CRM skips для типовых intents при включённых permissions.
- **≤2 LLM calls** на inbound в режиме `light` (default для SMB).
- **Load test** документирует p95 и 0 duplicates при 2 instances.
- **TasksAI** чекбоксы = grep-verifiable truth (forms, web chat, handoff).

### Продуктовая честность

- Instagram либо работает end-to-end, либо **не** рекламируется как AI-канал.
- Website forms: либо полный AI pipeline, либо явно «CRM order + авто-ack».

---

## 7. Прогресс выполнения (обновлять агентом)

| Фаза | Статус | PR / commit |
|------|--------|-------------|
| 0 | ✅ APPROVED | — |
| 1 | ✅ 1.1–1.5 (код) | web chat pipeline, handoff gate, contact fallback, handoff dedupe, calendar scope |
| 2 | ✅ 2.1–2.6 (код) | forms inbox+AI, voice queue, landing IG, orchestrator RAG, schema, send dedupe |
| 3 | ✅ 3.1–3.8 (код) | intent metadata, golden-path script, tracing stub+llm_fast, AI Ops metrics UI, load-test script, vitest ai/, PII+alerts cron, tool audit DB |
| 4 | ✅ 4.1–4.4 (код) | ai_intensity light/full, Redis profile cache, AI table indexes, worker env tuning, DR runbook |

---

## 8. Инструкция для агента Cursor

When user approves:

1. Set status at top to `APPROVED`.
2. Execute **Phase 1 step 1.1** first; mark row in §7; run verification.
3. Continue sequentially unless user reprioritizes.
4. Do not skip migration rule (Supabase MCP).
5. After each phase, run §5 checklist for completed scope.
