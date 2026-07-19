-- Align free/trial plan entitlements and hide free from public pricing.

update public.platform_subscription_plans
set
  is_public = false,
  entitlements = jsonb_build_object(
    'maxMessagingChannels', 3,
    'maxTeamSeats', 1,
    'monthlyAiReplies', 100,
    'monthlyVoiceMinutes', 20,
    'maxAutomationRules', 0,
    'voiceAi', true,
    'automations', false,
    'followUpAgent', false,
    'analyticsAiAsk', false,
    'gmailIntegration', false,
    'websiteKnowledgeSync', false,
    'extendedAiContext', false,
    'calendarBookingPages', true,
    'prioritySupport', false
  ),
  updated_at = timezone('utc', now())
where id = 'free';
