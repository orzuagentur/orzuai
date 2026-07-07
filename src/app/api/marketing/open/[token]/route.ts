import {
  marketingOpenPixelResponse,
  recordMarketingOpen,
} from "@/services/marketing-tracking.service";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  if (token?.trim()) {
    await recordMarketingOpen(token.trim()).catch((error) => {
      console.error("[marketing-open]", error);
    });
  }

  return marketingOpenPixelResponse();
}
