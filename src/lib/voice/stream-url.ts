export function buildAuthenticatedVoiceStreamUrl(input: {
  wsUrl: string;
  businessId: string;
  callSid: string;
  streamToken: string | null;
}): string {
  const url = new URL(input.wsUrl.trim());
  url.search = "";

  if (input.streamToken) {
    const basePath = url.pathname.replace(/\/$/, "");
    const pathParts = [
      input.businessId.trim(),
      input.callSid.trim(),
      input.streamToken,
    ].map(encodeURIComponent);
    url.pathname = `${basePath}/${pathParts.join("/")}`;
  }

  return url.toString();
}
