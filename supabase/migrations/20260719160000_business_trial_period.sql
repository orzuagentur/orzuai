-- 3-day product trial: track end time and one-shot expiry email.

alter table public.businesses
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_ended_email_sent_at timestamptz;

comment on column public.businesses.trial_ends_at is
  'When the signup trial ends. Null for paid / legacy accounts.';

comment on column public.businesses.trial_ended_email_sent_at is
  'Set when the trial-ended email was sent (idempotent cron).';

create index if not exists businesses_trial_ends_at_idx
  on public.businesses (trial_ends_at)
  where trial_ends_at is not null
    and subscription_status = 'trialing';
