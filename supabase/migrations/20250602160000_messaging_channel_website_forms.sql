-- Step 1: extend messaging_channel enum (must run in its own migration/transaction)
-- PostgreSQL requires new enum values to be committed before use.

ALTER TYPE public.messaging_channel ADD VALUE IF NOT EXISTS 'website_forms';
