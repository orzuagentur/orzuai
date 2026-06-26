CREATE OR REPLACE FUNCTION public.platform_admin_ai_provider_stats(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  provider TEXT,
  total_calls BIGINT,
  auto_replies BIGINT,
  voice_calls BIGINT,
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
    COUNT(*) FILTER (WHERE call_type = 'voice')::BIGINT AS voice_calls,
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

CREATE OR REPLACE FUNCTION public.platform_admin_ai_totals(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_calls BIGINT,
  auto_replies BIGINT,
  voice_calls BIGINT,
  cost_usd NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::BIGINT AS total_calls,
    COUNT(*) FILTER (WHERE call_type = 'auto_reply')::BIGINT AS auto_replies,
    COUNT(*) FILTER (WHERE call_type = 'voice')::BIGINT AS voice_calls,
    COALESCE(SUM(estimated_cost_usd), 0) AS cost_usd
  FROM public.ai_usage_logs
  WHERE (p_start IS NULL OR created_at >= p_start)
    AND (p_end IS NULL OR created_at < p_end);
$$;
