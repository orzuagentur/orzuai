-- When the single AI agent is active (can_reply), enable auto-reply on connected channels
-- that were left off by default after activation-before-connect flows.

UPDATE public.ai_settings AS s
SET ai_enabled = true
FROM public.ai_assistant_profile AS p
WHERE s.business_id = p.business_id
  AND p.can_reply = true
  AND s.ai_enabled = false
  AND (
    (
      s.channel = 'telegram'
      AND EXISTS (
        SELECT 1
        FROM public.telegram_connections AS t
        WHERE t.business_id = s.business_id
          AND t.telegram_status = 'connected'
      )
    )
    OR (
      s.channel = 'whatsapp'
      AND EXISTS (
        SELECT 1
        FROM public.whatsapp_connections AS w
        WHERE w.business_id = s.business_id
          AND w.whatsapp_status = 'connected'
      )
    )
    OR (
      s.channel = 'email'
      AND EXISTS (
        SELECT 1
        FROM public.email_connections AS e
        WHERE e.business_id = s.business_id
          AND e.email_status = 'connected'
      )
    )
    OR (
      s.channel = 'website_forms'
      AND EXISTS (
        SELECT 1
        FROM public.website_form_connections AS f
        WHERE f.business_id = s.business_id
          AND f.connection_status = 'connected'
      )
    )
  );
