-- Stripe billing: plans (admin source of truth) + per-user subscriptions

alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_id_uidx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  amount_cents int not null default 0 check (amount_cents >= 0),
  currency text not null default 'eur',
  interval text not null default 'month' check (interval in ('month', 'year')),
  entitlements jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  stripe_product_id text,
  stripe_price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_plans_active_sort_idx
  on public.billing_plans (is_active, sort_order);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.billing_plans(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists billing_subscriptions_status_idx
  on public.billing_subscriptions (status);

create unique index if not exists billing_subscriptions_stripe_sub_uidx
  on public.billing_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

drop trigger if exists billing_plans_set_updated_at on public.billing_plans;
create trigger billing_plans_set_updated_at
  before update on public.billing_plans
  for each row execute function public.set_updated_at();

drop trigger if exists billing_subscriptions_set_updated_at on public.billing_subscriptions;
create trigger billing_subscriptions_set_updated_at
  before update on public.billing_subscriptions
  for each row execute function public.set_updated_at();

alter table public.billing_plans enable row level security;
alter table public.billing_subscriptions enable row level security;

drop policy if exists billing_plans_select_active on public.billing_plans;
create policy billing_plans_select_active
  on public.billing_plans
  for select
  to authenticated
  using (is_active = true);

drop policy if exists billing_subscriptions_select_own on public.billing_subscriptions;
create policy billing_subscriptions_select_own
  on public.billing_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Seed default plans (Stripe IDs filled by admin sync)
insert into public.billing_plans (
  slug, name, description, amount_cents, currency, interval, entitlements, is_active, sort_order
) values
  (
    'free',
    'Free',
    'AI Video and YouTube autopilot with light daily limits.',
    0,
    'eur',
    'month',
    '{"videos_per_day":1,"creators":false,"presentation":false,"libraries":false,"worker_priority":false}'::jsonb,
    true,
    0
  ),
  (
    'creator',
    'Creator',
    'Full Creators suite, presentations, and libraries for growing channels.',
    2900,
    'eur',
    'month',
    '{"videos_per_day":3,"creators":true,"presentation":true,"libraries":true,"worker_priority":false}'::jsonb,
    true,
    1
  ),
  (
    'studio',
    'Studio',
    'Highest daily limits and priority rendering for serious production.',
    7900,
    'eur',
    'month',
    '{"videos_per_day":5,"creators":true,"presentation":true,"libraries":true,"worker_priority":true}'::jsonb,
    true,
    2
  )
on conflict (slug) do nothing;
