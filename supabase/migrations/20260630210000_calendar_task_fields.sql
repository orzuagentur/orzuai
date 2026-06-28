ALTER TABLE public.calendar_tasks
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;

UPDATE public.calendar_tasks
SET
  start_at = COALESCE(
    start_at,
    date_trunc('day', due_at AT TIME ZONE 'UTC') + interval '9 hours'
  ),
  end_at = COALESCE(
    end_at,
    date_trunc('day', due_at AT TIME ZONE 'UTC') + interval '9 hours 30 minutes'
  )
WHERE due_at IS NOT NULL
  AND (start_at IS NULL OR end_at IS NULL);

CREATE INDEX IF NOT EXISTS calendar_tasks_business_start_idx
ON public.calendar_tasks (business_id, start_at);
