export const LEAD_NOTIFICATION_SOUND = "/sounds/new-lead.wav";
export const MANAGER_CALLOUT_SOUND = "/sounds/manager-callout.wav";

export function isManagerCalloutSound(soundPath: string | undefined): boolean {
  return Boolean(soundPath?.includes("manager-callout"));
}
