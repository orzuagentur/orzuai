export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  waitMs: number,
): T {
  let lastCallAt = 0;
  let timeoutId: number | null = null;
  let pendingArgs: Parameters<T> | null = null;

  const invoke = () => {
    if (!pendingArgs) {
      return;
    }

    const args = pendingArgs;
    pendingArgs = null;
    lastCallAt = Date.now();
    fn(...args);
  };

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const elapsed = now - lastCallAt;
    pendingArgs = args;

    if (elapsed >= waitMs) {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      invoke();
      return;
    }

    if (timeoutId === null) {
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        invoke();
      }, waitMs - elapsed);
    }
  }) as T;
}
