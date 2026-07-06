ALTER TABLE public.website_chat_connections
  ADD COLUMN IF NOT EXISTS widget_title TEXT NOT NULL DEFAULT 'Chat with us',
  ADD COLUMN IF NOT EXISTS launcher_icon TEXT NOT NULL DEFAULT 'message',
  ADD COLUMN IF NOT EXISTS position TEXT NOT NULL DEFAULT 'bottom_right';
