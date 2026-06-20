"use client";

import { useEffect, useState } from "react";

import {
  resolveChannelAiEnabled,
  subscribeChannelAiSync,
} from "@/lib/client/channel-ai-sync-store";
import type { MessagingChannel } from "@/types/database.types";

export function useChannelAiEnabled(
  channel: MessagingChannel | null,
  serverValue: boolean | null,
): boolean | null {
  const [, setRevision] = useState(0);

  useEffect(() => subscribeChannelAiSync(() => setRevision((value) => value + 1)), []);

  if (!channel) {
    return null;
  }

  return resolveChannelAiEnabled(channel, serverValue);
}
