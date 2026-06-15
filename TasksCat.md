# TasksCat.md — Inbox / Messaging Performance Roadmap

> Задачи из deep performance & architecture audit (июнь 2026).  
> **Цель:** WhatsApp-grade perceived speed для SMB Inbox.  
> **North Star:** новое сообщение в открытом чате < 300 ms; отправка текста perceived instant; медиа upload без блокировки UI; inbox list плавный при 1000+ диалогов.  
> **Приоритеты:** P0 = блокер масштаба / потеря данных | P1 = высокий ROI | P2 = качество / упрощение | P3 = polish / future scale  
> **Правило:** работать строго по этому файлу; одна задача = один focused PR где возможно.

---

## Статус фаз (обновлять при закрытии задач)

| Фаза | Название | Прогресс |
|------|----------|----------|
| P0 | Critical path — reliability & throughput | 10/10 |
| P1 | High ROI — speed & freshness | 12/18 |
| P2 | Quality — frontend & DB | 5/14 |
| P3 | Simplify & scale prep | 2/12 |

**Легенда:** `[x]` done · `[~]` partial · `[ ]` todo

---

## Уже сделано (baseline — не трогать без регрессии)

* [x] QStash durable webhook worker + queue lag metrics
* [x] Inbound media hydration queue + retry UI
* [x] Active conversation polling off when realtime connected
* [x] Gap-sync API + reconnect cursor
* [x] Realtime auth: reconnect only on JWT change
* [x] Direct client upload to Storage (XHR + progress)
* [x] Provider-ready signed URL + delivery via link
* [x] Queue row claiming (`SKIP LOCKED`) + worker concurrency
* [x] Inbox FTS RPC `list_inbox_conversations`
* [x] `message_deliveries` realtime publication
* [x] Virtualization: ChatList ≥20, MessageHistory ≥25
* [x] CDN-first media (`preferDirectUrl`) + visible prefetch
* [x] Triggers/RLS optimize migration (unread merge + messages RLS)
* [x] `revalidatePath` убран из send hot paths (`chat.service`, `chat-media-upload`)
* [x] Upload progress UI (throttle + overlay)
* [x] Sharp on Vercel: lazy import + linux optional deps
* [x] Polling list: отключён при realtime SUBSCRIBED (fallback 120s при disconnect)
* [~] Observability: `messaging-health` extended, нет cron в `vercel.json`
* [~] Redis cache probe — partial, README production docs не завершён

---

# P0 — Critical Path (блокеры масштаба и надёжности)

### CAT-P0-01 — Delivery cron: drain loop до пустой очереди

* [x] **P0**

**Проблема:** `processPendingMessageDeliveries` обрабатывает только 1 batch (25 jobs) за cron tick. Webhook drain крутится until empty.

**Файлы:**
- `src/services/message-delivery.service.ts` (192–216)
- `src/services/webhook-queue.service.ts` (146–160) — reference pattern

**Сделать:**
- Добавить `while` loop с safety cap (max batches per invocation)
- Логировать `batches`, `processed`, `durationMs`

**Acceptance:**
- 100 pending deliveries обрабатываются за один cron run (< 2 min)
- Нет infinite loop при stuck jobs

---

### CAT-P0-02 — Delivery retry: immediate worker dispatch

* [x] **P0**

**Проблема:** После failed delivery retry ждёт только cron (до 60s). Webhooks re-dispatch сразу.

**Файлы:**
- `src/services/message-delivery.service.ts`
- `src/services/messaging.service.ts` (138–144)
- `src/lib/queue/qstash-*` — по аналогии с webhook worker

**Сделать:**
- `dispatchMessageDelivery` / QStash wake-up при retry scheduling
- Единый worker route или расширить существующий

**Acceptance:**
- Failed delivery retry стартует < 5s без ожидания cron

---

### CAT-P0-03 — Hydration cron fallback в `vercel.json`

* [x] **P0**

**Проблема:** `messaging-health` drain hydration, но cron не scheduled. Без QStash media зависает.

**Файлы:**
- `vercel.json`
- `src/app/api/cron/messaging-health/route.ts`
- `src/services/inbound-media-hydration.service.ts`

**Сделать:**
- Добавить cron `messaging-health` (или dedicated `inbound-media-hydration`) каждые 1–2 min
- Убрать дублирующий drain webhook из health если есть отдельный webhook cron
- Документировать в `.env.example`

**Acceptance:**
- Pending hydration обрабатывается без QStash env
- Health endpoint возвращает hydration lag metrics

---

### CAT-P0-04 — Gap-sync: re-run когда cursor появился

* [x] **P0**

**Проблема:** `SUBSCRIBED` может прийти до загрузки cursor → gap-sync пропускается навсегда до reconnect.

**Файлы:**
- `src/hooks/use-conversation-realtime.ts` (148–152)
- `src/hooks/use-inbox-active-conversation.ts` (cursor refs)

**Сделать:**
- Флаг `gapSyncPending` если subscribe без cursor
- Trigger gap-sync когда cursor устанавливается после load
- Опционально: gap-sync на tab visibility reconnect

**Acceptance:**
- Быстрое открытие чата после reconnect не оставляет дыр в истории
- Manual QA: disconnect WS → reconnect → open chat < 2s

---

### CAT-P0-05 — List inbox refresh на realtime `SUBSCRIBED`

* [x] **P0**

**Проблема:** List channel не refresh после reconnect; stale до 30–120s.

**Файлы:**
- `src/hooks/use-inbox-list-realtime.ts` (280–284)

**Сделать:**
- On `SUBSCRIBED`: debounced `onRefresh()` (500ms, reuse existing debounce)
- Не дублировать с первым mount если SSR data fresh

**Acceptance:**
- Tab focus после offline → list обновляется < 1s

---

### CAT-P0-06 — Отключить list polling при healthy realtime

* [x] **P0**

**Проблема:** 30s full list refetch при `SUBSCRIBED` — скрытая нагрузка.

**Файлы:**
- `src/components/chats/ChatsChannelPanel.tsx` (276–288)
- `src/components/chats/ChatsMonitorPanel.tsx` (405–417)
- `src/hooks/use-inbox-list-polling.ts`

**Сделать:**
- `enabled: hasBusiness && !isInitialLoading && !realtimeConnected`
- Fallback interval 120s оставить при disconnect
- Опционально: heartbeat poll 5 min при connected (safety net)

**Acceptance:**
- При SUBSCRIBED нет `fetchMonitorConversationsAction` каждые 30s
- При CHANNEL_ERROR polling включается автоматически

---

### CAT-P0-07 — Rewrite `list_inbox_conversations` pagination

* [x] **P0** (large — отдельный PR)

**Проблема:** `COUNT(*) OVER ()` + `ROW_NUMBER()` по всему filtered set; correlated FTS EXISTS.

**Файлы:**
- `supabase/migrations/20250708120000_inbox_full_text_search.sql`
- `src/services/chat-inbox-query.service.ts`

**Сделать:**
- Keyset/cursor pagination вместо OFFSET + window over full set
- FTS: materialized last_message_search или denormalized snippet
- Phone dedupe внутри RPC, не post-fetch
- Partial index `contacts.lead_score >= 70` для high_intent view

**Acceptance:**
- List load < 200ms p95 при 5k conversations (staging benchmark)
- Search не делает full-table window sort

---

### CAT-P0-08 — Unread trigger: batch per-user reads

* [x] **P0** (DB migration)

**Проблема:** O(team size) UPSERT в `conversation_reads` на каждое inbound client message.

**Файлы:**
- `supabase/migrations/20250711120000_messaging_triggers_rls_optimize.sql` (24–49)

**Сделать:**
- Вариант A: только increment `conversations.unread_count`; per-user reads lazy on open
- Вариант B: deferred job / single aggregate row
- Сохранить team-aware unread в UI

**Acceptance:**
- 1 inbound message = ≤2 writes независимо от team size
- Unread badges корректны для owner + members

---

### CAT-P0-09 — Hydration metrics в health snapshot

* [x] **P0**

**Файлы:**
- `src/services/messaging-health.service.ts`
- `src/lib/observability/messaging-metrics.ts`

**Сделать:**
- `pendingHydration`, `failedHydration`, `hydrationLagP95`
- Expose в cron JSON response

**Acceptance:**
- `/api/cron/messaging-health` возвращает hydration stats

---

### CAT-P0-10 — Убрать webhook drain из messaging-health (если дублирует)

* [x] **P0**

**Файлы:**
- `src/app/api/cron/messaging-health/route.ts` (19–22)

**Сделать:**
- Health = metrics + hydration drain only
- Webhooks = dedicated `/api/cron/webhook-queue` + QStash

**Acceptance:**
- Нет double-drain webhooks из двух cron

---

# P1 — High ROI (скорость и свежесть UI)

### CAT-P1-01 — Defer blocking work из `completeChatMediaUpload`

* [x] **P1**

**Файлы:** `src/services/chat-media-upload.service.ts` (356–429)

**Сделать:**
- Return success сразу после DB insert + storage verify
- `ensureProviderReadyMediaUrl` + final signed URL — async before delivery
- UI уже optimistic — подтвердить delivery queue pickup

**Acceptance:**
- `completeChatMediaUpload` p95 < 400ms
- Media send не блокируется на provider URL

---

### CAT-P1-02 — Outbound thumbnail без re-download

* [x] **P1**

**Файлы:**
- `src/services/chat-attachment-thumbnail.service.ts` (41–42)
- `src/hooks/use-send-chat-media.ts`
- `src/utils/image-thumbnail.ts`

**Сделать:**
- Вариант A: client-side thumb upload parallel с original
- Вариант B: pass buffer from upload complete (если server receives)
- Убрать `downloadChatAttachmentBuffer` для outbound

**Acceptance:**
- Нет storage download на outbound thumb path
- Thumb появляется в message content < 10s

---

### CAT-P1-03 — Persist inbound thumbnail metadata

* [x] **P1**

**Файлы:**
- `src/services/inbound-media.service.ts` (40–50)
- `src/services/chat-attachment-storage.service.ts` (113–118)

**Сделать:**
- Передавать `thumbPath`, `thumbWidth`, `thumbHeight` в `buildMediaPayloadFromUpload`
- Обновить `message_attachments` row

**Acceptance:**
- Inbound images показывают thumb-first в `ChatMediaMessage`

---

### CAT-P1-04 — SSR inbox: dedupe fan-out

* [x] **P1**

**Файлы:**
- `src/app/(dashboard)/dashboard/chats/page.tsx` (13–16)
- `src/app/(dashboard)/dashboard/chats/[channel]/page.tsx` (29–33)
- `src/services/chat.service.ts` (518–604, 640–647, 468–497)

**Сделать:**
- Channel page: skip `getChatsMonitorData` или merge stats
- Shared loader: list RPC once, pass to client
- `resolveInboxActiveConversationContext` не дублировать list fetch

**Acceptance:**
- Cold load inbox: ≤8 DB round-trips (было 15–20)

---

### CAT-P1-05 — Conversation open: убрать COUNT messages

* [x] **P1**

**Файлы:** `src/services/chat.service.ts` (177–181)

**Сделать:**
- Denormalize `total_message_count` на `conversations` (trigger on insert)
- Или derive: `hasOlder = messages.length === PAGE_SIZE`

**Acceptance:**
- Open chat на 1 query меньше

---

### CAT-P1-06 — Dual list RPC → single fetch + client split

* [x] **P1**

**Файлы:** `src/components/chats/ChatsMonitorPanel.tsx` (250–267)

**Сделать:**
- Один RPC с flag `include_needs_attention`
- Или client-side filter needs_reply из full list (если cheap)

**Acceptance:**
- List refresh = 1 server action не 2

---

### CAT-P1-07 — Details panel: reuse conversation contact data

* [ ] **P1**

**Файлы:**
- `src/components/chats/inbox/InboxDetailsPanel.tsx` (111–175)
- `src/services/inbox-details.service.ts`

**Сделать:**
- Initial render из `ConversationDetail` без fetch
- Background fetch только CRM deals + tasks

**Acceptance:**
- Panel open: 0 blocking requests для contact name/avatar

---

### CAT-P1-08 — Centralize `bindSupabaseRealtimeAuthRefresh`

* [x] **P1**

**Файлы:**
- `src/hooks/use-supabase-realtime-bootstrap.ts`
- `src/hooks/use-conversation-realtime.ts`
- `src/hooks/use-inbox-list-realtime.ts`
- `src/hooks/use-dashboard-nav-badges.ts`

**Сделать:**
- Один listener в bootstrap; hooks только `waitForSupabaseRealtime`

**Acceptance:**
- 1 auth refresh listener per dashboard session

---

### CAT-P1-09 — Nav badges: scope subscription by business_id

* [ ] **P1**

**Файлы:** `src/hooks/use-dashboard-nav-badges.ts` (82–104)

**Сделать:**
- Filter `messages` INSERT + `conversations` по `business_id=eq.{id}`
- Увеличить poll interval при connected realtime (60s → 5min)

**Acceptance:**
- WS events только для текущего business

---

### CAT-P1-10 — Delivery path symmetry (text + media)

* [x] **P1**

**Файлы:**
- `src/services/chat.service.ts` (1130–1141)
- `src/services/message-delivery.service.ts`

**Сделать:**
- Все outbound через `message_deliveries` queue + dispatch
- Убрать inline `deliverWhatsAppOutboundText` fire-and-forget

**Acceptance:**
- Единый retry/metrics path для text и media

---

### CAT-P1-11 — Убрать `revalidatePath` из inbound webhook hot path

* [x] **P1**

**Файлы:** `src/services/whatsapp.service.ts` (799–803)

**Сделать:**
- Удалить `revalidateWhatsAppPaths` + dashboard revalidate из queue worker
- Inbox client-side only

**Acceptance:**
- Webhook process не трогает Next.js cache

---

### CAT-P1-12 — Gap-sync failure retry

* [x] **P1**

**Файлы:** `src/hooks/use-conversation-realtime.ts` (160–162)
- `src/lib/client/conversation-gap-sync.ts`

**Сделать:**
- 1–2 retry с backoff при failed gap-sync
- Log to console/metrics

**Acceptance:**
- Transient 500 не оставляет permanent gap

---

### CAT-P1-13 — Instagram hydration: refresh source URL

* [x] **P1**

**Файлы:** `src/services/inbound-media-hydration.service.ts` (451–455)

**Сделать:**
- Re-fetch media URL from Graph API on retry if expired
- Fail fast with actionable error

**Acceptance:**
- Delayed hydration не permanent-fail на expired CDN URL

---

### CAT-P1-14 — `storageObjectExists`: HEAD вместо list scan

* [x] **P1**

**Файлы:** `src/services/chat-media-upload.service.ts` (232–249, 356–364)

**Сделать:**
- Supabase storage exists check без list pagination

**Acceptance:**
- Verify latency < 100ms p95

---

### CAT-P1-15 — Conversation cache: skip write on upload progress

* [ ] **P1**

**Файлы:** `src/hooks/use-inbox-active-conversation.ts` (554–571)

**Сделать:**
- Не persist session cache при изменении только `uploadProgress`/`uploadPhase`

**Acceptance:**
- Upload не пишет sessionStorage каждые 200ms

---

### CAT-P1-16 — Silent refresh dedupe после SSR

* [ ] **P1**

**Файлы:** `src/hooks/use-inbox-active-conversation.ts` (521–552)

**Сделать:**
- Skip `fetchConversationDetailAction` если SSR context < 30s fresh
- Invalidate только на explicit user action

**Acceptance:**
- Select conversation после SSR load = 0 immediate refetch

---

### CAT-P1-17 — Hydration: orphan storage cleanup on retry

* [x] **P1**

**Файлы:**
- `src/services/inbound-media-hydration.service.ts`
- `src/services/chat-attachment-path.ts`

**Сделать:**
- Stable path per `message_id` + upsert
- Delete orphan on successful final upload

**Acceptance:**
- Retries не создают unbounded orphan objects

---

### CAT-P1-18 — Outbound thumbnail queue + retry

* [x] **P1**

**Файлы:** `src/services/chat-attachment-thumbnail.service.ts` (30–32)

**Сделать:**
- QStash job или reuse media hydration pattern
- 3 retries, log failures

**Acceptance:**
- Thumb failures visible in health metrics; не silent loss

---

# P2 — Quality (frontend perf & DB polish)

### CAT-P2-01 — `React.memo` на row components

* [x] **P2**

**Файлы:**
- `src/components/chats/MessageHistory.tsx` (140–318)
- `src/components/chats/ChatList.tsx` (78–237)
- `src/components/chats/inbox/ChatMediaMessage.tsx` (691–811)

**Acceptance:** typing indicator не rerender все rows

---

### CAT-P2-02 — Isolate upload progress state

* [x] **P2**

**Файлы:**
- `src/components/chats/ChatWindow.tsx` (186–206)
- `src/utils/message-metadata.ts` (36–38)

**Сделать:**
- Progress в ref/Map вне `conversation.messages` immutable tree
- Overlay читает isolated state

**Acceptance:** upload progress не trigger full MessageHistory rerender

---

### CAT-P2-03 — Single `useChatMediaUrl` per attachment

* [x] **P2**

**Файлы:** `src/components/chats/inbox/ChatMediaMessage.tsx` (705–724, 317–325)

**Сделать:**
- Один hook: thumb → progressive full
- Убрать duplicate hook в `ChatMediaImage`

**Acceptance:** max 1 server action per image on first view

---

### CAT-P2-04 — Stabilize prefetch deps

* [x] **P2**

**Файлы:**
- `src/components/chats/MessageHistory.tsx` (354–363)
- `src/hooks/use-prefetch-conversation-media.ts` (57–87)

**Сделать:**
- Serialize `visibleStart-visibleEnd` string вместо array ref
- Throttle prefetch 300ms

**Acceptance:** scroll не штормит server actions

---

### CAT-P2-05 — Merge duplicate mark-read on select

* [x] **P2**

**Файлы:** `ChatsChannelPanel.tsx` (317–319, 353–361)

**Acceptance:** 1 state update on conversation select

---

### CAT-P2-06 — Extract shared `useInboxPanel` hook

* [x] **P2** (large)

**Файлы:**
- `src/components/chats/ChatsChannelPanel.tsx`
- `src/components/chats/ChatsMonitorPanel.tsx`

**Сделать:**
- Shared: realtime, polling, active conversation, mark read, fetch
- Panel-specific: channel filter, needs attention, favorites

**Acceptance:** bugfix в одном месте; −300+ duplicate lines

---

### CAT-P2-07 — Simplify media cache to 2 layers

* [x] **P2**

**Файлы:**
- `src/lib/client/inbox-messenger-cache.ts`
- `src/lib/client/media-browser-cache.ts`
- `src/services/media-url-cache.service.ts`

**Сделать:**
- Client: session signed URL cache only
- Server: Redis → Postgres → generate
- Remove dead blob cache path

**Acceptance:** documented cache flow; no `warmMediaBlobCache` dead code

---

### CAT-P2-08 — Delivery status: single path (postgres OR broadcast)

* [x] **P2** — postgres `message_deliveries` only; broadcast removed

**Файлы:**
- `src/hooks/use-conversation-realtime.ts` (247–302)
- `src/services/conversation-realtime-broadcast.service.ts`

**Сделать:**
- Keep postgres only for delivery; broadcast only for typing
- Или dedupe client-side с generation counter

**Acceptance:** 1 state patch per delivery status change

---

### CAT-P2-09 — List realtime: server-side channel filter

* [x] **P2** — `channel=eq.*` postgres filter + per-channel realtime channel name

**Файлы:** `src/hooks/use-inbox-list-realtime.ts`, `src/utils/inbox-list-realtime.ts` (82–84)

**Сделать:**
- Separate channel или filter в postgres subscription where possible

**Acceptance:** channel inbox не получает events других channels

---

### CAT-P2-10 — Denormalize `total_message_count`

* [x] **P2** (migration)

**Связано с:** CAT-P1-05

**Acceptance:** trigger maintain count; backfill migration

---

### CAT-P2-11 — Paginated monitor list: realtime patch

* [x] **P2** — refresh preserves loaded depth; in-memory rows patched via realtime

**Файлы:** `ChatsMonitorPanel.tsx` load more

**Сделать:**
- Realtime update items beyond page 1 if in memory
- Or invalidate paginated cache on event

**Acceptance:** load-more conversations update on new message

---

### CAT-P2-12 — `syncRecentMessages` in polling fallback

* [x] **P2** — `useRealtimeFallbackReady` (10s after disconnect)

**Файлы:** `src/hooks/use-inbox-active-conversation.ts` (473–491)

**Сделать:**
- Enable metadata repair when realtime down > 10s

**Acceptance:** delivery status updates without full reload

---

### CAT-P2-13 — WhatsApp webhook: parallel message processing

* [x] **P2** — `runWithConcurrency` in `processWhatsAppWebhook`

**Файлы:** `src/services/whatsapp.service.ts` (782–794)

**Сделать:**
- `runWithConcurrency` для messages in single payload

**Acceptance:** 10 messages in webhook < 2s process

---

### CAT-P2-14 — Production README + env docs

* [x] **P2** — `README.md` runbook + `.env.example` messaging section

**Файлы:** `README.md`, `.env.example`

**Сделать:**
- Redis, QStash, cron secrets, Supabase realtime
- Runbook: hydration stuck, delivery backlog

**Acceptance:** new deploy без oral tradition

---

# P3 — Simplify & Scale Prep

### CAT-P3-01 — Delete dead ChatWindow default layout

* [x] **P3** · `src/components/chats/ChatWindow.tsx` (623–746)

### CAT-P3-02 — Delete `ChatsHub`, `ChatsFavoritesPanel`, `ChatInboxToolbar`

* [x] **P3**

### CAT-P3-03 — Delete legacy `getChatsPageData` / `listConversations`

* [x] **P3** · `src/services/chat.service.ts` (101–147, 884–945)

### CAT-P3-04 — Delete unreachable client bootstrap path

* [x] **P3** · panels 169–201 / 351–387

### CAT-P3-05 — Delete deprecated `usePrefetchConversationMedia` export

* [x] **P3**

### CAT-P3-06 — Instrumentation startup probe

* [x] **P3** · `src/instrumentation.ts` — Redis probe on boot

### CAT-P3-07 — Sentry / structured logging for queue lag

* [x] **P3** · `src/lib/observability/messaging-metrics.ts` + messaging-health cron

### CAT-P3-08 — Load test: 1000 webhook msg/min

* [x] **P3** · `npm run load-test:webhooks`

### CAT-P3-09 — Load test: 100 concurrent inbox sessions

* [x] **P3** · `npm run load-test:inbox`

### CAT-P3-10 — Consider React Query for inbox data layer

* [x] **P3** (spike) — **defer**: SSR hydrate + session cache + server actions достаточны; миграция не окупается сейчас

### CAT-P3-11 — Edge signed URL generation (spike)

* [x] **P3** (spike) — **defer**: Redis→Postgres server cache закрывает p95; edge добавит сложность без bottleneck

### CAT-P3-12 — Dedicated delivery worker service (spike)

* [x] **P3** (spike) — **already covered**: QStash worker + cron drain; отдельный сервис — только при multi-region

---

# Рекомендуемый порядок спринтов

### Sprint A (3–5 дней) — «Realtime trust» ✅ DONE

1. [x] CAT-P0-04 Gap-sync cursor race
2. [x] CAT-P0-05 List refresh on SUBSCRIBED
3. [x] CAT-P0-06 Disable list poll when connected
4. [x] CAT-P1-12 Gap-sync retry
5. [x] CAT-P1-08 Centralize auth refresh

**Exit:** reconnect не теряет сообщения; list свежий < 1s

---

### Sprint B (3–5 дней) — «Delivery throughput» ✅ DONE

1. [x] CAT-P0-01 Delivery drain loop
2. [x] CAT-P0-02 Delivery retry dispatch
3. [x] CAT-P1-10 Delivery path symmetry
4. [x] CAT-P0-10 Webhook drain dedupe in health cron

**Exit:** 100 delivery backlog clears < 2 min

---

### Sprint C (3–5 дней) — «Media reliability» ✅ DONE

1. [x] CAT-P0-03 Hydration cron
2. [x] CAT-P0-09 Hydration metrics
3. [x] CAT-P1-03 Inbound thumb metadata
4. [x] CAT-P1-13 Instagram URL refresh
5. [x] CAT-P1-17 Orphan cleanup

**Exit:** inbound media < 30s p95 без QStash

---

### Sprint D (5–7 дней) — «Media speed» ✅
1. [x] CAT-P1-01 Defer completeChatMediaUpload blocking
2. [x] CAT-P1-02 Outbound thumb without re-download
3. [x] CAT-P1-14 storageObjectExists HEAD
4. [x] CAT-P1-18 Thumbnail queue

**Exit:** media send perceived < 1s after upload

---

### Sprint E (7–10 дней) — «Inbox load» ✅
1. [x] CAT-P0-07 list_inbox_conversations rewrite (big)
2. [x] CAT-P1-04 SSR dedupe
3. [x] CAT-P1-06 Dual list RPC
4. [x] CAT-P1-05 / CAT-P2-10 message count

**Exit:** inbox cold load < 1s p95

---

### Sprint F (5–7 дней) — «DB write path» ✅
1. [x] CAT-P0-08 Unread trigger batch
2. [x] CAT-P1-11 Remove revalidatePath webhook

**Exit:** inbound write ≤2 per message

---

### Sprint G (5–7 дней) — «Frontend polish» ✅
1. [x] CAT-P2-01 React.memo rows
2. [x] CAT-P2-02 Upload progress isolate
3. [x] CAT-P2-03 Single media hook
4. [x] CAT-P2-04 Prefetch stabilize
5. [x] CAT-P2-06 Shared inbox panel hook

**Exit:** smooth scroll + upload без jank

---

### Sprint H — «Cleanup & scale prep» ✅
1. [x] CAT-P3-01 … P3-07 cleanup + observability
2. [x] CAT-P2-07 Simplify media cache
3. [x] CAT-P3-08 … P3-09 load tests
4. [x] CAT-P3-10 … P3-12 spikes
5. [x] CAT-P2-08, P2-12, P2-13 reliability

**Exit:** dead code removed; queue lag visible in logs/cron; delivery status single path

---

# Manual QA checklist (после каждого спринта)

- [ ] Send text → optimistic instant → confirmed < 1s
- [ ] Send image 2MB → progress smooth → delivered to WhatsApp
- [ ] Receive inbound text → appears < 500ms in open chat
- [ ] Receive inbound image → placeholder → full media < 30s
- [ ] Tab background 5 min → foreground → list + chat fresh
- [ ] Switch conversation ×10 → no memory leak (DevTools heap)
- [ ] Search inbox с 500+ conv → responsive
- [ ] CRM details panel → no infinite loading
- [ ] Delivery failed → retry → success without manual refresh
- [ ] Two team members → unread counts correct

---

# Метрики успеха (target)

| Metric | Current (est.) | Target |
|--------|----------------|--------|
| Open chat (p95) | 500–800 ms | < 300 ms |
| Send text confirmed (p95) | 300–600 ms | < 200 ms |
| Media complete API (p95) | 800–1500 ms | < 400 ms |
| Inbound text in open chat | 200–500 ms | < 300 ms |
| Inbound media hydrated (p95) | 5–60 s | < 15 s |
| List load 1k conv (p95) | 1–5 s | < 500 ms |
| Delivery backlog recovery | 25/min | 200+/min |
| Concurrent users (comfortable) | ~100 | 500+ |

---

# Связь с TASKS.md

- `TASKS.md` — продуктовый roadmap (фичи, CRM, billing)
- `TasksCat.md` — **только** performance/reliability/архитектура Inbox/Messaging
- Не дублировать фичи из TASKS.md § «UX — Inbox» unless performance-related

---

*Последнее обновление: 2026-06-02 · источник: deep read-only audit Inbox/Messaging*
