-- Voice STT/TTS call types for accurate admin analytics

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_call_type_check;

UPDATE public.ai_usage_logs
SET call_type = 'voice_tts'
WHERE call_type = 'voice';

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_call_type_check
  CHECK (
    call_type IN (
      'auto_reply',
      'orchestrator',
      'sentiment',
      'bant',
      'follow_up',
      'automation',
      'intent',
      'crm_plan',
      'analytics',
      'conversation_summary',
      'voice',
      'voice_stt',
      'voice_tts',
      'other'
    )
  );

DROP FUNCTION IF EXISTS public.platform_admin_ai_provider_stats(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.platform_admin_ai_provider_stats(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  provider TEXT,
  total_calls BIGINT,
  auto_replies BIGINT,
  voice_stt_calls BIGINT,
  voice_tts_calls BIGINT,
  voice_stt_cost_usd NUMERIC,
  voice_tts_cost_usd NUMERIC,
  input_tokens BIGINT,
  output_tokens BIGINT,
  cost_usd NUMERIC,
  last_activity_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(trim(provider), ''), 'unknown') AS provider,
    COUNT(*)::BIGINT AS total_calls,
    COUNT(*) FILTER (WHERE call_type = 'auto_reply')::BIGINT AS auto_replies,
    COUNT(*) FILTER (WHERE call_type = 'voice_stt')::BIGINT AS voice_stt_calls,
    COUNT(*) FILTER (
      WHERE call_type IN ('voice_tts', 'voice')
    )::BIGINT AS voice_tts_calls,
    COALESCE(
      SUM(estimated_cost_usd) FILTER (WHERE call_type = 'voice_stt'),
      0
    ) AS voice_stt_cost_usd,
    COALESCE(
      SUM(estimated_cost_usd) FILTER (WHERE call_type IN ('voice_tts', 'voice')),
      0
    ) AS voice_tts_cost_usd,
    COALESCE(SUM(input_tokens), 0)::BIGINT AS input_tokens,
    COALESCE(SUM(output_tokens), 0)::BIGINT AS output_tokens,
    COALESCE(SUM(estimated_cost_usd), 0) AS cost_usd,
    MAX(created_at) AS last_activity_at
  FROM public.ai_usage_logs
  WHERE (p_start IS NULL OR created_at >= p_start)
    AND (p_end IS NULL OR created_at < p_end)
  GROUP BY 1;
$$;

CREATE OR REPLACE FUNCTION public.platform_admin_ai_daily_activity(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE (
  provider TEXT,
  activity_date DATE,
  calls BIGINT,
  cost_usd NUMERIC,
  replies BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(trim(provider), ''), 'unknown') AS provider,
    (created_at AT TIME ZONE 'UTC')::DATE AS activity_date,
    COUNT(*)::BIGINT AS calls,
    COALESCE(SUM(estimated_cost_usd), 0) AS cost_usd,
    COUNT(*) FILTER (WHERE call_type = 'auto_reply')::BIGINT AS replies
  FROM public.ai_usage_logs
  WHERE created_at >= p_start
    AND created_at < p_end
  GROUP BY 1, 2
  ORDER BY 2 ASC;
$$;

DROP FUNCTION IF EXISTS public.platform_admin_ai_totals(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.platform_admin_ai_totals(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_calls BIGINT,
  auto_replies BIGINT,
  voice_stt_calls BIGINT,
  voice_tts_calls BIGINT,
  voice_stt_cost_usd NUMERIC,
  voice_tts_cost_usd NUMERIC,
  cost_usd NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::BIGINT AS total_calls,
    COUNT(*) FILTER (WHERE call_type = 'auto_reply')::BIGINT AS auto_replies,
    COUNT(*) FILTER (WHERE call_type = 'voice_stt')::BIGINT AS voice_stt_calls,
    COUNT(*) FILTER (
      WHERE call_type IN ('voice_tts', 'voice')
    )::BIGINT AS voice_tts_calls,
    COALESCE(
      SUM(estimated_cost_usd) FILTER (WHERE call_type = 'voice_stt'),
      0
    ) AS voice_stt_cost_usd,
    COALESCE(
      SUM(estimated_cost_usd) FILTER (WHERE call_type IN ('voice_tts', 'voice')),
      0
    ) AS voice_tts_cost_usd,
    COALESCE(SUM(estimated_cost_usd), 0) AS cost_usd
  FROM public.ai_usage_logs
  WHERE (p_start IS NULL OR created_at >= p_start)
    AND (p_end IS NULL OR created_at < p_end);
$$;
