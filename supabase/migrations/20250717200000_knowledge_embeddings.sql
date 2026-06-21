-- Semantic search for knowledge base (Sprint AI-4).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_model TEXT;

CREATE INDEX IF NOT EXISTS knowledge_base_business_embedding_idx
  ON public.knowledge_base (business_id)
  WHERE embedding IS NOT NULL;

CREATE OR REPLACE FUNCTION public.match_knowledge_by_embedding(
  p_business_id UUID,
  p_query_embedding vector(768),
  p_match_count INT DEFAULT 25
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category::TEXT,
    (1 - (kb.embedding <=> p_query_embedding))::DOUBLE PRECISION AS similarity
  FROM public.knowledge_base kb
  WHERE kb.business_id = p_business_id
    AND kb.embedding IS NOT NULL
  ORDER BY kb.embedding <=> p_query_embedding
  LIMIT GREATEST(p_match_count, 1);
$$;

GRANT EXECUTE ON FUNCTION public.match_knowledge_by_embedding(UUID, vector, INT)
  TO authenticated, service_role;
