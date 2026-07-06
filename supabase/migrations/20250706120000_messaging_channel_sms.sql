-- Add SMS as a distinct messaging channel (must commit before using the value).

ALTER TYPE public.messaging_channel ADD VALUE IF NOT EXISTS 'sms';
