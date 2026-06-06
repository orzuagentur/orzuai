ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS sentiment TEXT
    CHECK (sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative'));

ALTER TABLE public.business_ai_config
  ADD COLUMN IF NOT EXISTS auto_task_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_task_threshold INTEGER NOT NULL DEFAULT 75
    CHECK (auto_task_threshold BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS sentiment_analysis_enabled BOOLEAN NOT NULL DEFAULT true;
