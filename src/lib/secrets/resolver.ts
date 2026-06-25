import { resolveSecretValue as resolveFromPackage } from "@orzu/secrets/server";

export function resolveSecretValue(
  keyName: string,
  options?: { required?: boolean },
): string | undefined {
  return resolveFromPackage(keyName, options);
}
