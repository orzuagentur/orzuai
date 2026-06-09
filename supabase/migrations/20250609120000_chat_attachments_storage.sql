INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  16777216,
  NULL
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Business owners can read chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.user_owns_business(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Business owners can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND public.user_owns_business(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Public read chat attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');
