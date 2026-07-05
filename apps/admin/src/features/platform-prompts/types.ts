import type { PlatformPromptKey } from "@orzu/platform-ai";

export type PlatformPromptRecord = {
  id: string;
  promptKey: PlatformPromptKey;
  version: number;
  content: string;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  changeNote: string;
  createdAt: string;
  updatedAt: string;
};

export type SavePlatformPromptInput = {
  promptKey: PlatformPromptKey;
  content: string;
  changeNote?: string;
  activate?: boolean;
};

export type PlatformPromptGroup = {
  promptKey: PlatformPromptKey;
  label: string;
  activeVersion: PlatformPromptRecord | null;
  versions: PlatformPromptRecord[];
};
