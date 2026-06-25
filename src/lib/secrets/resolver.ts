import { resolveSecretValue as resolveFromPackage } from "@orzu/secrets/runtime";

export function resolveSecretValue(
  keyName: string,
  options?: { required?: boolean },
): string | undefined {
  return resolveFromPackage(keyName, options);
}
