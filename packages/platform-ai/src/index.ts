export * from "./providers";
export * from "./models";
export * from "./use-cases";
export * from "./vercel-ai-sync";

export type PlatformAiCredentialRecord = {
  id: string;
  name: string;
  provider: string;
  secretKeyName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAiUseCaseConfigRecord = {
  useCaseId: string;
  credentialId: string | null;
  provider: string;
  model: string | null;
  updatedAt: string;
};
