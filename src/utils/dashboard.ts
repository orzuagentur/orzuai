export function getUserDisplayName(
  fullName: string | null | undefined,
  email: string,
): string {
  const trimmed = fullName?.trim();

  if (trimmed) {
    return trimmed;
  }

  const localPart = email.split("@")[0];

  return localPart || "User";
}

export function getUserInitials(
  fullName: string | null | undefined,
  email: string,
): string {
  const trimmed = fullName?.trim();

  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
    }

    return trimmed.slice(0, 2).toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

export function formatMetricValue(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatConversionRate(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calculateConversionRate(
  aiResponses: number,
  totalMessages: number,
): number {
  if (totalMessages <= 0) {
    return 0;
  }

  return Math.round((aiResponses / totalMessages) * 1000) / 10;
}

export function buildPeriodActivity(
  timestamps: string[],
  days: number,
): Array<{ label: string; value: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const safeDays = Math.max(1, Math.min(days, 90));

  const buckets = Array.from({ length: safeDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (safeDays - 1 - index));

    return {
      key: date.toISOString().slice(0, 10),
      label:
        safeDays <= 7
          ? date.toLocaleDateString("en-US", { weekday: "short" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const timestamp of timestamps) {
    const key = timestamp.slice(0, 10);
    const bucket = bucketMap.get(key);

    if (bucket) {
      bucket.value += 1;
    }
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

export function buildLastSevenDaysActivity(
  timestamps: string[],
): Array<{ label: string; value: number }> {
  return buildPeriodActivity(timestamps, 7);
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - date.getTime();

  if (Number.isNaN(diffMs)) {
    return "Unknown";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatMessageDateTime(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const now = new Date();
  const timeLabel = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === now.toDateString()) {
    return `Today, ${timeLabel}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeLabel}`;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}
