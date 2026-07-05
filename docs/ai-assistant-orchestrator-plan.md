# План: AI Assistant (лидер) + AI Agents (исполнители)

> **2026-07 update:** В продакшене один **AI Agent** (`ai_assistant_profile`) — Phase 1 reply + Phase 2 orchestrator + code executor. Отдельные AI Agents и keyword routing **удалены**. BANT/lead scoring — post-step orchestrator, не inbound automations. Промпты — Admin CMS (`platform_prompts`) + tenant `system_prompt`. Observability — `agent_runs` (planned / executed / blocked / skipped).

Цель: **один системный Gemini-ассистент** общается с клиентами 24/7. Специализированные агенты **не заменяют** его в чате — они **выполняют задачи** в CRM по его поручению.

---

## Видение (как должно работать)

```
Клиент пишет в WhatsApp / Telegram / Website Forms
                    │
                    ▼
         ┌──────────────────────┐
         │  AI Assistant        │  ← всегда Gemini, 24/7 если toggle ON
         │  (лидер, один на     │
         │   бизнес)            │
         └──────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                         │
   Обычный ответ            Нужно действие
   (FAQ, поддержка)        (запись, сделка, CRM)
        │                         │
        ▼                         ▼
   Ответ клиенту          Вызов AI Agent-исполнителя
                          (создать сделку, задачу,
                           встречу, обновить контакт)
                                    │
                                    ▼
                          Assistant подтверждает клиенту
```

### Принципы

| Правило | Пояснение |
|---------|-----------|
| **AI Assistant ≠ AI Agent** | Ассистент — лицо бизнеса в чате. Агент — исполнитель задач. |
| **Toggle = работает 24/7** | Включил на канале → отвечает без создания агентов и без сложных настроек |
| **Только Gemini** | Платформенный Gemini для Assistant (не выбор провайдера на простом экране) |
| **Inbox** | Только быстрый переключатель on/off (как сейчас `ChatAiToggle`) |
| **Раздел AI** | Две вкладки: **AI Assistant** (по умолчанию) и **AI Agents** |
| **Без вкладки Channels** | Убрать сложные настройки модели/промпта/теста с каналов |
| **Роутинг по смыслу** | «Хочу записаться» / «зарегистрируйте меня» → нужный агент **без** ключевых слов от клиента |

---

## Текущее состояние (проблемы)

| Сейчас | Проблема |
|--------|----------|
| Вкладка **Channels** в `/dashboard/ai-assistant` | Слишком сложно: модель, промпт, тест, `ChannelAiPanel` |
| `resolveAgentMatch` по **ключевым словам** | «Запишите меня» не сработает без keyword |
| Агент меняет только **текст ответа** | Не создаёт сделки, задачи, встречи в CRM |
| `ai_settings` per channel | provider/model/prompt на каждый канал — путаница с «одним ассистентом» |
| AI preview в Integrations | Дублирует настройки — нужно только toggle + ссылка |

---

## Целевая UI

### Навигация

- Sidebar: **AI** → `/dashboard/ai-assistant` (открывается **AI Assistant**)
- URL: `?tab=assistant` (default) | `?tab=agents`
- Redirect: `/dashboard/ai-manager`, `?tab=channels` → `?tab=assistant`

### Вкладка «AI Assistant» (простая)

```
┌─────────────────────────────────────────────────────────┐
│  [AI Assistant]  [AI Agents]          ← toolbar         │
├─────────────────────────────────────────────────────────┤
│  Краткое описание: ваш ассистент работает 24/7…        │
│                                                         │
│  ┌ WhatsApp ──────────────── [ON ●]  [Изменить] ─┐    │
│  ┌ Telegram ──────────────── [OFF   ]  [Изменить] ─┐   │
│  ┌ Website Forms ─────────── [ON ●]  [Изменить] ─┐    │
└─────────────────────────────────────────────────────────┘
```

- **Переключатель** — `ai_settings.ai_enabled` per channel (синхрон с Inbox)
- **Изменить** — открывает полную страницу профиля ассистента (не per-channel)

### Страница «Изменить ассистента»

`/dashboard/ai-assistant/assistant/edit` (или `?tab=assistant&edit=1`)

| Поле | Описание |
|------|----------|
| Имя | Как представляется («Анна из Orzu Clinic») |
| Поведение | Инструкции: чем занимается бизнес, что делать/не делать |
| Стиль общения | friendly / professional / concise (существующий каталог) |
| Язык | Язык ответов |

Без выбора модели и провайдера — **Gemini фиксирован**.

### Вкладка «AI Agents»

- Текущий wizard + список агентов (sales, booking, support, custom)
- Каждый агент: **цель (goal)** + каналы + инструкции
- Агенты **не обязательны** для работы Assistant
- В будущем: привязка **наборов действий** (CRM tools) к goal агента

### Что убираем из UI

| Убрать | Где |
|--------|-----|
| Вкладка **Channels** | `AiAgentsHub`, toolbar, URL `tab=channels` |
| `ChannelAiPanel` (модель, тест, промпт per channel) | Channels tab, Integrations deep-link |
| `AiAssistantChannelsPanel` bulk enable | Заменить простым списком |
| `IntegrationChannelAiPreview` — model, test links | Оставить toggle + «Настроить в AI» |
| Provider/model select на простом экране | Assistant edit не показывает |
| `AiGlobalDefaultsCard` | Per-channel defaults не нужны для MVP |

### Что остаётся

| Оставить | Где |
|----------|-----|
| `ChatAiToggle` | Inbox header |
| Knowledge Base | Отдельный модуль |
| Voice AI | Отдельный модуль |

---

## Целевая серверная архитектура

### Данные

**Новая таблица `ai_assistant_profile`** (один профиль на business):

```sql
ai_assistant_profile (
  business_id UUID PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'AI Assistant',
  system_prompt TEXT NOT NULL,
  communication_style TEXT NOT NULL DEFAULT 'friendly',
  language TEXT NOT NULL DEFAULT 'English',
  updated_at TIMESTAMPTZ
)
```

**`ai_settings` per channel** — упростить роль:

| Поле | Роль |
|------|------|
| `ai_enabled` | Toggle канала (единственное что меняет пользователь на простом экране) |
| `channel` | whatsapp / telegram / website_forms |
| provider/model/prompt | Игнорируются для Assistant path → всегда Gemini + `ai_assistant_profile` |

### Pipeline (этапы внедрения)

#### Фаза A — Ответ ассистента (без оркестрации)

`generateChannelAutoReply` → всегда:
- provider: `gemini`
- model: platform default
- systemPrompt: из `ai_assistant_profile` + communication style
- **Не** подменять промптом агента для обычного ответа

#### Фаза B — Intent router (семантика)

После получения сообщения клиента:

1. Gemini классифицирует intent: `general | booking | sales | support | registration | none`
2. Сопоставляет с enabled agent по **goal** (`sales`, `booking`, `support`, `custom`)
3. Если confidence > threshold → передаёт в executor

Заменяет `resolveAgentMatch` по keywords для **делегирования** (keywords остаются fallback).

#### Фаза C — Agent executor (CRM actions)

Новый `agent-task-executor.service.ts`:

| Tool | Действие |
|------|----------|
| `update_contact` | Имя, email, теги, pipeline_stage |
| `create_deal` | Сделка в CRM |
| `create_task` | Задача с due date |
| `create_meeting` | Запись / событие (если есть календарь) |
| `add_note` | Заметка на контакт |

Flow:
1. Assistant получает сообщение
2. Intent router → agent goal
3. Executor вызывает Gemini function-calling / structured JSON с tools
4. Выполняет действия в Supabase
5. Assistant формирует **ответ клиенту** с результатом («Записал вас на…»)

---

## Этапы работ

### Этап 1 — UI: простой AI Assistant + убрать Channels ✅

**Цель:** пользователь видит простой экран, система открывается на Assistant.

- [x] Табы: `assistant` (default) | `agents`; удалить `channels`
- [x] `AiAssistantHubPanel` — список каналов + toggle + кнопка «Изменить»
- [x] Redirect `tab=channels` → `tab=assistant`
- [x] Toolbar: «AI Assistant» | «AI Agents»
- [x] Убрать `AiAssistantChannelsPanel`, `ChannelAiPanel` из AI UI
- [x] Упростить `IntegrationChannelAiPreview` — toggle + ссылка на AI Assistant
- [x] Inbox `ChatAiToggle` — без изменений (уже есть)

**Проверка:** toggle Inbox ↔ AI Assistant синхронно; нет вкладки Channels.

---

### Этап 2 — Профиль ассистента + Gemini-only pipeline ✅

**Цель:** один ассистент на бизнес, всегда Gemini, работает без агентов.

- [x] Миграция `ai_assistant_profile`
- [x] `ai-assistant-profile.service.ts` — get/save
- [x] Страница редактирования: имя, поведение, стиль, язык
- [x] `generateChannelAutoReply`: Assistant path → profile prompt, `gemini` only
- [x] Отключить подмену промпта агентом для **текста ответа** (агенты — только этап 4)
- [x] Defaults при создании business

**Проверка:** AI ON на канале → inbound → ответ Gemini с профилем; агенты не нужны.

---

### Этап 3 — Убрать лишние настройки AI везде ✅

**Цель:** нигде нет model/provider/prompt per channel в UI.

- [x] Удалить/скрыть `ChannelAiPanel` из всех маршрутов
- [x] Onboarding: только toggle + ссылка на Assistant edit
- [x] Integrations wizard: Configure AI → Assistant tab
- [x] Убрать `AiGlobalDefaultsCard`, provider select с простых экранов
- [x] Обновить тексты (RU/EN constants)

**Проверка:** grep по UI — нет выбора провайдера вне Settings → API keys (если останется для агентов).

---

### Этап 4 — Intent router (смысл, не ключевые слова) ✅

**Цель:** «хочу записаться» → booking agent без keyword.

- [x] `intent-router.service.ts` — Gemini classification JSON
- [x] Маппинг intent → `AgentWizardGoalId` (sales/booking/support/custom)
- [x] Выбор enabled agent с matching goal на канале
- [x] Fallback: general → только Assistant отвечает

**Проверка:** сообщения без keywords триггерят правильного агента в логах.

---

### Этап 5 — Agent executor (реальные действия в CRM) ✅

**Цель:** агент создаёт сделку, задачу, обновляет контакт.

- [x] `agent-task-executor.service.ts` + tool definitions
- [x] Привязка tools к goal агента (booking → create_task + update_contact)
- [x] Интеграция в `processChannelAutoReply` / effects pipeline
- [x] Логирование `agent_runs` / audit trail
- [x] Ответ клиенту от Assistant с итогом действия

**Проверка:** «Запишите меня на завтра» → task/deal в CRM + ответ в чате.

---

### Этап 6 — Полировка ✅

- [x] Knowledge RAG вместо `LIMIT 25`
- [x] Debounce / очередь сообщений
- [x] Аналитика: ответы Assistant vs delegated agents

---

## Файлы (ключевые)

| Создать | Изменить | Удалить/упростить |
|---------|----------|-------------------|
| `ai-assistant-profile.service.ts` | `auto-reply-pipeline.service.ts` | `AiAssistantChannelsPanel` |
| `intent-router.service.ts` | `AiAgentsHub.tsx` | `ChannelAiPanel` в AI routes |
| `agent-task-executor.service.ts` | `ai-assistant-url.ts` | `tab=channels` |
| `AiAssistantHubPanel.tsx` | `messaging.service.ts` | |
| `AiAssistantEditPage.tsx` | Integrations preview | |

---

## Риски и ограничения

1. **Этап 5 — самый большой** — function-calling, идемпотентность, ошибки CRM
2. **Календарь/встречи** — если нет интеграции, `create_meeting` = task с типом meeting
3. **Миграция** — существующие `ai_settings.system_prompt` per channel → перенести в `ai_assistant_profile` (один раз)
4. **Агенты с custom API key** — остаются для Agents tab; Assistant всегда platform Gemini

---

## Порядок для пользователя

1. **Этап 1** — сразу виден простой UI (можно пользоваться toggle)
2. **Этап 2** — ассистент реально отвечает как единый Gemini-работник
3. **Этап 3** — убраны все лишние настройки
4. **Этапы 4–5** — умное делегирование и CRM-действия

После каждого этапа: `npx tsc --noEmit` + ручная проверка inbound на WA/TG.
