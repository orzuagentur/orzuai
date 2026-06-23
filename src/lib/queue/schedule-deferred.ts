import "server-only";

import { after } from "next/server";

import { sleep } from "@/lib/queue/sleep";

/** Run work after the HTTP response, keeping the serverless function alive. */
export function scheduleAfterResponse(
  delayMs: number,
  task: () => Promise<void>,
): void {
  after(async () => {
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    await task();
  });
}
