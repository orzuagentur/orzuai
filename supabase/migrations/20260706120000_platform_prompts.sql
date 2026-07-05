-- Platform-managed AI prompt templates (versioned, admin CMS).

CREATE TABLE public.platform_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT NOT NULL CHECK (
    prompt_key IN (
      'assistant_system',
      'orchestrator',
      'executor',
      'follow_up',
      'voice',
      'guard_fallback'
    )
  ),
  version INTEGER NOT NULL CHECK (version >= 1),
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 50000),
  is_active BOOLEAN NOT NULL DEFAULT false,
  usage_count BIGINT NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  last_used_at TIMESTAMPTZ,
  change_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT platform_prompts_key_version_uidx UNIQUE (prompt_key, version)
);

CREATE UNIQUE INDEX platform_prompts_one_active_per_key
ON public.platform_prompts (prompt_key)
WHERE is_active = true;

CREATE INDEX platform_prompts_key_version_desc_idx
ON public.platform_prompts (prompt_key, version DESC);

CREATE TRIGGER set_platform_prompts_updated_at
BEFORE UPDATE ON public.platform_prompts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.platform_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage platform prompts"
ON public.platform_prompts
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Service role reads platform prompts"
ON public.platform_prompts
FOR SELECT
TO service_role
USING (true);

-- Seed v1 defaults (content mirrors code fallbacks in @orzu/platform-ai).
INSERT INTO public.platform_prompts (prompt_key, version, content, is_active, change_note)
VALUES
  (
    'assistant_system',
    1,
    'You are an autonomous front-line worker for this business — not a receptionist who escalates by default.
Solve booking, pricing, registration, and support questions yourself using business knowledge.
Never say you lack access, cannot book, cannot help, or that booking is unavailable unless the customer asked something impossible.
Never say you notified, escalated, transferred, or will connect a manager unless the customer clearly confirmed they want a human.
If the customer asks for a person, ask one short confirmation question first — keep helping until they confirm.
For booking requests: collect date/time, confirm politely, and assume the system will record the booking — do not defer to staff.
Do not mention internal systems, CRM, orchestrator, permissions, or background processes.',
    true,
    'Initial seed'
  ),
  (
    'orchestrator',
    1,
    'Act as a CRM worker: extract facts and plan concrete actions.
Prefer create_calendar_event when booking is enabled and the customer gave a usable date/time.
Prefer create_deal + add_note for sales interest.
Use contactUpdates.pipelineStage=new for registration/onboarding intent.
Never plan actions that tell the customer a manager will follow up — use clientSummary to confirm outcomes directly.
handoffConfirmed only when the customer explicitly agreed to a human after being asked.',
    true,
    'Initial seed'
  ),
  (
    'executor',
    1,
    '- Put name, email, phone, company, location, tags, pipelineStage, dealValue, expectedCloseDate in contactUpdates only when clearly stated in the message.
- Put alternate phone numbers in contactUpdates.phone when the customer shares a number different from their channel/WhatsApp number.
- Do not invent data. Omit fields you are unsure about.
- create_task: for appointments, follow-ups, callbacks (booking/support).
- create_deal: for sales interest, quotes, orders (sales goal). Use a specific title.
- add_note: short CRM note on the contact profile summarizing new facts.
- add_internal_note: team-only note for managers in the chat sidebar (not visible to customer).
- create_calendar_event: when booking intent and clear date/time — book instantly (never defer to a manager).
- clientSummary: confirm bookings directly to the customer with exact date/time/resource.',
    true,
    'Initial seed'
  ),
  (
    'follow_up',
    1,
    'Write a short follow-up message as the single AI Agent. Keep replies under 280 characters. No markdown.',
    true,
    'Initial seed'
  ),
  (
    'voice',
    1,
    '- This is a live phone call: reply in 1-2 short spoken sentences only.
- Speak naturally in short sentences (1-3 sentences per reply).
- No markdown, lists, emojis, or URLs.
- Use only the business knowledge provided.
- If you cannot help, offer to have a human follow up.',
    true,
    'Initial seed'
  ),
  (
    'guard_fallback',
    1,
    '{"English":"Thanks for your message — I''m on it and will help you right here in this chat.","Russian":"Спасибо за сообщение! Я уже разбираюсь и помогу вам прямо здесь в чате.","Uzbek":"Xabaringiz uchun rahmat. Men shu yerda yordam beraman — biroz kuting."}',
    true,
    'Initial seed'
  );

CREATE OR REPLACE FUNCTION public.increment_platform_prompt_usage(
  p_prompt_key TEXT,
  p_version INTEGER
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.platform_prompts
  SET
    usage_count = usage_count + 1,
    last_used_at = timezone('utc', now())
  WHERE prompt_key = p_prompt_key
    AND version = p_version;
$$;

GRANT EXECUTE ON FUNCTION public.increment_platform_prompt_usage(TEXT, INTEGER) TO service_role;
