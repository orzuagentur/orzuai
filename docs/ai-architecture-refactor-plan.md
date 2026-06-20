# План рефакторинга AI-архитектуры Orzuai

Цель: **одна понятная система**, без дублирующих экранов и копипасты логики.

---

## Целевая архитектура (как должно быть)

```
┌─────────────────────────────────────────────────────────────┐
│  UI                                                         │
│  • Inbox — быстрый toggle AI на канал (ChatAiToggle)        │
│  • AI (/dashboard/ai-assistant) — единый центр управления   │
│      ├─ Agents — специализированные агенты                    │
│      ├─ Channels — on/off, модель, промпт, тест             │
│      └─ Advanced — follow-up, sales, global defaults        │
│  • Integrations — только подключение канала + ссылка на AI  │
│  • Knowledge — база знаний                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Services (server)                                            │
│  • auto-reply-pipeline.service — единая генерация ответа    │
│  • channel-ai.service — единый toggle + save ai_settings     │
│  • llm.service — провайдеры (без изменений)                 │
│  • ai-agents.service — CRUD агентов                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  БД                                                         │
│  ai_settings (per channel) │ ai_agents │ knowledge_base     │
└─────────────────────────────────────────────────────────────┘
```

### Что убираем / объединяем

| Было | Решение |
|------|---------|
| **My Assistant** (`/ai-manager`) + **AI Agents** (`/ai-assistant`) | Один раздел **AI** — вкладка Channels переносится из Manager |
| Toggle в 4 action'ах | Один `toggleChannelAiEnabled()` |
| LLM pipeline в 3 файлах | Один `generateChannelAutoReply()` |
| AI panel в Integrations (полный дубликат) | Статус + ссылка «Настроить в AI →» |
| `toggleChatAi` (вводит в заблуждение) | Переименовать в channel-level API |

### Что оставляем отдельно (не дубликаты)

| Модуль | Почему отдельно |
|--------|-----------------|
| Voice AI | Другой транспорт (Twilio), другие промпты |
| Follow-up agent | Cron, другой триггер (24/48ч) |
| Automations | Rule engine |
| Suggest reply | Ручной черновик, не отправка |

---

## Этапы работ

### Этап 1 — Единый AutoReply pipeline ✅ (в работе)

- [ ] `src/services/auto-reply-pipeline.service.ts`
- [ ] Рефактор `processChannelAutoReply` (messaging.service.ts)
- [ ] Рефактор `testChannelAiReply` (channel-workspace.service.ts)
- [ ] Рефактор `processWebsiteFormFollowUp` (website-forms.service.ts)

### Этап 2 — Единый channel AI API

- [ ] `src/services/channel-ai.service.ts` — toggle, save, get
- [ ] `toggleChatAi` → делегирует в channel-ai
- [ ] `suggestConversationReply` — тот же agent routing + multi-provider check
- [ ] Клиент: один action `toggleChannelAiAction`

### Этап 3 — UI: один раздел AI

- [ ] Вкладка **Channels** в AiAgentsHub (bulk toggle + ChannelAiPanel из Manager)
- [ ] Redirect `/ai-manager` → `/ai-assistant?tab=channels`
- [ ] Nav: убрать «My Assistant», оставить «AI» (бывший AI Agents)
- [ ] Обновить ссылки (dashboard, onboarding, integrations wizard)

### Этап 4 — Упростить Integrations

- [ ] В channel workspace «AI» — preview + кнопка «Open AI settings»
- [ ] Убрать полный `ChannelAiPanel` из integrations route (если дублируется)

### Этап 5 — Надёжность auto-reply

- [ ] Вынести side effects (sentiment, sales, automations) из `processChannelAutoReply`
- [ ] (Опционально) очередь QStash + debounce per conversation

### Этап 6 — Knowledge (позже)

- [ ] Retrieval layer вместо `LIMIT 25`

---

## Принципы

1. **Один источник правды** — `ai_settings` + `ai_agents`, один pipeline генерации.
2. **Один экран настройки** — `/dashboard/ai-assistant`.
3. **Inbox toggle** — только shortcut, не отдельная логика.
4. **Без big bang** — каждый этап отдельный PR, tsc + ручная проверка.

---

## Проверка после каждого этапа

- [ ] Toggle в Inbox ↔ AI Assistant ↔ Channel tab — синхронно
- [ ] Inbound WA/TG → AI ответ при `ai_enabled=true`
- [ ] Test reply в channel settings работает
- [ ] Suggest reply в Inbox работает
- [ ] `npx tsc --noEmit`
