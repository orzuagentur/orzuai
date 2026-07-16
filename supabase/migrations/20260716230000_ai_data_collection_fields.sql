-- Configurable AI data-collection fields + niche on assistant profile.
-- Answers live in contacts.custom_fields.collection (jsonb namespace).

ALTER TABLE public.ai_assistant_profile
  ADD COLUMN IF NOT EXISTS collection_niche text NOT NULL DEFAULT 'generic',
  ADD COLUMN IF NOT EXISTS data_collection_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.ai_assistant_profile
  DROP CONSTRAINT IF EXISTS ai_assistant_profile_collection_niche_check;

ALTER TABLE public.ai_assistant_profile
  ADD CONSTRAINT ai_assistant_profile_collection_niche_check
  CHECK (
    collection_niche IN (
      'generic',
      'hotel',
      'it_agency',
      'clinic',
      'real_estate',
      'salon',
      'restaurant',
      'auto_service',
      'spa',
      'dentist',
      'barbershop'
    )
  );

COMMENT ON COLUMN public.ai_assistant_profile.collection_niche IS
  'Business niche for default data-collection field presets (not hard-coded chat scripts).';

COMMENT ON COLUMN public.ai_assistant_profile.data_collection_fields IS
  'JSON array of DataCollectionField defs used by gap engine + AI prompts.';
