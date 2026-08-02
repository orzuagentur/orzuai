---
name: code-review
description: Review code changes in OrzuAI for correctness, regressions, security, data access, TypeScript quality, and missing tests. Use when reviewing pull requests, local diffs, branch changes, implementation plans, or when the user asks for a code review, bug review, risk review, regression check, or PR feedback.
---

# Code Review

## Review Stance

Prioritize actionable findings over summaries. Lead with bugs, regressions, security risks, data integrity issues, and missing tests. Keep comments grounded in the changed code and avoid broad refactors unless they are required to fix a real risk.

If there are no material issues, say so clearly and mention any remaining verification gaps.

## Project Context

OrzuAI is a Next.js 15, React 19, TypeScript strict-mode app with Supabase, multi-channel messaging, AI automation, workers, cron routes, and an admin workspace. Review changes with these system boundaries in mind:

- Root app code lives under `src/`; admin workspace lives under `apps/admin/`; shared packages live under `packages/`.
- Server actions, API routes, workers, cron routes, and service modules often touch customer messaging, CRM state, auth, billing, webhooks, and AI replies.
- Supabase access must respect auth, RLS boundaries, business ownership, and service-role isolation.
- Messaging changes can affect WhatsApp, Telegram, Instagram, email, SMS, voice, and website form flows.

## Review Checklist

Check for:

- Correctness: changed logic handles nulls, empty states, retries, concurrent updates, stale data, and partial failures.
- Regressions: existing user flows, background jobs, realtime subscriptions, delivery status, unread counts, and CRM updates still work.
- Data access: queries are scoped by authenticated user and `business_id` where appropriate; service-role clients are server-only and not exposed to client bundles.
- Security: secrets stay server-side; webhook and cron endpoints validate signatures or bearer tokens; user input is validated before persistence or external calls.
- Performance: avoid unnecessary database queries, excessive re-renders, repeated AI calls, N+1 queries, and unnecessary API requests.
- AI cost: avoid unnecessary LLM calls, prefer caching, batching, and reuse existing responses where possible.
- Respect the existing architecture. Do not introduce new patterns, libraries, or abstractions unless there is a strong technical reason.
- TypeScript quality: no `any`, no unused variables, no unchecked indexed access assumptions, and no avoidable casts that hide invalid states.
- Next.js boundaries: client components do not import server-only modules; server code does not depend on browser APIs; async route/action behavior matches Next.js 15 conventions.
- UI behavior: loading, error, empty, disabled, and mobile states are handled for changed user-facing components.
- AI and messaging safety: automated replies remain customer-safe, channel-aware, rate-limited where needed, and do not leak internal context.
- Persistence and migrations: schema changes include matching types, constraints, indexes, RLS policies, and rollback-aware reasoning.
- Tests and verification: risky changes have focused tests or a clear manual verification path.

## Verification Guidance

Use the smallest verification set that covers the changed behavior:

- Run `npm run lint` for TypeScript and ESLint coverage.
- Run `npm run build` when changes touch Next.js routing, server/client boundaries, environment validation, or shared types.
- Run workspace-specific checks for `apps/admin` or `packages/*` when those areas change.
- For environment changes, run `npm run validate:env`.
- For webhook, worker, or cron changes, verify authentication, idempotency, retry behavior, and queue drain behavior.

Do not require expensive load tests unless the change affects throughput, queueing, or concurrency-sensitive paths.

## Response Format

Use this structure:

```markdown
## Findings

- **Severity**: Brief issue title in `path`
  Explain the impact, why it happens, and the smallest credible fix.

## Open Questions

- Any assumptions or missing context that affect review confidence.

## Summary

Briefly describe the reviewed surface and verification gaps.
```

Order findings by severity. If there are no findings, replace the findings list with: "No material issues found."
