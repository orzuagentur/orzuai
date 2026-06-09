-- Store chat media privately; dashboard resolves signed URLs at display time.
UPDATE storage.buckets
SET public = false
WHERE id = 'chat-attachments';

DROP POLICY IF EXISTS "Public read chat attachments" ON storage.objects;

CREATE POLICY "Business owners can delete chat attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.user_owns_business(((storage.foldername(name))[1])::uuid)
);
