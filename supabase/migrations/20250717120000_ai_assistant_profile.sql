CREATE TABLE public.ai_assistant_profile (
  business_id UUID PRIMARY KEY REFERENCES public.businesses (id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'AI Assistant',
  system_prompt TEXT NOT NULL,
  communication_style TEXT NOT NULL DEFAULT 'friendly',
  language TEXT NOT NULL DEFAULT 'English',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER set_ai_assistant_profile_updated_at
BEFORE UPDATE ON public.ai_assistant_profile
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.ai_assistant_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own AI assistant profile"
ON public.ai_assistant_profile
FOR ALL
TO authenticated
USING (public.user_owns_business(business_id))
WITH CHECK (public.user_owns_business(business_id));

INSERT INTO public.ai_assistant_profile (business_id, name, system_prompt, communication_style, language)
SELECT DISTINCT ON (business_id)
  business_id,
  'AI Assistant',
  system_prompt,
  'friendly',
  language
FROM public.ai_settings
ORDER BY business_id, channel
ON CONFLICT (business_id) DO NOTHING;
