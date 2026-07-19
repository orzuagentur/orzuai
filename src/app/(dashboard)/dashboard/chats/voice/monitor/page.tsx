import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

type LegacyVoiceMonitorPageProps = {
  searchParams: Promise<{ call?: string }>;
};

export default async function LegacyVoiceMonitorPage({
  searchParams,
}: LegacyVoiceMonitorPageProps) {
  const { call: callId } = await searchParams;
  const query = new URLSearchParams();

  if (callId?.trim()) {
    query.set("call", callId.trim());
  }

  const suffix = query.toString();
  redirect(
    suffix
      ? `${DASHBOARD_ROUTES.voiceMonitor}?${suffix}`
      : DASHBOARD_ROUTES.voiceMonitor,
  );
}
