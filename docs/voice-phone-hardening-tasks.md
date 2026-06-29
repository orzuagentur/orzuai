# Voice / Phone Enterprise Hardening Tasks

This file is the working memory for turning OrzuX Voice/Phone into a reliable production phone product.

## Current Priority

Build a safe, reliable, real-world phone product before adding advanced campaign and enterprise features.

## P0 - Must Fix Before First Sale

- [x] Fail-closed Twilio webhook signatures.
- [x] Add Twilio signature validation to `voice/gather` and `voice/outbound`.
- [x] Make voice call logging idempotent with `business_id + CallSid`.
- [x] Resolve or create Contact and Conversation at inbound call start.
- [x] Move browser softphone to the global dashboard shell.
- [ ] Add incoming-call and missed-call push/toast/sound/badges.
- [x] Harden voice callback queue with locking, retries, and scheduled cron.
- [ ] Fix child/parent `CallSid` lifecycle handling.
- [ ] Add missed-call callback workflow.

## P1 - Strong SaaS Phone Product

- [ ] Run post-call AI orchestration over the full transcript.
- [ ] Create AI summary, internal notes, tasks, follow-up, deal updates, bookings, and calendar events after calls.
- [ ] Add Voice line settings UI: SMS, recording, greetings, business hours, inbound/outbound toggles.
- [ ] Add owner/team notifications for AI-created CRM actions.
- [ ] Add per-user phone availability: Available, Away, DND.
- [ ] Add call recording consent and compliance copy.
- [ ] Add SMS delivery status callbacks.
- [ ] Add voicemail or missed-call capture.
- [ ] Add call disposition and post-call notes.

## P2 - Future Enterprise Features

- [ ] Multi-number per business.
- [ ] Multi-user ring groups and round-robin routing.
- [ ] Warm transfer, hold, call queue, and call park.
- [ ] Campaign dialer and mass calling with consent controls.
- [ ] Do-not-call and opt-out management.
- [ ] Advanced call analytics and quality monitoring.
- [ ] Recording retention policies and export/delete tooling.
- [ ] Post-call Whisper transcription from recordings.
- [ ] Retell/Vapi full provider parity.
- [ ] Per-region geo permissions and compliance settings.

## Guardrails

- Keep all phone webhooks authenticated and idempotent.
- Never block Twilio voice responses on fragile background work.
- Prefer durable queues for retries, AI post-processing, notifications, and CRM side effects.
- Preserve multi-business isolation in every webhook and background job.
- Keep UX global: users must not miss calls just because they are outside the Voice page.
