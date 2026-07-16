# Platform Copilot Isolation

OrzuAI’s in-dashboard Platform Copilot is an operator helper, not a customer-facing channel. Isolation rules:

1. **Tenant-scoped** — Every context query filters by the current `business_id`. Copilot never loads another tenant’s data.
2. **No message bodies** — Context includes contact/conversation metadata (ids, names, channels, CRM deal fields, knowledge titles). It does **not** include chat or email message content.
3. **PII masked** — Phone numbers are reduced to last-4 digits; emails show domain only (`***@example.com`). Names and record IDs remain for navigation.
4. **Separate usage `call_type`** — LLM usage is logged as `platform_copilot` (not customer-facing types like `auto_reply` / `orchestrator`), so billing and analytics stay isolated from customer reply quotas.
