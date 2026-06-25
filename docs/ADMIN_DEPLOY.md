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

Добавьте первого администратора:

```sql
INSERT INTO public.platform_admins (user_id)
VALUES ('<auth.users uuid>');
```

## 2. Переменные окружения (оба проекта Vercel)

**Bootstrap (остаются в Vercel ENV):**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY` (32+ символов или 64 hex)
- `NEXT_PUBLIC_APP_URL` (только web)

**Admin project дополнительно:**

- Те же Supabase + `ENCRYPTION_KEY`
- Отдельный домен, например `admin.orzux.com`

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

Управление секретами: **Настройки → Секреты и API ключи** в admin UI.
