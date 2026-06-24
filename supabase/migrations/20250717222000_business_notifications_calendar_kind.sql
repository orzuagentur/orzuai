ALTER TABLE public.business_notifications
DROP CONSTRAINT IF EXISTS business_notifications_kind_check;

ALTER TABLE public.business_notifications
ADD CONSTRAINT business_notifications_kind_check
CHECK (kind IN ('ai_action', 'human_request', 'ai_calendar_event'));
