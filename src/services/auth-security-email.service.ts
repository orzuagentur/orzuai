import "server-only";

import { recordUserLoginDevice } from "@/services/auth-device.service";
import { isEmailTemplateActive } from "@/services/email-template-config.service";
import {
  sendNewDeviceLoginEmail,
  sendPasswordChangedEmail,
} from "@/services/email.service";

function formatSecurityTimestamp(date = new Date()): string {
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
}

export async function notifyPasswordChanged(input: {
  userId: string;
  email: string;
}): Promise<void> {
  if (!(await isEmailTemplateActive("password_changed"))) {
    return;
  }

  void sendPasswordChangedEmail({
    to: input.email,
    userId: input.userId,
    changedAtLabel: formatSecurityTimestamp(),
  });
}

export async function handlePostLoginSecurityNotify(input: {
  userId: string;
  email: string;
  userAgent: string;
  ipAddress?: string | null;
}): Promise<void> {
  const { isNewDevice, deviceLabel } = await recordUserLoginDevice({
    userId: input.userId,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  if (!isNewDevice) {
    return;
  }

  if (!(await isEmailTemplateActive("new_device_login"))) {
    return;
  }

  void sendNewDeviceLoginEmail({
    to: input.email,
    userId: input.userId,
    deviceLabel,
    signedInAtLabel: formatSecurityTimestamp(),
    ipAddress: input.ipAddress,
  });
}
