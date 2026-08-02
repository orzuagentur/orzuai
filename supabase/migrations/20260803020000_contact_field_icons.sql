-- Catalog of icons available when adding custom fields on a contact profile card.
-- Values for those fields live in contacts.custom_fields.profileFields (JSONB).

CREATE TABLE public.contact_field_icons (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.contact_field_icons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contact field icons"
ON public.contact_field_icons
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.contact_field_icons (key, label, sort_order) VALUES
  ('tag', 'Tag', 1),
  ('briefcase', 'Briefcase', 2),
  ('globe', 'Globe', 3),
  ('home', 'Home', 4),
  ('car', 'Car', 5),
  ('cake', 'Birthday', 6),
  ('heart', 'Heart', 7),
  ('star', 'Star', 8),
  ('link', 'Link', 9),
  ('hash', 'Hash', 10),
  ('bookmark', 'Bookmark', 11),
  ('credit-card', 'Card', 12),
  ('id-card', 'ID', 13),
  ('building-2', 'Building', 14),
  ('map-pin', 'Map', 15),
  ('calendar', 'Calendar', 16),
  ('clock', 'Clock', 17),
  ('users', 'People', 18),
  ('user', 'Person', 19),
  ('phone', 'Phone', 20),
  ('mail', 'Email', 21),
  ('message-square', 'Message', 22),
  ('file-text', 'Document', 23),
  ('wallet', 'Wallet', 24),
  ('shopping-bag', 'Shopping', 25),
  ('gift', 'Gift', 26),
  ('languages', 'Language', 27),
  ('at-sign', 'Handle', 28);
