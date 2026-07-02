# OrzuX Admin Panel — Vercel Deploy

Отдельное Next.js приложение в monorepo: `apps/admin`.

## 1. Supabase

```bash
npx supabase db push
```

Миграция `20250718120000_app_secrets_and_platform_admins.sql` создаёт:

- `app_secrets` — зашифрованные секреты
- `app_secret_audit_log` — журнал аудита
- `platform_admins` — доступ к админке

Миграция `20250719130000_platform_admin_presence_notifications.sql` добавляет:

- присутствие в админке (heartbeat, зелёный статус только при активной вкладке)
- `platform_admin_activity` — вход/выход/онлайн/оффлайн
- `platform_admin_notifications` — уведомления (например, «приглашение принято»)

Миграция `20250719150000_ai_voice_stt_tts_call_types.sql` добавляет типы `voice_stt` / `voice_tts` и обновляет SQL-аналитику.

Добавьте первого администратора (один раз, через SQL или после деплоя admin UI):

```sql
INSERT INTO public.platform_admins (user_id, role)
VALUES ('<auth.users uuid>', 'owner');
```

Либо в админке: **Команда → Add Admin** (пользователь должен уже быть зарегистрирован в Supabase Auth).

## 2. Переменные окружения (оба проекта Vercel)

**Bootstrap (остаются в Vercel ENV):**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY` (32+ символов или 64 hex)
- `NEXT_PUBLIC_APP_URL` (только web)

**Admin project дополнительно:**

- Те же Supabase + `ENCRYPTION_KEY`
- `NEXT_PUBLIC_ADMIN_APP_URL` — публичный URL админки (для ссылок в письмах), например `https://admin.orzux.com`
- `RESEND_API_KEY` и `RESEND_FROM_EMAIL` — письма приглашения и уведомления о входе
- Отдельный домен, например `admin.orzux.com`

**Синхронизация с Vercel (кнопка в Admin → API ключи / General API AI):**

Ключи берутся из **основного** Vercel-проекта `orzuaibot` (orzux.com), **не** из `orzuai-admin`.

На проекте **orzuai-admin** добавьте:

| Переменная | Значение |
|------------|----------|
| `VERCEL_ACCESS_TOKEN` | Personal/team token с доступом к env |
| `VERCEL_SYNC_PROJECT_ID` | `prj_1pZTdfXPPP2hiY4uGAWjBtqwLzBa` |
| `VERCEL_SYNC_PROJECT_NAME` | `orzuaibot` (опционально, для отображения) |
| `VERCEL_TEAM_ID` | `team_rRA61vEP6JGZ9Ezty2ElzGy8` |

Без `VERCEL_ACCESS_TOKEN` синхронизация не выполнится — runtime env админки намеренно не используется.

## 3. Миграция секретов из Vercel в БД

На **web** проекте (локально с `.env.local`):

```bash
npm run migrate:secrets
```

Скрипт автоматически переносит **все** migratable ENV (не bootstrap, не `NEXT_PUBLIC_*`).

## 4. Vercel — отдельный проект для admin

1. New Project → тот же GitHub репозиторий
2. **Root Directory:** `apps/admin`
3. Framework: Next.js
4. Environment variables: bootstrap keys above
5. Custom domain: `admin.yourdomain.com`
6. **Не** добавляйте ссылки на admin из основного сайта

## 5. Локальная разработка

```bash
npm install
npm run dev          # web на :3000
npm run dev:admin    # admin на :3001
```

## 6. Безопасность

- `robots.txt`: `Disallow: /`
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex`
- Нет sitemap, OpenGraph, Twitter Cards
- Middleware: только `platform_admins`
- Все секреты шифруются AES-256-GCM

## 7. После миграции

Web-приложение читает секреты из `app_secrets` (кэш 60с) с fallback на `process.env` для bootstrap и переходного периода.

Управление секретами: **API ключи** в admin UI.

После входа открывается **Дашборд** (`/dashboard`) с метриками платформы. Также доступны:

- **AI расходы** (`/ai-expenses`) — аналитика по Gemini, OpenAI, Claude
- **API ключи** (`/settings/secrets`) — карточки секретов с меню действий
- **Команда** (`/team`) — администраторы и роли

Админка поддерживает **PWA**: можно установить как приложение (manifest + service worker).
