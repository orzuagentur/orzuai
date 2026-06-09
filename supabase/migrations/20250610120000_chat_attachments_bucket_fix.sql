-- Allow all MIME types for inbound media (WhatsApp/Telegram send varied types).
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'chat-attachments';
