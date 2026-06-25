/** Admin is "online" when heartbeat was received within this window. */
export const PRESENCE_TTL_MS = 45_000;

export const PRESENCE_HEARTBEAT_MS = 20_000;

export function isAdminPresent(
  isPresent: boolean,
  lastSeenAt: string | null | undefined,
): boolean {
  if (!isPresent || !lastSeenAt) {
    return false;
  }

  const timestamp = new Date(lastSeenAt).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp < PRESENCE_TTL_MS;
}
