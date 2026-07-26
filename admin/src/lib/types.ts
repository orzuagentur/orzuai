export type UsageEvent = {
  id: string;
  user_id?: string | null;
  provider: string;
  kind: string;
  units: number;
  unit_label: string;
  cost_usd: number;
  meta: Record<string, unknown>;
  created_at: string;
  job_id?: string | null;
};

export type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  youtube_connected: boolean;
  youtube_channel_title: string | null;
  daily_videos_enabled: boolean;
  is_admin: boolean;
  created_at: string | null;
  job_count: number;
  cost_usd_month: number;
  plan_name?: string | null;
  plan_slug?: string | null;
  subscription_status?: string | null;
  cancel_at_period_end?: boolean;
  stripe_customer_id?: string | null;
};
