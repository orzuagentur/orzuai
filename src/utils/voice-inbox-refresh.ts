const VOICE_INBOX_REFRESH_DELAYS_MS = [1000, 3000, 6000] as const;

export function scheduleVoiceInboxRefresh(refresh: () => void): void {
  for (const delay of VOICE_INBOX_REFRESH_DELAYS_MS) {
    window.setTimeout(refresh, delay);
  }
}
