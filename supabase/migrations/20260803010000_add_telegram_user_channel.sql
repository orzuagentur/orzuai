-- Dedicated messaging channel for personal Telegram (MTProto) accounts.
-- Kept separate from the Bot API `telegram` channel so inbox, AI settings,
-- and marketplace cards can distinguish the two connections.
ALTER TYPE public.messaging_channel ADD VALUE IF NOT EXISTS 'telegram_user';
