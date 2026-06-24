-- Clear legacy text-embedding-004 vectors so cron can re-embed with gemini-embedding-001.

UPDATE public.knowledge_base
SET
  embedding = NULL,
  embedding_model = NULL
WHERE embedding IS NOT NULL
  AND (
    embedding_model IS NULL
    OR embedding_model <> 'gemini-embedding-001'
  );
