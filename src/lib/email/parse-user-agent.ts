import { createHash } from "crypto";

export function hashDeviceFingerprint(userAgent: string): string {
  return createHash("sha256")
    .update(userAgent.trim() || "unknown")
    .digest("hex")
    .slice(0, 32);
}

export function parseUserAgentDeviceLabel(userAgent: string): string {
  const ua = userAgent.trim();

  if (!ua) {
    return "Unknown device";
  }

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);

  let browser = "Browser";
  if (/Edg\//i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = "Chrome";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Firefox";
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = "Safari";
  }

  let os = "Unknown OS";
  if (/Windows NT/i.test(ua)) {
    os = "Windows";
  } else if (/Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) {
    os = "macOS";
  } else if (/Android/i.test(ua)) {
    os = "Android";
  } else if (/iPhone|iPad/i.test(ua)) {
    os = "iOS";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  const deviceType = isMobile ? "Mobile" : "Desktop";
  return `${deviceType} · ${browser} on ${os}`;
}
