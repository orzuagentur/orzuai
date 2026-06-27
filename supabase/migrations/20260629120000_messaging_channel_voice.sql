-- Add voice as a messaging channel for CRM/orchestration logging from phone AI.
ALTER TYPE public.messaging_channel ADD VALUE IF NOT EXISTS 'voice';
