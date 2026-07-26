-- Presentation editor hardening: local ids are text ids (deck_xxx), not UUIDs.
-- Also allow native PowerPoint export metadata.

alter table public.presentation_library
  alter column id type text using id::text;

alter table public.presentation_library
  drop constraint if exists presentation_library_format_check;

alter table public.presentation_library
  add constraint presentation_library_format_check
  check (format in ('pdf', 'word', 'pptx'));
