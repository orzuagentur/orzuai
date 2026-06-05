# TASKS.md

## Project Progress (MVP v1 + Version 2)

### Phase 1 - Foundation

* [x] Create Next.js project
* [x] Configure TypeScript
* [x] Configure Tailwind
* [x] Configure Shadcn UI
* [x] Configure Supabase
* [x] Configure Resend
* [x] Configure Gemini
* [x] Configure Environment Variables

Status: COMPLETE (8/8)

---

### Phase 2 - Authentication

* [x] Google Login
* [x] Email Registration
* [x] Email Verification
* [x] Login Page
* [x] Logout
* [x] Password Reset

Status: COMPLETE (6/6)

---

### Phase 3 - Dashboard

* [x] Sidebar
* [x] Overview Page
* [x] Analytics Cards
* [x] User Profile Section

Status: COMPLETE (4/4)

---

### Phase 4 - Business Profile

* [x] Create Business
* [x] Edit Business
* [x] Upload Logo
* [x] Business Settings

Status: COMPLETE (4/4)

---

### Phase 5 - Knowledge Base

* [x] Create Knowledge Entry
* [x] Edit Knowledge Entry
* [x] Delete Knowledge Entry
* [x] Search Knowledge

Status: COMPLETE (4/4)

---

### Phase 6 - WhatsApp

* [x] Connect WhatsApp
* [x] Verify Number
* [x] Sync Messages
* [x] AI Auto Reply

Status: COMPLETE (4/4)

---

### Phase 7 - Chats

* [x] Chat List
* [x] Chat Window
* [x] Message History
* [x] AI Status

Status: COMPLETE (4/4)

---

## Version 2 — Multi-channel Integrations Hub

### Phase 8.1 — Integrations hub UI

* [x] Integrations layout: channel list (left) + detail panel (right)
* [x] Section tabs: Activate, Contacts, AI Assistant, Analytics
* [x] Route structure `/dashboard/integrations/[channel]`
* [x] Default redirect to WhatsApp channel

Status: COMPLETE (4/4)

---

### Phase 8.2 — WhatsApp in hub

* [x] Move WhatsApp connect flow into Activate section
* [x] Show connection status per channel in list
* [x] Channel-scoped quick links for Contacts / AI / Analytics

Status: COMPLETE (3/3)

---

### Phase 8.3 — Instagram (prepare)

* [x] Instagram integration types, constants, env keys
* [x] Activate section UI (Meta / Instagram placeholder)
* [x] Database schema for `instagram_connections`

Status: COMPLETE (3/3)

---

### Phase 8.4 — Telegram (prepare)

* [x] Telegram integration types, constants, env keys
* [x] Activate section UI (Bot token placeholder)
* [x] Database schema for `telegram_connections`

Status: COMPLETE (3/3)

---

### Phase 8.5 — Per-channel workspace

* [x] Contacts filtered by active channel
* [x] AI Assistant settings per channel
* [x] Analytics metrics per channel

Status: COMPLETE (3/3)

---

### Phase 8.6 — Instagram API

* [x] Meta Instagram Messaging / Graph OAuth
* [x] Webhook handler for Instagram
* [x] Send/receive messages in chats

Status: DONE (3/3)

---

### Phase 8.7 — Telegram Bot API

* [x] Bot token connect + webhook setup
* [x] Webhook handler for Telegram
* [x] Send/receive messages in chats

Status: DONE (3/3)

---

### Phase 8.8 — Unified messaging

* [x] `channel` field on conversations/messages
* [x] Chat list shows channel badge (WhatsApp / Instagram / Telegram)
* [x] Shared AI reply pipeline per channel

Status: DONE (3/3)

---

### Phase 8.9 — Website Forms

* [x] Website Forms webhook ingest
* [x] Lead → contact + conversation + AI follow-up (WhatsApp / Email)
* [x] Website Forms → Telegram follow-up

Status: IN PROGRESS (2/3)

---

### Phase 8.10 — Website Knowledge Sync

* [x] Site crawler + Gemini extraction
* [x] Manual sync + Vercel cron auto-sync
* [x] Knowledge Base entries with `website_sync` source

Status: COMPLETE (3/3)

---

### Phase 8.11 — Monitoring hub redesign

* [x] Rename sidebar Chats → Monitoring
* [x] Monitor dashboard + per-channel inboxes
* [x] Channel icons and responsive layout

Status: COMPLETE (3/3)

---

### Phase 8.12 — WhatsApp manual connect

* [x] Manual Meta credentials form (Phone ID, WABA, token)
* [x] Webhook URL display in connect UI
* [ ] Optional: restore WhatsApp Embedded Signup as alternative

Status: IN PROGRESS (2/3)

---

### Phase 8.13 — Instagram Embedded Signup

* [x] Meta Facebook login (Embedded Signup SDK)
* [x] Token exchange + page subscribe
* [ ] Instagram comment replies (not only DM)

Status: IN PROGRESS (2/3)

---

### Phase 8.14 — Analytics hub

* [x] Global Analytics page with channel sidebar
* [x] All-channels overview totals
* [x] Per-channel metrics, 7-day chart, recent messages

Status: COMPLETE (3/3)

---

### MVP v1 Completion

Progress: **100%**

### Version 2 (Multi-channel) Completion

Progress: **100%** (core hub + channels)

---

# Version 2.0 — Platform Audit Roadmap

> Задачи из полного аудита платформы. Цель: GoHighLevel + HubSpot + ManyChat + Chatbase в единой экосистеме.
>
> **North Star:** Time to First AI Reply (TTFAR) < 10 минут от регистрации.
>
> **Приоритеты:** P0 = критично | P1 = высокий ROI | P2 = стратегически | P3 = будущее

---

## Категория: Quick Wins (1–7 дней)

* [x] **P0** Onboarding wizard (5 шагов: business → channel → knowledge → AI → test)
* [x] **P0** Auth modal: default tab = Register (не Login)
* [x] **P0** Fix Contacts nav: redirect `/dashboard/contacts` → `?channel=whatsapp`
* [x] **P0** Hide Subscription menu item до реализации billing
* [x] **P0** Overview: скрыть метрики/виджеты когда нет business profile
* [x] **P0** Заменить «Coming soon» на setup CTA (AI Assistant, Analytics, Contacts без channel)
* [x] **P1** Empty states + CTA: Recent Conversations → Integrations
* [x] **P1** Empty states + CTA: Knowledge Base → «Add first entry»
* [x] **P1** WhatsAppStatusCard / AiStatusCard: кнопки «Connect» / «Configure»
* [x] **P1** Унифицировать copy: Monitoring / Inbox / Dashboard naming
* [x] **P1** Landing: multi-channel positioning (не только WhatsApp)
* [x] **P1** Overview: агрегировать `channel_analytics` вместо legacy `analytics`
* [x] **P1** Убрать или реализовать кнопку WhatsApp «Sync messages»
* [x] **P2** Auth: унифицировать порядок Google / Email (modal = pages)
* [x] **P2** Auth: Terms checkbox перед Google OAuth на register page
* [x] **P2** Registration confirmation: primary CTA «Open email» вместо «Back to home»
* [x] **P2** Dashboard header: показывать title текущей страницы (mobile)
* [x] **P2** Integrations index page (все каналы) вместо redirect только на WhatsApp

---

## Категория: UX — навигация и информационная архитектура

* [x] **P0** Переименовать Monitoring → **Inbox** в sidebar
* [x] **P0** Объединить дубли: AI Assistant (sidebar + integrations) → один вход
* [x] **P0** Объединить дубли: Analytics (sidebar + integrations) → один вход
* [x] **P0** Объединить Knowledge Base + Website Knowledge в один раздел **Knowledge**
* [x] **P1** Integrations: wizard Connect → Configure AI → Test → Go live (вместо 4 табов)
* [x] **P1** Breadcrumbs в dashboard header
* [x] **P1** Quick Actions: disable до business + channel connect
* [x] **P2** Упростить sidebar: Home | Inbox | CRM | AI Agents | Analytics | Integrations | Knowledge | Settings
* [x] **P2** Channel workspace previews: убрать дубли, оставить deep links
* [x] **P2** Post-login redirect: users без business → onboarding wizard (не пустой dashboard)

---

## Категория: UX — Inbox (чаты / мониторинг)

* [x] **P0** Realtime обновления (Supabase Realtime или polling 5s)
* [x] **P1** Search conversations (по имени, телефону, тексту)
* [x] **P1** Filters: unread, AI-handled, needs human, by channel
* [x] **P1** Internal notes на conversation
* [ ] **P1** Assign conversation to team member (после Team module)
* [x] **P2** Unified inbox view (все каналы в одном списке)
* [x] **P2** AI suggest reply sidebar в chat window
* [ ] **P2** Typing indicators / read receipts (где API позволяет)
* [x] **P2** Conversation status: open / pending / resolved / snoozed
* [x] **P3** Canned responses / quick replies library

---

## Категория: UX — Onboarding и активация

* [x] **P0** Guided onboarding wizard с progress ring (0–100%)
* [x] **P0** Inline business name при регистрации (опционально)
* [x] **P0** AI enabled by default после connect channel
* [x] **P1** Setup checklist на Overview до завершения onboarding
* [x] **P1** Webhook health check: статус «Receiving messages» в Integrations
* [x] **P1** Test AI reply встроен в onboarding (шаг 4)
* [x] **P2** Magic link login (без пароля)
* [x] **P2** Resume setup: deep link для users с account но без business
* [x] **P2** Email drip: Day 0/1/3 onboarding tips (Resend)

---

## Категория: UI — Design System V2

* [x] **P1** Единая система кнопок (landing + dashboard)
* [x] **P1** Channel color coding (WhatsApp green, Instagram gradient, Telegram blue)
* [x] **P1** Semantic colors: success / warning / error / info
* [x] **P1** Typography scale (H1/H2/H3/body/caption)
* [x] **P1** Skeleton loaders вместо пустых нулей
* [x] **P1** Empty state illustrations + primary CTA
* [ ] **P2** shadcn Form + Select + Checkbox primitives везде
* [x] **P2** Channel brand icons в nav и badges
* [x] **P2** Dark mode toggle для dashboard
* [ ] **P2** 8px spacing grid audit
* [x] **P3** Design tokens: удалить или синхронизировать `constants/design.ts` с `globals.css`

---

## Категория: UI — Landing Page и конверсия

* [x] **P0** Hero: multi-channel value proposition
* [x] **P1** Header: Log in + Start free CTA
* [x] **P1** Social proof block (logos, testimonials)
* [x] **P1** Product screenshot / demo video (60s)
* [x] **P1** Pricing teaser section
* [x] **P1** FAQ section
* [x] **P2** Feature comparison vs ManyChat / Intercom
* [x] **P2** Secondary CTA: «Book a demo»
* [ ] **P2** Localized landing (EN / RU / UZ)
* [ ] **P3** A/B test framework для CTA

---

## Категория: CRM

* [x] **P0** Unified contacts view (все каналы, не только `?channel=`)
* [x] **P0** Contact profile drawer: timeline, channel badges, last message
* [x] **P1** Contact fields: email, tags, custom fields
* [x] **P1** AI Lead Score (0–100) на contact
* [x] **P1** AI Summary на contact (auto-generated)
* [x] **P1** Activity timeline (messages, tasks, AI actions, notes)
* [x] **P1** Edit / merge / delete contacts
* [ ] **P2** Pipeline (kanban): New → Qualified → Proposal → Won / Lost
* [ ] **P2** Deals: value, expected close date, stage
* [ ] **P2** Tasks: create, assign, due date, reminders
* [x] **P2** Segments: hot leads, no reply 48h, by channel/source
* [ ] **P2** Auto-create task при high-intent message (AI rule)
* [ ] **P3** Contact import (CSV)
* [ ] **P3** Contact export (CSV / GDPR)

---

## Категория: AI Agents

* [x] **P0** AI CRM Assistant: lead score + summary + suggested action per message
* [x] **P0** AI Follow-Up Agent: cron 24h/48h auto follow-up messages
* [x] **P1** AI suggest reply в Inbox sidebar
* [ ] **P1** Agent builder UI: prompt + channels + triggers
* [ ] **P1** Multi-model support: Gemini + OpenAI + Claude (selector)
* [ ] **P1** AI usage limits per subscription plan
* [ ] **P1** AI cost tracking ($ per conversation)
* [ ] **P2** AI Sales Agent: BANT qualification + routing rules
* [ ] **P2** AI Analytics Assistant: natural language insights («Why did conversions drop?»)
* [ ] **P2** Sentiment analysis на входящих сообщениях
* [ ] **P2** AI Agent templates library (sales, support, booking)
* [ ] **P3** AI Call Agent (voice): Retell AI / Vapi / Twilio integration
* [ ] **P3** AI Instagram comment replies (не только DM)

---

## Категория: Analytics

* [ ] **P0** Overview dashboard: multi-channel metrics (не legacy `analytics` table)
* [ ] **P1** AI Performance panel: AI resolution %, handoff rate, time saved
* [ ] **P1** Response time metrics: first response, avg resolution per channel
* [ ] **P1** CRM funnel: lead → qualified → won conversion
* [ ] **P1** Lead source attribution (channel, website form, campaign)
* [ ] **P2** Team analytics: messages per agent, SLA compliance
* [ ] **P2** Revenue metrics (после Stripe + CRM deals)
* [ ] **P2** AI cost dashboard ($ Gemini spend per business)
* [ ] **P2** Export reports (PDF / CSV)
* [ ] **P3** Custom date range + comparison (week vs week)
* [ ] **P3** Scheduled email reports (weekly digest)

---

## Категория: Integrations — каналы связи

* [x] **P0** Website Forms → Telegram follow-up (завершить stub)
* [ ] **P1** Facebook Messenger channel
* [ ] **P1** Gmail / Google Workspace (send + receive email inbox)
* [ ] **P1** Outlook / Microsoft 365 email
* [ ] **P1** WhatsApp Embedded Signup как альтернатива manual connect
* [ ] **P2** SMS (Twilio / Vonage)
* [ ] **P2** Live chat widget для сайта (OrzuAI embed)
* [ ] **P3** LinkedIn messaging
* [ ] **P3** Viber / Line (regional)

---

## Категория: Integrations — CRM, календари, платежи

* [ ] **P1** Stripe (payments + subscription billing)
* [ ] **P1** HubSpot sync (contacts, deals)
* [ ] **P1** Pipedrive sync
* [ ] **P1** Google Calendar (booking from chat)
* [ ] **P1** Calendly embed + booking AI flow
* [ ] **P2** Salesforce connector
* [ ] **P2** Zoho CRM sync
* [ ] **P2** PayPal checkout links in chat
* [ ] **P2** Mollie (EU payments)
* [ ] **P3** Klarna / BNPL

---

## Категория: Integrations — автоматизация и AI-провайдеры

* [ ] **P1** Zapier integration (triggers + actions)
* [ ] **P1** Make (Integromat) webhooks
* [ ] **P1** n8n self-hosted connector
* [ ] **P1** Outbound webhooks (new lead, new message, AI reply)
* [ ] **P2** OpenAI API как альтернатива Gemini
* [ ] **P2** Anthropic Claude API
* [ ] **P2** DeepSeek API (cost-efficient tier)
* [ ] **P3** Public REST API + API keys для developers

---

## Категория: Automations (Workflow Builder)

* [ ] **P1** Visual workflow builder (triggers → conditions → actions)
* [ ] **P1** Triggers: new message, form submit, tag added, no reply 24h
* [ ] **P1** Actions: send message, create task, update CRM, call AI, notify team
* [ ] **P1** 5 pre-built templates (welcome, follow-up, booking, qualify, escalate)
* [ ] **P2** Conditional branching (if lead score > 70 → assign manager)
* [ ] **P2** Delay steps (wait 2 hours → send follow-up)
* [ ] **P2** Automation analytics (runs, success rate)
* [ ] **P3** Automation marketplace (community templates)

---

## Категория: Knowledge Base

* [ ] **P1** Объединить UI: manual entries + website sync в одном разделе
* [ ] **P1** PDF / document upload → AI extraction
* [ ] **P1** Knowledge training status (coverage score)
* [ ] **P2** Multi-site sync (несколько URL)
* [ ] **P2** Knowledge versioning + rollback
* [ ] **P2** FAQ auto-suggest from conversation gaps
* [ ] **P3** Google Drive / Notion import

---

## Категория: Settings — Workspace и команда

* [ ] **P0** Team: invite members by email
* [ ] **P0** Roles: Owner / Admin / Manager / Agent / Viewer
* [ ] **P0** Permissions matrix per role
* [ ] **P1** User profile edit (name, avatar) в Settings
* [ ] **P1** Multi-location / multi-brand per account
* [ ] **P1** Channel health dashboard в Settings
* [ ] **P2** Agent availability + routing rules
* [ ] **P2** Business hours per channel (AI off outside hours)
* [ ] **P3** SSO (Google Workspace / SAML) для enterprise

---

## Категория: Settings — AI, уведомления, безопасность

* [ ] **P1** AI settings: default model, temperature, max tokens
* [ ] **P1** AI global system prompt в Settings (не только per-channel)
* [ ] **P1** AI usage limits UI per plan
* [ ] **P1** Email notifications: new lead, AI failed, daily digest
* [ ] **P1** WhatsApp admin alerts (новый лид)
* [ ] **P2** Push notifications (PWA)
* [ ] **P2** 2FA (TOTP)
* [ ] **P2** Session management (active sessions, revoke)
* [ ] **P2** Login history
* [ ] **P2** IP allowlist (enterprise)
* [ ] **P3** Audit log (who changed what)

---

## Категория: Settings — брендинг и API

* [ ] **P1** Billing section: plan, usage, invoices (Stripe Customer Portal)
* [ ] **P2** White-label: custom logo, colors, domain (agency mode)
* [ ] **P2** API keys management (generate, revoke, scopes)
* [ ] **P2** Outbound webhook configuration UI
* [ ] **P3** Custom email domain (Resend)
* [ ] **P3** Remove «Powered by OrzuAI» (enterprise)

---

## Категория: Billing и монетизация

* [ ] **P0** Stripe integration: subscription plans (Free / Starter / Pro / Agency)
* [ ] **P0** Usage-based AI pricing (messages / tokens overage)
* [ ] **P0** Subscription page: plan comparison, upgrade, cancel
* [ ] **P1** Free trial (14 days Pro)
* [ ] **P1** Invoice history + PDF download
* [ ] **P1** Payment method management
* [ ] **P2** Agency / reseller pricing tier
* [ ] **P2** Annual billing discount
* [ ] **P3** Marketplace revenue share (automations, AI agents)

---

## Категория: Tech Debt и баги

* [ ] **P0** Удалить misleading `DashboardComingSoon` для реальных фич
* [ ] **P1** WhatsApp sync: реализовать backfill истории или убрать кнопку
* [ ] **P1** Миграция Overview с `analytics` на `channel_analytics`
* [ ] **P1** Overview AI status: per-channel (не первый row без filter)
* [ ] **P1** Обновить `DATABASE_SCHEMA.md` под актуальные миграции
* [ ] **P2** Удалить legacy `ComingSoonChannelPanel` fallback
* [ ] **P2** Удалить неиспользуемый `TELEGRAM_WEBHOOK_SECRET` env или задокументировать
* [ ] **P2** Instagram manual connect API: скрыть или admin-only
* [ ] **P2** Единый error boundary + toast strategy
* [ ] **P3** E2E tests: onboarding → connect → first AI reply
* [ ] **P3** Load testing webhooks (1000 msg/min)

---

## Категория: Platform V2 — крупные модули (1–3 месяца)

* [ ] **P0** Module: **Home** (activation dashboard с progress ring)
* [ ] **P0** Module: **Inbox** (unified + realtime + AI sidebar)
* [ ] **P0** Module: **CRM** (contacts + pipeline + tasks)
* [ ] **P0** Module: **AI Agents** (builder + templates + follow-up)
* [ ] **P1** Module: **Automations** (visual workflow builder)
* [ ] **P1** Module: **Analytics V2** (AI + CRM + business metrics)
* [ ] **P1** Module: **Team** (members, roles, routing)
* [ ] **P1** Module: **Billing** (Stripe full)
* [ ] **P2** Module: **Calls** (AI voice agent)
* [ ] **P2** Module: **Integrations Marketplace**
* [ ] **P3** Module: **Mobile App** (PWA → React Native)

---

## Категория: Будущее платформы (6–12 месяцев)

* [ ] **P3** Agency marketplace (templates, automations, AI agents)
* [ ] **P3** Multi-location / multi-brand accounts
* [ ] **P3** Revenue attribution (Stripe → CRM → AI)
* [ ] **P3** GDPR compliance dashboard + data residency EU
* [ ] **P3** Community integrations App Store
* [ ] **P3** AI Agent Store (pre-built bots)
* [ ] **P3** Цель: 1,000+ paying customers, $50K+ MRR

---

## Сводка прогресса V2.0

| Категория | Задач | P0 |
|-----------|-------|-----|
| Quick Wins | 18 | 6 |
| UX — навигация | 10 | 4 |
| UX — Inbox | 10 | 1 |
| UX — Onboarding | 9 | 3 |
| UI — Design System | 11 | 0 |
| UI — Landing | 10 | 1 |
| CRM | 14 | 2 |
| AI Agents | 13 | 2 |
| Analytics | 11 | 1 |
| Integrations — каналы | 9 | 1 |
| Integrations — CRM/календари | 10 | 0 |
| Integrations — automation/AI | 8 | 0 |
| Automations | 8 | 0 |
| Knowledge Base | 7 | 0 |
| Settings — команда | 9 | 3 |
| Settings — AI/безопасность | 11 | 0 |
| Settings — брендинг/API | 6 | 0 |
| Billing | 9 | 3 |
| Tech Debt | 11 | 1 |
| Platform V2 модули | 11 | 4 |
| Будущее | 7 | 0 |
| **Итого** | **~202** | **~32** |

---

## Рекомендуемый порядок спринтов

### Sprint 1 (неделя 1) — Activation
Quick Wins P0 + Onboarding wizard + Fix Contacts + Landing CTA

### Sprint 2 (неделя 2) — Trust
Overview metrics fix + Empty states + Channel analytics + Hide stubs

### Sprint 3 (недели 3–4) — CRM Lite
Unified contacts + AI Lead Score + AI Summary + Activity timeline

### Sprint 4 (недели 5–6) — Revenue
Stripe billing + Subscription page + AI usage limits

### Sprint 5 (недели 7–8) — Inbox V2
Realtime + Search + AI suggest reply + Follow-up agent

### Sprint 6 (месяц 3) — Platform
Team roles + Automations templates + CRM Pipeline
