-- Track active subscription add-ons per business (synced from Stripe)

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS subscription_addons JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.platform_subscription_addons
SET metadata = '{"monthlyAiReplies": 1000}'::jsonb
WHERE id = 'ai_reply_pack';

UPDATE public.platform_subscription_addons
SET metadata = '{"monthlyVoiceMinutes": 500}'::jsonb
WHERE id = 'voice_minutes_pack';

UPDATE public.platform_subscription_addons
SET metadata = '{"maxTeamSeats": 1}'::jsonb
WHERE id = 'team_seat';
