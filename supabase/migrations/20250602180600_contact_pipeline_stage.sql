ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'new';

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_pipeline_stage_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_pipeline_stage_check
  CHECK (pipeline_stage IN ('new', 'qualified', 'proposal', 'won', 'lost'));

CREATE INDEX IF NOT EXISTS contacts_pipeline_stage_idx
  ON public.contacts (business_id, pipeline_stage);
