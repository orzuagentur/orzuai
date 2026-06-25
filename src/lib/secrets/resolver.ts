import { resolveSecretValue as resolveFromPackage } from "@orzu/secrets";

export function resolveSecretValue(
  keyName: string,
  options?: { required?: boolean },
): string | undefined {
  return resolveFromPackage(keyName, options);
}
