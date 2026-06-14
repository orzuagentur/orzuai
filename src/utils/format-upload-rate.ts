export function formatUploadSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
    return "—";
  }

  if (bytesPerSecond >= 1_000_000) {
    return `${(bytesPerSecond / 1_000_000).toFixed(1)} MB/s`;
  }

  if (bytesPerSecond >= 1_000) {
    return `${(bytesPerSecond / 1_000).toFixed(1)} KB/s`;
  }

  return `${Math.round(bytesPerSecond)} B/s`;
}

export function formatUploadPercent(percent: number): string {
  return `${Math.min(100, Math.max(0, Math.round(percent)))}%`;
}
