ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS contacts_business_id_is_favorite_idx
  ON public.contacts (business_id, is_favorite)
  WHERE is_favorite = TRUE;
