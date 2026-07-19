import { getLandingCopy, type LandingLocale } from "@/features/landing/i18n";

export type LandingArchitectureNode = {
  id: string;
  label: string;
  caption: string;
  detail?: string;
};

export type LandingArchitectureCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  lead?: string;
  outcomeTitle?: string;
  outcomeBody?: string;
  principles?: { title: string; description: string }[];
  nodes: LandingArchitectureNode[];
};

export function getLandingArchitecture(locale: LandingLocale): LandingArchitectureCopy {
  return getLandingCopy(locale).architecture;
}
