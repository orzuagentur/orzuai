import "server-only";

import {
  getVoicePostCallQueueLagMetrics,
  type VoicePostCallQueueLagMetrics,
} from "@/services/voice-post-call-queue.service";

export type VoiceHealthSnapshot = {
  postCallQueue: VoicePostCallQueueLagMetrics;
  capturedAt: string;
};

export async function getVoiceHealthSnapshot(): Promise<VoiceHealthSnapshot> {
  const postCallQueue = await getVoicePostCallQueueLagMetrics();

  return {
    postCallQueue,
    capturedAt: new Date().toISOString(),
  };
}
