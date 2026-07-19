import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

type LegacyVoiceInboxPageProps = {
  searchParams: Promise<{ call?: string; phone?: string }>;
};

export default async function LegacyVoiceInboxPage({
  searchParams,
}: LegacyVoiceInboxPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (params.call?.trim()) {
    query.set("call", params.call.trim());
  }

  if (params.phone?.trim()) {
    query.set("phone", params.phone.trim());
  }

  const suffix = query.toString();
  redirect(
    suffix ? `${DASHBOARD_ROUTES.voice}?${suffix}` : DASHBOARD_ROUTES.voice,
  );
}
