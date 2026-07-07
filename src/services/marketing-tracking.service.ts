import { createAdminClient } from "@/lib/supabase/admin";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

type RecipientRow = {
  id: string;
  campaign_id: string;
  status: string;
  open_count: number;
  click_count: number;
  opened_at: string | null;
  clicked_at: string | null;
};

type CampaignSnapshot = {
  cta_url?: string;
};

async function getRecipientByToken(
  token: string,
): Promise<(RecipientRow & { cta_url: string }) | null> {
  const admin = createAdminClient();

  const { data: recipient, error } = await admin
    .from("marketing_campaign_recipients")
    .select("id, campaign_id, status, open_count, click_count, opened_at, clicked_at")
    .eq("tracking_token", token)
    .maybeSingle();

  if (error || !recipient) {
    return null;
  }

  const { data: campaign } = await admin
    .from("marketing_campaigns")
    .select("template_snapshot")
    .eq("id", recipient.campaign_id)
    .maybeSingle();

  const snapshot = (campaign?.template_snapshot ?? {}) as CampaignSnapshot;
  const ctaUrl =
    typeof snapshot.cta_url === "string" && snapshot.cta_url.trim()
      ? snapshot.cta_url.trim()
      : "https://www.orzux.com/dashboard";

  return {
    ...(recipient as RecipientRow),
    cta_url: ctaUrl,
  };
}

export function marketingOpenPixelResponse(): Response {
  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function recordMarketingOpen(token: string): Promise<void> {
  const recipient = await getRecipientByToken(token);

  if (!recipient) {
    return;
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const nextStatus =
    recipient.status === "clicked" ? "clicked"
    : recipient.status === "sent" || recipient.status === "opened" ? "opened"
    : recipient.status;

  await admin
    .from("marketing_campaign_recipients")
    .update({
      status: nextStatus,
      opened_at: recipient.opened_at ?? now,
      open_count: recipient.open_count + 1,
    })
    .eq("id", recipient.id);
}

export async function recordMarketingClick(
  token: string,
): Promise<string | null> {
  const recipient = await getRecipientByToken(token);

  if (!recipient) {
    return null;
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("marketing_campaign_recipients")
    .update({
      status: "clicked",
      clicked_at: recipient.clicked_at ?? now,
      click_count: recipient.click_count + 1,
      opened_at: recipient.opened_at ?? now,
      open_count: recipient.open_count === 0 ? 1 : recipient.open_count,
    })
    .eq("id", recipient.id);

  return recipient.cta_url;
}
