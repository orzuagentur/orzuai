# OrzuX Admin Panel — Master Rebuild Plan

## Vision

Professional platform control center for OrzuX operators: manage every tenant (business), their AI spend, channels, account status, and direct support communication — without leaving admin.

**Principles:** card-based UI, clear Russian labels, role-based access, audit everything destructive, service-role reads with platform_admin gate.

---

## Current State (kept 100%)

| Section | Route | Status |
|---------|-------|--------|
| Дашборд | `/dashboard` | Keep + enhance KPIs |
| AI расходы | `/ai-expenses` | Keep + per-business drill-down |
| Управление AI | `/ai-management/*` | Keep |
| API ключи | `/settings/secrets` | Keep |
| Команда | `/team` | Keep |
| Legal pages | `/legal-pages` | Keep |

---

## New Sections

| Section | Route | Phase |
|---------|-------|-------|
| **Бизнесы** | `/businesses` | 1 — list, search, filters |
| **Бизнес** | `/businesses/[id]` | 1 — detail tabs |
| **Поддержка** | `/support` | 1 — OrzuX ↔ tenant chat |
| **Уведомления** | `/announcements` | 2 — broadcast to tenants |
| **Биллинг** | `/billing` | 2 ✅ — Stripe deep links, MRR, CSV |
| **Аудит** | `/audit` | 3 ✅ — cross-tenant log, filters, CSV |

---

## Business Detail Tabs (target)

```
Overview     — owner, plan, status, created, quick stats
Analytics    — messages, conversations, channels (7/30d)
AI & Voice   — toggles: AI, voice, SMS, automations, outbound AI
Channels     — WhatsApp, Telegram, Twilio, Email status cards
Expenses     — ai_usage_logs for this business
Activity     — recent calls, chats count
Support      — thread with this business
Controls     — suspend, delete (owner only), admin notes
```

---

## Support Channel Architecture

```
Platform Admin (apps/admin)
    ↕ platform_support_threads (1 per business)
    ↕ platform_support_messages
Tenant Dashboard (main app — Phase 2)
    — widget «Поддержка OrzuX» reads same thread via RLS
```

Message types: `platform` (admin), `business` (tenant owner reply).

Future: AI assist for support replies (draft from context) in Phase 3.

---

## Data Model (Phase 1 migration)

- `platform_business_controls` — account_status, feature flags, admin notes
- `platform_support_threads` — one thread per business
- `platform_support_messages` — chat messages
- `platform_business_admin_audit_log` — suspend, delete, toggle events

---

## Permissions

| Action | owner | admin | support |
|--------|-------|-------|---------|
| View businesses | ✓ | ✓ | ✓ |
| Toggle AI/features | ✓ | ✓ | ✓ |
| Send support message | ✓ | ✓ | ✓ |
| Suspend account | ✓ | ✓ | — |
| Delete business | ✓ | — | — |
| Manage team/secrets | ✓ | partial | — |

---

## UI System

- **PageHeader** — title, description, actions
- **SectionCard** — grouped content with icon
- **StatCard** — existing, reused
- **StatusBadge** — plan, status, channel
- **Sidebar sections** — Platform | Operations | System
- Max width `1400px`, responsive cards grid

---

## Phased Delivery

### Phase 1 ✅
- Migration + RLS (`platform_business_admin`, `platform_announcements`)
- Businesses list + detail tabs (overview, analytics, controls, channels, tools)
- Support inbox + tenant widget in main app
- Sidebar + layout rebuild
- Business delete/suspend/toggle actions + audit log

### Phase 2 ✅
- Tenant-facing support widget + announcements banner in dashboard
- Per-business analytics charts (7/30/90d)
- Platform announcements + push delivery (internal API + admin trigger)
- SMS send from admin (Twilio)
- Billing panel + Stripe deep links
- Platform controls enforcement in main app services

### Phase 3 ✅
- AI draft for support replies (OpenAI)
- Read-only platform preview (`/platform-preview?token=…`)
- Audit explorer with filters
- CSV export (audit + billing)
- Push resend / send on re-enable announcements

### Deferred
- Full dashboard login-as-tenant (RLS limits → preview-only)
- Voice history dedupe UI, Twilio Geo +49

---

## Security

- All mutations via `requirePlatformAdmin()` + role checks
- Destructive actions require `owner` role + confirmation phrase
- Audit log for every control change
- No secrets in client components
- Business delete = CASCADE (irreversible)
