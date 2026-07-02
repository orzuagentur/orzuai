"use server";

const DEFAULT_APP_URL = "http://localhost:3000";

export async function triggerAnnouncementPushDelivery(
  announcementId: string,
): Promise<void> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || DEFAULT_APP_URL;
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return;
  }

  try {
    await fetch(`${appUrl}/api/internal/platform/announcement-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ announcementId }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[admin] announcement push delivery failed", error);
  }
}
